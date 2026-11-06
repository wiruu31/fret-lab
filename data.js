/* ================================================================
   DATA.JS - TEORI MUSIK, DATA BAWAAN, MESIN CHORD  [FredLab v1.0.0]
   Isi file ini: nama nada, jenis chord, daftar tuning, lagu contoh,
   dan "mesin" yang mencari bentuk jari (voicing) untuk tiap chord.
   File ini TIDAK menyentuh tampilan (DOM) dan TIDAK menyimpan data.

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   KONSTANTA | CHORD | NAMA & ALIAS | MESIN VOICING | TUNING | LAGU CONTOH
   ================================================================ */


/* ===== KONSTANTA START =====
   Nama app, warna tema, nama nada, dan instrumen.
   ================================================================ */
const NAMA_APP = "FredLab";
const VERSI_APP = "1.0.0";

const MODE_TEMA = ["auto", "terang", "gelap"];

/* Pilihan warna tema (bukan hijau). Bisa juga pilih warna bebas. */
const PRESET_WARNA = [
  { id: "biru",   nama: "Biru",   hex: "#3B82F6" },
  { id: "oranye", nama: "Oranye", hex: "#F97316" },
  { id: "ungu",   nama: "Ungu",   hex: "#8B5CF6" },
  { id: "merah",  nama: "Merah",  hex: "#EF4444" },
  { id: "kuning", nama: "Kuning", hex: "#EAB308" },
  { id: "teal",   nama: "Teal",   hex: "#14B8A6" }
];

const NADA_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NADA_FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/* Nama nada (dengan kres atau mol) -> nomor 0..11 (C = 0) */
const INDEKS_NADA = {
  "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "Fb": 4, "E#": 5,
  "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10,
  "B": 11, "Cb": 11, "B#": 0
};

/* Label tombol nada dasar: "C", "C#/Db", ... */
const LABEL_AKAR = NADA_SHARP.map((n, i) => (n === NADA_FLAT[i] ? n : n + "/" + NADA_FLAT[i]));

/* Instrumen untuk pustaka chord.
   senar = nomor MIDI tiap senar, dari senar 6 (terbawah) ke senar 1.
   reentrant = urutan nada tidak naik terus (ukulele: G tinggi). */
const INSTRUMEN = {
  gitar:   { nama: "Gitar",   senar: [40, 45, 50, 55, 59, 64], reentrant: false },
  ukulele: { nama: "Ukulele", senar: [67, 60, 64, 69],         reentrant: true }
};
/* ===== KONSTANTA END ===== */


/* ===== CHORD START =====
   Semua jenis chord. interval = jarak nada (setengah nada) dari nada
   dasar. opsi = nada yang boleh dihilangkan (biasanya kuint) saat
   mencari bentuk jari. Mau menambah jenis chord? Tambah satu baris.
   ================================================================ */
const GRUP_CHORD = [
  { id: "semua",    nama: "Semua" },
  { id: "dasar",    nama: "Dasar" },
  { id: "gantung",  nama: "Gantung" },
  { id: "tujuh",    nama: "Tujuh" },
  { id: "tambahan", nama: "Tambahan" },
  { id: "ekstensi", nama: "Ekstensi" }
];

const TIPE_CHORD = [
  /* dasar */
  { id: "maj",  sufiks: "",     nama: "Mayor",                grup: "dasar",    interval: [0, 4, 7] },
  { id: "m",    sufiks: "m",    nama: "Minor",                grup: "dasar",    interval: [0, 3, 7] },
  { id: "5",    sufiks: "5",    nama: "Power chord (5)",      grup: "dasar",    interval: [0, 7] },
  { id: "dim",  sufiks: "dim",  nama: "Diminished",           grup: "dasar",    interval: [0, 3, 6] },
  { id: "aug",  sufiks: "aug",  nama: "Augmented",            grup: "dasar",    interval: [0, 4, 8] },
  /* gantung (suspended) */
  { id: "sus2",  sufiks: "sus2",  nama: "Suspended 2",        grup: "gantung",  interval: [0, 2, 7] },
  { id: "sus4",  sufiks: "sus4",  nama: "Suspended 4",        grup: "gantung",  interval: [0, 5, 7] },
  { id: "7sus4", sufiks: "7sus4", nama: "Dominan 7 sus4",     grup: "gantung",  interval: [0, 5, 7, 10] },
  /* tujuh */
  { id: "7",     sufiks: "7",       nama: "Dominan 7",            grup: "tujuh", interval: [0, 4, 7, 10] },
  { id: "maj7",  sufiks: "maj7",    nama: "Mayor 7",              grup: "tujuh", interval: [0, 4, 7, 11] },
  { id: "m7",    sufiks: "m7",      nama: "Minor 7",              grup: "tujuh", interval: [0, 3, 7, 10] },
  { id: "mMaj7", sufiks: "m(maj7)", nama: "Minor mayor 7",        grup: "tujuh", interval: [0, 3, 7, 11] },
  { id: "dim7",  sufiks: "dim7",    nama: "Diminished 7",         grup: "tujuh", interval: [0, 3, 6, 9] },
  { id: "m7b5",  sufiks: "m7b5",    nama: "Half-diminished (m7b5)", grup: "tujuh", interval: [0, 3, 6, 10] },
  { id: "7#5",   sufiks: "7#5",     nama: "Dominan 7 augmented",  grup: "tujuh", interval: [0, 4, 8, 10] },
  { id: "7b5",   sufiks: "7b5",     nama: "Dominan 7 b5",         grup: "tujuh", interval: [0, 4, 6, 10] },
  /* tambahan (6 dan add) */
  { id: "6",     sufiks: "6",     nama: "Mayor 6",     grup: "tambahan", interval: [0, 4, 7, 9] },
  { id: "m6",    sufiks: "m6",    nama: "Minor 6",     grup: "tambahan", interval: [0, 3, 7, 9] },
  { id: "69",    sufiks: "6/9",   nama: "Mayor 6/9",   grup: "tambahan", interval: [0, 4, 7, 9, 14] },
  { id: "add9",  sufiks: "add9",  nama: "Mayor add9",  grup: "tambahan", interval: [0, 4, 7, 14] },
  { id: "madd9", sufiks: "madd9", nama: "Minor add9",  grup: "tambahan", interval: [0, 3, 7, 14] },
  /* ekstensi (9, 11, 13, alterasi) */
  { id: "9",    sufiks: "9",    nama: "Dominan 9", grup: "ekstensi", interval: [0, 4, 7, 10, 14] },
  { id: "maj9", sufiks: "maj9", nama: "Mayor 9",   grup: "ekstensi", interval: [0, 4, 7, 11, 14] },
  { id: "m9",   sufiks: "m9",   nama: "Minor 9",   grup: "ekstensi", interval: [0, 3, 7, 10, 14] },
  { id: "11",   sufiks: "11",   nama: "Dominan 11", grup: "ekstensi", interval: [0, 4, 7, 10, 14, 17], opsi: [7, 14] },
  { id: "m11",  sufiks: "m11",  nama: "Minor 11",   grup: "ekstensi", interval: [0, 3, 7, 10, 14, 17], opsi: [7, 14] },
  { id: "13",   sufiks: "13",   nama: "Dominan 13", grup: "ekstensi", interval: [0, 4, 7, 10, 14, 21], opsi: [7, 14] },
  { id: "7b9",  sufiks: "7b9",  nama: "Dominan 7 b9", grup: "ekstensi", interval: [0, 4, 7, 10, 13] },
  { id: "7#9",  sufiks: "7#9",  nama: "Dominan 7 #9", grup: "ekstensi", interval: [0, 4, 7, 10, 15] }
];

const TIPE_ID = {};
TIPE_CHORD.forEach((t) => { TIPE_ID[t.id] = t; });
/* ===== CHORD END ===== */


/* ===== NAMA & ALIAS START =====
   Mengubah teks seperti "F#m7/C#" menjadi data chord, dan sebaliknya.
   Dipakai oleh pencarian chord dan pembaca lagu.
   ================================================================ */
const ALIAS_SUFIKS = (() => {
  const m = {};
  TIPE_CHORD.forEach((t) => { m[t.sufiks] = t.id; });
  const tambah = (id, daftar) => daftar.forEach((s) => { m[s] = id; });
  tambah("maj",   ["maj", "M", "major"]);
  tambah("m",     ["min", "mi", "-", "minor"]);
  tambah("sus4",  ["sus", "4"]);
  tambah("sus2",  ["2"]);
  tambah("7",     ["dom7"]);
  tambah("maj7",  ["M7", "Maj7", "major7", "ma7", "Δ", "Δ7"]);
  tambah("m7",    ["min7", "mi7", "-7", "minor7"]);
  tambah("mMaj7", ["mmaj7", "mM7", "mMaj7", "minmaj7"]);
  tambah("7sus4", ["7sus"]);
  tambah("dim",   ["o", "°"]);
  tambah("dim7",  ["o7", "°7"]);
  tambah("m7b5",  ["ø", "ø7", "m7-5", "min7b5"]);
  tambah("aug",   ["+"]);
  tambah("7#5",   ["+7", "aug7", "7+5", "7+"]);
  tambah("69",    ["69"]);
  tambah("add9",  ["add2"]);
  tambah("6",     ["maj6"]);
  tambah("7b5",   ["7-5"]);
  return m;
})();

/* Cadangan: cocokkan tanpa membedakan huruf besar/kecil (kecuali yang bentrok) */
const ALIAS_KECIL = (() => {
  const k = {};
  Object.keys(ALIAS_SUFIKS).forEach((s) => {
    const kecil = s.toLowerCase();
    if (!(kecil in k)) k[kecil] = ALIAS_SUFIKS[s];
  });
  return k;
})();

/* Teks akhiran chord -> id jenis chord, atau null kalau tidak dikenal */
function idDariSufiks(s) {
  if (Object.prototype.hasOwnProperty.call(ALIAS_SUFIKS, s)) return ALIAS_SUFIKS[s];
  const kecil = s.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIAS_KECIL, kecil)) return ALIAS_KECIL[kecil];
  return null;
}

function namaNada(indeks, mol) {
  return (mol ? NADA_FLAT : NADA_SHARP)[((indeks % 12) + 12) % 12];
}

/* "C" + "m7" -> "Cm7" */
function namaChord(root, tipeId, mol) {
  return namaNada(root, mol) + TIPE_ID[tipeId].sufiks;
}

/* Daftar nama nada penyusun chord, mis. ["C", "E", "G", "B"] */
function nadaPenyusun(root, tipeId, mol) {
  const seen = [];
  TIPE_ID[tipeId].interval.forEach((i) => {
    const nama = namaNada(root + i, mol);
    if (!seen.includes(nama)) seen.push(nama);
  });
  return seen;
}

/* Satu "kata" chord: awalan "(-", nada dasar, akhiran, /bass, penutup ".." */
const REGEX_CHORD = /^(\(?-?)([A-G][#b]?)(6\/9|[A-Za-z0-9#+°øΔ\-]*)(?:\/([A-G][#b]?))?([.,;:)\]*~]*)$/;

function uraiToken(teks) {
  const m = REGEX_CHORD.exec(teks);
  if (!m) return null;
  const tipeId = idDariSufiks(m[3]);
  if (tipeId === null) return null;
  const root = INDEKS_NADA[m[2]];
  if (root === undefined) return null;
  let bass = null;
  if (m[4]) {
    bass = INDEKS_NADA[m[4]];
    if (bass === undefined) return null;
  }
  return {
    pre: m[1], root: root, suf: m[3], bass: bass, post: m[5], tipeId: tipeId,
    mol: m[2].length === 2 && m[2].charAt(1) === "b"
  };
}

/* Untuk pencarian: "c#m7" atau "Am/G" -> { root, tipeId, bass } atau null */
function uraiNamaChord(teks) {
  let t = String(teks || "").trim();
  if (!t) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  const c = uraiToken(t);
  if (!c || c.pre || c.post) return null;
  return { root: c.root, tipeId: c.tipeId, bass: c.bass };
}

/* Kunci favorit: "gitar|0|maj7" */
const kunciFav = (inst, root, tipeId) => inst + "|" + root + "|" + tipeId;
function uraiKunciFav(kunci) {
  const p = String(kunci).split("|");
  const root = Number(p[1]);
  if (p.length !== 3 || !INSTRUMEN[p[0]] || !Number.isInteger(root) || root < 0 || root > 11 || !TIPE_ID[p[2]]) return null;
  return { inst: p[0], root: root, tipeId: p[2] };
}
/* ===== NAMA & ALIAS END ===== */


/* ===== MESIN VOICING START =====
   Mencari bentuk jari (voicing) tiap chord secara otomatis dari
   rumus nada. Aturan utama:
   - semua nada penting ada (kuint boleh hilang di chord besar)
   - nada terendah = nada dasar (kecuali instrumen reentrant)
   - paling banyak 4 jari (barre dihitung 1 jari), rentang 4 fret
   - senar yang tidak dibunyikan hanya di pinggir (bukan di tengah)
   Hasil diurutkan dari yang paling mudah, lalu dibuat beragam.
   ================================================================ */
const cacheVoicing = new Map();

function opsiOffset(tipe, longgar) {
  const o = tipe.opsi ? tipe.opsi.slice() : (tipe.interval.length >= 5 ? [7] : []);
  if (longgar && tipe.interval.length >= 4 && tipe.interval.indexOf(7) >= 0 && o.indexOf(7) < 0) o.push(7);
  return o;
}

function cariPass(instId, root, tipe, longgar) {
  const inst = INSTRUMEN[instId];
  const senar = inst.senar;
  const n = senar.length;

  const semua = new Set(tipe.interval.map((i) => (root + i) % 12));
  const opsi = new Set(opsiOffset(tipe, longgar).map((i) => (root + i) % 12));
  const wajib = Array.from(semua).filter((pc) => !opsi.has(pc));
  const minBunyi = n >= 6 ? (wajib.length >= 4 ? 4 : 3) : 3;
  const hasil = new Map();
  const fr = new Array(n);

  function evaluasi(p) {
    let bunyi = 0;
    let rendah = -1;
    const pcs = new Set();
    for (let i = 0; i < n; i++) {
      if (fr[i] === null) continue;
      bunyi++;
      pcs.add((senar[i] + fr[i]) % 12);
      if (rendah < 0) rendah = i;
    }
    if (bunyi < minBunyi) return;
    for (let k = 0; k < wajib.length; k++) if (!pcs.has(wajib[k])) return;

    if (!inst.reentrant) {
      const pb = (senar[rendah] + fr[rendah]) % 12;
      if (longgar ? !semua.has(pb) : pb !== root) return;
    }

    /* jari: nada yang ditekan; fret terkecil dengan >= 2 senar bisa barre */
    const tekan = [];
    for (let i = 0; i < n; i++) if (fr[i] !== null && fr[i] > 0) tekan.push(i);
    let minF = 0;
    let barre = null;
    let jari = 0;
    if (tekan.length) {
      minF = Math.min.apply(null, tekan.map((i) => fr[i]));
      const dasar = tekan.filter((i) => fr[i] === minF);
      if (dasar.length >= 2) {
        const a = dasar[0];
        const b = dasar[dasar.length - 1];
        let bersih = true;
        for (let k = a; k <= b; k++) {
          if (fr[k] === null || fr[k] === 0) { bersih = false; break; }
        }
        if (bersih) barre = { fret: minF, dari: a, ke: b };
      }
      jari = barre ? 1 + tekan.filter((i) => fr[i] > minF).length : tekan.length;
    }
    if (jari > 4) return;

    let buka = false;
    let mutuTengah = 0;
    let terbunyi = false;
    let mutuTertunda = 0;
    for (let i = 0; i < n; i++) {
      if (fr[i] === 0) buka = true;
      if (fr[i] === null) { if (terbunyi) mutuTertunda++; }
      else { terbunyi = true; mutuTengah += mutuTertunda; mutuTertunda = 0; }
    }
    let hilang = 0;
    opsi.forEach((pc) => { if (semua.has(pc) && !pcs.has(pc)) hilang++; });

    /* dua jari di fret yang sama tanpa barre (ada senar kosong di antaranya) = janggal */
    const janggal = tekan.length && tekan.filter((i) => fr[i] === minF).length >= 2 && !barre ? 3 : 0;
    const rentang = tekan.length ? Math.max.apply(null, tekan.map((i) => fr[i])) - minF : 0;
    const biayaBarre = barre ? (barre.ke - barre.dari >= 4 ? 1.5 : 0.3) : 0;
    const skor = jari * 2 + minF * 0.5 + (n - bunyi) * (n <= 4 ? 4 : 2.5) + hilang * 2.5 +
                 biayaBarre + rentang * 0.7 + mutuTengah * 3 + janggal - (buka ? 1.5 : 0) + (longgar ? 4 : 0) + p * 0.01;
    const kunci = fr.map((f) => (f === null ? "x" : f)).join(".");
    const ada = hasil.get(kunci);
    if (!ada || ada.skor > skor) {
      hasil.set(kunci, { frets: fr.slice(), jari: jari, barre: barre, mulai: minF || 1, skor: skor });
    }
  }

  for (let p = 0; p <= 12; p++) {
    const lo = Math.max(1, p);
    const hi = lo + 3;
    const bukaOk = p <= 3;
    const pilihan = senar.map((m) => {
      const o = [null];
      if (bukaOk && semua.has(m % 12)) o.push(0);
      for (let f = lo; f <= hi; f++) if (semua.has((m + f) % 12)) o.push(f);
      return o;
    });

    const rec = (i, state) => {
      if (i === n) { evaluasi(p); return; }
      const daftar = pilihan[i];
      for (let k = 0; k < daftar.length; k++) {
        const f = daftar[k];
        let s = state;
        if (f === null) {
          if (state === 1) s = longgar ? 1 : 2;
        } else {
          if (state === 2) continue;
          s = 1;
        }
        fr[i] = f;
        rec(i + 1, s);
      }
    };
    rec(0, 0);
  }
  return hasil;
}

/* Pilih beberapa bentuk: yang terbaik dulu, lalu yang posisinya berbeda */
function pilihBeragam(peta, maks) {
  const arr = Array.from(peta.values()).sort((a, b) => a.skor - b.skor);
  const pilih = [];
  arr.forEach((v) => {
    if (pilih.length >= maks) return;
    if (pilih.every((x) => Math.abs(x.mulai - v.mulai) >= 2)) pilih.push(v);
  });
  arr.forEach((v) => {
    if (pilih.length >= Math.min(maks, 3)) return;
    if (pilih.indexOf(v) < 0) pilih.push(v);
  });
  return pilih;
}

/* Daftar bentuk jari: [{ frets:[null|0..], jari, barre, mulai }] (bisa kosong) */
function cariVoicing(instId, root, tipeId) {
  const kunci = instId + "|" + root + "|" + tipeId;
  if (cacheVoicing.has(kunci)) return cacheVoicing.get(kunci);

  const tipe = TIPE_ID[tipeId];
  let peta = cariPass(instId, root, tipe, false);
  if (peta.size === 0) peta = cariPass(instId, root, tipe, true);
  const hasil = pilihBeragam(peta, 6);
  cacheVoicing.set(kunci, hasil);
  return hasil;
}

/* Teks jari: [null,3,2,0,1,0] -> "x 3 2 0 1 0" */
const teksJari = (frets) => frets.map((f) => (f === null ? "x" : f)).join(" ");
/* ===== MESIN VOICING END ===== */


/* ===== TUNING START =====
   Daftar tuning bawaan. senar = nomor MIDI dari senar terbawah ke
   teratas (E2 = 40, A2 = 45, ... E4 = 64). kelompok: gitar | ukulele.
   Mau tuning lain? Tambah satu baris, atau buat sendiri di app.
   ================================================================ */
const KELOMPOK_TUNING = [
  { id: "gitar",   nama: "Gitar" },
  { id: "ukulele", nama: "Ukulele" },
  { id: "bass",    nama: "Bass" },
  { id: "lainnya", nama: "Lainnya" }
];

const TUNING_BAWAAN = [
  { id: "standar",     kelompok: "gitar", nama: "Standar (E A D G B E)",          senar: [40, 45, 50, 55, 59, 64] },
  { id: "dropd",       kelompok: "gitar", nama: "Drop D (D A D G B E)",           senar: [38, 45, 50, 55, 59, 64] },
  { id: "setengah",    kelompok: "gitar", nama: "Turun 1/2 nada (Eb Ab Db Gb Bb Eb)", senar: [39, 44, 49, 54, 58, 63] },
  { id: "satunada",    kelompok: "gitar", nama: "Turun 1 nada (D G C F A D)",     senar: [38, 43, 48, 53, 57, 62] },
  { id: "dropc",       kelompok: "gitar", nama: "Drop C (C G C F A D)",           senar: [36, 43, 48, 53, 57, 62] },
  { id: "doubledropd", kelompok: "gitar", nama: "Double Drop D (D A D G B D)",    senar: [38, 45, 50, 55, 59, 62] },
  { id: "dadgad",      kelompok: "gitar", nama: "DADGAD",                         senar: [38, 45, 50, 55, 57, 62] },
  { id: "opend",       kelompok: "gitar", nama: "Open D (D A D F# A D)",          senar: [38, 45, 50, 54, 57, 62] },
  { id: "openg",       kelompok: "gitar", nama: "Open G (D G D G B D)",           senar: [38, 43, 50, 55, 59, 62] },
  { id: "openc",       kelompok: "gitar", nama: "Open C (C G C G C E)",           senar: [36, 43, 48, 55, 60, 64] },
  { id: "opene",       kelompok: "gitar", nama: "Open E (E B E G# B E)",          senar: [40, 47, 52, 56, 59, 64] },
  { id: "ukulele",     kelompok: "ukulele", nama: "Ukulele standar (G C E A)",    senar: [67, 60, 64, 69] },
  { id: "ukulelelow",  kelompok: "ukulele", nama: "Ukulele low G (G C E A)",      senar: [55, 60, 64, 69] },
  { id: "ukubaritone", kelompok: "ukulele", nama: "Ukulele baritone (D G B E)",   senar: [50, 55, 59, 64] },
  { id: "ukud",        kelompok: "ukulele", nama: "Ukulele D (A D F# B)",         senar: [69, 62, 66, 71] }
];

/* Nomor MIDI -> "E2", "F#3" */
function namaMidi(m) {
  return NADA_SHARP[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}

/* "F#3" -> nomor MIDI. Melempar Error kalau formatnya salah. */
function midiDariNama(teks) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(String(teks).trim());
  if (!m) throw new Error("Nada \"" + teks + "\" salah. Contoh yang benar: E2, F#3, Bb3");
  const idx = INDEKS_NADA[m[1].toUpperCase() + m[2]];
  if (idx === undefined) throw new Error("Nada \"" + teks + "\" tidak dikenal");
  return idx + (Number(m[3]) + 1) * 12;
}

/* "E2 A2 D3 G3 B3 E4" -> [40, 45, 50, 55, 59, 64] */
function parseTuningTeks(teks) {
  const bagian = String(teks || "").trim().split(/[\s,]+/).filter(Boolean);
  if (bagian.length < 2 || bagian.length > 8) throw new Error("Isi 2 sampai 8 nada, dipisah spasi. Contoh: E2 A2 D3 G3 B3 E4");
  return bagian.map(midiDariNama);
}

/* Nomor MIDI -> frekuensi (Hz) dengan acuan A4 */
const frekDariMidi = (m, a4) => a4 * Math.pow(2, (m - 69) / 12);
/* ===== TUNING END ===== */


/* ===== LAGU CONTOH START =====
   Satu lagu domain publik supaya tampilan chord + lirik langsung
   terlihat. Format: baris chord di atas baris lirik; posisi chord
   mengikuti kolom hurufnya (sama seperti di situs chord).
   ================================================================ */
function barisChord(daftar) {
  let s = "";
  daftar.forEach((x) => { s += " ".repeat(Math.max(0, x[0] - s.length)) + x[1]; });
  return s;
}

const LAGU_CONTOH = {
  judul: "Twinkle Twinkle Little Star",
  artis: "Lagu anak tradisional (domain publik)",
  teks: [
    "Intro : C F C G..",
    "",
    barisChord([[0, "C"], [18, "F"], [25, "C"]]),
    "Twinkle, twinkle, little star",
    barisChord([[0, "F"], [6, "C"], [13, "G"], [22, "C"]]),
    "How I wonder what you are",
    barisChord([[0, "C"], [13, "F"], [22, "C"]]),
    "Up above the world so high",
    barisChord([[0, "F"], [7, "C"], [15, "G"], [22, "C"]]),
    "Like a diamond in the sky",
    "",
    "Reff :",
    barisChord([[0, "C"], [18, "F"], [25, "C"]]),
    "Twinkle, twinkle, little star",
    barisChord([[0, "F"], [6, "C"], [13, "G"], [22, "C"]]),
    "How I wonder what you are"
  ].join("\n")
};
/* ===== LAGU CONTOH END ===== */
