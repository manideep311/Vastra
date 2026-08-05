# Vastra — project overview

Vastra ("Where Tradition Meets Trade") is a B2B textile marketplace connecting fabric **buyers** (retailers, manufacturers, boutiques) with **suppliers** (mills, wholesalers, trading companies) across India. Buyers browse and order fabric by the meter/kg/unit; suppliers list inventory, quote bulk orders, and fulfill them.

## Tech stack

**Client** (`client/`)
- React 19 + Vite 8, React Router 7
- Tailwind CSS 4
- Axios for API calls
- Heroicons for iconography

**Server** (`server/`)
- Node.js + Express 5
- MongoDB via Mongoose 9 (hosted on MongoDB Atlas)
- JWT-based auth (`jsonwebtoken` + `bcryptjs`)
- Multer for image uploads
- Hugging Face inference API (via the `openai`-compatible client) for the AI features — chat model + embedding model, configured via `HF_CHAT_MODEL` / `HF_EMBEDDING_MODEL` in `.env`

## Repo layout

```
Vastra-main/
├── client/src/
│   ├── components/       shared UI: Navbar, BuyerLayout, SupplierLayout, ChatWidget, ProductCard, route guards...
│   ├── context/          BuyerAuthContext, SupplierAuthContext, WishlistContext
│   ├── features/
│   │   ├── auth/         Buyer/Supplier login pages, Register page
│   │   ├── buyer/        Discovery (Home), ProductsPage, ProductDetail, Cart, Checkout, Orders, Dashboard, Wishlist, Quotes, Onboarding
│   │   ├── supplier/     SupplierDashboard, Inventory, ProductForm, Orders, Quotes, Profile, Onboarding
│   │   └── marketing/    LandingPage
│   ├── services/         one file per API resource (apiClient.js is the shared axios instance)
│   └── utils/             config.js, units.js
└── server/src/
    ├── config/db.js       Mongoose connection
    ├── middleware/        auth guard, error handler
    ├── models/             Mongoose schemas
    ├── modules/<resource>/ controller + service + routes per resource (auth, products, cart, orders, suppliers, ai, quotes, wishlist, reviews, notifications, samples, categories, buyers)
    ├── routes/index.js     mounts every module under /api
    └── scripts/            one-off maintenance scripts (seedDemoProducts.js, removeMoq.js)
```

## Data model (MongoDB)

- **User** — email, password hash, `role` (`buyer` | `supplier`), onboarding flag.
- **Product** — name, category, price, `unit` (kg/meter/unit), `moq`, stock, status, images, colors, fabric specs (GSM, width, composition, lead time), `priceTiers`, rating aggregate, `embeddingVector` (for AI semantic search).
- **Cart** — one per buyer, line items snapshot price/quantity.
- **Order** — buyer + supplier refs, item snapshots, shipping info, status history (`pending → accepted → preparing → ready_for_dispatch → completed`).
- **Quote** — RFQ thread between a buyer and supplier for bulk pricing.
- **SampleRequest**, **Review**, **Wishlist**, **Notification**, **Category** — supporting features.
- **BuyerProfile** / **SupplierProfile** — onboarding details (business type, industry, preferred fabrics / product categories, MOQ policy, etc.).

## API surface (`/api/...`)

`auth`, `buyer`, `products`, `cart`, `orders`, `supplier` (authenticated supplier actions), `suppliers` (public directory), `ai`, `quotes`, `wishlist`, `reviews`, `notifications`, `samples`, `categories` — each is its own module with `*.routes.js` → `*.controller.js` → `*.service.js`.

## Buyer vs. supplier: fully isolated experiences

This was a major piece of work in this project: Buyer and Supplier are **two separate sessions**, not one shared login with a role flag.

- Separate React contexts — `BuyerAuthContext` / `SupplierAuthContext` — each with its own `localStorage` keys (`buyerToken`/`buyerProfile`/`buyerLoggedIn` vs `supplierToken`/`supplierProfile`/`supplierLoggedIn`). Logging into one never touches the other; logging out of one never affects the other.
- `apiClient.js` attaches whichever token matches the current route (`/supplier/*` → supplier token, everything else → buyer token).
- `RoleRoute` guards check only the relevant session and redirect to that role's own login.
- Navbar/BottomNav (buyer) and SupplierLayout's nav render from their own context only — a supplier session can never leak buyer nav items (email/profile/logout) and vice versa.

## Buyer flow

Landing page → "Explore Textile" → choose **Buyer** (continue as guest, no login) or **Supplier** (must sign in). Guests can browse Home, Products, and Cart; Checkout/Orders/Profile/Wishlist/Quotes require a buyer login. Guest cart is stored in `localStorage` and merged into the account cart on login.

- **Home** (`/home`) — hero, search, featured + full product grid.
- **Products** (`/products`) — dense list view: search/category/sort toolbar, one row per product with stock badge, MOQ/rating, price, wishlist + add-to-cart, "Load more" pagination.
- **Product detail** — gallery, live-priced quantity selector (unit-aware, respects MOQ), wishlist, bulk quote request, reviews, AI-suggested similar products.
- **Cart / Checkout / Orders / Dashboard / Wishlist / Quotes** — standard buyer account flows.

## Supplier flow

Supplier login is required up front (no guest browsing). After login: Dashboard, My Products (inventory CRUD + image upload + AI category/tag suggestion), Add/Edit Product, Orders (status updates), Quotes (respond to RFQs, AI-assisted price/lead-time suggestion), Profile.

## Minimum order quantity (MOQ)

`Product.moq` (default 1) is enforced everywhere quantity is set — product detail, cart quantity edits, and the cart API itself (defense in depth) — for both guests and logged-in buyers. `moq <= 1` means no minimum; a supplier just leaves it blank to remove it, or sets a number to make it a real floor. Quantities and toasts throughout the buyer flow are unit-aware ("Added 15 meters to cart", pluralized correctly for kg/meter/unit).

## AI features ("Vastra Assistant")

- **Chat widget** (buyer-facing) — Hugging Face chat model grounded in live product data via semantic search (embeddings + cosine similarity) or, when opened from a product page, that specific product. System prompt now proactively mentions MOQ, flags out-of-stock items with alternatives, asks a clarifying question on vague requests, and ends with a natural follow-up. Quick-prompt suggestion chips appear before the first message. Custom avatar illustration used in both the floating toggle and the panel header.
- **Similar products** on product detail (embedding similarity).
- **Product comparison** tool.
- **AI category/tag suggestion** for suppliers filling out the product form.
- **AI quote suggestion** — suggests a fair bulk price/lead-time when a supplier responds to an RFQ.
- **Personalized recommendations** based on a buyer's onboarding profile.

## Notable recent work in this session

1. Fixed Buyer/Supplier session isolation (previously shared auth state leaked buyer nav into supplier sessions and vice versa).
2. Split `/products` into its own dense list-view page, separate from the `/home` discovery page.
3. Made MOQ a real, enforced constraint (client + server) instead of decorative text; removed the unused bulk price-tier display.
4. Unit-aware quantity labels throughout cart/toasts.
5. Rebranded the assistant to "Vastra Assistant" with a custom avatar, added quick-prompt suggestions, improved its system prompt, and moved toast notifications off its corner of the screen.
6. Renamed the landing page CTA to "Explore Textile."

## Running it locally

```
# server
cd server && npm install && npm run dev      # http://localhost:5000

# client
cd client && npm install && npm run dev      # http://localhost:5173
```

Server needs a `.env` with `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `HF_TOKEN`, `HF_CHAT_MODEL`, `HF_EMBEDDING_MODEL`, `PORT`. Useful one-off script: `node src/scripts/seedDemoProducts.js` (wipes and reseeds demo suppliers/products).

## Known gaps worth knowing about

- No automated tests.
- Guest-cart-to-account merge on login silently drops any item that fails a MOQ check at merge time (logs to console only, no user-facing notice).
- `priceTiers` exists on the Product schema and factors into effective pricing, but suppliers have no UI to set it — currently only reachable via seed data.
