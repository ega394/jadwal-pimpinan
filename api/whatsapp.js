// api/whatsapp.js — Vercel Serverless Function
// Kirim notifikasi WhatsApp via Meta Cloud API (GRATIS s/d 1000 pesan/bulan)
const https = require("https");
const { guard } = require("./_middleware");

function httpsPost(url, body, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token,
        "Content-Length": Buffer.byteLength(data, "utf8"),
      },
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { resolve({ status: res.statusCode, body: { raw } }); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(data, "utf8");
    req.end();
  });
}

module.exports = async (req, res) => {
  // CORS
  // Rate limit: 60 notif per menit per IP
  const g = guard(req, res, { requireSecret: true, maxPerMin: 60 });
  if (g) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const WA_TOKEN   = process.env.WA_TOKEN;      // Meta API Token
  const WA_PHONE_ID = process.env.WA_PHONE_ID;  // Phone Number ID

  if (!WA_TOKEN || !WA_PHONE_ID) {
    return res.status(500).json({ error: "WA_TOKEN / WA_PHONE_ID belum diset di Vercel" });
  }

  const { to, namaAcara, tanggal, jam, penyelenggara, lokasi, event: evType, catatanTolak, submittedBy } = req.body;

  if (!to || !namaAcara) {
    return res.status(400).json({ error: "Parameter tidak lengkap" });
  }

  // Format nomor: hilangkan +, 0 awal → 62
  const phone = String(to).replace(/\D/g, "").replace(/^0/, "62");

  // Bangun pesan sesuai jenis event
  const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const tglFmt = tanggal
    ? HARI[new Date(tanggal + "T00:00:00").getDay()] + ", " +
      new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })
    : "-";

  let pesan = "";
  const header = "🏛️ *PROKOPIM KOTA TARAKAN*\n";

  if (evType === "submit") {
    pesan = header +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "📋 *Jadwal Baru Masuk*\n\n" +
      `📌 *${namaAcara}*\n` +
      `📅 ${tglFmt}\n` +
      `⏰ ${jam} WITA\n` +
      `🏢 ${penyelenggara}\n` +
      (lokasi ? `📍 ${lokasi}\n` : "") +
      `👤 Diajukan oleh: ${submittedBy || "-"}\n\n` +
      "Silakan buka aplikasi untuk memverifikasi.\n" +
      "➡️ https://prokopim.tarakankota.go.id";
  } else if (evType === "kasubbag_approve") {
    pesan = header +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "✅ *Jadwal Diteruskan ke Kabag*\n\n" +
      `📌 *${namaAcara}*\n` +
      `📅 ${tglFmt} — ${jam} WITA\n` +
      `🏢 ${penyelenggara}\n\n` +
      "Menunggu persetujuan Anda.\n" +
      "➡️ https://prokopim.tarakankota.go.id";
  } else if (evType === "approved") {
    pesan = header +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "✅ *Jadwal Disetujui & Dipublikasi*\n\n" +
      `📌 *${namaAcara}*\n` +
      `📅 ${tglFmt} — ${jam} WITA\n` +
      `🏢 ${penyelenggara}\n` +
      (lokasi ? `📍 ${lokasi}\n` : "") +
      "\nJadwal sudah tayang di Agenda Pimpinan.\n" +
      "➡️ https://prokopim.tarakankota.go.id";
  } else if (evType === "rejected") {
    pesan = header +
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "❌ *Jadwal Dikembalikan*\n\n" +
      `📌 *${namaAcara}*\n` +
      `📅 ${tglFmt} — ${jam} WITA\n\n` +
      `💬 Catatan: _${catatanTolak || "Perlu diperbaiki"}_\n\n` +
      "Silakan edit dan kirim ulang.\n" +
      "➡️ https://prokopim.tarakankota.go.id";
  } else {
    pesan = header + `📢 ${namaAcara} — ${tglFmt}`;
  }

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { preview_url: false, body: pesan },
  };

  try {
    const result = await httpsPost(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      payload,
      WA_TOKEN
    );
    if (result.status === 200) {
      return res.status(200).json({ ok: true, messageId: result.body?.messages?.[0]?.id });
    } else {
      return res.status(result.status).json({ error: result.body });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
