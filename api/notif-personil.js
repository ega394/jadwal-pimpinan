// ============================================================
//  /api/notif-personil.js — Rekap Besok untuk Personil 16:10 WITA
//  Cron: "10 8 * * *" UTC (= 16:10 WITA)
//
//  Penerima: Personil/Staf yang punya ≥1 penugasan besok
//  Isi: agenda besok yang mereka ditugaskan + nama rekan bertugas
//  Skip jika tidak ada penugasan besok.
//
//  vercel.json:
//  { "path": "/api/notif-personil", "schedule": "10 8 * * *" }
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
    console.error("[personil] Gagal kirim ke", nomor, e.message);
    return false;
  }
}

// Susun pesan personil: hanya kegiatan di mana dia ditugaskan
function pesanPersonil(namaPersonil, events, tglBesok, userMap) {
  const sorted = [...events].sort((a, b) => (a.jam||"").localeCompare(b.jam||""));

  let lines = [
    "📋 *Agenda & Penugasan Besok*",
    fmtTgl(tglBesok),
    "",
    "*" + namaPersonil + "* bertugas pada:",
    "",
  ];

  sorted.forEach((ev, i) => {
    // Rekan bertugas = personil lain di event yang sama
    const rekan = (ev.personil||[])
      .filter(un => userMap[un]?.nama !== namaPersonil)
      .map(un => userMap[un]?.nama || un);

    const pimpinanList = [];
    if ((ev.untukPimpinan||[]).includes("walikota"))
      pimpinanList.push(ev.delegasiKeWWK ? "WK (Delegasi ke WWK)" : "Wali Kota");
    if ((ev.untukPimpinan||[]).includes("wakilwalikota") || ev.delegasiKeWWK)
      pimpinanList.push("Wakil Wali Kota");

    lines.push((i+1) + ". ⏰ " + (ev.jam||"-") + " | *" + (ev.namaAcara||"-") + "*");
    if (ev.lokasi)        lines.push("   📍 " + ev.lokasi);
    if (ev.penyelenggara) lines.push("   🏢 " + ev.penyelenggara);
    if (pimpinanList.length) lines.push("   👔 " + pimpinanList.join(" & "));
    if (ev.catatanPenugasan) lines.push("   📝 " + ev.catatanPenugasan);
    if (rekan.length)
      lines.push("   🤝 Bertugas bersama: " + rekan.join(", "));
    lines.push("");
  });

  lines.push("Silakan siapkan perlengkapan yang diperlukan. Sampai jumpa besok! 🙏");
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
    console.log("[personil] Rekap penugasan besok:", tglBesok);

    const [allJadwal, allUsers] = await Promise.all([getAllJadwal(), getAllUsers()]);
    const userMap = {};
    allUsers.forEach(u => { userMap[u.username] = u; });

    const besokEvents = allJadwal.filter(ev =>
      ev.tanggal === tglBesok && ev.alur === "disetujui" && !ev.tersembunyi
    );

    if (besokEvents.length === 0) {
      console.log("[personil] Tidak ada kegiatan besok, skip.");
      return res.status(200).json({ ok: true, sent: 0, message: "Tidak ada kegiatan besok" });
    }

    // Kumpulkan semua username personil yang ditugaskan besok
    const personilBesok = new Map(); // username → [events]
    besokEvents.forEach(ev => {
      (ev.personil||[]).forEach(un => {
        if (!personilBesok.has(un)) personilBesok.set(un, []);
        personilBesok.get(un).push(ev);
      });
    });

    let sent = 0, failed = 0;
    const results = [];

    for (const [username, evMereka] of personilBesok) {
      const u = userMap[username];
      if (!u?.noWA) continue;

      const pesan = pesanPersonil(u.nama || username, evMereka, tglBesok, userMap);
      const ok    = await kirimWA(u.noWA, pesan);
      if (ok) sent++; else failed++;
      results.push({ username, jumlahKegiatan: evMereka.length, ok });
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("[personil] Selesai. Terkirim:", sent, "| Gagal:", failed);
    return res.status(200).json({
      ok: true, tglBesok, kegiatanCount: besokEvents.length,
      personilCount: personilBesok.size, sent, failed, results
    });

  } catch (err) {
    console.error("[personil] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
