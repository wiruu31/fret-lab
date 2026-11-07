/* ================================================================
   HALAMAN.JS - MENGGAMBAR SEMUA HALAMAN  [FretLab v1.1.0]
   Tiap fungsi render menerima data (dan pilihan) lalu mengisi HTML
   ke wadahnya. File ini TIDAK menyimpan data dan TIDAK memasang
   event (itu tugas storage.js dan app.js).

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   KOMPONEN | CHORD | DETAIL CHORD | TUNER | LAGU | PENGATURAN
   ================================================================ */


/* ===== KOMPONEN START =====
   Potongan HTML yang dipakai berulang.
   ================================================================ */
function kartu(judul, isi, kelas) {
  return '<article class="card ' + (kelas || "") + '">' +
    (judul ? '<h2 class="card-title">' + judul + "</h2>" : "") + isi + "</article>";
}

/* Baris "label ........ nilai" */
function barisInfo(label, nilai, kelasNilai) {
  return '<div class="row"><span>' + label + '</span><strong class="' + (kelasNilai || "") + '">' + nilai + "</strong></div>";
}

/* daftar = [[nilai, label], ...]; aktif = nilai yang terpilih */
function chipsHTML(daftar, aktif, aksi, atribut, kelas) {
  return '<div class="chips ' + (kelas || "") + '">' + daftar.map((c) =>
    '<button type="button" class="chip' + (String(c[0]) === String(aktif) ? " is-active" : "") + '" data-aksi="' + aksi +
    '" data-' + atribut + '="' + esc(c[0]) + '">' + c[1] + "</button>"
  ).join("") + "</div>";
}
/* ===== KOMPONEN END ===== */


/* ===== CHORD START =====
   Pustaka chord: pilih instrumen, nada dasar, kelompok; atau cari
   (misal "Am7", "F#m", "sus"). Tiap kartu menampilkan bentuk jari
   terbaik; ketuk kartu untuk melihat semua variasi.
   st = { root, grup, cari }
   ================================================================ */
function renderChord(data, st) {
  const p = data.pengaturan;
  const inst = chipsHTML(Object.keys(INSTRUMEN).map((id) => [id, INSTRUMEN[id].nama]), p.instrumenChord, "set-inst", "inst");
  const akar = chipsHTML(LABEL_AKAR.map((n, i) => [i, n]), st.root, "pilih-root", "root", "chips--rapat");
  const grup = chipsHTML(GRUP_CHORD.map((g) => [g.id, g.nama]).concat([["fav", "&#9733; Favorit"]]), st.grup, "pilih-grup", "grup", "chips--rapat");

  $("#isi-chord").innerHTML =
    '<p class="label-kecil">instrumen</p>' + inst +
    '<p class="label-kecil">nada dasar</p>' + akar +
    '<p class="label-kecil">kelompok</p>' + grup +
    '<input type="search" class="cari" id="inputCariChord" placeholder="cari chord: Am7, F#m, sus, add9..." ' +
      'autocomplete="off" aria-label="Cari chord" value="' + esc(st.cari) + '">' +
    '<div id="gridChord"></div>';
  renderGridChord(data, st);
}

/* Daftar chord yang tampil, sesuai pilihan & pencarian */
function kumpulChord(data, st) {
  const inst = data.pengaturan.instrumenChord;
  const q = st.cari.trim();

  if (q) {
    const u = uraiNamaChord(q);
    if (u && q.length >= 2) return [{ root: u.root, tipeId: u.tipeId, bass: u.bass }];
    const ql = q.toLowerCase();
    return TIPE_CHORD
      .filter((t) => (NADA_SHARP[st.root] + t.sufiks).toLowerCase().indexOf(ql) >= 0 || t.nama.toLowerCase().indexOf(ql) >= 0)
      .map((t) => ({ root: st.root, tipeId: t.id, bass: null }));
  }

  if (st.grup === "fav") {
    return data.favorit.map(uraiKunciFav).filter((x) => x && x.inst === inst)
      .map((x) => ({ root: x.root, tipeId: x.tipeId, bass: null }));
  }
  return TIPE_CHORD.filter((t) => st.grup === "semua" || t.grup === st.grup)
    .map((t) => ({ root: st.root, tipeId: t.id, bass: null }));
}

function kartuChord(item, data) {
  const inst = data.pengaturan.instrumenChord;
  const tipe = TIPE_ID[item.tipeId];
  const v = cariVoicing(inst, item.root, item.tipeId);
  const gambar = v.length
    ? chordSVG(v[0], INSTRUMEN[inst].senar.length)
    : '<span class="muted chord-kosong">belum ada bentuk jari yang praktis</span>';
  const fav = data.favorit.indexOf(kunciFav(inst, item.root, item.tipeId)) >= 0;
  const atribut = ' data-r="' + item.root + '" data-t="' + esc(item.tipeId) + '"' + (item.bass !== null ? ' data-b="' + item.bass + '"' : "");

  return '<div class="chord-kartu">' +
    '<button type="button" class="chord-btn" data-aksi="buka-chord"' + atribut + '>' +
      '<span class="chord-nama">' + esc(namaChord(item.root, item.tipeId) + (item.bass !== null ? "/" + namaNada(item.bass) : "")) + "</span>" +
      '<small class="chord-sub muted">' + esc(tipe.nama) + "</small>" +
      '<span class="chord-gambar">' + gambar + "</span></button>" +
    '<button type="button" class="fav-btn' + (fav ? " is-aktif" : "") + '" data-aksi="fav-chord" data-r="' + item.root + '" data-t="' + esc(item.tipeId) +
      '" aria-label="' + (fav ? "Hapus dari favorit" : "Tambah ke favorit") + '" aria-pressed="' + fav + '">' + (fav ? "&#9733;" : "&#9734;") + "</button>" +
  "</div>";
}

/* Hanya isi grid (dipanggil saat mengetik, supaya kolom cari tidak hilang fokus) */
function renderGridChord(data, st) {
  const daftar = kumpulChord(data, st);
  const wadah = $("#gridChord");
  if (!wadah) return;
  if (daftar.length === 0) {
    wadah.innerHTML = kosong(st.cari.trim() ? "tidak ada chord yang cocok" : "belum ada chord favorit. ketuk bintang di kartu chord");
    return;
  }
  wadah.innerHTML = '<div class="chord-grid">' + daftar.map((x) => kartuChord(x, data)).join("") + "</div>";
}
/* ===== CHORD END ===== */


/* ===== DETAIL CHORD START =====
   Isi dialog chord: diagram besar, nada penyusun, dan semua
   variasi bentuk jari. det = { inst, root, tipeId, bass, idx }
   ================================================================ */
function htmlDetailChord(data, det) {
  const inst = INSTRUMEN[det.inst];
  const tipe = TIPE_ID[det.tipeId];
  const vs = cariVoicing(det.inst, det.root, det.tipeId);
  const idx = Math.min(det.idx, Math.max(0, vs.length - 1));
  const v = vs[idx];
  const kunci = kunciFav(det.inst, det.root, det.tipeId);
  const fav = data.favorit.indexOf(kunci) >= 0;
  const nama = namaChord(det.root, det.tipeId) + (det.bass !== null && det.bass !== undefined ? "/" + namaNada(det.bass) : "");
  const nada = nadaPenyusun(det.root, det.tipeId).join(" &middot; ");

  let isi =
    '<div class="detail-atas"><div><h2 class="sheet-title detail-judul">' + esc(nama) + "</h2>" +
      '<p class="muted detail-sub">' + esc(tipe.nama) + " &middot; " + esc(inst.nama) + "</p></div>" +
      '<button type="button" class="fav-btn fav-btn--besar' + (fav ? " is-aktif" : "") + '" data-aksi="fav-detail" aria-pressed="' + fav +
        '" aria-label="Favorit">' + (fav ? "&#9733;" : "&#9734;") + "</button></div>" +
    '<p class="detail-nada">' + nada + "</p>";

  if (det.bass !== null && det.bass !== undefined && det.bass !== det.root) {
    isi += '<p class="hint">Chord dengan bass ' + esc(namaNada(det.bass)) + ". Diagram menampilkan chord dasarnya; mainkan " +
           esc(namaNada(det.bass)) + " di nada terendah.</p>";
  }

  if (!v) {
    isi += kosong("belum ada bentuk jari yang praktis untuk chord ini di " + inst.nama.toLowerCase() + ".");
  } else {
    isi += '<div class="detail-gambar">' + chordSVG(v, inst.senar.length) + "</div>" +
      '<p class="detail-jari">' + esc(teksJari(v.frets)) + "</p>" +
      '<p class="muted detail-info">variasi ' + (idx + 1) + " dari " + vs.length + " &middot; " +
        (v.mulai > 1 ? "posisi fret " + v.mulai : "posisi terbuka") + (v.barre ? " &middot; barre fret " + v.barre.fret : "") + "</p>";
    if (vs.length > 1) {
      isi += '<div class="var-baris">' + vs.map((x, i) =>
        '<button type="button" class="var-btn' + (i === idx ? " is-active" : "") + '" data-aksi="chord-var" data-idx="' + i +
        '" aria-label="Variasi ' + (i + 1) + '">' + chordSVG(x, inst.senar.length) + "</button>").join("") + "</div>";
    }
  }

  isi += '<div class="sheet-actions"><button type="button" class="btn btn--solid" data-aksi="tutup-dialog">tutup</button></div>';
  return isi;
}
/* ===== DETAIL CHORD END ===== */


/* ===== TUNER START =====
   Tuner mikrofon: jarum, nama nada, selisih (cent), dan tombol senar.
   renderTuner menggambar kerangkanya; perbaruiTuner dipanggil terus
   saat mikrofon aktif untuk menggerakkan jarum.
   st = { aktif, pilih }
   ================================================================ */
function gaugeSVG() {
  const CX = 120, CY = 118;
  let s = '<svg class="gauge" viewBox="0 0 240 134" role="img" aria-label="penunjuk tuner">';
  /* garis skala tiap 10 cent dari -50 sampai +50 */
  for (let c = -50; c <= 50; c += 10) {
    const a = (c * 0.9 * Math.PI) / 180;
    const besar = c === 0;
    const r1 = besar ? 80 : 86;
    const r2 = 98;
    s += '<line class="gauge-tick' + (besar ? " gauge-tick--besar" : "") + '" x1="' + (CX + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (CY - r1 * Math.cos(a)).toFixed(1) +
         '" x2="' + (CX + r2 * Math.sin(a)).toFixed(1) + '" y2="' + (CY - r2 * Math.cos(a)).toFixed(1) + '"/>';
  }
  s += '<text class="gauge-ket" x="22" y="126">&flat; rendah</text>';
  s += '<text class="gauge-ket" x="218" y="126" text-anchor="end">tinggi &sharp;</text>';
  s += '<g class="gauge-jarum" id="jarum" transform="rotate(0 ' + CX + " " + CY + ')">' +
       '<line x1="' + CX + '" y1="' + CY + '" x2="' + CX + '" y2="30"/></g>';
  s += '<circle class="gauge-pivot" cx="' + CX + '" cy="' + CY + '" r="7"/></svg>';
  return s;
}

function renderTuner(data, st) {
  const p = data.pengaturan;
  const daftar = daftarTuning(data);
  const aktif = tuningAktif(data);

  const opsi = KELOMPOK_TUNING.map((k) => {
    const isi = daftar.filter((t) => t.kelompok === k.id);
    if (!isi.length) return "";
    return '<optgroup label="' + esc(k.nama) + '">' + isi.map((t) =>
      '<option value="' + esc(t.id) + '"' + (t.id === aktif.id ? " selected" : "") + ">" + esc(t.nama) + "</option>").join("") + "</optgroup>";
  }).join("");

  const n = aktif.senar.length;
  const senar = aktif.senar.map((m, i) =>
    '<button type="button" class="senar-btn" id="senar-' + i + '" data-aksi="tuner-senar" data-i="' + i + '">' +
      '<span class="senar-no">' + (n - i) + "</span><b>" + esc(NADA_SHARP[m % 12]) + "</b><small>" + (Math.floor(m / 12) - 1) + "</small></button>").join("");

  const mic = Tuner.tersedia()
    ? ""
    : '<p class="hint hint--peringatan">Mikrofon hanya bisa dipakai lewat https atau localhost. Lihat README.md untuk cara menjalankannya.</p>';

  $("#isi-tuner").innerHTML =
    '<div class="field"><label for="pilihTuning">tuning</label><select id="pilihTuning">' + opsi + "</select></div>" +
    chipsHTML([["auto", "Otomatis"], ["manual", "Pilih senar"]], p.modeTuner, "set-mode-tuner", "mode") +
    '<div class="tuner-kotak">' + gaugeSVG() +
      '<p class="tn-nada" id="tnNada">&ndash;</p>' +
      '<p class="tn-cent" id="tnCent">&nbsp;</p>' +
      '<p class="tn-status" id="tnStatus">' + (st.aktif ? "petik satu senar" : "tekan mulai, lalu petik satu senar") + "</p>" +
      '<p class="tn-freq muted" id="tnFreq">&nbsp;</p></div>' +
    '<div class="senar-baris">' + senar + "</div>" +
    '<p class="hint" id="tnPetunjuk">' + (p.modeTuner === "auto"
      ? "Mode otomatis: tuner mencari senar terdekat sendiri. Ketuk senar untuk mendengar nada acuannya."
      : "Mode pilih senar: ketuk senar yang mau disetel (nada acuan ikut berbunyi), lalu petik senar itu.") + "</p>" +
    mic +
    '<div class="tuner-aksi">' +
      '<button type="button" class="btn btn--solid btn--besar" data-aksi="tuner-toggle">' + (st.aktif ? "berhenti" : "mulai tuner") + "</button>" +
    "</div>" +
    '<div class="tuner-aksi tuner-aksi--kecil">' +
      '<button type="button" class="mini-btn" data-aksi="tuning-baru">+ tuning baru</button>' +
      (aktif.kustom ? '<button type="button" class="mini-btn mini-btn--abu" data-aksi="tuning-hapus">hapus tuning ini</button>' : "") +
      '<small class="muted">acuan A4 = ' + p.a4 + " Hz</small>" +
    "</div>";

  perbaruiSenar(st.pilih, p.modeTuner === "manual", null);
}

/* Beri tanda senar yang sedang dipilih (manual) atau terdeteksi (auto) */
function perbaruiSenar(pilih, manual, terdeteksi) {
  $$(".senar-btn").forEach((b) => {
    const i = Number(b.dataset.i);
    b.classList.toggle("is-pilih", manual && i === pilih);
    b.classList.toggle("is-aktif", terdeteksi !== null && i === terdeteksi);
  });
}

/* info = null (tidak ada suara) atau { nada, cent, freq, idx }
   Memperbarui jarum & teks tanpa menggambar ulang halaman. */
function perbaruiTuner(info, st, manual) {
  const jarum = $("#jarum");
  const nada = $("#tnNada");
  const cent = $("#tnCent");
  const status = $("#tnStatus");
  const freq = $("#tnFreq");
  const kotak = $(".tuner-kotak");
  if (!jarum || !nada || !cent || !status || !freq || !kotak) return;

  if (!info) {
    jarum.setAttribute("transform", "rotate(0 120 118)");
    kotak.classList.remove("is-pas", "is-rendah", "is-tinggi");
    cent.innerHTML = "&nbsp;";
    freq.innerHTML = "&nbsp;";
    status.textContent = st.aktif ? "petik satu senar" : "tekan mulai, lalu petik satu senar";
    if (!manual) nada.innerHTML = "&ndash;";
    perbaruiSenar(st.pilih, manual, null);
    return;
  }

  const c = Math.round(info.cent);
  const pas = Math.abs(info.cent) <= 5;
  jarum.setAttribute("transform", "rotate(" + (batasi(info.cent, -50, 50) * 0.9).toFixed(1) + " 120 118)");
  kotak.classList.toggle("is-pas", pas);
  kotak.classList.toggle("is-rendah", !pas && info.cent < 0);
  kotak.classList.toggle("is-tinggi", !pas && info.cent > 0);
  nada.textContent = info.nada;
  cent.textContent = (c > 0 ? "+" : "") + c + " cent";
  freq.textContent = info.freq.toFixed(1) + " Hz";
  status.textContent = pas ? "pas ✓" : info.cent < 0 ? "terlalu rendah → kencangkan" : "terlalu tinggi → kendurkan";
  perbaruiSenar(st.pilih, manual, manual ? null : info.idx);
}
/* ===== TUNER END ===== */


/* ===== LAGU START =====
   Daftar lagu dan pembaca lagu (chord di atas lirik).
   st = { bukaId, cari, lirikSaja, scroll }
   ================================================================ */
function renderLagu(data, st) {
  const lagu = st.bukaId ? data.lagu.find((l) => l.id === st.bukaId) : null;
  if (lagu) { renderBaca(data, st, lagu); return; }

  $("#isi-lagu").innerHTML =
    '<input type="search" class="cari" id="inputCariLagu" placeholder="cari judul atau artis..." autocomplete="off" aria-label="Cari lagu" value="' + esc(st.cari) + '">' +
    '<div id="daftarLagu"></div>' +
    '<p class="hint hint--atas">Ketuk + untuk menambah lagu. Salin chord + lirik dari situs chord, lalu tempel di form.</p>';
  renderDaftarLagu(data, st);
}

function renderDaftarLagu(data, st) {
  const wadah = $("#daftarLagu");
  if (!wadah) return;
  const q = st.cari.trim().toLowerCase();
  const daftar = data.lagu
    .filter((l) => !q || (l.judul + " " + l.artis).toLowerCase().indexOf(q) >= 0)
    .sort((a, b) => b.diubah - a.diubah);

  if (daftar.length === 0) {
    wadah.innerHTML = kartu("", kosong(q ? "tidak ada lagu yang cocok" : "belum ada lagu. ketuk + untuk menambah"));
    return;
  }
  wadah.innerHTML = daftar.map((l) =>
    '<article class="card card--rapat lagu-item">' +
      '<button type="button" class="baris-btn lagu-buka" data-aksi="buka-lagu" data-id="' + esc(l.id) + '">' +
        '<span class="baris-kiri"><strong>' + esc(l.judul) + "</strong>" +
        '<small class="muted">' + esc(l.artis || "tanpa artis") + (l.transpose ? " &middot; transpose " + (l.transpose > 0 ? "+" : "") + l.transpose : "") + "</small></span>" +
        '<span class="baris-kanan muted" aria-hidden="true">&rsaquo;</span></button>' +
      '<button type="button" class="x-btn x-btn--aksen" data-aksi="edit-lagu" data-id="' + esc(l.id) + '" aria-label="Ubah lagu ' + esc(l.judul) + '">&#9998;</button>' +
    "</article>").join("");
}

/* Teks tombol transpose: "0", "+2", "-1" */
const labelTranspose = (n) => (n > 0 ? "+" : "") + n;

function renderBaca(data, st, lagu) {
  const p = data.pengaturan;
  const dasar = chordPertama(lagu.teks, lagu.transpose);

  $("#isi-lagu").innerHTML =
    '<div class="bar-baca" id="barBaca">' +
      '<button type="button" class="mini-btn mini-btn--tgl' + (st.lirikSaja ? " is-aktif" : "") + '" id="tombolLirik" data-aksi="lirik-saja" aria-pressed="' + st.lirikSaja + '">&#9835; Mode Lirik</button>' +
      '<span class="grup-btn" aria-label="Ukuran huruf">' +
        '<button type="button" data-aksi="font" data-arah="-1" aria-label="Perkecil huruf">A&minus;</button>' +
        '<button type="button" data-aksi="font" data-arah="1" aria-label="Perbesar huruf">A+</button></span>' +
      '<span class="grup-btn" aria-label="Transpose">' +
        '<button type="button" data-aksi="transpose" data-arah="-1" aria-label="Turunkan nada">&minus;</button>' +
        '<button type="button" id="tombolTranspose" data-aksi="transpose" data-arah="0" aria-label="Kembali ke nada asli">' + labelTranspose(lagu.transpose) + "</button>" +
        '<button type="button" data-aksi="transpose" data-arah="1" aria-label="Naikkan nada">+</button></span>' +
      '<span class="grup-btn grup-btn--scroll">' +
        '<button type="button" id="tombolScroll" class="' + (st.scroll ? "is-aktif" : "") + '" data-aksi="scroll-toggle" aria-pressed="' + st.scroll + '">' + (st.scroll ? "&#10074;&#10074; Berhenti" : "&#9654; Auto Scroll") + "</button>" +
        '<button type="button" data-aksi="scroll-kec" data-arah="-1" aria-label="Lebih lambat">&minus;</button>' +
        '<span class="kec" id="lblKecepatan" aria-label="Kecepatan">' + p.scrollLagu + "</span>" +
        '<button type="button" data-aksi="scroll-kec" data-arah="1" aria-label="Lebih cepat">+</button></span>' +
    "</div>" +
    '<div class="lagu-kepala"><h2 class="lagu-judul">' + esc(lagu.judul) + "</h2>" +
      '<p class="muted lagu-artis">' + esc(lagu.artis) + (lagu.artis && dasar ? " &middot; " : "") +
      (dasar ? 'mulai dari chord <b id="chordAwal">' + esc(dasar) + "</b>" : "") + "</p></div>" +
    '<div class="lagu-teks' + (st.lirikSaja ? " lirik-saja" : "") + '" id="laguTeks" style="font-size:' + p.fontLagu + 'px">' +
      htmlLagu(lagu.teks, lagu.transpose) + "</div>" +
    '<p class="hint hint--atas">Ketuk chord untuk melihat bentuk jarinya.</p>';
}

/* Perbarui bagian pembaca tanpa menggambar ulang (supaya posisi scroll tetap) */
function perbaruiBaca(data, st, lagu) {
  const teks = $("#laguTeks");
  if (!teks) return;
  teks.innerHTML = htmlLagu(lagu.teks, lagu.transpose);
  teks.style.fontSize = data.pengaturan.fontLagu + "px";
  teks.classList.toggle("lirik-saja", st.lirikSaja);

  const tr = $("#tombolTranspose");
  if (tr) tr.textContent = labelTranspose(lagu.transpose);
  const awal = $("#chordAwal");
  if (awal) awal.textContent = chordPertama(lagu.teks, lagu.transpose);
  const lirik = $("#tombolLirik");
  if (lirik) { lirik.classList.toggle("is-aktif", st.lirikSaja); lirik.setAttribute("aria-pressed", String(st.lirikSaja)); }
  const kec = $("#lblKecepatan");
  if (kec) kec.textContent = data.pengaturan.scrollLagu;
  const sc = $("#tombolScroll");
  if (sc) {
    sc.classList.toggle("is-aktif", st.scroll);
    sc.setAttribute("aria-pressed", String(st.scroll));
    sc.innerHTML = st.scroll ? "&#10074;&#10074; Berhenti" : "&#9654; Auto Scroll";
  }
}
/* ===== LAGU END ===== */


/* ===== PENGATURAN START =====
   Tampilan (mode & warna), acuan tuner, cadangan data, pasang app.
   ================================================================ */
function renderPengaturan(data, pasang) {
  const p = data.pengaturan;
  pasang = pasang || { terpasang: true };

  /* --- Tampilan --- */
  const mode = chipsHTML([["auto", "otomatis"], ["terang", "terang"], ["gelap", "gelap"]], p.mode, "set-mode", "mode");
  const swatch = PRESET_WARNA.map((w) =>
    '<button type="button" class="swatch' + (p.aksen.toLowerCase() === w.hex.toLowerCase() ? " is-active" : "") + '" style="--sw:' + w.hex +
    '" data-aksi="set-preset" data-preset="' + w.id + '" data-hex="' + w.hex + '" aria-label="Warna ' + w.nama + '" title="' + w.nama + '"></button>'
  ).join("");
  const tampilan = kartu("Tampilan",
    '<p class="sub-head sub-head--atas">mode</p>' + mode +
    '<p class="sub-head">warna tema</p><div class="swatch-baris">' + swatch +
    '<label class="swatch swatch--kustom" title="Warna bebas"><input type="color" id="warnaKustom" value="' + esc(p.aksen) + '" aria-label="Pilih warna bebas"><span>+</span></label></div>');

  /* --- Tuner --- */
  const tuner = kartu("Tuner",
    '<p class="hint">Acuan nada A4. Standar dunia 440 Hz. Ubah hanya kalau ensemble atau instrumenmu memakai acuan lain.</p>' +
    chipsHTML([432, 435, 438, 440, 442, 444].map((h) => [h, h + " Hz"]), p.a4, "set-a4", "hz"));

  /* --- Cadangan --- */
  const cadangan = kartu("Data &amp; cadangan",
    '<p class="hint">Data (' + data.lagu.length + " lagu, " + data.favorit.length + " chord favorit, " + data.tuningKustom.length + " tuning sendiri) tersimpan di browser perangkat ini saja. " +
    "Kalau data browser dibersihkan atau ganti HP, data hilang. Ekspor JSON secara berkala sebagai cadangan.</p>" +
    '<div class="btn-grid">' +
      '<button type="button" class="btn" data-aksi="ekspor-json">ekspor JSON</button>' +
      '<button type="button" class="btn" data-aksi="impor">impor JSON</button>' +
      '<button type="button" class="btn btn--danger btn--lebar" data-aksi="reset-data">reset semua data</button></div>');

  /* --- Pasang aplikasi (disembunyikan kalau sudah terpasang) --- */
  let kartuPasang = "";
  if (!pasang.terpasang) {
    const petunjuk = pasang.bisa
      ? '<button type="button" class="btn btn--solid" data-aksi="pasang-app">pasang sekarang</button>'
      : pasang.ios
        ? '<p class="hint">Buka halaman ini di <strong>Safari</strong>, ketuk tombol <strong>Bagikan</strong>, lalu pilih <strong>Tambah ke Layar Utama</strong>.</p>' +
          '<p class="hint">Catatan: aplikasi di layar utama punya penyimpanan terpisah dari Safari. Kalau sudah punya data di Safari, ' +
          "ekspor JSON dulu lalu impor di aplikasinya.</p>"
        : '<p class="hint">Chrome Android: buka menu &#8942; lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>. ' +
          "Di komputer: klik ikon pasang di address bar.</p>";
    kartuPasang = kartu("Pasang aplikasi",
      '<p class="hint">Pasang di layar utama supaya terbuka seperti aplikasi biasa dan tetap bisa dipakai tanpa internet. Datamu tetap hanya di perangkat ini.</p>' +
      petunjuk);
  }

  const tentang = kartu("Tentang",
    barisInfo("Aplikasi", esc(NAMA_APP)) + barisInfo("Versi", "v" + esc(VERSI_APP)) +
    '<p class="hint hint--atas">Pustaka chord, tuner, dan chord + lirik untuk main gitar dan ukulele.</p>');

  $("#isi-pengaturan").innerHTML = '<div class="grid">' + tampilan + tuner + cadangan + kartuPasang + "</div>" + tentang;
}
/* ===== PENGATURAN END ===== */
