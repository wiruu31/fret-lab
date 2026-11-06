# FredLab v1.0.0

Web app (PWA) untuk main gitar dan ukulele: **pustaka chord**, **tuner**, dan **chord + lirik** (chord di atas lirik, transpose, auto scroll).

© 2026 Muh Geris Wiruno Mandawa. Semua hak dilindungi.

## Fitur
- **Chord**: semua nada dasar (C, C#, D, ... B) x 29 jenis chord (mayor, minor, 5, dim, aug, sus2, sus4, 7sus4, 7, maj7, m7, mMaj7, dim7, m7b5, 7#5, 7b5, 6, m6, 69, add9, madd9, 9, maj9, m9, 11, m11, 13, 7b9, 7#9). Gitar dan ukulele, banyak variasi bentuk jari per chord, pencarian (Am7, F#m, sus), dan favorit.
- **Tuner**: mikrofon (deteksi nada YIN), mode otomatis atau pilih senar, nada acuan lewat speaker. Tuning bawaan: Standar, Drop D, Setengah nada turun, Satu nada turun, Drop C, Double Drop D, DADGAD, Open D/G/C/E, Ukulele (standar, low G, baritone, D), dan tuning buatan sendiri. Acuan A4 bisa diubah.
- **Lagu**: tempel chord + lirik sendiri. Mode Lirik, ukuran huruf, transpose, Auto Scroll (layar dijaga menyala), ketuk chord untuk melihat bentuk jarinya.
- **Tema**: otomatis/terang/gelap, warna preset (bawaan Biru) + warna bebas.
- **Offline & dipasang di layar utama** (PWA). Data tersimpan di `localStorage` perangkat; ada ekspor/impor JSON.

## Struktur
```
fredlab.html            halaman utama
fredlab.css             tampilan
data.js                 mesin chord, tuning, konstanta
storage.js              penyimpanan (localStorage)
audio.js                mikrofon, deteksi nada, nada acuan
ui.js                   helper, diagram chord SVG, parser lagu, tema
halaman.js              render semua halaman
app.js                  state, event, tuner, auto scroll, PWA
manifest.webmanifest    manifest PWA
sw.js                   service worker (offline)
icons/                  ikon aplikasi
```

## Cara menjalankan
Mikrofon (tuner) dan service worker **hanya jalan lewat `https://` atau `http://localhost`**, bukan dengan membuka file langsung.

Lokal:
```
cd fredlab
python3 -m http.server 8000
```
lalu buka `http://localhost:8000/fredlab.html`.

Hosting: upload semua file ke GitHub Pages / Netlify / Cloudflare Pages (otomatis https). Buka `fredlab.html` (atau ganti nama menjadi `index.html` dan ubah `start_url` di manifest serta daftar di `sw.js`).

Setelah mengubah file, naikkan `VERSI_CACHE` di `sw.js` agar perangkat memuat versi baru.

## Cara menambah lagu
Tab **Lagu** → tombol **+** → isi judul, lalu tempel chord + lirik. Baris chord di atas baris lirik; label seperti `Intro :` / `Reff :` dikenali. Aplikasi tidak menyertakan lirik berhak cipta.

## Catatan
- Data hanya di browser perangkat ini. Ekspor JSON secara berkala (Pengaturan → Data & cadangan).
- Aplikasi yang dipasang di layar utama iOS punya penyimpanan terpisah dari Safari.
