// api/ai.js — Vercel Serverless Function
// Proxy untuk Anthropic API agar tidak terkena CORS di browser
// File ini harus diletakkan di folder: api/ai.js (root repositori GitHub)

export default async function handler(req, res) {
  // Hanya izinkan POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Ambil API key dari environment variable Vercel
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY belum diset di Vercel Environment Variables. Buka Vercel > Project > Settings > Environment Variables dan tambahkan ANTHROPIC_API_KEY."
    });
  }

  try {
    const body = req.body;

    // Validasi body
    if (!body || !body.messages || !body.model) {
      return res.status(400).json({ error: "Request body tidak valid" });
    }

    // Panggil Anthropic API dari server (tidak kena CORS)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 1000,
        messages: body.messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Anthropic API error: " + response.status,
      });
    }

    // Set CORS headers agar aman
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Server error: " + err.message,
    });
  }
}
