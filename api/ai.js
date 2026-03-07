const https = require("https");
const { guard } = require("./_middleware");

// Model gratis dengan vision, diurutkan dari yang paling prioritas
// Jika model pertama gagal/tidak tersedia, otomatis coba berikutnya
const FREE_VISION_MODELS = [
  "meta-llama/llama-4-maverick:free",      // Meta Llama 4, vision, aktif 2026
  "meta-llama/llama-4-scout:free",         // Llama 4 Scout, lebih ringan
  "google/gemma-3-27b-it:free",            // Google Gemma 3, vision
  "openrouter/auto",                        // OpenRouter auto-pilih model tersedia
];

function httpsPost(url, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data, "utf8"),
        ...extraHeaders,
      },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => { chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); });
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, body: { error: "Parse failed: " + raw.slice(0, 400) } }); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(data, "utf8");
    req.end();
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk.toString(); });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch (e) { resolve({}); }
    });
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  // Rate limit: 10 analisa per menit per IP
  const g = guard(req, res, { requireSecret: false, maxPerMin: 10 });
  if (g) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY belum diset di Vercel Environment Variables."
    });
  }

  const body = await readBody(req);
  const messages = body.messages || [];
  if (!messages.length) return res.status(400).json({ error: "Request tidak valid." });

  // Bangun content untuk OpenRouter (format OpenAI-compatible)
  const contentArr = Array.isArray(messages[0].content)
    ? messages[0].content
    : [{ type: "text", text: String(messages[0].content || "") }];

  const openrouterContent = [];
  for (const block of contentArr) {
    if (block.type === "text") {
      openrouterContent.push({ type: "text", text: block.text });
    } else if ((block.type === "image" || block.type === "document") && block.source) {
      openrouterContent.push({
        type: "image_url",
        image_url: {
          url: "data:" + block.source.media_type + ";base64," + block.source.data
        }
      });
    }
  }

  if (!openrouterContent.length) {
    return res.status(400).json({ error: "Tidak ada konten untuk diproses." });
  }

  const orHeaders = {
    "Authorization": "Bearer " + apiKey,
    "HTTP-Referer": "https://prokopim.tarakankota.go.id",
    "X-Title": "Prokopim Tarakan",
  };

  // Coba tiap model secara berurutan hingga berhasil
  let lastError = "Semua model tidak tersedia saat ini.";

  for (const model of FREE_VISION_MODELS) {
    try {
      const result = await httpsPost(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages: [{ role: "user", content: openrouterContent }],
          max_tokens: 4096,
          temperature: 0.1,
        },
        orHeaders
      );

      // Lanjut ke model berikutnya jika endpoint tidak tersedia
      if (result.status === 503 || result.status === 404 ||
          (result.body?.error?.message || "").toLowerCase().includes("no endpoints")) {
        lastError = `[${model}] tidak tersedia`;
        continue;
      }

      if (result.status !== 200) {
        lastError = result.body?.error?.message || `Error ${result.status} dari ${model}`;
        continue;
      }

      const text = result.body?.choices?.[0]?.message?.content || "";
      if (!text) {
        lastError = `[${model}] tidak menghasilkan teks`;
        continue;
      }

      // Berhasil — kembalikan hasil + info model yang dipakai
      return res.status(200).json({
        content: [{ type: "text", text }],
        model_used: model,
      });

    } catch (err) {
      lastError = `[${model}] error: ${err.message}`;
      continue;
    }
  }

  // Semua model gagal
  return res.status(503).json({ error: lastError });
};
