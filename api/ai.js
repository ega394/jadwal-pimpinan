module.exports = async function handler(req, res) {
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
      error: "GEMINI_API_KEY belum diset di Vercel Environment Variables."
    });
  }

  let body = req.body;

  // Kalau body masih string atau undefined, parse manual
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch (e) {
      body = {};
    }
  }

  const messages = body.messages || [];
  if (!messages.length) {
    return res.status(400).json({ error: "Request tidak valid." });
  }

  const contentArr = Array.isArray(messages[0].content)
    ? messages[0].content
    : [{ type: "text", text: String(messages[0].content || "") }];

  const parts = [];
  for (const block of contentArr) {
    if (block.type === "text") {
      parts.push({ text: block.text });
    } else if ((block.type === "image" || block.type === "document") && block.source) {
      parts.push({
        inline_data: {
          mime_type: block.source.media_type,
          data: block.source.data
        }
      });
    }
  }

  if (!parts.length) {
    return res.status(400).json({ error: "Tidak ada konten untuk diproses." });
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const msg = (data && data.error && data.error.message)
        ? String(data.error.message)
        : "Gemini error " + response.status;
      return res.status(response.status).json({ error: msg });
    }

    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
        ? String(data.candidates[0].content.parts[0].text)
        : "";

    if (!text) {
      return res.status(500).json({ error: "Gemini tidak menghasilkan teks." });
    }

    return res.status(200).json({ content: [{ type: "text", text: text }] });

  } catch (err) {
    return res.status(500).json({ error: "Fetch gagal: " + String(err.message || err) });
  }
};
