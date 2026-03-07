import https from "https";

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, body: { error: raw } }); }
      });
    });
    req.on("error", reject);
    req.write(data);
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

function normalizeModelName(rawName) {
  if (!rawName || typeof rawName !== "string") return null;
  const parts = rawName.split("/");
  return parts[parts.length - 1];
}

function findModelForMethod(models, methodName) {
  if (!Array.isArray(models)) return null;
  for (const m of models) {
    if (m && Array.isArray(m.supportedMethods) && m.supportedMethods.includes(methodName)) return m;
  }
  for (const m of models) {
    try {
      const s = JSON.stringify(m).toLowerCase();
      if (s.includes(methodName.toLowerCase())) return m;
    } catch (e) {}
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY belum diset di Vercel Environment Variables." });

  const body = await readBody(req);
  const messages = body.messages || [];
  if (!messages.length) return res.status(400).json({ error: "Request tidak valid." });

  const contentArr = Array.isArray(messages[0].content)
    ? messages[0].content
    : [{ type: "text", text: String(messages[0].content || "") }];

  const parts = [];
  for (const block of contentArr) {
    if (block.type === "text") parts.push({ text: block.text });
    else if ((block.type === "image" || block.type === "document") && block.source) {
      parts.push({ inline_data: { mime_type: block.source.media_type, data: block.source.data } });
    }
  }

  if (!parts.length) return res.status(400).json({ error: "Tidak ada konten untuk diproses." });

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResult = await httpsGet(listUrl);

    console.log("ListModels response status:", listResult.status);
    console.log("ListModels body:", JSON.stringify(listResult.body));

    if (listResult.status !== 200) {
      return res.status(500).json({ error: "Gagal memanggil ListModels." });
    }

    const models = Array.isArray(listResult.body.models) ? listResult.body.models : listResult.body.models || listResult.body;
    const modelForGenerateContent = findModelForMethod(models, "generateContent");
    const modelForGenerateText = findModelForMethod(models, "generateText");

    let chosenModel = null;
    let chosenMethod = null;

    if (modelForGenerateContent) { chosenModel = modelForGenerateContent; chosenMethod = "generateContent"; }
    else if (modelForGenerateText) { chosenModel = modelForGenerateText; chosenMethod = "generateText"; }
    else {
      const fallback = (Array.isArray(models) ? models.find(m => m.name && m.name.toLowerCase().includes("gemini")) : null);
      if (fallback) { chosenModel = fallback; chosenMethod = "generateContent"; }
    }

    if (!chosenModel || !chosenModel.name) {
      return res.status(500).json({ error: "Tidak menemukan model yang sesuai. Periksa ListModels di log." });
    }

    const rawModelName = chosenModel.name;
    const modelId = normalizeModelName(rawModelName);
    if (!modelId) return res.status(500).json({ error: "Nama model tidak valid: " + String(rawModelName) });

    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}`;
    const geminiUrl = `${baseUrl}:${chosenMethod}?key=${apiKey}`;

    console.log("Chosen model raw name:", rawModelName);
    console.log("Using model id:", modelId);
    console.log("Chosen method:", chosenMethod);
    console.log("Gemini URL:", geminiUrl);

    let result;
    if (chosenMethod === "generateContent") {
      result = await httpsPost(geminiUrl, {
        contents: [{ parts: parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
      });
    } else {
      const combinedText = parts.map(p => p.text || "").join("\n\n").trim();
      const payload = { prompt: { text: combinedText }, temperature: 0.1, maxOutputTokens: 1000 };
      result = await httpsPost(geminiUrl, payload);
    }

    console.log("Generate response status:", result && result.status);
    console.log("Generate response body:", JSON.stringify(result && result.body));

    if (!result || result.status !== 200) {
      const msg = result && result.body && result.body.error && result.body.error.message
        ? String(result.body.error.message)
        : "Gemini error " + (result ? result.status : "no response");
      return res.status(result ? result.status : 500).json({ error: msg });
    }

    let text = "";
    if (result.body && result.body.candidates && result.body.candidates[0] && result.body.candidates[0].content && result.body.candidates[0].content.parts) {
      const p = result.body.candidates[0].content.parts[0];
      if (p && p.text) text = String(p.text);
    }
    if (!text && result.body && typeof result.body.output_text === "string") text = result.body.output_text;
    if (!text && result.body && result.body.candidates && result.body.candidates[0]) {
      const cand = result.body.candidates[0];
      if (cand.output) text = String(cand.output);
      else if (cand.text) text = String(cand.text);
    }
    if (!text) text = JSON.stringify(result.body).slice(0, 2000);

    return res.status(200).json({ content: [{ type: "text", text: text }] });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Gagal memproses permintaan: " + String(err.message || err) });
  }
}
