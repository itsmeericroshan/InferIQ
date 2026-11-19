// Vercel serverless function - /api/infer
// Real text inference via Hugging Face Inference API (free tier)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, model = 'gpt2' } = req.body || {};

  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  const HF_TOKEN = process.env.HF_TOKEN; // set in Vercel env vars

  const start = Date.now();

  try {
    const hfRes = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 200, temperature: 0.7 },
        }),
      }
    );

    const latencyMs = Date.now() - start;

    if (!hfRes.ok) {
      const err = await hfRes.text();
      return res.status(hfRes.status).json({ error: err });
    }

    const data = await hfRes.json();
    const generatedText = Array.isArray(data)
      ? data[0]?.generated_text || ''
      : data?.generated_text || '';

    const outputOnly = generatedText.startsWith(prompt)
      ? generatedText.slice(prompt.length).trim()
      : generatedText.trim();

    const tokens = outputOnly.split(/\s+/).length;

    return res.status(200).json({
      output: outputOnly,
      model,
      latencyMs,
      tokensGenerated: tokens,
      tokensPerSec: +(tokens / (latencyMs / 1000)).toFixed(2),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
