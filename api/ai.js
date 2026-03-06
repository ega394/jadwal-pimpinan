// api/ai.js — Vercel Serverless Function
// Menggunakan Google Gemini 1.5 Flash (GRATIS: 1500 request/hari, 15 req/menit)
// Cara dapat API key GRATIS: aistudio.google.com → Get API Key

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY belum diset. Buka Vercel -> Project -> Settings -> Environment Variables -> tambahkan GEMINI_API_KEY. Dapatkan key gratis di: aistudio.google.com"
    });
  }

  try {
    const body = req.body;
    if (!body || !body.messages) {
      return res.status(400).json({ error: "Request tidak valid" });
    }

    // Ambil konten dari format Anthropic yang dikirim frontend
    const userMsg = body.messages[0];
    const contentArr = Array.isArray(userMsg.content)
      ? userMsg.content
      : [{ type: "text", text: userMsg.content }];

    // Konversi ke format Gemini
    const parts = [];
    for (const block of contentArr) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      } else if (block.type === "image") {
        parts.push({
          inline_data: {
            mime_type: block.source.media_type,
            data: block.source.data,
          },
        });
      } else if (block.type === "document") {
        // Gemini mendukung PDF via inline_data
        parts.push({
          inline_data: {
            mime_type: "application/pdf",
            data: block.source.data,
          },
        });
      }
    }

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
      },
    };

    // Panggil Gemini 1.5 Flash (gratis)
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data && data.error && data.error.message
        ? data.error.message
        : "Gemini API error " + response.status;
      if (response.status === 429) {
        return res.status(429).json({ error: "Batas request gratis tercapai. Coba lagi dalam 1 menit." });
      }
      if (response.status === 400 && errMsg.includes("API_KEY")) {
        return res.status(401).json({ error: "GEMINI_API_KEY tidak valid. Periksa kembali key di Vercel." });
      }
      return res.status(response.status).json({ error: errMsg });
    }

    // Ambil teks dari respons Gemini
    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
        ? data.candidates[0].content.parts[0].text
        : "";

    if (!text) {
      return res.status(500).json({ error: "Gemini tidak mengembalikan teks. Coba upload gambar yang lebih jelas." });
    }

    // Kembalikan dalam format yang sama dengan Anthropic agar frontend tidak perlu diubah
    return res.status(200).json({
      content: [{ type: "text", text }],
    });

  } catch (err) {
    return res.status(500).json({ error: "Server error: " + err.message });
  }
}
