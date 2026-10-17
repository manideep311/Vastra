# Architecture

This document covers how Vastra is put together. For setup and a feature tour, see the [README](../README.md).

## Overview

```
Browser (React SPA on Vercel)
   │  HTTPS + JWT
   ▼
Express API (Render) ──► MongoDB Atlas (data, product vectors, images in GridFS)
   │   └─ embedding model (all-MiniLM-L6-v2) runs in-process
   │
   └──► OpenAI-compatible chat API (e.g. Groq free tier)
```

The client is a static Vite build. The API is a single Express process; it keeps a few caches in memory (the product vector index, an LRU of query embeddings, rate-limit counters), so it is designed to run as one instance.

## Repository layout

```
client/src/
├── components/   shared UI: layouts, navbar, product cards, chat widget, route guards
├── context/      BuyerAuthContext, SupplierAuthContext, WishlistContext
├── features/     auth, buyer, supplier and marketing pages
├── services/     one module per API resource; apiClient.js is the shared axios instance
└── utils/        pricing, units, config, error helpers

server/src/
├── app.js        Express app: middleware, routes, error handler (imported by tests)
├── server.js     startup: config checks, MongoDB connection, listen
├── config/       Mongoose connection
├── middleware/   auth guards, rate limits, uploads, error handler
├── models/       Mongoose schemas
├── modules/      one folder per resource: *.routes.js → *.controller.js → *.service.js
├── routes/       mounts every module under /api
├── scripts/      seed, migration, backfill and evaluation scripts
└── utils/        validation, similarity, image storage
server/tests/     Jest + Supertest suites against an in-memory MongoDB
server/eval/      labelled questions for the retrieval evaluation
```

## Data model

- **User**: email, bcrypt password hash, `role` (`buyer` or `supplier`), onboarding flag.
- **Product**: name, category, price, `unit` (meter, kg, piece and so on), `moq`, stock, status, images, colours, fabric specs (GSM, width, composition, lead time), `priceTiers`, rating aggregate, and `embeddingVector`. The vector has `select: false`, so it is only loaded by the AI code.
- **Cart**: one per buyer. Line items keep the quantity and the price at the time they were added. `checkoutLockedAt` marks a cart that a checkout has claimed.
- **Order**: one per supplier per checkout. It holds item snapshots, shipping info and a status history (`pending → accepted → preparing → ready_for_dispatch → completed`).
- **Quote**: a bulk quote request (RFQ). It holds the buyer's quantity, target price and note, then the supplier's price, lead time and note, then the buyer's accept or reject.
- **Review**: one per buyer per product. Only buyers with a completed order for that product can post one.
- **Wishlist**, **Notification**, **Category**: supporting features.
- **BuyerProfile** and **SupplierProfile**: onboarding details. The buyer profile drives recommendations; the supplier profile is shown on the public storefront.

Product images are resized with sharp into WebP variants (full, thumb, small) and stored in MongoDB GridFS. They are served from `/api/images/:key` with long-lived immutable cache headers. `migrate:images` moves legacy disk uploads into GridFS.

## API surface

All routes are under `/api`:

`auth`, `buyer`, `products`, `cart`, `orders`, `supplier` (authenticated supplier actions), `suppliers` (public storefronts), `ai`, `quotes`, `wishlist`, `reviews`, `notifications`, `categories`, `images`.

## Buyer and supplier sessions

Buyer and supplier are two separate sessions, not one login with a role flag.

- `BuyerAuthContext` and `SupplierAuthContext` each keep their own `localStorage` keys (`buyerToken`, `buyerProfile`, `buyerLoggedIn` and the `supplier…` equivalents). Signing in or out of one never touches the other.
- `apiClient.js` sends the supplier token for pages under `/supplier` and the buyer token everywhere else (including public `/suppliers/:id` storefronts). A service can pin the role with `authRole`.
- On the server, `authenticate` verifies the JWT (HS256) and `authorize(role)` guards each route group. Ownership is checked in the service layer: a supplier can only change their own products, orders and quotes, and a buyer can only read their own orders.

## Buying flow

Guests can browse the home page, catalog, product pages, storefronts and cart. A guest cart lives in `localStorage` and is merged into the account cart on sign-in. Checkout, orders, quotes, wishlist and profile require a buyer account.

- **MOQ and stock** are enforced in the cart API (and mirrored in the UI): a line can't go below the product's minimum order or above available stock.
- **Pricing** is recomputed on the server at checkout from the live catalog price and bulk tiers. Only accepted-quote lines keep their negotiated price.
- **Checkout** first claims the cart atomically (`findOneAndUpdate` on `checkoutLockedAt`). A second simultaneous checkout gets a 409, and a claim older than two minutes counts as abandoned. Stock is reserved with conditional decrements, all lines or none, and one order is created per supplier. No payment is taken in the app; suppliers arrange invoicing directly.

## AI features

Both model types are free to run.
- **Embeddings** come from `Xenova/all-MiniLM-L6-v2`, the 8-bit quantized ONNX build of `sentence-transformers/all-MiniLM-L6-v2`. It runs inside the API process with Transformers.js, using mean pooling and L2 normalisation, and returns 384 dimensions.
  - `npm run model:download` stores the model in `server/.models` (about 23 MB) during the build, so a server waking from sleep doesn't download it.
  - `server.js` loads it right after startup.
  - `EMBEDDING_PROVIDER=huggingface` switches to the hosted Hugging Face API instead.
- **Chat** goes through the OpenAI SDK to any compatible endpoint (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`), such as Groq's free tier. Calls time out after 25 seconds and aren't retried, so a rate-limited call fails fast.

- **Embedding lifecycle.** Each product's name, category, description and tags are embedded when it is created, and again when that text changes or when the product has no vector yet. Vectors are validated (numeric, consistent dimension) and a bad one raises an `EmbeddingError`. If the model fails, the product is saved without a vector and `npm run backfill:embeddings` fills the gaps later. `-- --all` re-embeds everything, so all stored vectors come from the same model as the queries.
- **Vector index.** Product vectors are loaded into memory, refreshed every 10 minutes or whenever a product's text changes, and ranked with cosine similarity in a linear scan.
- **Assistant.** The latest buyer message is embedded and the top 5 products are retrieved. If embeddings fail, it falls back to MongoDB text search. When the chat is opened from a product page, that product is the context instead. The system prompt is static; the product list goes into the user turn inside `<catalog>` tags, with delimiter-like text stripped, so supplier-written descriptions can't act as instructions. Up to 10 earlier turns are forwarded as plain user and assistant messages.
- **Other uses.** Similar products (stored vectors only, no model call), AI search on `/products`, recommendations from the buyer's onboarding profile, category and tag suggestions for suppliers, and price and lead-time suggestions for quote responses.
- **Failure handling.**
  - If the chat model fails or is rate limited, `/ai/chat` still answers 200 with keyword matches (or the product being viewed) and a "temporarily unavailable" note.
  - Other AI endpoints answer 503 with a friendly message, and the UI degrades: the catalog falls back to keyword results, and the recommendation and similar-product sections hide.

## Security measures

- JWT secret required at startup. In production, the server also refuses to start without a `CLIENT_ORIGIN` CORS allow-list.
- helmet headers, a 100 kB JSON body limit, and whitelisted input validation in every service.
- Rate limits:
  - a general API ceiling;
  - a login limiter that ignores successful sign-ins;
  - a separate registration limiter that counts every attempt;
  - a per-user or per-IP AI limiter.
- `TRUST_PROXY` makes rate limits see the real client IP behind Render's proxy.
- Error responses never include stack traces or driver messages. Only messages written for clients are shown.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run seed:demo` | Wipes products, supplier accounts and everything that references them, then seeds demo suppliers and products. Needs `SEED_DEMO_PASSWORD`. |
| `npm run seed:supplier` | Adds a fixed set of products to one supplier account without deleting anything. Needs `SEED_DEMO_PASSWORD` if it has to create the account. |
| `npm run migrate:images` | Moves legacy `/uploads` images into GridFS. |
| `npm run model:download` | Downloads the local embedding model into `server/.models` (deploy build step). |
| `npm run backfill:embeddings` | Embeds products that have no vector. `-- --all` re-embeds everything; `-- --dry-run` lists them. |
| `npm run eval:assistant` | Retrieval evaluation against `server/eval/questions.json`. |
| `node src/scripts/removeMoq.js` | One-off: clears the MOQ on a fixed list of products. |
