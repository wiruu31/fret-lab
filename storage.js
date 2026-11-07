/* ================================================================
   STORAGE.JS - URUSAN DATA (SIMPAN / AMBIL)  [FretLab v1.1.0]
   Semua akses data aplikasi lewat objek "Data" di file ini.
   File lain (ui.js, halaman.js, app.js) TIDAK menyentuh localStorage.

   Semua fungsi dibuat async supaya nanti kalau pindah ke database
   online (misal Supabase), cukup ganti ISI file ini.

   Yang disimpan: pengaturan, daftar lagu, chord favorit, dan tuning
   buatan sendiri. Data hanya ada di browser perangkat ini.

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   HELPER | VALIDASI | OBJEK DATA
   ================================================================ */


/* ===== HELPER START =====
   Fungsi kecil pendukung. Tidak perlu diedit.
   ================================================================ */
const KUNCI_DATA = "fretlab.v1";
const KUNCI_LAMA = "fredlab.v1";   // nama lama (v1.0.0): data otomatis dipindah saat pertama dibuka

function buatId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const salin = (obj) => JSON.parse(JSON.stringify(obj));
const teksBersih = (x, maks) => String(x || "").trim().slice(0, maks);

/* Pastikan x bilangan bulat dalam rentang, kalau tidak lempar Error(pesan) */
function intRentang(x, min, maks, pesan) {
  const n = Number(x);
  if (!Number.isInteger(n) || n < min || n > maks) throw new Error(pesan);
  return n;
}

function rangka() {
  return {
    versi: 1,
    pengaturan: {
      mode: "gelap",                       // auto | terang | gelap
      aksen: PRESET_WARNA[0].hex,
      preset: PRESET_WARNA[0].id,
      a4: 440,                             // acuan tuner (Hz)
      instrumenChord: "gitar",             // gitar | ukulele
      tuningId: "standar",
      modeTuner: "auto",                   // auto | manual
      fontLagu: 15,                        // ukuran huruf pembaca lagu (px)
      scrollLagu: 3                        // kecepatan auto scroll 1..10
    },
    lagu: [],          // { id, judul, artis, teks, transpose, dibuat, diubah }
    favorit: [],       // "gitar|0|maj7"
    tuningKustom: []   // { id, nama, kelompok, senar:[midi,...] }
  };
}

function dataAwal() {
  const d = rangka();
  const t = Date.now();
  d.lagu.push({
    id: buatId(), judul: LAGU_CONTOH.judul, artis: LAGU_CONTOH.artis,
    teks: LAGU_CONTOH.teks, transpose: 0, dibuat: t, diubah: t
  });
  return d;
}

/* Rapikan teks lagu: seragamkan baris baru & spasi, jaga spasi di depan
   baris (posisi chord bergantung padanya) */
function rapikanTeksLagu(teks) {
  return String(teks || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\t/g, "    ")
    .split("\n")
    .map((b) => b.replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}
/* ===== HELPER END ===== */


/* ===== VALIDASI START =====
   Pemeriksaan data. Dipakai saat memuat, mengimpor, dan menyimpan.
   ================================================================ */
const okInt = Number.isInteger;

/* Mengembalikan pesan masalah, atau "" kalau data baik */
function cekData(d) {
  if (!d || typeof d !== "object") return "format bukan objek data";
  for (const kunci of ["lagu", "favorit", "tuningKustom"]) {
    if (!Array.isArray(d[kunci])) return "bagian '" + kunci + "' tidak ada";
  }
  if (!d.pengaturan || typeof d.pengaturan !== "object") return "bagian 'pengaturan' tidak ada";

  for (const x of d.lagu) {
    if (!x || typeof x.id !== "string" || typeof x.judul !== "string" || typeof x.teks !== "string" ||
        typeof x.artis !== "string" || !okInt(x.transpose || 0)) return "data lagu rusak";
  }
  for (const x of d.favorit) {
    if (typeof x !== "string" || !uraiKunciFav(x)) return "data favorit rusak";
  }
  for (const x of d.tuningKustom) {
    if (!x || typeof x.id !== "string" || typeof x.nama !== "string" ||
        !KELOMPOK_TUNING.some((k) => k.id === x.kelompok) ||
        !Array.isArray(x.senar) || x.senar.length < 2 || x.senar.length > 8 ||
        x.senar.some((m) => !okInt(m) || m < 24 || m > 96)) return "data tuning rusak";
  }
  return "";
}

/* Merapikan data sebelum dipakai (isi bagian yang kosong) */
function rapikanData(d) {
  d.versi = 1;
  const p = d.pengaturan || {};
  const dasar = rangka().pengaturan;
  d.pengaturan = {
    mode: MODE_TEMA.includes(p.mode) ? p.mode : dasar.mode,
    aksen: /^#[0-9a-fA-F]{6}$/.test(p.aksen || "") ? p.aksen : dasar.aksen,
    preset: String(p.preset || ""),
    a4: okInt(p.a4) && p.a4 >= 400 && p.a4 <= 480 ? p.a4 : dasar.a4,
    instrumenChord: INSTRUMEN[p.instrumenChord] ? p.instrumenChord : dasar.instrumenChord,
    tuningId: String(p.tuningId || dasar.tuningId),
    modeTuner: p.modeTuner === "manual" ? "manual" : "auto",
    fontLagu: okInt(p.fontLagu) && p.fontLagu >= 10 && p.fontLagu <= 28 ? p.fontLagu : dasar.fontLagu,
    scrollLagu: okInt(p.scrollLagu) && p.scrollLagu >= 1 && p.scrollLagu <= 10 ? p.scrollLagu : dasar.scrollLagu
  };
  d.lagu.forEach((l) => {
    l.transpose = Math.max(-11, Math.min(11, l.transpose || 0));
    l.judul = String(l.judul).slice(0, 60);
    l.artis = String(l.artis).slice(0, 60);
    l.dibuat = okInt(l.dibuat) ? l.dibuat : Date.now();
    l.diubah = okInt(l.diubah) ? l.diubah : l.dibuat;
  });
  /* buang duplikat favorit */
  d.favorit = d.favorit.filter((x, i) => d.favorit.indexOf(x) === i);
  return d;
}
/* ===== VALIDASI END ===== */


/* ===== OBJEK DATA START =====
   Satu-satunya pintu akses data. Semua fungsi async.
   Kalau ada yang tidak valid, fungsi melempar Error dengan pesan
   berbahasa Indonesia yang langsung bisa ditampilkan ke pengguna.
   ================================================================ */
const Data = {
  _db: null,

  /* --- Memuat dari penyimpanan browser --- */
  _muat() {
    if (this._db) return this._db;

    let teks = null;
    try { teks = localStorage.getItem(KUNCI_DATA); } catch (e) { /* diblokir */ }
    /* Belum ada data baru tapi ada data dari v1.1.0 (FretLab): pakai itu */
    if (!teks) {
      try { teks = localStorage.getItem(KUNCI_LAMA); } catch (e) { /* diblokir */ }
    }

    if (teks) {
      try {
        const d = JSON.parse(teks);
        if (cekData(d) === "") {
          this._db = rapikanData(d);
          return this._db;
        }
      } catch (e) { /* JSON rusak */ }
      /* Data rusak: simpan salinannya dulu, jangan langsung ditimpa */
      try { localStorage.setItem(KUNCI_DATA + ".rusak", teks); } catch (e) { /* abaikan */ }
    }

    this._db = dataAwal();
    try { localStorage.setItem(KUNCI_DATA, JSON.stringify(this._db)); } catch (e) { /* abaikan */ }
    return this._db;
  },

  /* --- Menulis ke penyimpanan browser (dicek dulu) --- */
  _tulis(db) {
    const masalah = cekData(db);
    if (masalah) throw new Error("Data tidak valid: " + masalah);
    try {
      localStorage.setItem(KUNCI_DATA, JSON.stringify(db));
    } catch (e) {
      throw new Error("Gagal menyimpan data (penyimpanan penuh atau diblokir browser)");
    }
    this._db = db;
  },

  /* --- Ubah data dengan aman ---
     fn mengubah SALINAN data. Hanya kalau berhasil disimpan,
     salinan itu menggantikan data lama. */
  _ubah(fn) {
    const db = salin(this._muat());
    const hasil = fn(db);
    this._tulis(db);
    return hasil;
  },

  /* ------------------------------------------------------------
     [DATA 1] BACA SEMUA
     ------------------------------------------------------------ */
  async ambilSemua() {
    return salin(this._muat());
  },

  /* ------------------------------------------------------------
     [DATA 2] LAGU
     Input: { judul, artis, teks }
     teks = chord di atas lirik (boleh tempel dari situs chord).
     ------------------------------------------------------------ */
  _cekLagu(l) {
    const judul = teksBersih(l.judul, 60);
    if (!judul) throw new Error("Judul lagu tidak boleh kosong");
    const teks = rapikanTeksLagu(l.teks);
    if (!teks.trim()) throw new Error("Teks lagu tidak boleh kosong");
    if (teks.length > 30000) throw new Error("Teks lagu terlalu panjang (maksimal 30.000 huruf)");
    return { judul: judul, artis: teksBersih(l.artis, 60), teks: teks };
  },

  async tambahLagu(l) {
    return this._ubah((db) => {
      const baru = this._cekLagu(l);
      baru.id = buatId();
      baru.transpose = 0;
      baru.dibuat = Date.now();
      baru.diubah = baru.dibuat;
      db.lagu.push(baru);
      return baru.id;
    });
  },

  async ubahLagu(id, l) {
    return this._ubah((db) => {
      const x = db.lagu.find((y) => y.id === id);
      if (!x) throw new Error("Lagu tidak ditemukan");
      Object.assign(x, this._cekLagu(l));
      x.diubah = Date.now();
    });
  },

  async hapusLagu(id) {
    return this._ubah((db) => { db.lagu = db.lagu.filter((x) => x.id !== id); });
  },

  /* Simpan jumlah transpose terakhir lagu (-11..11) */
  async setTransposeLagu(id, n) {
    return this._ubah((db) => {
      const x = db.lagu.find((y) => y.id === id);
      if (!x) throw new Error("Lagu tidak ditemukan");
      x.transpose = intRentang(n, -11, 11, "Transpose harus antara -11 dan 11");
    });
  },

  /* ------------------------------------------------------------
     [DATA 3] CHORD FAVORIT
     kunci: "gitar|0|maj7" (lihat kunciFav di data.js)
     Mengembalikan true kalau sekarang jadi favorit.
     ------------------------------------------------------------ */
  async toggleFavorit(kunci) {
    return this._ubah((db) => {
      if (!uraiKunciFav(kunci)) throw new Error("Chord favorit tidak valid");
      const i = db.favorit.indexOf(kunci);
      if (i >= 0) { db.favorit.splice(i, 1); return false; }
      db.favorit.push(kunci);
      return true;
    });
  },

  /* ------------------------------------------------------------
     [DATA 4] TUNING BUATAN SENDIRI
     Input: { nama, kelompok, senar:[midi,...] } senar dari terbawah.
     ------------------------------------------------------------ */
  async tambahTuning(t) {
    return this._ubah((db) => {
      const nama = teksBersih(t.nama, 30);
      if (!nama) throw new Error("Nama tuning tidak boleh kosong");
      if (!KELOMPOK_TUNING.some((k) => k.id === t.kelompok)) throw new Error("Pilih kelompok tuning");
      if (!Array.isArray(t.senar) || t.senar.length < 2 || t.senar.length > 8) throw new Error("Tuning harus punya 2 sampai 8 senar");
      t.senar.forEach((m) => intRentang(m, 24, 96, "Nada di luar jangkauan tuner"));
      const id = "k_" + buatId();
      db.tuningKustom.push({ id: id, nama: nama, kelompok: t.kelompok, senar: t.senar.slice() });
      return id;
    });
  },

  async hapusTuning(id) {
    return this._ubah((db) => {
      if (!db.tuningKustom.some((t) => t.id === id)) throw new Error("Tuning tidak ditemukan");
      db.tuningKustom = db.tuningKustom.filter((t) => t.id !== id);
      if (db.pengaturan.tuningId === id) db.pengaturan.tuningId = "standar";
    });
  },

  /* ------------------------------------------------------------
     [DATA 5] PENGATURAN
     p boleh berisi sebagian: { mode, aksen, preset, a4,
     instrumenChord, tuningId, modeTuner, fontLagu, scrollLagu }
     ------------------------------------------------------------ */
  async setPengaturan(p) {
    return this._ubah((db) => {
      const s = db.pengaturan;
      if (p.mode !== undefined) {
        if (!MODE_TEMA.includes(p.mode)) throw new Error("Mode tampilan tidak valid");
        s.mode = p.mode;
      }
      if (p.aksen !== undefined) {
        if (!/^#[0-9a-fA-F]{6}$/.test(p.aksen)) throw new Error("Warna tidak valid");
        s.aksen = p.aksen;
      }
      if (p.preset !== undefined) s.preset = String(p.preset);
      if (p.a4 !== undefined) s.a4 = intRentang(p.a4, 400, 480, "Acuan A4 harus antara 400 dan 480 Hz");
      if (p.instrumenChord !== undefined) {
        if (!INSTRUMEN[p.instrumenChord]) throw new Error("Instrumen tidak valid");
        s.instrumenChord = p.instrumenChord;
      }
      if (p.tuningId !== undefined) {
        const ada = TUNING_BAWAAN.some((t) => t.id === p.tuningId) || db.tuningKustom.some((t) => t.id === p.tuningId);
        if (!ada) throw new Error("Tuning tidak ditemukan");
        s.tuningId = p.tuningId;
      }
      if (p.modeTuner !== undefined) {
        if (p.modeTuner !== "auto" && p.modeTuner !== "manual") throw new Error("Mode tuner tidak valid");
        s.modeTuner = p.modeTuner;
      }
      if (p.fontLagu !== undefined) s.fontLagu = intRentang(p.fontLagu, 10, 28, "Ukuran huruf harus 10 sampai 28");
      if (p.scrollLagu !== undefined) s.scrollLagu = intRentang(p.scrollLagu, 1, 10, "Kecepatan harus 1 sampai 10");
    });
  },

  /* ------------------------------------------------------------
     [DATA 6] CADANGAN (EKSPOR / IMPOR / RESET)
     ------------------------------------------------------------ */
  async eksporJSON() {
    return JSON.stringify(this._muat(), null, 2);
  },

  async imporJSON(teks) {
    let d;
    try { d = JSON.parse(teks); } catch (e) { throw new Error("File bukan JSON yang valid"); }
    const masalah = cekData(d);
    if (masalah) throw new Error("File cadangan tidak valid: " + masalah);

    /* Simpan data lama sebagai cadangan darurat sebelum diganti */
    try { localStorage.setItem(KUNCI_DATA + ".sebelum_impor", JSON.stringify(this._muat())); } catch (e) { /* abaikan */ }

    this._tulis(rapikanData(d));
  },

  async resetSemua() {
    const baru = dataAwal();
    baru.pengaturan = salin(this._muat().pengaturan);   // tema & pengaturan tetap
    this._tulis(baru);
  }
};
/* ===== OBJEK DATA END ===== */
