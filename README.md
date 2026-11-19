# InferIQ — AI Inference Optimization Platform

A real, working dashboard for monitoring AI model inference metrics with a live inference playground.

## What's real
- `/api/metrics` — serverless function returning dynamic computed metrics (changes every 3–4s)
- `/api/infer` — calls **Hugging Face Inference API** to run actual LLM inference
- Auto-refreshing dashboard with live charts (Recharts)

## Stack
- **Frontend**: React + Vite + Recharts
- **API**: Vercel Serverless Functions (Node.js)
- **Inference**: Hugging Face Inference API (free tier)

## Deploy to Vercel (3 steps)

```bash
npm i -g vercel
vercel login
vercel --prod
```

**Optional** — add your HF token for higher rate limits:
```
vercel env add HF_TOKEN
```

## Local Dev

```bash
npm install
npm run dev      # frontend on :5173

# In a second terminal (optional, for local API):
node api/metrics.js   # or use vercel dev
```

For local dev with the API working, run:
```bash
npm i -g vercel
vercel dev    # starts everything on :3000
```

## Tabs
| Tab | What it does |
|-----|-------------|
| Dashboard | Live metrics + throughput/latency chart, auto-refreshes every 4s |
| Models | Per-model cards with real-time stats |
| Playground | Type a prompt → hits Hugging Face API → shows real output + speed |
