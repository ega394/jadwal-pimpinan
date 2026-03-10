// ============================================================
//  /api/otp.js  —  Reset Password via OTP WhatsApp (Fonnte)
//
//  ENV di Vercel Dashboard:
//    FONNTE_TOKEN  = token dari https://fonnte.com
//    SUPABASE_URL  = URL project Supabase
//    SUPABASE_KEY  = anon/service key Supabase
//
//  Jalankan SQL ini SEKALI di Supabase SQL Editor:
//    ALTER TABLE users
//      ADD COLUMN IF NOT EXISTS otp_code text,
//      ADD COLUMN IF NOT EXISTS otp_expires timestamptz;
// ============================================================

const OTP_TTL_MS = 10 * 60 * 1000; // 10 menit

function supaHeaders() {
  return {
    "Content-Type":  "application/json",
    "apikey":        process.env.SUPABASE_KEY,
    "Authorization": "Bearer " + process.env.SUPABASE_KEY,
  };
}

async function getUser(username) {
  const url = process.env.SUPABASE_URL
    + "/rest/v1/users?username=eq."
    + encodeURIComponent(username)
    + "&select=*";
  const r = await fetch(url, { headers: supaHeaders() });
  if (!r.ok) throw new Error("Gagal membaca data user");
  const rows = await r.json();
  return rows[0] || null;
}

async function updateUser(username, fields) {
  const url = process.env.SUPABASE_URL
    + "/rest/v1/users?username=eq."
    + encodeURIComponent(username);
  const h = Object.assign({}, supaHeaders(), { Prefer: "return=minimal" });
  const r = await fetch(url, {
    method: "PATCH",
    headers: h,
    body: JSON.stringify(fields),
  });
  if (!r.ok) throw new Error("Gagal update data user");
}

async function hashPassword(plain) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  const hex = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  return "$sha256$" + hex;
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function maskPhone(phone) {
  const p = phone.replace(/\D/g, "");
  if (p.length < 6) return "****";
  return p.slice(0, 4) + "****" + p.slice(-4);
}

async function sendOTPviaWA(noWA, otp, nama) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return false;
  const nomor = noWA.trim().replace(/^0/, "62").replace(/\D/g, "");
  const pesan = [
    "\uD83D\uDD10 *Reset Password - Sistem Jadwal Pimpinan Kota Tarakan*",
    "",
    "Halo *" + nama + "*,",
    "",
    "Kode OTP Anda:",
    "",
    "*" + otp + "*",
    "",
    "Berlaku selama *10 menit*. Jangan bagikan kode ini kepada siapapun.",
    "",
    "Jika Anda tidak meminta reset password, abaikan pesan ini.",
  ].join("\n");
  try {
    const r = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { "Authorization": token, "Content-Type": "application/json" },
      body: JSON.stringify({ target: nomor, message: pesan }),
    });
    const d = await r.json();
    return d.status !== false;
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { action, username, otp, newPassword } = req.body || {};
  if (!username) return res.status(400).json({ error: "Username wajib diisi" });

  if (action === "request") {
    let user;
    try { user = await getUser(username.toLowerCase().trim()); }
    catch (e) { return res.status(500).json({ error: "Gagal membaca data: " + e.message }); }

    if (!user) return res.status(404).json({ error: "Username tidak ditemukan" });

    const code    = generateOTP();
    const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();

    try { await updateUser(user.username, { otp_code: code, otp_expires: expires }); }
    catch (e) { return res.status(500).json({ error: "Gagal menyimpan OTP: " + e.message }); }

    if (user.noWA) {
      const sent = await sendOTPviaWA(user.noWA, code, user.nama || username);
      if (sent) {
        return res.status(200).json({ channel: "wa", masked: maskPhone(user.noWA), nama: user.nama || username });
      }
    }

    // Fallback: tampilkan kode di layar
    return res.status(200).json({ channel: "screen", code, nama: user.nama || username });
  }

  if (action === "verify") {
    if (!otp || !newPassword) return res.status(400).json({ error: "OTP dan password baru wajib diisi" });

    let user;
    try { user = await getUser(username.toLowerCase().trim()); }
    catch (e) { return res.status(500).json({ error: "Gagal membaca data: " + e.message }); }

    if (!user)            return res.status(404).json({ error: "Username tidak ditemukan" });
    if (!user.otp_code)   return res.status(400).json({ error: "OTP belum diminta atau sudah kedaluwarsa" });
    if (new Date(user.otp_expires) < new Date()) return res.status(400).json({ error: "Kode OTP sudah kedaluwarsa. Minta kode baru." });
    if (user.otp_code !== otp.trim()) return res.status(400).json({ error: "Kode OTP salah" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter" });

    const hashed = await hashPassword(newPassword);
    try { await updateUser(user.username, { password: hashed, otp_code: null, otp_expires: null }); }
    catch (e) { return res.status(500).json({ error: "Gagal update password: " + e.message }); }

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Action tidak valid" });
};
