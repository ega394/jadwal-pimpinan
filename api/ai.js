export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY belum diset di Vercel Environment Variables."
    });
  }

  try {
    const { messages } = req.body;
    const contentArr = Array.isArray(messages[0].content)
      ? messages[0].content
      : [{ type: "text", text: messages[0].content }];

    const parts = contentArr.map(block => {
      if (block.type === "text") return { text: block.text };
      if (block.type === "image") return { inline_data: { mime_type: block.source.media_type, data: block.source.data } };
      if (block.type === "document") return { inline_data: { mime_type: "application/pdf", data: block.source.data } };
      return null;
    }).filter(Boolean);

    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
        })
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      const msg = data?.error?.message || ("Gemini error " + resp.status);
      return res.status(resp.status).json({ error: msg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return res.status(500).json({ error: "Gemini tidak mengembalikan teks." });

    return res.status(200).json({ content: [{ type: "text", text }] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
