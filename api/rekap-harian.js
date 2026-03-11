// ============================================================
//  /api/rekap-harian.js — Cron job rekap RK besok via WhatsApp
//  Dijadwalkan: 08:25 UTC = 15:25 WITA (Asia/Makassar)
//  Penerima: semua user yang punya noWA (terutama kabag, kasubbag, personil)
//
//  Tambahkan ke vercel.json:
//  “crons”: [{ “path”: “/api/rekap-harian”, “schedule”: “25 8 * * *” }]
//
//  ENV yang dibutuhkan (sama dengan file lain):
//    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, FONNTE_TOKEN
//    CRON_SECRET  = string rahasia bebas, set juga di Vercel env
// ============================================================

const SUPA_URL = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || “”;
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || “”;
const FONNTE   = process.env.FONNTE_TOKEN || “”;

const H = () => ({
“Content-Type”:  “application/json”,
“apikey”:        SUPA_KEY,
“Authorization”: “Bearer “ + SUPA_KEY,
});

// ── Ambil semua jadwal dari Supabase ────────────────────────
async function getAllJadwal() {
const url = SUPA_URL + “/rest/v1/jadwal?select=data&order=id”;
const r = await fetch(url, { headers: H() });
if (!r.ok) throw new Error(“Gagal ambil jadwal: “ + r.status);
const rows = await r.json();
return rows.map(x => x.data).filter(Boolean);
}

// ── Ambil semua user dari Supabase ──────────────────────────
async function getAllUsers() {
const url = SUPA_URL + “/rest/v1/users?select=*”;
const r = await fetch(url, { headers: H() });
if (!r.ok) throw new Error(“Gagal ambil users: “ + r.status);
return await r.json();
}

// ── Format tanggal → YYYY-MM-DD untuk zona WITA ─────────────
function getTomorrowWITA() {
// WITA = UTC+8. Cron jalan 08:25 UTC = 15:25 WITA
// “besok” dari perspektif WITA
const now = new Date();
// Geser ke WITA (+8 jam)
const witaMs = now.getTime() + (8 * 60 * 60 * 1000);
const wita   = new Date(witaMs);
// Tambah 1 hari
wita.setUTCDate(wita.getUTCDate() + 1);
const y  = wita.getUTCFullYear();
const m  = String(wita.getUTCMonth() + 1).padStart(2, “0”);
const d  = String(wita.getUTCDate()).padStart(2, “0”);
return y + “-” + m + “-” + d;
}

function getTodayWITA() {
const now   = new Date();
const witaMs = now.getTime() + (8 * 60 * 60 * 1000);
const wita  = new Date(witaMs);
const y  = wita.getUTCFullYear();
const m  = String(wita.getUTCMonth() + 1).padStart(2, “0”);
const d  = String(wita.getUTCDate()).padStart(2, “0”);
return y + “-” + m + “-” + d;
}

const HARI = [“Minggu”,“Senin”,“Selasa”,“Rabu”,“Kamis”,“Jumat”,“Sabtu”];
function namaHari(tgl) {
// tgl = “YYYY-MM-DD”
const [y, m, d] = tgl.split(”-”).map(Number);
return HARI[new Date(y, m - 1, d).getDay()];
}

function fmtTgl(tgl) {
// “2025-03-11” → “11 Maret 2025”
const BULAN = [””,“Januari”,“Februari”,“Maret”,“April”,“Mei”,“Juni”,“Juli”,“Agustus”,“September”,“Oktober”,“November”,“Desember”];
const [y, m, d] = tgl.split(”-”).map(Number);
return d + “ “ + BULAN[m] + “ “ + y;
}

// ── Kirim WA via Fonnte ─────────────────────────────────────
async function sendWA(noWA, pesan) {
const nomor = noWA.trim().replace(/^0/, “62”).replace(/\D/g, “”);
try {
const r = await fetch(“https://api.fonnte.com/send”, {
method:  “POST”,
headers: { “Authorization”: FONNTE, “Content-Type”: “application/json” },
body:    JSON.stringify({ target: nomor, message: pesan }),
});
const d = await r.json();
return d.status !== false;
} catch (e) {
console.error(”[rekap] Gagal kirim WA ke”, nomor, “:”, e.message);
return false;
}
}

// ── Susun pesan rekap untuk satu penerima ───────────────────
function buatPesanRekap(events, tglBesok, userMap, targetUsername, targetRole) {
// Filter event yang relevan untuk penerima ini
let eventsFiltered = events;
if (targetRole === “ajudan_walikota”) {
eventsFiltered = events.filter(ev => (ev.untukPimpinan || []).includes(“walikota”));
} else if (targetRole === “ajudan_wakilwalikota”) {
eventsFiltered = events.filter(ev =>
(ev.untukPimpinan || []).includes(“wakilwalikota”) || ev.delegasiKeWWK
);
}
// Urutkan berdasarkan jam
const sorted = […eventsFiltered].sort((a, b) => (a.jam || “”).localeCompare(b.jam || “”));

const hari  = namaHari(tglBesok);
const tglFmt = fmtTgl(tglBesok);

let lines = [
“\uD83D\uDCCB *REKAP KEGIATAN BESOK*”,
“*” + hari + “, “ + tglFmt + “*”,
“*Sistem Jadwal Pimpinan Kota Tarakan*”,
“─────────────────────”,
];

let adaYangBelumDitugaskan = false;

sorted.forEach((ev, i) => {
const no      = i + 1;
const jam     = ev.jam || “-”;
const acara   = ev.namaAcara || “-”;
const lokasi  = ev.lokasi || “-”;
const pakaian = ev.pakaian || “-”;

```
// Pimpinan yang hadir
const pimpinan = [];
if (ev.untukPimpinan?.includes("walikota"))
  pimpinan.push(ev.delegasiKeWWK ? "WK (Delegasi ke WWK)" : "Wali Kota");
if (ev.untukPimpinan?.includes("wakilwalikota") || ev.delegasiKeWWK)
  pimpinan.push("Wakil Wali Kota");

// Personil yang ditugaskan
const personilList = ev.personil || [];
let personilStr;
if (personilList.length === 0) {
  personilStr = "\u26A0\uFE0F _Belum ada personil ditugaskan_";
  adaYangBelumDitugaskan = true;
} else {
  // Resolve nama dari username
  const namaList = personilList.map(un => {
    const u = userMap[un];
    return u ? u.nama : un;
  });
  personilStr = namaList.join(", ");
}

// Apakah penerima ini termasuk personil?
const isDitugaskan = targetUsername && personilList.includes(targetUsername);
const tagSaya = isDitugaskan ? " \u2B50 *(Anda ditugaskan)*" : "";

lines.push(
  "",
  "*" + no + ". " + acara + "*" + tagSaya,
  "\u23F0 " + jam + " WITA",
  "\uD83D\uDCCD " + lokasi,
  "\uD83D\uDC54 " + pakaian,
  "\uD83D\uDC64 Pimpinan: " + (pimpinan.join(" & ") || "-"),
  "\uD83D\uDC65 Personil: " + personilStr,
);

if (ev.catatanPenugasan) {
  lines.push("\uD83D\uDCDD Catatan: " + ev.catatanPenugasan);
}
```

});

lines.push(“─────────────────────”);

// Pesan pengingat cek penugasan
if (adaYangBelumDitugaskan) {
lines.push(
“”,
“\u26A0\uFE0F *Perhatian:* Ada kegiatan yang *belum memiliki personil*.”,
“Mohon segera lakukan penugasan melalui sistem sebelum kegiatan berlangsung.”,
“”,
);
} else {
lines.push(
“”,
“\u2705 Semua kegiatan telah memiliki personil yang ditugaskan.”,
“”,
);
}

lines.push(
“\uD83D\uDD14 *Harap cek penugasan secara berkala* di sistem untuk memastikan tidak ada perubahan mendadak.”,
“*prokopim.tarakankota.go.id*”,
);

return lines.join(”\n”);
}

// ── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
// Vercel Cron: hanya GET, header khusus dari Vercel
// Bisa juga dipanggil manual via POST dengan CRON_SECRET
const authHeader  = req.headers[“authorization”] || “”;
const cronSecret  = process.env.CRON_SECRET || “”;

// Izinkan: Vercel cron (header x-vercel-cron) ATAU manual dengan secret
const isVercelCron = req.headers[“x-vercel-cron”] === “1”;
const isManual     = cronSecret && authHeader === “Bearer “ + cronSecret;

if (!isVercelCron && !isManual) {
return res.status(401).json({ error: “Unauthorized” });
}

if (!SUPA_URL || !SUPA_KEY) {
return res.status(500).json({ error: “SUPABASE env belum diset” });
}
if (!FONNTE) {
console.warn(”[rekap] FONNTE_TOKEN tidak diset — WA tidak akan terkirim”);
}

try {
const tglBesok = getTomorrowWITA();
console.log(”[rekap] Mencari jadwal untuk:”, tglBesok);

```
const [allJadwal, allUsers] = await Promise.all([getAllJadwal(), getAllUsers()]);

// Filter: jadwal besok yang sudah disetujui (tayang)
const besok = allJadwal.filter(ev =>
  ev.tanggal === tglBesok && ev.alur === "disetujui" && !ev.tersembunyi
);

console.log("[rekap] Jumlah kegiatan besok:", besok.length);

if (besok.length === 0) {
  console.log("[rekap] Tidak ada kegiatan besok, tidak ada WA yang dikirim.");
  return res.status(200).json({ ok: true, sent: 0, message: "Tidak ada kegiatan besok" });
}

// Buat map username → user object
const userMap = {};
allUsers.forEach(u => { userMap[u.username] = u; });

// Tentukan siapa yang perlu dikirimi:
// 1. Semua kabag & kasubbag yang punya noWA
// 2. Semua personil yang ditugaskan di salah satu kegiatan besok
const targetUsernames = new Set();

// Kabag & kasubbag
allUsers.forEach(u => {
  if (
    (u.role === "kabag" ||
     u.role === "kasubbag_protokol" ||
     u.role === "kasubbag_komdokpim") &&
    u.noWA
  ) {
    targetUsernames.add(u.username);
  }
});

// Ajudan: filter sesuai pimpinan yang punya kegiatan besok
const adaWK  = besok.some(ev => (ev.untukPimpinan || []).includes("walikota"));
const adaWWK = besok.some(ev =>
  (ev.untukPimpinan || []).includes("wakilwalikota") || ev.delegasiKeWWK
);
allUsers.forEach(u => {
  if (!u.noWA) return;
  if (u.role === "ajudan_walikota"      && adaWK)  targetUsernames.add(u.username);
  if (u.role === "ajudan_wakilwalikota" && adaWWK) targetUsernames.add(u.username);
});

// Personil yang ditugaskan
besok.forEach(ev => {
  (ev.personil || []).forEach(un => {
    if (userMap[un]?.noWA) targetUsernames.add(un);
  });
});

console.log("[rekap] Penerima WA:", [...targetUsernames].join(", "));

let sent = 0; let failed = 0;
const results = [];

for (const username of targetUsernames) {
  const u = userMap[username];
  if (!u?.noWA) continue;

  const pesan = buatPesanRekap(besok, tglBesok, userMap, username, u.role);
  const ok    = await sendWA(u.noWA, pesan);
  if (ok) { sent++; } else { failed++; }
  results.push({ username, ok });

  // Jeda kecil agar tidak spam ke Fonnte
  await new Promise(r => setTimeout(r, 300));
}

console.log("[rekap] Selesai. Terkirim:", sent, "| Gagal:", failed);
return res.status(200).json({ ok: true, tglBesok, kegiatanCount: besok.length, sent, failed, results });
```

} catch (err) {
console.error(”[rekap] Error:”, err.message);
return res.status(500).json({ error: err.message });
}
};
