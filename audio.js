/* ================================================================
   AUDIO.JS - MIKROFON, DETEKSI NADA, NADA ACUAN  [FretLab v1.1.0]
   Dipakai oleh Tuner. File ini hanya mengurus suara:
   - deteksiPitch : mengubah rekaman pendek menjadi frekuensi (Hz)
                    memakai algoritma YIN
   - Tuner.mulai / berhenti : membuka dan menutup mikrofon
   - Tuner.bunyikan : membunyikan nada acuan lewat speaker
   File ini TIDAK menyentuh tampilan dan TIDAK menyimpan data.

   Mikrofon hanya jalan lewat https:// atau localhost, dan harus
   dimulai dari ketukan pengguna.

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   DETEKSI PITCH | TUNER
   ================================================================ */


/* ===== DETEKSI PITCH START =====
   Algoritma YIN (de Cheveigne & Kawahara, 2002), versi ringkas.
   Menerima potongan gelombang suara, mengembalikan
   { freq, kuat } atau null kalau tidak ada nada yang jelas.
   Jangkauan: sekitar 55 Hz sampai 1400 Hz (cukup untuk gitar & ukulele).
   ================================================================ */
const AMBANG_DIAM = 0.008;     // di bawah volume ini dianggap sunyi (RMS)
const AMBANG_YIN = 0.12;       // makin kecil makin ketat

function deteksiPitch(buf, sampleRate) {
  /* Volume terlalu kecil = sunyi */
  let jumlah = 0;
  for (let i = 0; i < buf.length; i++) jumlah += buf[i] * buf[i];
  const rms = Math.sqrt(jumlah / buf.length);
  if (rms < AMBANG_DIAM) return null;

  const W = Math.floor(buf.length / 2);
  const tauMax = Math.min(W - 1, Math.floor(sampleRate / 55));
  const tauMin = Math.max(2, Math.floor(sampleRate / 1400));
  if (tauMax <= tauMin + 2) return null;

  /* Langkah 1-2: selisih kuadrat, lalu dinormalkan */
  const cm = new Float32Array(tauMax + 1);
  let total = 0;
  cm[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    total += s;
    cm[tau] = total > 0 ? (s * tau) / total : 1;
  }

  /* Langkah 3: cari lembah pertama di bawah ambang */
  let tau = tauMin;
  let ketemu = -1;
  while (tau < tauMax) {
    if (cm[tau] < AMBANG_YIN) {
      while (tau + 1 < tauMax && cm[tau + 1] < cm[tau]) tau++;
      ketemu = tau;
      break;
    }
    tau++;
  }
  if (ketemu < 0) return null;

  /* Langkah 4: haluskan dengan interpolasi parabola */
  let tauHalus = ketemu;
  if (ketemu > 1 && ketemu < tauMax) {
    const a = cm[ketemu - 1];
    const b = cm[ketemu];
    const c = cm[ketemu + 1];
    const pembagi = 2 * (2 * b - c - a);
    if (pembagi !== 0) tauHalus = ketemu + (c - a) / pembagi;
  }
  return { freq: sampleRate / tauHalus, kuat: 1 - cm[ketemu], rms: rms };
}
/* ===== DETEKSI PITCH END ===== */


/* ===== TUNER START =====
   Objek Tuner: membuka mikrofon dan memanggil callback sekitar
   16 kali per detik dengan hasil deteksiPitch (atau null).
   ================================================================ */
const Tuner = {
  ctx: null,
  stream: null,
  analyser: null,
  buf: null,
  jalan: false,
  raf: 0,
  terakhir: 0,
  ctxKeluar: null,
  abaikanSampai: 0,    // saat nada acuan berbunyi, mikrofon diabaikan sebentar

  tersedia() {
    return Boolean(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  },

  async mulai(callback) {
    if (this.jalan) return;
    if (!this.tersedia()) {
      throw new Error("Mikrofon hanya bisa dipakai lewat https atau localhost. Lihat README.md");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
    });

    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state === "suspended") await this.ctx.resume();

    const sumber = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0;
    sumber.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);

    this.jalan = true;
    this.terakhir = 0;

    const putar = (waktu) => {
      if (!this.jalan) return;
      this.raf = requestAnimationFrame(putar);
      if (waktu - this.terakhir < 60) return;   // sekitar 16 kali per detik
      this.terakhir = waktu;
      this.analyser.getFloatTimeDomainData(this.buf);
      callback(deteksiPitch(this.buf, this.ctx.sampleRate));
    };
    this.raf = requestAnimationFrame(putar);
  },

  berhenti() {
    this.jalan = false;
    cancelAnimationFrame(this.raf);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.ctx) { try { this.ctx.close(); } catch (e) { /* abaikan */ } }
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
    this.buf = null;
  },

  /* Bunyikan nada acuan (gelombang segitiga, memudar pelan) */
  bunyikan(freq, detik) {
    const lama = detik || 1.6;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!this.ctxKeluar) this.ctxKeluar = new AC();
      const c = this.ctxKeluar;
      if (c.state === "suspended") c.resume();

      const osc = c.createOscillator();
      const gain = c.createGain();
      const t0 = c.currentTime;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + lama);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + lama + 0.05);

      this.abaikanSampai = performance.now() + lama * 1000 + 150;
    } catch (e) { /* suara tidak tersedia: abaikan */ }
  }
};
/* ===== TUNER END ===== */
