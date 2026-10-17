# Vastra

[![CI](https://github.com/manideep311/Vastra/actions/workflows/ci.yml/badge.svg)](https://github.com/manideep311/Vastra/actions/workflows/ci.yml)

Vastra is a B2B textile marketplace. Buyers (boutiques, garment makers, retailers) can source fabric straight from Indian mills and wholesalers. A retrieval-grounded AI assistant answers questions using the live product catalog. Built with React, Express and MongoDB, with Hugging Face models for embeddings and chat.

**Live demo:** https://vastra-311.vercel.app

The API runs on Render's free tier, so the first request after a quiet period can take a while as the server wakes up.

## Screenshots

[TODO: owner]

## Features

### For buyers

- **Browse without an account.** The catalog offers keyword search, category filters and sorting, plus an **AI search** mode that ranks fabrics by meaning (for example, "breathable fabric for summer kurtas").
- **Product pages** show specs, minimum order quantity, bulk price tiers, stock, buyer reviews, similar fabrics found through embeddings, and a link to the supplier's storefront.
- **The cart** enforces each product's minimum order and available stock. A guest cart is merged into the account cart when the buyer signs in.
- **Checkout** reprices everything on the server, reserves stock atomically and creates one order per supplier. No payment is taken in the app; suppliers arrange invoicing directly.
- **Bulk quote requests:** ask a supplier for a price on a large quantity. Accepting the offer puts it in the cart at the negotiated price.
- **Account pages:** order tracking, wishlist, notifications, and reviews (open once an order is completed).
- **Personalised recommendations:** after a short onboarding questionnaire, the home page shows fabrics matched to the buyer's business.
- **Vastra Assistant:** a chat widget that answers questions about the catalog, grounded in real product data.

### For suppliers

- A dashboard with orders, revenue and stock alerts.
- **Inventory:** create and edit listings, upload images (stored as resized WebP variants), and set bulk price tiers. An AI helper suggests a category and tags.
- **Orders:** move each order through `pending → accepted → preparing → ready_for_dispatch → completed`.
- **Quotes:** answer bulk requests. **Suggest price & lead time** fills in an AI suggestion that the supplier reviews before sending.
- A business profile that also powers a public storefront page at `/suppliers/:id`.

## How the assistant works

```mermaid
flowchart LR
    Q["Buyer question"] --> E["Embedding<br/>(Hugging Face, all-MiniLM-L6-v2)"]
    E --> S["Cosine similarity over<br/>product vectors stored in MongoDB"]
    S --> T["Top 5 products"]
    T --> L["LLM via Hugging Face router<br/>(products passed as delimited context)"]
    L --> R["Grounded reply<br/>+ product cards"]
    E -.->|embedding service unavailable| K["Keyword fallback<br/>(MongoDB text search)"]
    K --> T
```

1. The buyer's latest message is turned into a vector with a sentence-embedding model.
2. That vector is compared against every product's stored vector with cosine similarity, and the 5 closest products are kept. If the embedding call fails, MongoDB text search supplies the products instead. When the chat is opened from a product page, that product is the context.
3. The products are sent to the chat model inside a `<catalog>` block in the user turn. The system prompt never changes, and it tells the model to answer only from that catalog and to treat it as data, not instructions.
4. The reply comes back with the referenced products, which the widget shows as cards.

The same vectors power AI search, similar products and recommendations. More detail is in [docs/architecture.md](docs/architecture.md).

## Tech stack

| Layer | Tools |
| --- | --- |
| Client | React 19, Vite 8, React Router 7, Tailwind CSS 4, Axios |
| Server | Node.js 22, Express 5, Mongoose 9, JWT (jsonwebtoken + bcryptjs), helmet, express-rate-limit, multer, sharp |
| Data | MongoDB Atlas (documents, product vectors, GridFS images) |
| AI | Hugging Face Inference: `sentence-transformers/all-MiniLM-L6-v2` embeddings and a chat model through the OpenAI-compatible router |
| Testing and CI | Jest, Supertest, mongodb-memory-server, oxlint, GitHub Actions |
| Hosting | Vercel (client), Render (API) |

## Running locally

You need Node.js 22+, a MongoDB connection string (Atlas or local) and, for the AI features, a Hugging Face access token.

```bash
git clone https://github.com/manideep311/Vastra.git
cd Vastra

# API
cd server
cp .env.example .env        # then fill in the values (see below)
npm install
npm run dev                 # http://localhost:5000

# Client (in a second terminal)
cd client
cp .env.example .env.local  # optional: only needed if the API isn't on localhost:5000
npm install
npm run dev                 # http://localhost:5173
```

The app runs without `HF_TOKEN`. In that case the AI features answer "temporarily unavailable" and search falls back to keywords.

## Environment variables

### Server (`server/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Secret for signing session tokens. The server refuses to start without it. |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `PORT` | no | API port, default `5000` |
| `NODE_ENV` | no | Set to `production` when deployed |
| `CLIENT_ORIGIN` | in production | Comma-separated CORS allow-list, e.g. `https://vastra-311.vercel.app`. Production refuses to start without it. |
| `TRUST_PROXY` | behind a proxy | Set to `1` on Render or behind one reverse proxy, so rate limits see the real client IP |
| `HF_TOKEN` | for AI | Hugging Face access token |
| `HF_CHAT_MODEL` | for AI | Chat model ID served by the Hugging Face router |
| `HF_EMBEDDING_MODEL` | for AI | Embedding model ID, e.g. `sentence-transformers/all-MiniLM-L6-v2` |
| `HF_EMBEDDING_DIM` | no | Expected vector length (384 for all-MiniLM-L6-v2). If unset, it's learned from the first response. |
| `SEED_DEMO_PASSWORD` | for seeding | Password for the demo supplier accounts created by the seed scripts. At least 8 characters. |

### Client (`client/.env.local`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL, default `http://localhost:5000` |

## Seed and maintenance scripts

Run these from `server/`:

| Command | What it does |
| --- | --- |
| `npm run seed:demo` | **Wipes** products, supplier accounts, carts, orders, quotes, reviews, wishlists and notifications, then seeds demo suppliers and products. Buyer accounts are kept. |
| `npm run seed:supplier` | Adds a fixed set of products to one supplier account without deleting anything. |
| `npm run backfill:embeddings` | Creates vectors for products saved while the embedding service was down (`-- --dry-run` to preview). |
| `npm run migrate:images` | Moves legacy disk uploads into MongoDB GridFS. |
| `npm run eval:assistant` | Measures retrieval quality (see below). |

## Tests

```bash
cd server && npm test
```

The API tests use Jest and Supertest against an in-memory MongoDB, with Hugging Face mocked. They cover:

- role isolation between buyer and supplier tokens;
- ownership checks on products and orders;
- cart MOQ and stock rules;
- server-side checkout pricing, including the concurrent-checkout race;
- AI fallbacks: keyword context when embeddings fail, 503 when the chat model is down, and products still saving without vectors.

GitHub Actions runs these tests, plus client lint and build, on every push and pull request.

### Assistant retrieval evaluation

`npm run eval:assistant` runs the questions in [`server/eval/questions.json`](server/eval/questions.json) through the same retrieval step the assistant uses. It reports:

- how many products have embeddings;
- average and p95 retrieval latency;
- hit@5: how often an expected product appears in the top 5.

The current file is a five-question starter set, so the numbers are indicative only.

| Metric | Result |
| --- | --- |
| Products with embeddings | [TODO: owner] |
| Retrieval latency (avg / p95) | [TODO: owner] |
| hit@5 | [TODO: owner] |

## Known limitations

- **Linear-scan retrieval.** Every product vector is held in memory and compared on each query. That is fine for a catalog of this size, but a larger catalog would need a vector index (for example, MongoDB Atlas Vector Search).
- **No similarity threshold.** Retrieval always returns the top 5, even when they're only loosely related. The prompt asks the model to say when nothing fits, but nothing filters weak matches beforehand.
- **Only the latest message drives retrieval.** Earlier turns are sent to the chat model (up to 10), but they don't influence which products are retrieved, so follow-ups like "a cheaper one" can pull in unrelated products.
- **Hosted inference dependency.** Embeddings and chat need Hugging Face credits. When the provider is unavailable, AI search falls back to keywords, the assistant reports that it's unavailable, and new products are saved without vectors until `backfill:embeddings` runs.
- **Single-instance design.** The vector index, embedding cache and rate-limit counters live in process memory.
- **Silent guest-cart merge.** Guest-cart items that fail a stock or MOQ check at sign-in are skipped without a message.
- **No payments.** Orders are placed without payment; suppliers handle invoicing outside the app.

## Project structure

```
client/   React SPA (see client/README.md)
server/   Express API, tests, evaluation set and scripts
docs/     architecture notes
```

## License

[MIT](LICENSE) © 2026 Manideep Chittimodu
