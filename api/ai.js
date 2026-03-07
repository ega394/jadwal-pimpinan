export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY belum diset di Vercel"
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const messages = body.messages || [];

    if (!messages.length) {
      return res.status(400).json({
        error: "Request tidak valid: messages kosong"
      });
    }

    const contentArr = Array.isArray(messages[0].content)
      ? messages[0].content
      : [{ type: "text", text: String(messages[0].content || "") }];

    const parts = [];

    for (const block of contentArr) {
      if (block.type === "text") {
        parts.push({ text: block.text });
      }

      if (block.type === "image" && block.source) {
        parts.push({
          inline_data: {
            mime_type: block.source.media_type,
            data: block.source.data
          }
        });
      }

      if (block.type === "document" && block.source) {
        parts.push({
          inline_data: {
            mime_type: "application/pdf",
            data: block.source.data
          }
        });
      }
    }

    if (!parts.length) {
      return res.status(400).json({
        error: "Tidak ada konten yang bisa diproses"
      });
    }

    const geminiResp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
        apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const geminiData = await geminiResp.json();

    if (!geminiResp.ok) {
      const errMsg =
        geminiData &&
        geminiData.error &&
        geminiData.error.message
          ? String(geminiData.error.message)
          : "Gemini API error " + geminiResp.status;

      return res.status(geminiResp.status).json({
        error: errMsg
      });
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      return res.status(500).json({
        error: "Gemini tidak menghasilkan teks"
      });
    }

    return res.status(200).json({
      content: [{ type: "text", text }]
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error: " + String(err.message || err)
    });
  }
}