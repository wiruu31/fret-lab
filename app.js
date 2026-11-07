/* ================================================================
   APP.JS - OTAK APLIKASI (PENGHUBUNG)  [FretLab v1.1.0]
   Tugas file ini: menyimpan "keadaan" aplikasi (tab aktif, pilihan
   chord, lagu yang dibuka), memasang semua event (klik, submit),
   membuka form, menjalankan tuner dan auto scroll, lalu memanggil
   Data (storage.js), Tuner (audio.js), dan fungsi render
   (ui.js, halaman.js).

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   STATE | RENDER & TAB | NOTIFIKASI | DIALOG & FORM | CHORD | TUNER |
   LAGU & SCROLL | CADANGAN | PWA | AKSI KLIK | AKSI SUBMIT | MULAI
   ================================================================ */


/* ===== STATE START =====
   Keadaan aplikasi yang berubah-ubah.
   ================================================================ */
const state = {
  tab: "chord",                // chord | tuner | lagu | pengaturan
  data: null,                  // salinan data terbaru dari Data.ambilSemua()
  chord: { root: 0, grup: "semua", cari: "" },
  detail: null,                // chord yang sedang dibuka di dialog
  tuner: { aktif: false, pilih: 0, waktuTerakhir: 0, riwayat: [] },
  lagu: { bukaId: null, cari: "", lirikSaja: false, scroll: false },
  umum: null,                  // aksi dialog umum yang sedang terbuka
  promptPasang: null           // penawaran "pasang aplikasi" dari browser (kalau ada)
};

const JUDUL_HALAMAN = { chord: "Chord", tuner: "Tuner", lagu: "Lagu", pengaturan: "Pengaturan" };

function hariIni() {
  const d = new Date();
  const dua = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate());
}

const laguAktif = () => (state.lagu.bukaId ? state.data.lagu.find((l) => l.id === state.lagu.bukaId) || null : null);
/* ===== STATE END ===== */


/* ===== RENDER & TAB START =====
   Menggambar ulang semua halaman dan berpindah tab.
   ================================================================ */
async function muatUlang() {
  state.data = await Data.ambilSemua();
  /* lagu yang dibuka sudah dihapus? kembali ke daftar */
  if (state.lagu.bukaId && !laguAktif()) state.lagu.bukaId = null;
  render();
}

/* Tuner digambar lewat sini supaya nada senar pilihan ikut tampil */
function gambarTuner() {
  renderTuner(state.data, state.tuner);
  const p = state.data.pengaturan;
  const tun = tuningAktif(state.data);
  state.tuner.pilih = Math.min(state.tuner.pilih, tun.senar.length - 1);
  if (p.modeTuner === "manual") {
    perbaruiSenar(state.tuner.pilih, true, null);
    const el = $("#tnNada");
    if (el) el.textContent = namaMidi(tun.senar[state.tuner.pilih]);
  }
}

function render() {
  terapkanTema(state.data.pengaturan);
  renderChord(state.data, state.chord);
  gambarTuner();
  renderLagu(state.data, state.lagu);
  renderPengaturan(state.data, infoPasang());
  perbaruiHeader();
  perbaruiFab();
}

function perbaruiHeader() {
  const baca = state.tab === "lagu" ? laguAktif() : null;
  $("#judulHalaman").textContent = baca ? baca.judul : (JUDUL_HALAMAN[state.tab] || "");
  $("#btnKembali").hidden = !baca;
  $(".app-title .logo").toggleAttribute("hidden", Boolean(baca));
}

/* Tombol + hanya dipakai untuk menambah lagu (di daftar lagu) */
function perbaruiFab() {
  $("#fabTambah").hidden = !(state.tab === "lagu" && !state.lagu.bukaId);
  $("#fabTambah").setAttribute("aria-label", "Tambah lagu");
}

function pindahTab(nama) {
  if (nama !== "tuner") hentikanTuner();
  if (nama !== state.tab) hentikanScroll();
  state.tab = nama;

  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === "view-" + nama));
  $$(".nav-btn").forEach((b) => {
    const aktif = b.dataset.tab === nama;
    b.classList.toggle("is-active", aktif);
    b.setAttribute("aria-current", aktif ? "page" : "false");
  });
  perbaruiHeader();
  perbaruiFab();
  window.scrollTo(0, 0);
}
/* ===== RENDER & TAB END ===== */


/* ===== NOTIFIKASI START =====
   Pesan kecil di bawah layar, dan pembungkus pengaman error.
   ================================================================ */
let timerToast = null;

function toast(pesan, galat) {
  const el = $("#toast");
  el.textContent = pesan;
  el.classList.toggle("is-error", Boolean(galat));
  el.classList.add("is-show");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => el.classList.remove("is-show"), 2800);
}

/* Jalankan fungsi; kalau error, tampilkan pesannya sebagai notifikasi */
async function aman(fn) {
  try {
    await fn();
  } catch (error) {
    console.error(error);
    toast(error && error.message ? error.message : "Terjadi kesalahan", true);
  }
}
/* ===== NOTIFIKASI END ===== */


/* ===== DIALOG & FORM START =====
   Dua dialog: #dialogChord (detail chord) dan #dialogUmum (satu form
   serbaguna untuk lagu, tuning, dll).
   bukaFormUmum({ judul, info, fields, simpan, hapus, labelSimpan,
                  tombolTempel, konfirmasiHapus, pesan })
   field: { nama, label, tipe: text|select|area, nilai, opsi,
            placeholder, maks, wajib }
   simpan(nilai) dan hapus() boleh async; dialog tertutup hanya
   kalau berhasil (kalau error, pesannya tampil dan form tetap).
   ================================================================ */
function bukaDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function tutupForm() {
  ["#dialogChord", "#dialogUmum"].forEach((s) => {
    const d = $(s);
    if (typeof d.close === "function") { if (d.open) d.close(); }
    else d.removeAttribute("open");
  });
  state.umum = null;
  state.detail = null;
}

function pasangDialog() {
  ["#dialogChord", "#dialogUmum"].forEach((s) => {
    const dialog = $(s);
    /* Ketuk area gelap di luar dialog = tutup */
    dialog.addEventListener("click", (e) => { if (e.target === dialog) tutupForm(); });
    /* Tombol Esc menutup dialog: bersihkan keadaan juga */
    dialog.addEventListener("close", () => { state.umum = null; state.detail = null; });
  });
}

function htmlField(f) {
  const id = "u_" + f.nama;
  const wajib = f.wajib ? " required" : "";
  let input;

  if (f.tipe === "select") {
    input = '<select id="' + id + '" name="' + f.nama + '"' + wajib + ">" +
      f.opsi.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(f.nilai) ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") +
      "</select>";
  } else if (f.tipe === "area") {
    input = '<textarea id="' + id + '" name="' + f.nama + '" class="area-teks" rows="12" spellcheck="false" autocapitalize="none" autocorrect="off" wrap="off" placeholder="' +
      esc(f.placeholder || "") + '"' + wajib + ">" + esc(f.nilai || "") + "</textarea>";
  } else {
    input = '<input type="text" id="' + id + '" name="' + f.nama + '" maxlength="' + (f.maks || 40) + '" placeholder="' +
      esc(f.placeholder || "") + '" value="' + esc(f.nilai || "") + '"' + wajib + ">";
  }
  return '<div class="field"><label for="' + id + '">' + esc(f.label) + "</label>" + input + "</div>";
}

function bukaFormUmum(cfg) {
  state.umum = cfg;
  $("#judulUmum").textContent = cfg.judul;
  const info = $("#infoUmum");
  info.hidden = !cfg.info;
  info.textContent = cfg.info || "";

  let isi = cfg.fields.map(htmlField).join("");
  if (cfg.tombolTempel) {
    const penanda = '<div class="field">';
    const i = isi.indexOf('<div class="field"><label for="u_' + cfg.tombolTempel + '"');
    const tombol = '<div class="aksi-baris aksi-baris--kiri"><button type="button" class="mini-btn" data-aksi="tempel-clip" data-field="' +
      esc(cfg.tombolTempel) + '">tempel dari clipboard</button></div>';
    isi = i >= 0 ? isi.slice(0, i) + tombol + isi.slice(i) : isi + tombol;
    void penanda;
  }
  $("#isiUmum").innerHTML = isi;
  $("#btnHapusUmum").hidden = !cfg.hapus;
  $("#btnSimpanUmum").textContent = cfg.labelSimpan || "simpan";
  bukaDialog($("#dialogUmum"));
}

function bacaFormUmum(cfg) {
  const form = $("#formUmum");
  const nilai = {};
  cfg.fields.forEach((f) => { nilai[f.nama] = form.elements[f.nama].value; });
  return nilai;
}

async function kirimFormUmum() {
  const cfg = state.umum;
  if (!cfg) return;
  await cfg.simpan(bacaFormUmum(cfg));
  tutupForm();
  toast(cfg.pesan || "tersimpan");
  await muatUlang();
}

async function hapusFormUmum() {
  const cfg = state.umum;
  if (!cfg || !cfg.hapus) return;
  if (!confirm(cfg.konfirmasiHapus || "Hapus data ini?")) return;
  await cfg.hapus();
  tutupForm();
  toast("dihapus");
  await muatUlang();
}

/* --- Form lagu --- */
function formLagu(id) {
  const l = id ? state.data.lagu.find((x) => x.id === id) : null;
  bukaFormUmum({
    judul: l ? "Ubah lagu" : "Lagu baru",
    info: "Tempel chord + lirik. Baris chord ditaruh di atas baris lirik, dan posisi chord mengikuti kolom hurufnya. Label seperti \"Intro :\" atau \"Reff :\" boleh dipakai.",
    fields: [
      { nama: "judul", label: "judul lagu", tipe: "text", nilai: l ? l.judul : "", maks: 60, wajib: true },
      { nama: "artis", label: "artis (opsional)", tipe: "text", nilai: l ? l.artis : "", maks: 60 },
      { nama: "teks", label: "chord + lirik", tipe: "area", nilai: l ? l.teks : "", wajib: true,
        placeholder: "Intro : C G Am F\n\nC          G\nContoh baris lirik" }
    ],
    tombolTempel: "teks",
    simpan: (v) => (l ? Data.ubahLagu(l.id, v) : Data.tambahLagu(v)),
    hapus: l ? async () => {
      await Data.hapusLagu(l.id);
      if (state.lagu.bukaId === l.id) { hentikanScroll(); state.lagu.bukaId = null; }
    } : null,
    konfirmasiHapus: "Hapus lagu ini?",
    pesan: l ? "lagu diubah" : "lagu ditambahkan"
  });
}

/* --- Form tuning baru --- */
function formTuning() {
  bukaFormUmum({
    judul: "Tuning baru",
    info: "Tulis nada tiap senar dari yang terbawah (paling tebal) ke teratas, dipisah spasi. Pakai angka oktaf, misal E2 A2 D3 G3 B3 E4. Kres: F#3, mol: Bb3.",
    fields: [
      { nama: "nama", label: "nama tuning", tipe: "text", maks: 30, wajib: true, placeholder: "misal: Drop D tinggi" },
      { nama: "kelompok", label: "kelompok", tipe: "select", nilai: "gitar", opsi: KELOMPOK_TUNING.map((k) => [k.id, k.nama]) },
      { nama: "senar", label: "nada senar", tipe: "text", maks: 60, wajib: true, placeholder: "E2 A2 D3 G3 B3 E4" }
    ],
    simpan: async (v) => {
      const senar = parseTuningTeks(v.senar);
      const id = await Data.tambahTuning({ nama: v.nama, kelompok: v.kelompok, senar: senar });
      await Data.setPengaturan({ tuningId: id });
      state.tuner.pilih = 0;
      state.tuner.riwayat = [];
    },
    pesan: "tuning ditambahkan"
  });
}
/* ===== DIALOG & FORM END ===== */


/* ===== CHORD START =====
   Detail chord dibuka dari kartu chord atau dari chord di dalam lagu.
   ================================================================ */
function segarDetail() {
  if (!state.detail) return;
  $("#isiChord").innerHTML = htmlDetailChord(state.data, state.detail);
}

function bukaDetailChord(root, tipeId, bass) {
  if (!TIPE_ID[tipeId]) return;
  state.detail = { inst: state.data.pengaturan.instrumenChord, root: root, tipeId: tipeId, bass: bass, idx: 0 };
  segarDetail();
  bukaDialog($("#dialogChord"));
}

const bacaBass = (v) => (v === undefined || v === "" || v === null ? null : Number(v));

async function toggleFavorit(root, tipeId) {
  const kunci = kunciFav(state.data.pengaturan.instrumenChord, root, tipeId);
  const jadi = await Data.toggleFavorit(kunci);
  state.data = await Data.ambilSemua();
  renderGridChord(state.data, state.chord);
  segarDetail();
  toast(jadi ? "ditambahkan ke favorit" : "dihapus dari favorit");
}
/* ===== CHORD END ===== */


/* ===== TUNER START =====
   Mikrofon hanya jalan saat tab Tuner terbuka dan tombol mulai
   ditekan. Berhenti otomatis kalau pindah tab / aplikasi disembunyikan.
   ================================================================ */
function pesanMic(e) {
  const nama = e && e.name;
  if (nama === "NotAllowedError" || nama === "SecurityError") return "Izin mikrofon ditolak. Aktifkan lewat pengaturan browser, lalu coba lagi";
  if (nama === "NotFoundError" || nama === "OverconstrainedError") return "Mikrofon tidak ditemukan di perangkat ini";
  if (nama === "NotReadableError") return "Mikrofon sedang dipakai aplikasi lain";
  return e && e.message ? e.message : "Mikrofon tidak bisa dibuka";
}

function hentikanTuner() {
  if (Tuner.jalan) Tuner.berhenti();
  if (state.tuner.aktif) {
    state.tuner.aktif = false;
    state.tuner.riwayat = [];
    if (state.data) gambarTuner();
  }
}

/* Dipanggil tiap frame oleh Tuner dengan hasil deteksiPitch (atau null) */
function tanganiFrame(h) {
  const t = state.tuner;
  const sekarang = performance.now();
  if (sekarang < Tuner.abaikanSampai) return;

  const p = state.data.pengaturan;
  const manual = p.modeTuner === "manual";

  if (!h) {
    if (sekarang - t.waktuTerakhir > 800) { t.riwayat = []; perbaruiTuner(null, t, manual); }
    return;
  }
  t.waktuTerakhir = sekarang;

  /* nada berubah jauh (ganti senar): mulai pemulusan dari awal */
  if (t.riwayat.length && Math.abs(1200 * Math.log2(h.freq / median(t.riwayat))) > 80) t.riwayat = [];
  t.riwayat.push(h.freq);
  if (t.riwayat.length > 5) t.riwayat.shift();
  const f = median(t.riwayat);

  const tun = tuningAktif(state.data);
  const frek = tun.senar.map((m) => frekDariMidi(m, p.a4));
  let idx = Math.min(t.pilih, frek.length - 1);
  if (!manual) {
    let terbaik = Infinity;
    frek.forEach((fs, i) => {
      const jarak = Math.abs(1200 * Math.log2(f / fs));
      if (jarak < terbaik) { terbaik = jarak; idx = i; }
    });
  }
  perbaruiTuner({
    nada: namaMidi(tun.senar[idx]),
    cent: 1200 * Math.log2(f / frek[idx]),
    freq: f,
    idx: idx
  }, t, manual);
}

async function toggleTuner() {
  if (state.tuner.aktif) { hentikanTuner(); return; }
  try {
    await Tuner.mulai(tanganiFrame);
  } catch (e) {
    Tuner.berhenti();
    throw new Error(pesanMic(e));
  }
  state.tuner.aktif = true;
  state.tuner.riwayat = [];
  gambarTuner();
}
/* ===== TUNER END ===== */


/* ===== LAGU & SCROLL START =====
   Auto scroll: halaman bergulir sendiri dengan kecepatan 1..10.
   Berhenti saat sampai bawah, pindah tab, atau tombol ditekan lagi.
   Selama jari menyentuh layar, gulir berhenti sementara. Layar
   dijaga tetap menyala (Wake Lock) selama auto scroll aktif.
   ================================================================ */
const KECEPATAN_PX = [0, 8, 14, 20, 28, 36, 46, 58, 72, 90, 110];   // piksel per detik
const Scroll = { raf: 0, terakhir: 0, sisa: 0, tahan: false, kunci: null };

async function kunciLayar() {
  try {
    if ("wakeLock" in navigator) Scroll.kunci = await navigator.wakeLock.request("screen");
  } catch (e) { /* tidak didukung: abaikan */ }
}

function lepasLayar() {
  try { if (Scroll.kunci) Scroll.kunci.release(); } catch (e) { /* abaikan */ }
  Scroll.kunci = null;
}

function langkahScroll(waktu) {
  if (!state.lagu.scroll) return;
  Scroll.raf = requestAnimationFrame(langkahScroll);
  const dt = Math.min(100, waktu - Scroll.terakhir) / 1000;
  Scroll.terakhir = waktu;
  if (Scroll.tahan) return;

  Scroll.sisa += KECEPATAN_PX[state.data.pengaturan.scrollLagu] * dt;
  const px = Math.floor(Scroll.sisa);
  if (px >= 1) {
    Scroll.sisa -= px;
    window.scrollBy(0, px);
  }
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) hentikanScroll();
}

function mulaiScroll() {
  if (state.lagu.scroll) return;
  state.lagu.scroll = true;
  Scroll.terakhir = performance.now();
  Scroll.sisa = 0;
  Scroll.raf = requestAnimationFrame(langkahScroll);
  kunciLayar();
  segarBaca();
}

function hentikanScroll() {
  if (!state.lagu.scroll) return;
  state.lagu.scroll = false;
  cancelAnimationFrame(Scroll.raf);
  lepasLayar();
  segarBaca();
}

function segarBaca() {
  const l = laguAktif();
  if (l) perbaruiBaca(state.data, state.lagu, l);
}

/* Ubah pengaturan kecil tanpa menggambar ulang seluruh halaman */
async function simpanKecil(p) {
  await Data.setPengaturan(p);
  Object.assign(state.data.pengaturan, p);
  segarBaca();
}

async function geserTranspose(arah) {
  const l = laguAktif();
  if (!l) return;
  const baru = arah === 0 ? 0 : batasi(l.transpose + arah, -11, 11);
  if (baru === l.transpose) return;
  await Data.setTransposeLagu(l.id, baru);
  l.transpose = baru;
  segarBaca();
}
/* ===== LAGU & SCROLL END ===== */


/* ===== CADANGAN START =====
   Ekspor / impor / reset data. Karena data hanya tersimpan di
   browser ini, ekspor JSON secara berkala itu PENTING.
   ================================================================ */
function unduh(namaFile, teks, mime) {
  const blob = new Blob([teks], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function eksporJSON() {
  unduh("fretlab-" + hariIni() + ".json", await Data.eksporJSON(), "application/json");
  toast("cadangan JSON diunduh");
}

async function imporDariFile(file) {
  if (!file) return;
  if (!confirm("Impor akan MENGGANTI semua data yang ada sekarang. Lanjut?")) return;
  await Data.imporJSON(await file.text());
  hentikanScroll();
  state.lagu.bukaId = null;
  toast("data berhasil diimpor");
  await muatUlang();
}

async function resetData() {
  if (!confirm("Hapus SEMUA lagu, favorit, dan tuning buatan sendiri, lalu mulai dari awal? Pastikan sudah ekspor cadangan.")) return;
  await Data.resetSemua();
  hentikanScroll();
  state.lagu.bukaId = null;
  toast("data direset");
  await muatUlang();
}
/* ===== CADANGAN END ===== */


/* ===== PWA START =====
   Agar web ini bisa dipasang seperti aplikasi & jalan offline.
   File terkait: manifest.webmanifest, sw.js, folder icons/.
   Data tetap di localStorage perangkat, tidak dikirim ke mana pun.
   ================================================================ */
function sudahTerpasang() {
  try {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  } catch (e) { return false; }
}

/* Dipakai halaman Pengaturan untuk memilih petunjuk yang pas */
function infoPasang() {
  const ua = navigator.userAgent || "";
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return { terpasang: sudahTerpasang(), bisa: Boolean(state.promptPasang), ios: ios };
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.promptPasang = e;
  if (state.data) renderPengaturan(state.data, infoPasang());
});

window.addEventListener("appinstalled", () => {
  state.promptPasang = null;
  toast("aplikasi terpasang");
  if (state.data) renderPengaturan(state.data, infoPasang());
});

async function pasangAplikasi() {
  const p = state.promptPasang;
  if (!p) return;
  p.prompt();
  await p.userChoice;
  state.promptPasang = null;
  renderPengaturan(state.data, infoPasang());
}

/* Daftarkan service worker (hanya jalan lewat http/https, bukan file://) */
function daftarkanSW() {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("service worker gagal:", e));
}
/* ===== PWA END ===== */


/* ===== AKSI KLIK START =====
   Setiap elemen ber-atribut data-aksi="nama" memicu fungsi di bawah.
   Mau menambah tombol baru? Beri data-aksi di HTML, lalu daftarkan
   namanya di sini.
   ================================================================ */
async function simpanPengaturan(p, pesan) {
  await Data.setPengaturan(p);
  if (pesan) toast(pesan);
  await muatUlang();
}

const AKSI = {
  "tab": (el) => pindahTab(el.dataset.tab),

  "fab": () => formLagu(null),

  /* --- Chord --- */
  "set-inst": (el) => simpanPengaturan({ instrumenChord: el.dataset.inst }),
  "pilih-root": (el) => { state.chord.root = Number(el.dataset.root); state.chord.cari = ""; renderChord(state.data, state.chord); },
  "pilih-grup": (el) => { state.chord.grup = el.dataset.grup; state.chord.cari = ""; renderChord(state.data, state.chord); },
  "buka-chord": (el) => bukaDetailChord(Number(el.dataset.r), el.dataset.t, bacaBass(el.dataset.b)),
  "fav-chord": (el) => toggleFavorit(Number(el.dataset.r), el.dataset.t),
  "fav-detail": () => { if (state.detail) return toggleFavorit(state.detail.root, state.detail.tipeId); },
  "chord-var": (el) => { if (state.detail) { state.detail.idx = Number(el.dataset.idx); segarDetail(); } },
  "tutup-dialog": () => tutupForm(),

  /* --- Tuner --- */
  "tuner-toggle": () => toggleTuner(),
  "set-mode-tuner": (el) => { state.tuner.riwayat = []; return simpanPengaturan({ modeTuner: el.dataset.mode }); },
  "tuner-senar": (el) => {
    const i = Number(el.dataset.i);
    const tun = tuningAktif(state.data);
    const manual = state.data.pengaturan.modeTuner === "manual";
    if (manual) {
      state.tuner.pilih = i;
      state.tuner.riwayat = [];
      perbaruiSenar(i, true, null);
      $("#tnNada").textContent = namaMidi(tun.senar[i]);
    }
    Tuner.bunyikan(frekDariMidi(tun.senar[i], state.data.pengaturan.a4));
  },
  "tuning-baru": () => formTuning(),
  "tuning-hapus": async () => {
    const tun = tuningAktif(state.data);
    if (!tun.kustom) return;
    if (!confirm("Hapus tuning \"" + tun.nama + "\"?")) return;
    await Data.hapusTuning(tun.id);
    state.tuner.pilih = 0;
    toast("tuning dihapus");
    await muatUlang();
  },

  /* --- Lagu --- */
  "buka-lagu": (el) => {
    state.lagu.bukaId = el.dataset.id;
    renderLagu(state.data, state.lagu);
    perbaruiHeader();
    perbaruiFab();
    window.scrollTo(0, 0);
  },
  "lagu-kembali": () => {
    hentikanScroll();
    state.lagu.bukaId = null;
    renderLagu(state.data, state.lagu);
    perbaruiHeader();
    perbaruiFab();
    window.scrollTo(0, 0);
  },
  "edit-lagu": (el) => formLagu(el.dataset.id),
  "lirik-saja": () => { state.lagu.lirikSaja = !state.lagu.lirikSaja; segarBaca(); },
  "font": (el) => simpanKecil({ fontLagu: batasi(state.data.pengaturan.fontLagu + Number(el.dataset.arah), 10, 28) }),
  "transpose": (el) => geserTranspose(Number(el.dataset.arah)),
  "scroll-toggle": () => { if (state.lagu.scroll) hentikanScroll(); else mulaiScroll(); },
  "scroll-kec": (el) => simpanKecil({ scrollLagu: batasi(state.data.pengaturan.scrollLagu + Number(el.dataset.arah), 1, 10) }),
  "chord-lagu": (el) => bukaDetailChord(Number(el.dataset.r), el.dataset.t, bacaBass(el.dataset.b)),

  /* --- Form umum --- */
  "hapus-umum": () => hapusFormUmum(),
  "tempel-clip": async (el) => {
    const kolom = $("#u_" + el.dataset.field);
    if (!kolom) return;
    try {
      const teks = await navigator.clipboard.readText();
      if (!teks) throw new Error("kosong");
      kolom.value = teks;
      toast("teks ditempel");
    } catch (e) {
      kolom.focus();
      toast("Clipboard tidak bisa dibaca. Tekan lama di kolom teks lalu pilih Tempel", true);
    }
  },

  /* --- Pengaturan --- */
  "set-mode":   (el) => simpanPengaturan({ mode: el.dataset.mode }),
  "set-preset": (el) => simpanPengaturan({ aksen: el.dataset.hex, preset: el.dataset.preset }),
  "set-a4":     (el) => simpanPengaturan({ a4: Number(el.dataset.hz) }, "acuan A4 = " + el.dataset.hz + " Hz"),
  "ekspor-json": () => eksporJSON(),
  "impor":       () => $("#inputImpor").click(),
  "reset-data":  () => resetData(),
  "pasang-app":  () => pasangAplikasi()
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-aksi]");
  if (!el) return;
  const fn = AKSI[el.dataset.aksi];
  if (fn) aman(() => fn(el));
});

/* Chord di dalam lagu juga bisa dibuka dengan keyboard */
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("ch")) {
    e.preventDefault();
    e.target.click();
  }
});
/* ===== AKSI KLIK END ===== */


/* ===== AKSI SUBMIT START =====
   Form dialog umum (#formUmum) diproses sebagai "umum".
   Di bagian ini juga: pencarian, pilih tuning, warna bebas, dan
   pengaman layar (tuner & scroll berhenti saat aplikasi disembunyikan).
   ================================================================ */
document.addEventListener("submit", (e) => {
  const form = e.target.closest("#formUmum");
  if (!form) return;
  e.preventDefault();
  aman(() => kirimFormUmum());
});

document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id === "inputCariChord") {
    state.chord.cari = e.target.value;
    renderGridChord(state.data, state.chord);
  } else if (id === "inputCariLagu") {
    state.lagu.cari = e.target.value;
    renderDaftarLagu(state.data, state.lagu);
  } else if (id === "warnaKustom") {
    /* Pilih warna bebas: langsung terlihat, disimpan saat selesai memilih */
    terapkanTema(Object.assign({}, state.data.pengaturan, { aksen: e.target.value }));
  }
});

document.addEventListener("change", (e) => {
  const id = e.target.id;
  if (id === "warnaKustom") {
    aman(() => simpanPengaturan({ aksen: e.target.value, preset: "kustom" }, "warna tema diubah"));
  } else if (id === "pilihTuning") {
    aman(async () => {
      state.tuner.pilih = 0;
      state.tuner.riwayat = [];
      await simpanPengaturan({ tuningId: e.target.value });
    });
  }
});

/* Tahan gulir otomatis selama jari menyentuh layar */
["pointerdown", "touchstart"].forEach((n) => document.addEventListener(n, () => { Scroll.tahan = true; }, { passive: true }));
["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((n) => document.addEventListener(n, () => { Scroll.tahan = false; }, { passive: true }));
document.addEventListener("wheel", () => { Scroll.sisa = 0; }, { passive: true });

/* Aplikasi disembunyikan / pindah aplikasi: matikan mikrofon dan auto scroll */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { hentikanTuner(); hentikanScroll(); }
});
/* ===== AKSI SUBMIT END ===== */


/* ===== MULAI START =====
   Dijalankan sekali saat halaman dibuka.
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  aman(async () => {
    pasangDialog();

    /* Pilih file cadangan untuk diimpor */
    $("#inputImpor").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";   // supaya file yang sama bisa dipilih lagi
      aman(() => imporDariFile(file));
    });

    /* Mode "otomatis" mengikuti pengaturan terang/gelap perangkat */
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const ganti = () => { if (state.data && state.data.pengaturan.mode === "auto") terapkanTema(state.data.pengaturan); };
      if (mq.addEventListener) mq.addEventListener("change", ganti);
    } catch (e) { /* abaikan */ }

    /* Tahun hak cipta otomatis */
    $("#tahunCopyright").textContent = new Date().getFullYear();

    await muatUlang();
    pindahTab("chord");

    daftarkanSW();

    /* Minta browser agar tidak menghapus data otomatis saat memori penuh */
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) { /* abaikan */ }
  });
});
/* ===== MULAI END ===== */
