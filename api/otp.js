// ============================================================
//  /api/otp.js  —  Reset Password via OTP WhatsApp (Fonnte)
//  Deploy di Vercel sebagai file: api/otp.js
//
//  ENV yang wajib diset di Vercel Dashboard:
//    FONNTE_TOKEN  = token dari https://fonnte.com
//    SUPABASE_URL  = URL project Supabase Anda
//    SUPABASE_KEY  = anon/service key Supabase
// ============================================================

const OTP_TTL_MS = 10 * 60 * 1000; // 10 menit

// ── Helper: headers Supabase ─────────────────────────────────
function supaHeaders() {
return {
“Content-Type”:  “application/json”,
“apikey”:        process.env.SUPABASE_KEY,
“Authorization”: `Bearer ${process.env.SUPABASE_KEY}`,
};
}

// ── Ambil user dari Supabase berdasarkan username ────────────
async function getUser(username) {
const url = `${process.env.SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=*`;
const r = await fetch(url, { headers: supaHeaders() });
if (!r.ok) throw new Error(“Gagal membaca data user”);
const rows = await r.json();
return rows[0] || null;
}

// ── Update field user di Supabase ───────────────────────────
async function updateUser(username, fields) {
const url = `${process.env.SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}`;
const r = await fetch(url, {
method:  “PATCH”,
headers: { …supaHeaders(), Prefer: “return=minimal” },
body:    JSON.stringify(fields),
});
if (!r.ok) throw new Error(“Gagal update data user”);
}

// ── Hash password (SHA-256, sama dgn logika di App.jsx) ──────
async function hashPassword(plain) {
// Jalankan di Node.js (Web Crypto tersedia di Node 18+)
const encoder = new TextEncoder();
const data    = encoder.encode(plain);
const buf     = await crypto.subtle.digest(“SHA-256”, data);
const hex     = Array.from(new Uint8Array(buf))
.map(b => b.toString(16).padStart(2, “0”))
.join(””);
return “$sha256$” + hex;
}

// ── Generate kode OTP 6 digit ─────────────────────────────
function generateOTP() {
return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Masking nomor WA: 0812****5678 ─────────────────────────
function maskPhone(phone) {
const p = phone.replace(/\D/g, “”);
if (p.length < 6) return “****”;
return p.slice(0, 4) + “****” + p.slice(-4);
}

// ── Kirim OTP via Fonnte ──────────────────────────────────
async function sendOTPviaWA(noWA, otp, nama) {
const token = process.env.FONNTE_TOKEN;
if (!token) return false;

const nomor = noWA.trim().replace(/^0/, “62”).replace(/\D/g, “”);
const pesan =
`🔐 *Reset Password — Sistem Jadwal Pimpinan Kota Tarakan*\n\n` +
`Halo *${nama}*,\n\n` +
`Kode OTP Anda:\n\n` +
`*${otp}*\n\n` +
`Berlaku selama *10 menit*. Jangan bagikan kode ini kepada siapapun.\n\n` +
`Jika Anda tidak meminta reset password, abaikan pesan ini.`;

try {
const r = await fetch(“https://api.fonnte.com/send”, {
method:  “POST”,
headers: {
“Authorization”: token,
“Content-Type”:  “application/json”,
},
body: JSON.stringify({ target: nomor, message: pesan }),
});
const d = await r.json();
return d.status !== false;
} catch {
return false;
}
}

// ── Main handler ─────────────────────────────────────────────
export default async function handler(req, res) {
if (req.method !== “POST”) {
return res.status(405).json({ error: “Method not allowed” });
}

const { action, username, otp, newPassword } = req.body || {};

if (!username) return res.status(400).json({ error: “Username wajib diisi” });

// ── ACTION: request OTP ──────────────────────────────────
if (action === “request”) {
let user;
try {
user = await getUser(username);
} catch (e) {
return res.status(500).json({ error: “Gagal membaca data: “ + e.message });
}

```
if (!user) {
  return res.status(404).json({ error: "Username tidak ditemukan" });
}

const code    = generateOTP();
const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();

// Simpan OTP ke Supabase (field sementara)
try {
  await updateUser(username, { otp_code: code, otp_expires: expires });
} catch (e) {
  return res.status(500).json({ error: "Gagal menyimpan OTP: " + e.message });
}

// Coba kirim via WA
if (user.noWA) {
  const sent = await sendOTPviaWA(user.noWA, code, user.nama || username);
  if (sent) {
    return res.status(200).json({
      channel: "wa",
      masked:  maskPhone(user.noWA),
      nama:    user.nama || username,
    });
  }
}

// Fallback: tampilkan OTP di layar (jika WA tidak tersedia)
return res.status(200).json({
  channel: "screen",
  code,
  nama: user.nama || username,
});
```

}

// ── ACTION: verify OTP ───────────────────────────────────
if (action === “verify”) {
if (!otp || !newPassword) {
return res.status(400).json({ error: “OTP dan password baru wajib diisi” });
}

```
let user;
try {
  user = await getUser(username);
} catch (e) {
  return res.status(500).json({ error: "Gagal membaca data: " + e.message });
}

if (!user) {
  return res.status(404).json({ error: "Username tidak ditemukan" });
}

if (!user.otp_code) {
  return res.status(400).json({ error: "OTP belum diminta atau sudah kedaluwarsa" });
}

if (new Date(user.otp_expires) < new Date()) {
  return res.status(400).json({ error: "Kode OTP sudah kedaluwarsa. Minta kode baru." });
}

if (user.otp_code !== otp.trim()) {
  return res.status(400).json({ error: "Kode OTP salah" });
}

if (newPassword.length < 6) {
  return res.status(400).json({ error: "Password minimal 6 karakter" });
}

// Hash password baru & hapus OTP
const hashed = await hashPassword(newPassword);
try {
  await updateUser(username, {
    password:    hashed,
    otp_code:    null,
    otp_expires: null,
  });
} catch (e) {
  return res.status(500).json({ error: "Gagal update password: " + e.message });
}

return res.status(200).json({ ok: true });
```

}

return res.status(400).json({ error: “Action tidak valid” });
}
