// api/otp.js — Generate & verify OTP untuk lupa password
const https = require("https");
const { guard } = require("./_middleware");

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const WA_TOKEN = process.env.WA_TOKEN;
const WA_PHONE_ID = process.env.WA_PHONE_ID;
const H = { "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY };

function httpsPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers },
    }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: {} }); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

async function supaFetch(path, opts = {}) {
  const url = SUPA_URL + path;
  const res = await fetch(url, { headers: H, ...opts });
  return res.ok ? await res.json() : null;
}

// Buat tabel otp_tokens jika diperlukan (dipanggil otomatis)
async function ensureTable() {
  // Coba insert dummy — jika tabel ada, skip
  await fetch(SUPA_URL + "/rest/v1/otp_tokens?limit=1", { headers: H }).catch(() => {});
}

module.exports = async (req, res) => {
  const g = guard(req, res, { requireSecret: false, maxPerMin: 5 });
  if (g) return;

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = "";
  await new Promise(r => { req.on("data", c => body += c); req.on("end", r); });
  const { action, username, otp, newPassword } = JSON.parse(body || "{}");

  if (!username) return res.status(400).json({ error: "Username wajib diisi." });

  // ── Cek user di Supabase ──
  const users = await supaFetch(`/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=username,nama,noWA,role`);
  const user = users?.[0];
  if (!user) return res.status(404).json({ error: "Username tidak ditemukan." });

  // ══════════════════════════════════════
  // ACTION: request — kirim OTP
  // ══════════════════════════════════════
  if (action === "request") {
    if (!user.noWA) {
      return res.status(400).json({
        error: "Nomor WhatsApp belum terdaftar untuk akun ini. Hubungi Kabag untuk reset password."
      });
    }

    // Generate OTP 6 digit
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 menit

    // Hapus OTP lama & simpan yang baru
    await fetch(SUPA_URL + `/rest/v1/otp_tokens?username=eq.${encodeURIComponent(username)}`,
      { method: "DELETE", headers: H });
    await fetch(SUPA_URL + "/rest/v1/otp_tokens", {
      method: "POST", headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ username, code, expires_at: expiresAt })
    });

    // Kirim via WhatsApp
    if (WA_TOKEN && WA_PHONE_ID) {
      const phone = String(user.noWA).replace(/\D/g, "").replace(/^0/, "62");
      await httpsPost(
        `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
        {
          messaging_product: "whatsapp", to: phone, type: "text",
          text: {
            body: `🏛️ *PROKOPIM KOTA TARAKAN*\n\nKode reset password Anda:\n\n*${code}*\n\nBerlaku 10 menit. Jangan berikan kode ini kepada siapapun.`
          }
        },
        { Authorization: "Bearer " + WA_TOKEN }
      ).catch(() => {});
    }

    // Samarkan nomor WA untuk tampilan
    const wa = user.noWA.replace(/\D/g, "");
    const masked = wa.slice(0, 4) + "****" + wa.slice(-3);

    return res.status(200).json({ ok: true, masked, nama: user.nama });
  }

  // ══════════════════════════════════════
  // ACTION: verify — verifikasi OTP + ganti password
  // ══════════════════════════════════════
  if (action === "verify") {
    if (!otp || !newPassword) return res.status(400).json({ error: "OTP dan password baru wajib diisi." });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter." });

    const tokens = await supaFetch(`/rest/v1/otp_tokens?username=eq.${encodeURIComponent(username)}&select=code,expires_at`);
    const token = tokens?.[0];

    if (!token) return res.status(400).json({ error: "Kode OTP tidak ditemukan. Minta kode baru." });
    if (new Date() > new Date(token.expires_at)) return res.status(400).json({ error: "Kode OTP sudah kadaluarsa. Minta kode baru." });
    if (token.code !== String(otp).trim()) return res.status(400).json({ error: "Kode OTP salah." });

    // Hash password baru (SHA-256)
    const { createHash } = require("crypto");
    const hashed = "$sha256$" + createHash("sha256").update(newPassword).digest("hex");

    // Update password di Supabase
    await fetch(SUPA_URL + `/rest/v1/users?username=eq.${encodeURIComponent(username)}`, {
      method: "PATCH", headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ password: hashed })
    });

    // Hapus OTP yang sudah dipakai
    await fetch(SUPA_URL + `/rest/v1/otp_tokens?username=eq.${encodeURIComponent(username)}`,
      { method: "DELETE", headers: H });

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Action tidak dikenal." });
};
