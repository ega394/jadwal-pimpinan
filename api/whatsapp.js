// ============================================================
//  /api/whatsapp.js  —  Notifikasi WhatsApp via Fonnte
//  Deploy di Vercel sebagai file: api/whatsapp.js
//
//  ENV yang wajib diset di Vercel Dashboard:
//    FONNTE_TOKEN = token dari https://fonnte.com
// ============================================================

export default async function handler(req, res) {
  // Hanya terima POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
  if (!FONNTE_TOKEN) {
    console.error("FONNTE_TOKEN tidak diset di environment variables");
    return res.status(500).json({ error: "WA service not configured" });
  }

  const {
    to,
    namaAcara,
    tanggal,
    jam,
    penyelenggara,
    lokasi,
    event,
    submittedBy,
    catatanTolak,
    labelPimpinan,
  } = req.body || {};

  if (!to) {
    return res.status(400).json({ error: "Nomor tujuan (to) wajib diisi" });
  }

  // Normalisasi nomor: 08xxx → 628xxx
  const nomor = to.trim().replace(/^0/, "62").replace(/\D/g, "");

  // ── Susun isi pesan berdasarkan jenis event ──────────────
  let pesan = "";

  const infoJadwal = [
    `📋 *${namaAcara || "-"}*`,
    `📅 ${tanggal || "-"} pukul ${jam || "-"} WITA`,
    penyelenggara ? `🏢 ${penyelenggara}` : null,
    lokasi        ? `📍 ${lokasi}`        : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (event === "submit") {
    const oleh = submittedBy ? ` oleh *${submittedBy}*` : "";
    pesan =
      `📬 *Jadwal Baru Masuk${oleh}*\n\n` +
      infoJadwal +
      `\n\nSilakan buka sistem untuk mereview & menyetujui jadwal ini.\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else if (event === "kasubbag_approve") {
    pesan =
      `📤 *Jadwal Diteruskan ke Kabag*\n\n` +
      infoJadwal +
      `\n\nJadwal ini sudah disetujui Kasubbag dan menunggu persetujuan akhir Kabag.\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else if (event === "approved") {
    pesan =
      `✅ *Jadwal Disetujui & Dipublikasi*\n\n` +
      infoJadwal +
      `\n\nJadwal ini sudah resmi dipublikasikan dan dapat dilihat di sistem.\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else if (event === "penugasan") {
    const nama    = req.body.namaPersonil ? `*${req.body.namaPersonil}*` : "Anda";
    const catatanPen = req.body.catatanPenugasan
      ? `\n\n📝 *Catatan penugasan:*\n${req.body.catatanPenugasan}`
      : "";
    pesan =
      `🎯 *Penugasan Baru untuk ${nama}*\n\n` +
      infoJadwal +
      catatanPen +
      `\n\nSilakan buka sistem untuk melihat detail penugasan Anda.\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else if (event === "rejected") {
    const catatan = catatanTolak ? `\n\n📝 *Catatan:* ${catatanTolak}` : "";
    pesan =
      `❌ *Jadwal Dikembalikan*\n\n` +
      infoJadwal +
      catatan +
      `\n\nSilakan perbaiki dan kirim ulang melalui sistem.\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else if (event === "undangan_sore") {
    // ── Notif ke ajudan: ada undangan masuk sore/malam (≥16.00 WITA) ──
    const pim = labelPimpinan ? `*${labelPimpinan}*` : "Pimpinan";
    pesan =
      `🔔 *Undangan Baru Masuk (Petang/Malam)*\n\n` +
      infoJadwal +
      `\n\n` +
      `⏰ Undangan ini baru diterima *setelah pukul 16.00 WITA*.\n\n` +
      `Mohon segera:\n` +
      `1️⃣ Informasikan ke ${pim}\n` +
      `2️⃣ Konfirmasi kehadiran melalui sistem\n` +
      `3️⃣ Pastikan persiapan sudah matang sebelum hari pelaksanaan\n\n` +
      `✅ Cek & konfirmasi di:\n` +
      `prokopim.tarakankota.go.id\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else if (event === "delegasi_wwk") {
    // ── Notif ke ajudan WWK: WK mendelegasikan ke Wakil WK ──
    pesan =
      `↩️ *Disposisi dari Wali Kota*\n\n` +
      `Wali Kota telah *mendelegasikan* kehadiran pada kegiatan berikut kepada Wakil Wali Kota:\n\n` +
      infoJadwal +
      `\n\n` +
      `📌 Mohon segera:\n` +
      `1️⃣ Informasikan ke Wakil Wali Kota\n` +
      `2️⃣ Input konfirmasi kehadiran Wakil WK di sistem\n` +
      `3️⃣ Siapkan berkas/naskah yang diperlukan\n\n` +
      `✅ Cek detail di:\n` +
      `prokopim.tarakankota.go.id\n` +
      `_Sistem Jadwal Pimpinan Kota Tarakan_`;

  } else {
    // Event tidak dikenal — kirim info jadwal generik
    pesan =
      `🔔 *Notifikasi Jadwal*\n\n` +
      infoJadwal +
      `\n\n_Sistem Jadwal Pimpinan Kota Tarakan_`;
  }

  // ── Kirim via Fonnte API ─────────────────────────────────
  try {
    const fonnteRes = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target:  nomor,
        message: pesan,
        // countryCode: "62",  // opsional, aktifkan jika perlu
      }),
    });

    const data = await fonnteRes.json();

    if (!fonnteRes.ok || data.status === false) {
      console.error("Fonnte error:", data);
      return res.status(500).json({ error: "Gagal kirim WA", detail: data });
    }

    return res.status(200).json({ ok: true, detail: data });

  } catch (err) {
    console.error("Fetch ke Fonnte gagal:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
