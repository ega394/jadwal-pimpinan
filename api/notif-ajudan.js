// ============================================================
//  /api/notif-ajudan.js — Rekap Besok untuk Ajudan 16:00 WITA
//  Cron: "0 8 * * *" UTC (= 16:00 WITA)
//
//  Penerima:
//  - Ajudan WK  : agenda besok untuk Wali Kota + pengingat konfirmasi kehadiran
//  - Ajudan WWK : agenda besok untuk Wakil WK  + pengingat konfirmasi kehadiran
//  Hanya dikirim jika ada agenda besok yang relevan.
//
//  vercel.json:
//  { "path": "/api/notif-ajudan", "schedule": "0 8 * * *" }
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
    console.error("[ajudan] Gagal kirim ke", nomor, e.message);
    return false;
  }
}

function pesanAjudan(events, tglBesok, labelPimpinan, userMap) {
  // events sudah difilter sesuai pimpinan
  const sorted = [...events].sort((a, b) => (a.jam||"").localeCompare(b.jam||""));

  let lines = [
    "📋 *Agenda " + labelPimpinan + " Besok*",
    fmtTgl(tglBesok),
    "",
  ];

  sorted.forEach((ev, i) => {
    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi)        lines.push("   📍 " + ev.lokasi);
    if (ev.penyelenggara) lines.push("   🏢 " + ev.penyelenggara);
    lines.push("");
  });

  lines.push(
    "⚠️ *Mohon segera konfirmasi kehadiran " + labelPimpinan + "* untuk " +
    events.length + " kegiatan di atas."
  );
  lines.push("Hubungi Pimpinan hari ini dan input konfirmasi melalui:");
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
    console.log("[ajudan] Rekap besok untuk ajudan:", tglBesok);

    const [allJadwal, allUsers] = await Promise.all([getAllJadwal(), getAllUsers()]);
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    const besokAll = allJadwal.filter(ev =>
      ev.tanggal === tglBesok && ev.alur === "disetujui" && !ev.tersembunyi
    );

    const besokWK  = besokAll.filter(ev => (ev.untukPimpinan||[]).includes("walikota"));
    const besokWWK = besokAll.filter(ev =>
      (ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK
    );

    let sent = 0, failed = 0;
    const results = [];

    for (const u of allUsers) {
      if (!u.noWA) continue;
      let pesan = null;

      if (u.role === "ajudan_walikota" && besokWK.length > 0)
        pesan = pesanAjudan(besokWK, tglBesok, "Wali Kota", userMap);
      else if (u.role === "ajudan_wakilwalikota" && besokWWK.length > 0)
        pesan = pesanAjudan(besokWWK, tglBesok, "Wakil Wali Kota", userMap);

      if (!pesan) continue;

      const ok = await kirimWA(u.noWA, pesan);
      if (ok) sent++; else failed++;
      results.push({ username: u.username, role: u.role, ok });
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("[ajudan] Selesai. Terkirim:", sent, "| Gagal:", failed);
    return res.status(200).json({
      ok: true, tglBesok,
      besokWK: besokWK.length, besokWWK: besokWWK.length,
      sent, failed, results
    });

  } catch (err) {
    console.error("[ajudan] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
