# AeroOps Dashboard

Next.js 14 dashboard for **live HVAC / duct inspection telemetry**, 3D point-cloud map (PLY), multi-layer field views, and **Ops AI** (Google Gemini) with server-side API key.

## Stack

- **Next.js** (App Router), TypeScript, Tailwind CSS  
- **Zustand** for telemetry / map / UI state  
- **React Three Fiber** + **Drei** for the center viewport  
- **Recharts** sparklines (client-only)  
- **Air-Audit** backend via same-origin proxy: `/api/air-audit/*`  
- **Gemini** via `/api/ai/chat` (key in `.env.local` only)

## Quick start

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local: API base URL, optional GEMINI_API_KEY, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See **[`.env.local.example`](.env.local.example)** for all options. Common entries:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_AIR_AUDIT_API_BASE` | FastAPI / Air-Audit base URL (client polls through Next proxy) |
| `GEMINI_API_KEY` | Google AI Studio key for Ops AI (**never commit**; `.env*.local` is gitignored) |
| `GEMINI_MODEL` | Optional; server tries several model ids if unset |
| `NEXT_PUBLIC_SKIP_SHADER_INTRO` | Set to `1` to skip the WebGL AeroOps splash and open the dashboard immediately |

**Do not** commit `.env.local` or paste API keys into the repo.

## Scripts

```bash
npm run dev    # development
npm run build  # production build
npm run start  # run production build
npm run lint
```

## Repository

Remote: **https://github.com/Akrishh06/AeroOps-Dashboard**

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
