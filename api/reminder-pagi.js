// ============================================================
//  /api/reminder-pagi.js — Reminder pagi 07:30 WITA ke semua staf
//  Jadwal cron: 23 23 * * *  (UTC) = 07:23 WITA keesokan harinya
//  → diset 07:23 agar pesan tiba sekitar 07:28–07:30 WITA
//
//  Penerima: semua role KECUALI walikota & wakilwalikota
//  Isi: ucapan selamat pagi + daftar kegiatan hari ini yang
//       relevan dengan role penerima (personil yang ditugaskan,
//       atau semua kegiatan untuk kabag/kasubbag/ajudan)
//
//  Tambahkan ke vercel.json crons:
//  { "path": "/api/reminder-pagi", "schedule": "23 23 * * *" }
//
//  ENV:
//    VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, FONNTE_TOKEN, CRON_SECRET
// ============================================================

const SUPA_URL = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || "";
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
const FONNTE   = process.env.FONNTE_TOKEN || "";

const H = () => ({
  "Content-Type":  "application/json",
  "apikey":        SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
});

// ─── Supabase helpers ────────────────────────────────────────
async function getAllJadwal() {
  const url = SUPA_URL + "/rest/v1/jadwal?select=data&order=id";
  const r = await fetch(url, { headers: H() });
  if (!r.ok) throw new Error("Gagal ambil jadwal: " + r.status);
  const rows = await r.json();
  return rows.map(x => x.data).filter(Boolean);
}

async function getAllUsers() {
  const url = SUPA_URL + "/rest/v1/users?select=*";
  const r = await fetch(url, { headers: H() });
  if (!r.ok) throw new Error("Gagal ambil users: " + r.status);
  return await r.json();
}

// ─── Waktu WITA ─────────────────────────────────────────────
// Cron jalan 23:23 UTC = 07:23 WITA keesokan harinya
// "hari ini" dari sudut pandang WITA = hari berikutnya UTC
function getTodayWITA() {
  const now    = new Date();
  const witaMs = now.getTime() + (8 * 60 * 60 * 1000);
  const wita   = new Date(witaMs);
  const y  = wita.getUTCFullYear();
  const m  = String(wita.getUTCMonth() + 1).padStart(2, "0");
  const d  = String(wita.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

// ─── Format ─────────────────────────────────────────────────
const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["","Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

function namaHari(tgl) {
  const [y, m, d] = tgl.split("-").map(Number);
  return HARI[new Date(y, m - 1, d).getDay()];
}
function fmtTgl(tgl) {
  const [y, m, d] = tgl.split("-").map(Number);
  return d + " " + BULAN[m] + " " + y;
}

// ─── Kirim WA via Fonnte ─────────────────────────────────────
async function kirimWA(noWA, pesan) {
  const nomor = noWA.trim().replace(/^0/, "62").replace(/\D/g, "");
  if (nomor.length < 10) return false;
  try {
    const r = await fetch("https://api.fonnte.com/send", {
      method:  "POST",
      headers: { "Authorization": FONNTE, "Content-Type": "application/json" },
      body:    JSON.stringify({ target: nomor, message: pesan }),
    });
    const d = await r.json();
    return d.status !== false;
  } catch (e) {
    console.error("[reminder-pagi] WA gagal →", nomor, e.message);
    return false;
  }
}

// ─── Label role ──────────────────────────────────────────────
function labelRole(role) {
  const MAP = {
    admin_rk:               "Admin RK",
    staf:                   "Staf Protokol",
    timkom:                 "Staf Komdokpim",
    kasubbag_protokol:      "Kasubbag Protokol",
    kasubbag_komdokpim:     "Kasubbag Komdokpim",
    kabag:                  "Kepala Bagian",
    ajudan_walikota:        "Ajudan Wali Kota",
    ajudan_wakilwalikota:   "Ajudan Wakil Wali Kota",
  };
  return MAP[role] || role;
}

// ─── Role yang mendapat semua kegiatan (bukan hanya yg ditugaskan) ──
const ROLE_LIHAT_SEMUA = new Set([
  "kabag", "kasubbag_protokol", "kasubbag_komdokpim",
  "ajudan_walikota", "ajudan_wakilwalikota",
]);

// ─── Susun pesan per penerima ────────────────────────────────
function buatPesan(user, events, userMap, tgl) {
  const hari    = namaHari(tgl);
  const tglFmt  = fmtTgl(tgl);
  const nama    = user.nama || user.username;
  const jabatan = user.jabatan || labelRole(user.role);

  // Tentukan kegiatan yang relevan
  let relevant;
  if (ROLE_LIHAT_SEMUA.has(user.role)) {
    // Lihat semua kegiatan hari ini
    relevant = [...events].sort((a, b) => (a.jam || "").localeCompare(b.jam || ""));
  } else {
    // Hanya kegiatan di mana user ini ditugaskan sebagai personil
    relevant = events
      .filter(ev => (ev.personil || []).includes(user.username))
      .sort((a, b) => (a.jam || "").localeCompare(b.jam || ""));
  }

  // ── Header ──────────────────────────────────────────────
  const lines = [
    "🌤️ *Selamat Pagi & Selamat Bertugas!*",
    "",
    "Yth. *" + nama + "*",
    "_" + jabatan + "_",
    "",
    "Semoga hari ini penuh berkah dan produktif. 🙏",
    "Berikut agenda kegiatan Pimpinan *hari ini*:",
    "",
    "📅 *" + hari + ", " + tglFmt + "*",
    "━━━━━━━━━━━━━━━━━━━━",
  ];

  if (relevant.length === 0) {
    lines.push("");
    lines.push("✅ Tidak ada kegiatan terjadwal untuk Anda hari ini.");
    lines.push("");
  } else {
    relevant.forEach((ev, i) => {
      const no       = i + 1;
      const acara    = ev.namaAcara || "-";
      const jam      = ev.jam || "-";
      const lokasi   = ev.lokasi || "-";
      const pakaian  = ev.pakaian || "-";

      // Pimpinan hadir
      const p = [];
      if ((ev.untukPimpinan || []).includes("walikota"))
        p.push(ev.delegasiKeWWK ? "WK→Delegasi" : "Wali Kota");
      if ((ev.untukPimpinan || []).includes("wakilwalikota") || ev.delegasiKeWWK)
        p.push("Wakil WK");
      const pimpinanStr = p.join(" & ") || "-";

      // Apakah user ini ditugaskan di sini?
      const isDitugaskan = (ev.personil || []).includes(user.username);
      const tagSaya = isDitugaskan ? " ⭐ *(Anda Bertugas)*" : "";

      // Personil lain (untuk role lihat semua)
      let personilInfo = "";
      if (ROLE_LIHAT_SEMUA.has(user.role) && (ev.personil || []).length > 0) {
        const namaPersonil = (ev.personil || []).map(un => {
          const u = userMap[un];
          return u ? u.nama : un;
        });
        personilInfo = "\n👥 Tim: " + namaPersonil.join(", ");
      } else if (ROLE_LIHAT_SEMUA.has(user.role) && (ev.personil || []).length === 0) {
        personilInfo = "\n⚠️ Belum ada personil";
      }

      const catatanStr = ev.catatanPenugasan
        ? "\n📝 " + ev.catatanPenugasan
        : "";

      lines.push(
        "",
        "*" + no + ". " + acara + "*" + tagSaya,
        "⏰ " + jam + " WITA",
        "📍 " + lokasi,
        "👔 " + pakaian,
        "👤 " + pimpinanStr,
        personilInfo + catatanStr,
      );
    });
    lines.push("━━━━━━━━━━━━━━━━━━━━");
  }

  // ── Footer khusus per role ──
  if (user.role === "ajudan_walikota" || user.role === "ajudan_wakilwalikota") {
    lines.push(
      "",
      "📌 *Pengingat:* Pastikan konfirmasi kehadiran pimpinan sudah diinput sebelum acara dimulai.",
    );
  } else if (user.role === "kabag" || user.role.startsWith("kasubbag")) {
    const belumPersonil = relevant.filter(ev => !(ev.personil || []).length);
    if (belumPersonil.length > 0) {
      lines.push(
        "",
        "⚠️ *" + belumPersonil.length + " kegiatan* belum memiliki personil. Segera tugaskan melalui sistem.",
      );
    }
  } else if (user.role === "staf" || user.role === "timkom") {
    lines.push(
      "",
      "📌 Harap hadir tepat waktu dan siapkan perlengkapan yang diperlukan.",
    );
  }

  lines.push(
    "",
    "🔔 Info lengkap: *prokopim.tarakankota.go.id*",
  );

  return lines.filter(l => l !== undefined).join("\n");
}

// ─── Main Handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const authHeader  = req.headers["authorization"] || "";
  const cronSecret  = process.env.CRON_SECRET || "";
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const isManual     = cronSecret && authHeader === "Bearer " + cronSecret;

  if (!isVercelCron && !isManual) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!SUPA_URL || !SUPA_KEY) {
    return res.status(500).json({ error: "SUPABASE env belum diset" });
  }
  if (!FONNTE) {
    console.warn("[reminder-pagi] FONNTE_TOKEN tidak diset — WA tidak akan terkirim");
  }

  try {
    const tgl = getTodayWITA();
    console.log("[reminder-pagi] Tanggal WITA hari ini:", tgl);

    const [allJadwal, allUsers] = await Promise.all([getAllJadwal(), getAllUsers()]);

    // Filter: kegiatan hari ini yang sudah disetujui & tidak tersembunyi
    const hariIni = allJadwal.filter(ev =>
      ev.tanggal === tgl && ev.alur === "disetujui" && !ev.tersembunyi
    );

    console.log("[reminder-pagi] Kegiatan hari ini:", hariIni.length);

    // Build userMap
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    // Tentukan penerima:
    // – Semua role KECUALI walikota & wakilwalikota
    // – Harus punya noWA
    // – Untuk staf/timkom: hanya jika ditugaskan di setidaknya satu kegiatan hari ini
    const SKIP_ROLES = new Set(["walikota", "wakilwalikota"]);

    const penerima = allUsers.filter(u => {
      if (SKIP_ROLES.has(u.role)) return false;
      if (!u.noWA) return false;

      // Staf & timkom: kirim hanya jika ada penugasan hari ini
      if (u.role === "staf" || u.role === "timkom") {
        return hariIni.some(ev => (ev.personil || []).includes(u.username));
      }

      // Role lain (ajudan, kasubbag, kabag, admin_rk): selalu kirim jika ada kegiatan
      // Jika tidak ada kegiatan sama sekali, tetap kirim (info "tidak ada kegiatan")
      return true;
    });

    console.log("[reminder-pagi] Penerima:", penerima.map(u => u.username).join(", "));

    let sent = 0, failed = 0;
    const results = [];

    for (const u of penerima) {
      const pesan = buatPesan(u, hariIni, userMap, tgl);
      const ok    = await kirimWA(u.noWA, pesan);
      if (ok) sent++; else failed++;
      results.push({ username: u.username, role: u.role, ok });
      // Jeda agar tidak spam Fonnte
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("[reminder-pagi] Selesai. Terkirim:", sent, "| Gagal:", failed);
    return res.status(200).json({
      ok: true,
      tgl,
      kegiatanHariIni: hariIni.length,
      penerimaCount:   penerima.length,
      sent,
      failed,
      results,
    });

  } catch (err) {
    console.error("[reminder-pagi] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
