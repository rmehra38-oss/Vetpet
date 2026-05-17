# Vetpet Full-Stack App

Vetpet is a lightweight full-stack pet care storefront built with Node.js and browser-native HTML, CSS, and JavaScript. It includes:

- A responsive storefront UI.
- Backend APIs for health, products, services, redirects, and order creation.
- A server-backed `/go/:destination` redirect route so navigation and call-to-action links reliably reach their intended sections or support destination.
- Automated tests using Node's built-in test runner.

## Run locally

```bash
npm start
```

Open <http://localhost:3000>.

## Test

```bash
npm test
```

## Deploy to Vercel

The repository includes `vercel.json`, which serves the static files from `public/` and rewrites `/api/*` plus `/go/*` traffic to the Node serverless handler in `api/index.js`.

```bash
vercel --prod
```

## Redirect destinations

The app exposes these fixed redirect slugs:

| Slug | Destination |
| --- | --- |
| `shop` | `/#shop` |
| `services` | `/#services` |
| `appointment` | `/#appointment` |
| `support` | `mailto:care@vetpet.example?subject=Vetpet%20support` |

Use `/api/redirects` to inspect the configured destinations from the frontend or monitoring tools.
