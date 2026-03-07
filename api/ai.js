import https from "https";

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
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

function findModelForMethod(models, methodName) {
  if (!Array.isArray(models)) return null;
  // Prefer models whose supportedMethods explicitly include methodName
  for (const m of models) {
    if (m && Array.isArray(m.supportedMethods) && m.supportedMethods.includes(methodName)) return m;
  }
  // Fallback: try to detect methodName in any stringified field (loose)
  for (const m of models) {
    try {
      const s = JSON.stringify(m).toLowerCase();
      if (s.includes(methodName.toLowerCase())) return m;
    } catch (e) { /* ignore */ }
  }
  return null;
}

export default async function handler(req, res) {
  // CORS
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

  const body = await readBody(req);
  const messages = body.messages || [];
  if (!messages.length) {
    return res.status(400).json({ error: "Request tidak valid." });
  }

  // Prepare content parts (sama seperti implementasi awal)
  const contentArr = Array.isArray(messages[0].content)
    ? messages[0].content
    : [{ type: "text", text: String(messages[0].content || "") }];

  const parts = [];
  for (const block of contentArr) {
    if (block.type === "text") {
      parts.push({ text: block.text });
    } else if ((block.type === "image" || block.type === "document") && block.source) {
      parts.push({ inline_data: { mime_type: block.source.media_type, data: block.source.data } });
    }
  }

  if (!parts.length) {
    return res.status(400).json({ error: "Tidak ada konten untuk diproses." });
  }

  try {
    // 1) Panggil ListModels untuk mengetahui model dan metode yang tersedia
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResult = await httpsGet(listUrl);

    if (listResult.status !== 200) {
      return res.status(500).json({
        error: "Gagal memanggil ListModels: " + (listResult.body && listResult.body.error ? String(listResult.body.error) : String(listResult.body))
      });
    }

    const models = Array.isArray(listResult.body.models) ? listResult.body.models : listResult.body.models || listResult.body;

    // 2) Cari model yang mendukung generateContent terlebih dahulu
    const modelForGenerateContent = findModelForMethod(models, "generateContent");
    const modelForGenerateText = findModelForMethod(models, "generateText");

    let chosenModel = null;
    let chosenMethod = null;

    if (modelForGenerateContent) {
      chosenModel = modelForGenerateContent;
      chosenMethod = "generateContent";
    } else if (modelForGenerateText) {
      chosenModel = modelForGenerateText;
      chosenMethod = "generateText";
    } else {
      // Jika tidak ada model yang jelas mendukung kedua metode, coba cari model bernama gemini-*
      const fallback = (Array.isArray(models) ? models.find(m => m.name && m.name.toLowerCase().includes("gemini")) : null);
      if (fallback) {
        chosenModel = fallback;
        // coba asumsi generateContent dulu
        chosenMethod = "generateContent";
      }
    }

    if (!chosenModel || !chosenModel.name) {
      return res.status(500).json({
        error: "Tidak menemukan model yang mendukung generateContent atau generateText. Periksa ListModels."
      });
    }

    const modelName = chosenModel.name;
    // 3) Bangun endpoint sesuai metode yang dipilih
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}`;
    let geminiUrl = `${baseUrl}:${chosenMethod}?key=${apiKey}`;

    // 4) Siapkan payload sesuai metode
    let result;
    if (chosenMethod === "generateContent") {
      result = await httpsPost(geminiUrl, {
        contents: [{ parts: parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1000 },
      });
    } else {
      // generateText: kita gabungkan teks dari parts sebagai fallback prompt
      const combinedText = parts.map(p => p.text || "").join("\n\n").trim();
      // body shape untuk generateText bisa berbeda antar versi; kita kirim bentuk umum
      const payload = {
        prompt: { text: combinedText },
        temperature: 0.1,
        maxOutputTokens: 1000,
      };
      result = await httpsPost(geminiUrl, payload);
    }

    if (!result || result.status !== 200) {
      const msg = result && result.body && result.body.error && result.body.error.message
        ? String(result.body.error.message)
        : "Gemini error " + (result ? result.status : "no response");
      return res.status(result ? result.status : 500).json({ error: msg });
    }

    // 5) Ambil teks dari respons (coba beberapa kemungkinan struktur respons)
    let text = "";

    try {
      // Struktur untuk generateContent (seperti sebelumnya)
      if (result.body && result.body.candidates && result.body.candidates[0] && result.body.candidates[0].content && result.body.candidates[0].content.parts) {
        const p = result.body.candidates[0].content.parts[0];
        if (p && p.text) text = String(p.text);
      }

      // Struktur alternatif: result.body.output_text atau result.body.output
      if (!text && result.body && typeof result.body.output_text === "string") {
        text = result.body.output_text;
      }

      // Struktur lain: candidates[0].output atau candidates[0].text
      if (!text && result.body && result.body.candidates && result.body.candidates[0]) {
        const cand = result.body.candidates[0];
        if (cand.output) text = String(cand.output);
        else if (cand.text) text = String(cand.text);
      }

      // Jika masih kosong, coba stringify body untuk debugging ringan
      if (!text) {
        // jika body punya field yang tampak seperti teks, ambil yang paling mungkin
        const bodyStr = JSON.stringify(result.body || {});
        text = bodyStr.slice(0, 2000); // batasi panjang
      }
    } catch (e) {
      // ignore parsing error
      text = "";
    }

    if (!text) {
      return res.status(500).json({ error: "Gemini tidak menghasilkan teks yang dapat diparsing." });
    }

    return res.status(200).json({ content: [{ type: "text", text: text }] });

  } catch (err) {
    return res.status(500).json({ error: "Gagal memproses permintaan: " + String(err.message || err) });
  }
}
