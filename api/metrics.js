// Vercel serverless function - /api/metrics
// Returns live-computed inference metrics (changes every request)

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const now = Date.now();
  const seed = Math.floor(now / 3000); // changes every 3 seconds

  // Pseudo-random but realistic variation
  function rand(base, range, s) {
    return +(base + (Math.sin(seed * 7 + s) * range * 0.5 + Math.cos(seed * 3 + s) * range * 0.5)).toFixed(2);
  }

  const models = [
    { id: 'llama-3-8b',   name: 'Llama 3 8B',    provider: 'Meta' },
    { id: 'mistral-7b',   name: 'Mistral 7B',    provider: 'Mistral AI' },
    { id: 'gemma-9b',     name: 'Gemma 9B',      provider: 'Google' },
    { id: 'qwen2-7b',     name: 'Qwen2 7B',      provider: 'Alibaba' },
  ];

  const modelStats = models.map((m, i) => ({
    ...m,
    tokensPerSec:  rand(85 + i * 12,  25, i),
    latencyMs:     rand(120 - i * 8,  30, i + 1),
    requestsPerMin: Math.floor(rand(140 + i * 20, 40, i + 2)),
    gpuUtil:       rand(72 + i * 4,   10, i + 3),
    memUsedGb:     rand(6.2 + i * 0.8, 1, i + 4),
    errorRate:     rand(0.4 - i * 0.05, 0.3, i + 5),
    status:        'online',
  }));

  // Last 10 minutes of throughput history (one point per minute)
  const history = Array.from({ length: 10 }, (_, i) => {
    const t = new Date(now - (9 - i) * 60000);
    return {
      time: t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      throughput: Math.floor(rand(520, 120, i * 10)),
      latency:    Math.floor(rand(130, 35, i * 10 + 1)),
    };
  });

  res.status(200).json({
    timestamp: new Date().toISOString(),
    summary: {
      totalRequests:   modelStats.reduce((s, m) => s + m.requestsPerMin, 0),
      avgLatencyMs:    +(modelStats.reduce((s, m) => s + m.latencyMs, 0) / modelStats.length).toFixed(1),
      avgThroughput:   +(modelStats.reduce((s, m) => s + m.tokensPerSec, 0) / modelStats.length).toFixed(1),
      activeModels:    modelStats.length,
    },
    models: modelStats,
    history,
  });
}
