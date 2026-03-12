// ============================================================
//  /api/notif-reminder.js — Pengingat Penugasan 15:55 WITA
//  Cron: "55 7 * * *" UTC (= 15:55 WITA)
//
//  Penerima:
//  - Kasubbag Protokol   : jika ada kegiatan besok yang belum ada
//                          ≥1 personil dari [staf, admin_rk, kasubbag_protokol]
//  - Kasubbag Komdokpim  : jika ada kegiatan besok yang belum ada
//                          ≥1 personil dari [timkom, kasubbag_komdokpim]
//
//  vercel.json:
//  { "path": "/api/notif-reminder", "schedule": "55 7 * * *" }
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

function getTomorrowWITA() {
  const wita = new Date(Date.now() + 8 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  return wita.toISOString().slice(0, 10);
}

const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["","Januari","Februari","Maret","April","Mei","Juni",
               "Juli","Agustus","September","Oktober","November","Desember"];

function fmtTgl(tgl) {
  const [y, m, d] = tgl.split("-").map(Number);
  return HARI[new Date(y, m - 1, d).getDay()] + ", " + d + " " + BULAN[m] + " " + y;
}

function getTodayWITA() {
  const wita = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return wita.toISOString().slice(0, 10);
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
    console.error("[reminder] Gagal kirim ke", nomor, e.message);
    return false;
  }
}

// Cek apakah event punya ≥1 personil dari role tertentu
function punyaPersonilDariRole(ev, rolesYangDibutuhkan, userMap) {
  return (ev.personil || []).some(un => {
    const u = userMap[un];
    return u && rolesYangDibutuhkan.includes(u.role);
  });
}

// Susun pesan pengingat
function pesanPengingat(events, tglBesok, todayStr) {
  const sorted = [...events].sort((a, b) => (a.jam||"").localeCompare(b.jam||""));

  const pimpinanLabel = (ev) => {
    const list = [];
    if ((ev.untukPimpinan||[]).includes("walikota"))
      list.push(ev.delegasiKeWWK ? "WK (Delegasi ke WWK)" : "WK");
    if ((ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK)
      list.push("WWK");
    return list.join(" & ") || "-";
  };

  let lines = [
    "⚠️ *Pengingat Penugasan — Besok*",
    fmtTgl(todayStr) + " | 15.55 WITA",
    "",
    "Kegiatan besok yang *belum ada penugasan*:",
    "",
  ];

  sorted.forEach((ev, i) => {
    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi) lines.push("   📍 " + ev.lokasi);
    lines.push("   👔 " + pimpinanLabel(ev));
    if (ev.sambutanFile !== undefined)
      lines.push("   📝 Sambutan: " + (ev.sambutanFile ? "✅ Tersedia" : "❌ Belum ada"));
    lines.push("");
  });

  lines.push("Mohon segera input penugasan melalui:");
  lines.push("🔗 " + LINK);
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
    const tglBesok = getTomorrowWITA();
    const today    = getTodayWITA();
    console.log("[reminder] Cek penugasan untuk besok:", tglBesok);

    const [allJadwal, allUsers] = await Promise.all([getAllJadwal(), getAllUsers()]);
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    const besokEvents = allJadwal.filter(ev =>
      ev.tanggal === tglBesok && ev.alur === "disetujui" && !ev.tersembunyi
    );

    if (besokEvents.length === 0) {
      console.log("[reminder] Tidak ada kegiatan besok, skip.");
      return res.status(200).json({ ok: true, sent: 0, message: "Tidak ada kegiatan besok" });
    }

    // Role Kasubbag Protokol: cek ada kegiatan tanpa personil dari [staf, admin_rk, kasubbag_protokol]
    const PROTOKOL_ROLES = ["staf", "admin_rk", "kasubbag_protokol"];
    const belumProtokol  = besokEvents.filter(ev => !punyaPersonilDariRole(ev, PROTOKOL_ROLES, userMap));

    // Role Kasubbag Komdokpim: cek ada kegiatan tanpa personil dari [timkom, kasubbag_komdokpim]
    const KOMDOK_ROLES = ["timkom", "kasubbag_komdokpim"];
    const belumKomdok  = besokEvents.filter(ev => !punyaPersonilDariRole(ev, KOMDOK_ROLES, userMap));

    let sent = 0, failed = 0;
    const results = [];

    for (const u of allUsers) {
      if (!u.noWA) continue;
      let evBelum = null;

      if (u.role === "kasubbag_protokol" && belumProtokol.length > 0)
        evBelum = belumProtokol;
      else if (u.role === "kasubbag_komdokpim" && belumKomdok.length > 0)
        evBelum = belumKomdok;

      if (!evBelum) continue;

      const pesan = pesanPengingat(evBelum, tglBesok, today);
      const ok    = await kirimWA(u.noWA, pesan);
      if (ok) sent++; else failed++;
      results.push({ username: u.username, role: u.role, eventCount: evBelum.length, ok });
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("[reminder] Selesai. Terkirim:", sent, "| Gagal:", failed);
    return res.status(200).json({
      ok: true, tglBesok,
      belumProtokol: belumProtokol.length,
      belumKomdok: belumKomdok.length,
      sent, failed, results
    });

  } catch (err) {
    console.error("[reminder] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
