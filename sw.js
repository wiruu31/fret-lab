/* ================================================================
   SW.JS - SERVICE WORKER  [FretLab v1.1.0]
   Menyimpan file aplikasi di cache agar bisa dibuka tanpa internet.
   Strategi: cache dulu, lalu perbarui di latar belakang.
   Naikkan VERSI_CACHE setiap kali ada file yang diubah.
   ================================================================ */
const VERSI_CACHE = "fretlab-v1.1.0-5";
const FILE_APP = [
  "./",
  "fretlab.html",
  "fretlab.css",
  "data.js",
  "storage.js",
  "audio.js",
  "ui.js",
  "halaman.js",
  "app.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSI_CACHE).then((c) => c.addAll(FILE_APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(nama.filter((n) => n !== VERSI_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((tersimpan) => {
      const jaringan = fetch(req).then((res) => {
        if (res && res.ok) {
          const salinan = res.clone();
          caches.open(VERSI_CACHE).then((c) => c.put(req, salinan));
        }
        return res;
      }).catch(() => tersimpan || caches.match("fretlab.html"));
      return tersimpan || jaringan;
    })
  );
});
