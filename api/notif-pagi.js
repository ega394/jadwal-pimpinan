// ============================================================
//  /api/notif-pagi.js — Notifikasi Pagi 07:30 WITA
//  Cron: "30 23 * * *" UTC (= 07:30 WITA hari berikutnya)
//
//  Penerima & isi:
//  - Kabag           : rekap agenda hari ini (nama pejabat + semua personil)
//  - Kasubbag Komdokpim : rekap lengkap agenda hari ini (semua personil)
//  - Ajudan WK       : agenda hari ini untuk WK (filter)
//  - Ajudan WWK      : agenda hari ini untuk WWK (filter)
//  - Personil/Staf   : agenda hari ini UMUM (jabatan saja, + nama personil)
//                      HANYA jika punya ≥1 penugasan hari ini
//
//  vercel.json:
//  { "path": "/api/notif-pagi", "schedule": "30 23 * * *" }
// ============================================================

const SUPA_URL = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || "";
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
const FONNTE   = process.env.FONNTE_TOKEN || "";
const LINK     = "prokopim.tarakankota.go.id";
const FOOTER   = "\n_Prokopim Kota Tarakan_\n_" + LINK + "_";

const H = () => ({
  "Content-Type":  "application/json",
  "apikey":        SUPA_KEY,
  "Authorization": "Bearer " + SUPA_KEY,
});

async function getAllJadwal() {
  const r = await fetch(SUPA_URL + "/rest/v1/jadwal?select=data&order=id", { headers: H() });
  if (!r.ok) throw new Error("Gagal ambil jadwal: " + r.status);
  return (await r.json()).map(x => x.data).filter(Boolean);
}

async function getAllUsers() {
  const r = await fetch(SUPA_URL + "/rest/v1/users?select=*", { headers: H() });
  if (!r.ok) throw new Error("Gagal ambil users: " + r.status);
  return await r.json();
}

function getTodayWITA() {
  const wita = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return wita.toISOString().slice(0, 10);
}

const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["","Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

function fmtTgl(tgl) {
  const [y, m, d] = tgl.split("-").map(Number);
  return HARI[new Date(y, m - 1, d).getDay()] + ", " + d + " " + BULAN[m] + " " + y;
}

async function kirimWA(noWA, pesan) {
  const nomor = noWA.trim().replace(/^0/, "62").replace(/\D/g, "");
  try {
    const r = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { "Authorization": FONNTE, "Content-Type": "application/json" },
      body: JSON.stringify({ target: nomor, message: pesan }),
    });
    const d = await r.json();
    return d.status !== false;
  } catch (e) {
    console.error("[pagi] Gagal kirim ke", nomor, e.message);
    return false;
  }
}

// ── Status kehadiran pimpinan ──────────────────────────────
function statusLabel(ev, pim) {
  if (pim === "wk") {
    if (ev.delegasiKeWWK) return "↩️ Delegasi ke Wakil WK";
    const s = ev.statusWK;
    if (!s) return "⚠️ Belum konfirmasi";
    if (s === "hadir") return "✅";
    if (s === "tidak_hadir") return "❌ Tidak hadir";
    if (s === "diwakilkan") return "🔄 Diwakilkan" + (ev.perwakilanWK ? ": " + ev.perwakilanWK : "");
    return s;
  } else {
    const s = ev.statusWWK;
    if (!s) return "⚠️ Belum konfirmasi";
    if (s === "hadir") return "✅";
    if (s === "tidak_hadir") return "❌ Tidak hadir";
    if (s === "diwakilkan") return "🔄 Diwakilkan" + (ev.perwakilanWWK ? ": " + ev.perwakilanWWK : "");
    return s;
  }
}

// ── Pesan Kabag: nama pejabat + semua personil ────────────
function pesanKabag(events, tgl, userMap) {
  const sorted = [...events].sort((a, b) => (a.jam||"").localeCompare(b.jam||""));
  const wkUser  = Object.values(userMap).find(u => u.role === "walikota");
  const wwkUser = Object.values(userMap).find(u => u.role === "wakilwalikota");
  const wkNama  = wkUser?.nama  || "Wali Kota";
  const wwkNama = wwkUser?.nama || "Wakil Wali Kota";

  let lines = [
    "🗓️ *Rekap Agenda Pimpinan — Hari Ini*",
    fmtTgl(tgl),
    "",
  ];

  sorted.forEach((ev, i) => {
    const hadirWK  = (ev.untukPimpinan||[]).includes("walikota");
    const hadirWWK = (ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK;
    const personilNama = (ev.personil||[])
      .map(un => userMap[un]?.nama || un).join(", ") || "—";

    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi)       lines.push("   📍 " + ev.lokasi);
    if (ev.penyelenggara) lines.push("   🏢 " + ev.penyelenggara);
    if (hadirWK)  lines.push("   👔 " + wkNama + " " + statusLabel(ev,"wk"));
    if (hadirWWK) lines.push("   👔 " + wwkNama + " " + statusLabel(ev,"wwk"));
    lines.push("   🎯 Bertugas: " + personilNama);
    lines.push("");
  });

  lines.push("_Total: " + events.length + " kegiatan hari ini_");
  lines.push(FOOTER);
  return lines.join("\n");
}

// ── Pesan Kasubbag Komdokpim: rekap lengkap ───────────────
function pesanKasubbagKomdok(events, tgl, userMap) {
  const sorted = [...events].sort((a, b) => (a.jam||"").localeCompare(b.jam||""));
  let lines = [
    "🗓️ *Rekap Lengkap Agenda Pimpinan — Hari Ini*",
    fmtTgl(tgl),
    "",
  ];

  sorted.forEach((ev, i) => {
    const hadirWK  = (ev.untukPimpinan||[]).includes("walikota");
    const hadirWWK = (ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK;
    const personilNama = (ev.personil||[])
      .map(un => userMap[un]?.nama || un).join(", ") || "—";
    const sambutanStr = ev.sambutanFile ? "✅ Tersedia" : "❌ Belum ada";

    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi)        lines.push("   📍 " + ev.lokasi);
    if (ev.penyelenggara) lines.push("   🏢 " + ev.penyelenggara);
    if (hadirWK)  lines.push("   👔 Wali Kota " + statusLabel(ev,"wk"));
    if (hadirWWK) lines.push("   👔 Wakil Wali Kota " + statusLabel(ev,"wwk"));
    lines.push("   🎯 Bertugas: " + personilNama);
    lines.push("   📝 Sambutan: " + sambutanStr);
    lines.push("");
  });

  lines.push("_Total: " + events.length + " kegiatan hari ini_");
  lines.push(FOOTER);
  return lines.join("\n");
}

// ── Pesan Ajudan: rekap untuk pimpinan mereka ─────────────
function pesanAjudan(events, tgl, userMap, pim) {
  const label = pim === "wk" ? "Wali Kota" : "Wakil Wali Kota";
  const filtered = events.filter(ev => {
    if (pim === "wk") return (ev.untukPimpinan||[]).includes("walikota");
    return (ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK;
  }).sort((a, b) => (a.jam||"").localeCompare(b.jam||""));

  if (filtered.length === 0) return null;

  let lines = [
    "🌅 *Selamat Pagi!*",
    "*Agenda " + label + " — Hari Ini*",
    fmtTgl(tgl),
    "",
  ];

  filtered.forEach((ev, i) => {
    const personilNama = (ev.personil||[])
      .map(un => userMap[un]?.nama || un).join(", ") || "—";

    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi)        lines.push("   📍 " + ev.lokasi);
    if (ev.penyelenggara) lines.push("   🏢 " + ev.penyelenggara);
    lines.push("   👔 " + label + " " + statusLabel(ev, pim));
    lines.push("   🎯 Bertugas: " + personilNama);
    lines.push("");
  });

  lines.push(FOOTER);
  return lines.join("\n");
}

// ── Pesan Personil/Staf: agenda UMUM (jabatan saja, no nama pejabat) ──
function pesanPersonil(events, tgl, userMap) {
  const sorted = [...events].sort((a, b) => (a.jam||"").localeCompare(b.jam||""));

  let lines = [
    "🌅 *Selamat Pagi!*",
    fmtTgl(tgl),
    "",
    "Agenda Pimpinan hari ini:",
    "",
  ];

  sorted.forEach((ev, i) => {
    const hadirWK  = (ev.untukPimpinan||[]).includes("walikota");
    const hadirWWK = (ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK;
    const personilNama = (ev.personil||[])
      .map(un => userMap[un]?.nama || un).join(", ") || "—";

    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi)        lines.push("   📍 " + ev.lokasi);
    if (ev.penyelenggara) lines.push("   🏢 " + ev.penyelenggara);
    if (hadirWK)  lines.push("   👔 Wali Kota " + statusLabel(ev,"wk"));
    if (hadirWWK) lines.push("   👔 Wakil Wali Kota " + statusLabel(ev,"wwk"));
    lines.push("   🎯 Personil bertugas: " + personilNama);
    lines.push("");
  });

  lines.push(FOOTER);
  return lines.join("\n");
}

// ── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const cronSecret   = process.env.CRON_SECRET || "";
  const authHeader   = req.headers["authorization"] || "";
  const isManual     = cronSecret && authHeader === "Bearer " + cronSecret;

  if (!isVercelCron && !isManual)
    return res.status(401).json({ error: "Unauthorized" });

  if (!SUPA_URL || !SUPA_KEY)
    return res.status(500).json({ error: "Supabase env belum diset" });

  try {
    const today = getTodayWITA();
    console.log("[pagi] Rekap hari ini:", today);

    const [allJadwal, allUsers] = await Promise.all([getAllJadwal(), getAllUsers()]);
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    const todayEvents = allJadwal.filter(ev =>
      ev.tanggal === today && ev.alur === "disetujui" && !ev.tersembunyi
    );

    console.log("[pagi] Kegiatan hari ini:", todayEvents.length);

    if (todayEvents.length === 0) {
      console.log("[pagi] Tidak ada kegiatan hari ini, skip.");
      return res.status(200).json({ ok: true, sent: 0, message: "Tidak ada kegiatan hari ini" });
    }

    let sent = 0, failed = 0;
    const results = [];

    const PERSONIL_ROLES = ["staf","admin_rk","timkom","kasubbag_protokol","kasubbag_komdokpim"];

    for (const u of allUsers) {
      if (!u.noWA) continue;
      let pesan = null;

      if (u.role === "kabag") {
        pesan = pesanKabag(todayEvents, today, userMap);

      } else if (u.role === "kasubbag_komdokpim") {
        pesan = pesanKasubbagKomdok(todayEvents, today, userMap);

      } else if (u.role === "ajudan_walikota") {
        pesan = pesanAjudan(todayEvents, today, userMap, "wk");

      } else if (u.role === "ajudan_wakilwalikota") {
        pesan = pesanAjudan(todayEvents, today, userMap, "wwk");

      } else if (PERSONIL_ROLES.includes(u.role)) {
        // Hanya kirim jika punya ≥1 penugasan hari ini
        const punya = todayEvents.some(ev => (ev.personil||[]).includes(u.username));
        if (punya) pesan = pesanPersonil(todayEvents, today, userMap);
      }

      if (!pesan) continue;

      const ok = await kirimWA(u.noWA, pesan);
      if (ok) sent++; else failed++;
      results.push({ username: u.username, role: u.role, ok });
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("[pagi] Selesai. Terkirim:", sent, "| Gagal:", failed);
    return res.status(200).json({ ok: true, today, kegiatanCount: todayEvents.length, sent, failed, results });

  } catch (err) {
    console.error("[pagi] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
