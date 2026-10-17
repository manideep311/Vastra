# Vastra client

React single-page app for the Vastra marketplace: the buyer storefront, the supplier dashboard and the Vastra Assistant chat widget. See the [root README](../README.md) for the full project.

## Stack

React 19, Vite 8, React Router 7, Tailwind CSS 4, Axios, Heroicons. Linting uses [oxlint](https://oxc.rs).

## Run locally

```bash
cp .env.example .env.local   # set VITE_API_URL if the API isn't on http://localhost:5000
npm install
npm run dev                  # http://localhost:5173
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | oxlint over `src/` |

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the API, e.g. `https://your-api.onrender.com`. Defaults to `http://localhost:5000`. |

## Layout

```
src/
├── components/   shared UI: layouts, navbar, product cards and rows, chat widget, route guards
├── context/      buyer and supplier auth contexts (separate sessions), wishlist
├── features/
│   ├── auth/      buyer and supplier sign-in, registration
│   ├── buyer/     home, catalog, product page, supplier storefront, cart, checkout, orders, quotes, wishlist, onboarding
│   ├── supplier/  dashboard, inventory, product form, orders, quotes, profile, onboarding
│   └── marketing/ landing page
├── hooks/        shared hooks (product actions, debouncing, slow-loading indicator)
├── services/     one module per API resource; apiClient.js picks the buyer or supplier token
└── utils/        pricing, units, config, error messages
```

Buyer and supplier sessions are stored separately, so one browser can be signed in as both. Requests from pages under `/supplier` use the supplier token; everything else uses the buyer token unless a service pins the role explicitly.
