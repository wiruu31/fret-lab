/* ================================================================
   UI.JS - HELPER, DIAGRAM CHORD, PEMBACA LAGU, TEMA  [FretLab v1.1.0]
   Isi file ini: pencari elemen, format angka, penggambar diagram
   chord (SVG murni), pengurai teks lagu + transpose, dan penerap tema.
   File ini TIDAK menyimpan data dan TIDAK memasang event.

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   HELPER | TUNING | DIAGRAM | LAGU | TEMA
   ================================================================ */


/* ===== HELPER START =====
   Pencari elemen, pengaman teks, format angka.
   ================================================================ */
const $  = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

/* WAJIB dipakai untuk setiap teks buatan pengguna (judul, teks lagu)
   sebelum dimasukkan ke HTML, supaya aman dari penyisipan kode. */
function esc(teks) {
  return String(teks).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* Tampilan kosong yang seragam */
const kosong = (teks) => '<p class="empty">' + esc(teks) + "</p>";

function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const t = Math.floor(s.length / 2);
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2;
}

const batasi = (x, min, maks) => Math.max(min, Math.min(maks, x));
/* ===== HELPER END ===== */


/* ===== TUNING START =====
   Gabungan tuning bawaan + buatan sendiri.
   ================================================================ */
function daftarTuning(data) {
  return TUNING_BAWAAN.concat(data.tuningKustom.map((t) => Object.assign({ kustom: true }, t)));
}

function tuningAktif(data) {
  const daftar = daftarTuning(data);
  return daftar.find((t) => t.id === data.pengaturan.tuningId) || daftar[0];
}
/* ===== TUNING END ===== */


/* ===== DIAGRAM START =====
   Diagram chord SVG. frets = [null | 0 | 1..] dari senar terbawah.
   null = tidak dibunyikan (x), 0 = senar kosong (o).
   Warna diatur lewat class .cd-* di fretlab.css.
   ================================================================ */
function chordSVG(v, jumlahSenar) {
  const n = jumlahSenar;
  const GW = 72, X0 = 26, Y0 = 30, FH = 22, BARIS = 5;
  const ss = GW / (n - 1);
  const x = (i) => X0 + i * ss;

  const terbunyi = v.frets.filter((f) => f !== null && f > 0);
  const maks = terbunyi.length ? Math.max.apply(null, terbunyi) : 0;
  const mulai = maks <= BARIS ? 1 : v.mulai;
  const tinggi = Y0 + BARIS * FH + 8;

  let s = '<svg class="cd" viewBox="0 0 ' + (X0 + GW + 16) + " " + tinggi + '" role="img" aria-label="diagram chord">';

  /* kisi: fret (garis datar) dan senar (garis tegak) */
  for (let r = 0; r <= BARIS; r++) {
    const y = Y0 + r * FH;
    const nut = r === 0 && mulai === 1;
    s += '<line class="' + (nut ? "cd-nut" : "cd-fret") + '" x1="' + X0 + '" y1="' + y + '" x2="' + (X0 + GW) + '" y2="' + y + '"/>';
  }
  for (let i = 0; i < n; i++) {
    s += '<line class="cd-senar" x1="' + x(i).toFixed(1) + '" y1="' + Y0 + '" x2="' + x(i).toFixed(1) + '" y2="' + (Y0 + BARIS * FH) + '"/>';
  }
  if (mulai > 1) {
    s += '<text class="cd-label" x="' + (X0 - 8) + '" y="' + (Y0 + FH / 2 + 4) + '" text-anchor="end">' + mulai + "fr</text>";
  }

  /* tanda di atas: x (mati) dan o (kosong) */
  v.frets.forEach((f, i) => {
    if (f === null) {
      s += '<text class="cd-x" x="' + x(i).toFixed(1) + '" y="' + (Y0 - 9) + '" text-anchor="middle">&times;</text>';
    } else if (f === 0) {
      s += '<circle class="cd-o" cx="' + x(i).toFixed(1) + '" cy="' + (Y0 - 13) + '" r="4.2"/>';
    }
  });

  /* barre */
  if (v.barre && v.barre.fret - mulai >= 0 && v.barre.fret - mulai < BARIS) {
    const yb = Y0 + (v.barre.fret - mulai + 0.5) * FH;
    s += '<rect class="cd-barre" x="' + (x(v.barre.dari) - 7).toFixed(1) + '" y="' + (yb - 7).toFixed(1) +
         '" width="' + (x(v.barre.ke) - x(v.barre.dari) + 14).toFixed(1) + '" height="14" rx="7"/>';
  }

  /* titik jari */
  v.frets.forEach((f, i) => {
    if (f === null || f === 0) return;
    const baris = f - mulai;
    if (baris < 0 || baris >= BARIS) return;
    s += '<circle class="cd-dot" cx="' + x(i).toFixed(1) + '" cy="' + (Y0 + (baris + 0.5) * FH).toFixed(1) + '" r="7"/>';
  });

  return s + "</svg>";
}
/* ===== DIAGRAM END ===== */


/* ===== LAGU START =====
   Mengurai teks lagu menjadi baris: chord / lirik / label / kosong.
   Baris chord = semua "kata"-nya chord (boleh ada label seperti
   "Intro :" dan tanda seperti ".." atau "(x2)").
   Transpose menggeser tiap chord tanpa merusak posisi kolomnya.
   ================================================================ */
const LABEL_BAGIAN = /^(intro|int|interlude|inter|reff?|refrain|reffrain|chorus|verse|bridge|outro|coda|ending|solo|bait|prechorus|pre-chorus|pre|instrumental|inst|musik|ref)\.?:?$/i;
const FILLER = /^[.\-–—|:~*()\[\]xX×0-9,;]+$/;

/* Memecah baris menjadi kata + posisi kolom awalnya */
function pecahKata(baris) {
  const hasil = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(baris)) !== null) hasil.push({ teks: m[0], mulai: m.index });
  return hasil;
}

function klasifikasiBaris(baris) {
  const t = baris.trim();
  if (!t) return { tipe: "kosong" };
  if (/^\[.*\]$/.test(t)) return { tipe: "label" };

  const kata = pecahKata(baris);
  let adaChord = 0;
  let bukan = 0;
  kata.forEach((k, i) => {
    const c = uraiToken(k.teks);
    if (c) { k.chord = c; adaChord++; }
    else if (i === 0 && LABEL_BAGIAN.test(k.teks)) k.label = true;
    else if (FILLER.test(k.teks)) k.filler = true;
    else bukan++;
  });

  if (bukan === 0 && adaChord > 0) return { tipe: "chord", kata: kata };
  if (bukan === 0 && kata[0].label) return { tipe: "label" };
  return { tipe: "lirik" };
}

/* Geser satu chord sebanyak n setengah nada */
function geserChord(c, n) {
  const root = (((c.root + n) % 12) + 12) % 12;
  const bass = c.bass === null ? null : (((c.bass + n) % 12) + 12) % 12;
  const teks = c.pre + namaNada(root, c.mol) + c.suf + (bass === null ? "" : "/" + namaNada(bass, c.mol)) + c.post;
  return { root: root, bass: bass, teks: teks };
}

/* Satu baris -> { tipe, html } (html sudah aman) */
function olahBaris(baris, n) {
  const k = klasifikasiBaris(baris);
  if (k.tipe === "kosong") return { tipe: "kosong", html: "&nbsp;" };
  if (k.tipe === "label") return { tipe: "label", html: esc(baris) };
  if (k.tipe === "lirik") return { tipe: "lirik", html: esc(baris) };

  let polos = "";
  let html = "";
  k.kata.forEach((kata) => {
    let teks = kata.teks;
    let g = null;
    if (kata.chord) {
      g = geserChord(kata.chord, n);
      teks = g.teks;
    }
    let jarak = kata.mulai - polos.length;
    if (polos.length && jarak < 1) jarak = 1;
    if (jarak > 0) { polos += " ".repeat(jarak); html += " ".repeat(jarak); }
    polos += teks;
    if (g) {
      html += '<span class="ch" role="button" tabindex="0" data-aksi="chord-lagu" data-r="' + g.root + '" data-t="' +
              esc(kata.chord.tipeId) + '" data-b="' + (g.bass === null ? "" : g.bass) + '">' + esc(teks) + "</span>";
    } else {
      html += esc(teks);
    }
  });
  return { tipe: "chord", html: html };
}

/* Seluruh teks lagu -> HTML siap pasang */
function htmlLagu(teks, n) {
  return String(teks).split("\n").map((baris) => {
    const b = olahBaris(baris, n);
    return '<div class="baris baris--' + b.tipe + '">' + b.html + "</div>";
  }).join("");
}

/* Perkiraan "nada dasar" lagu: chord pertama yang dikenali (sudah ditranspose) */
function chordPertama(teks, n) {
  const baris = String(teks).split("\n");
  for (let i = 0; i < baris.length; i++) {
    const k = klasifikasiBaris(baris[i]);
    if (k.tipe === "chord") {
      const c = k.kata.find((x) => x.chord);
      if (c) return geserChord(c.chord, n).teks.replace(/[^A-Za-z0-9#\/+°øΔ\-]/g, "");
    }
  }
  return "";
}
/* ===== LAGU END ===== */


/* ===== TEMA START =====
   Menerapkan mode (auto/terang/gelap) dan warna aksen.
   Semua warna lain diturunkan dari --aksen lewat CSS.
   ================================================================ */
function luminan(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function modeGelap(mode) {
  if (mode === "gelap") return true;
  if (mode === "terang") return false;
  return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function terapkanTema(p) {
  const gelap = modeGelap(p.mode);
  const root = document.documentElement;
  root.dataset.tema = gelap ? "gelap" : "terang";
  root.style.setProperty("--aksen", p.aksen);
  root.style.setProperty("--aksen-teks", luminan(p.aksen) > 0.4 ? "#0B0D10" : "#FFFFFF");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", gelap ? "#050D17" : "#EAF0F9");
}
/* ===== TEMA END ===== */
