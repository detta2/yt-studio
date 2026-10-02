# BLUEPRINT: SiPintar Content Studio (YouTube Automation Dashboard)

> Tujuan: dashboard web untuk memanage konten YouTube Shorts — generate otomatis tiap hari,
> upload otomatis ke YouTube, statistik views/likes/komen otomatis.
> Status: BLUEPRINT — belum dibangun. Menunggu persetujuan detta.

## 1. Gambaran Sistem

```
┌──────────────────┐      ┌───────────────────┐      ┌──────────────┐
│   DASHBOARD      │─────▶│   BACKEND         │─────▶│ YouTube API  │
│   (web statis)   │      │   (FastAPI, di VM)│      │ (OAuth milik │
│   kalender,      │      │   queue, upload,  │      │  detta)      │
│   antrian,       │      │   stats, auth     │      │              │
│   statistik      │      │                   │      │              │
└──────────────────┘      └─────────┬─────────┘      └──────────────┘
                                    ▲
                          ┌─────────┴─────────┐
                          │   CRON (jadwal)   │
                          │ • 06:00 generate  │
                          │ • tiap 30 mnt     │
                          │   cek & upload    │
                          │ • 07:00 sync stat │
                          └───────────────────┘
```

## 2. Komponen

### 2.1 Content Generator (cron harian 06:00 WIB)
- Agent (aku) generate 1 video CCTV/hari via media pipeline.
- Tema rotasi otomatis: hewan (kucing, musang, monyet, biawak, burung hantu) → misteri (bayangan, pocong, kuntilanak).
- Output: `queue/<id>.mp4` + `queue/<id>.json` (judul, hashtag, deskripsi, jadwal default 19:00).
- Kalau generate gagal → cron lapor, antrian kosong hari itu (tidak di-skip diam-diam).

### 2.2 Dashboard (web)
Single-page app, deploy statis (GitHub Pages, repo baru `yt-studio`).

| Tab | Isi |
|-----|-----|
| 📋 Antrian | List video siap: preview, edit judul/hashtag/deskripsi, atur jadwal, tombol Setujui / Hapus / Upload manual |
| 📅 Kalender | View bulanan: terjadwal (kuning), terbit (hijau), gagal (merah). Klik tanggal = detail |
| 📊 Statistik | Tabel + grafik: views, likes, komen per video; total channel; tren 7/30 hari |
| ⚙️ Pengaturan | Status koneksi YouTube (Connect/Disconnect), jam rilis default, rotasi tema, API quota hari ini |

### 2.3 Backend (FastAPI, jalan di VM Detta via systemd)
Karena dashboard statis tidak bisa simpan token OAuth dengan aman.

**Endpoint:**
| Method | Path | Fungsi |
|--------|------|--------|
| GET | /api/queue | List antrian + metadata |
| PATCH | /api/queue/:id | Edit judul/hashtag/jadwal/status |
| DELETE | /api/queue/:id | Hapus dari antrian |
| POST | /api/queue/:id/upload | Upload manual sekarang |
| GET | /api/stats | Statistik semua video published |
| GET | /api/channel | Info channel + quota terpakai |
| GET | /api/youtube/auth | Mulai OAuth flow |
| GET | /api/youtube/callback | Terima OAuth code |
| GET | /api/youtube/status | Cek koneksi |
| POST | /api/youtube/disconnect | Putus koneksi |

**Penyimpanan:** SQLite lokal (`studio.db`): queue, videos, stats_cache, tokens (terenkripsi Fernet).

### 2.4 Auto Uploader (cron tiap 30 menit)
- Cek item `status=scheduled` yang `scheduled_at` sudah lewat → upload via `videos.insert`.
- Upload: `privacyStatus=public` (atau `private` + `publishAt` kalau mau scheduled ala YouTube).
- Retry 3x dengan backoff; kalau gagal → status `failed` + notifikasi ke detta.
- Setelah sukses: pindah ke `published/`, simpan `youtube_id`.

### 2.5 Stats Sync (cron harian 07:00 WIB)
- `videos.list(part=statistics)` untuk semua `youtube_id` → simpan ke DB.
- Hitung delta harian untuk grafik tren.

## 3. YouTube API — Detail Teknis

- **API:** YouTube Data API v3.
- **Scope OAuth:** `https://www.googleapis.com/auth/youtube.upload` + `https://www.googleapis.com/auth/youtube.readonly`
- **Kuota gratis:** 10.000 unit/hari.
  - 1 upload = 1.600 unit → maks ~6 video/hari (kita cuma butuh 1).
  - 1 stats sync (±50 video) = ~50 unit. Aman jauh.
- **Token:** access token (1 jam) + refresh token (long-lived). Backend refresh otomatis.
- **Batasan jujur:**
  - Upload Shorts via API = video vertikal ≤ 3 menit + `#shorts` di judul/deskripsi (aturan YouTube, bukan API).
  - API tidak bisa set "Made for Kids" otomatis per video? Bisa — `status.madeForKids`.
  - Komentar/dislike tidak bisa diambil detail via Data API v3 (hanya count).

## 4. Data Model (SQLite)

```sql
queue(id TEXT PK, file TEXT, theme TEXT, title TEXT, hashtags TEXT,
      description TEXT, scheduled_at TEXT, status TEXT, created_at TEXT);

videos(id TEXT PK, youtube_id TEXT, title TEXT, published_at TEXT,
       scheduled_at TEXT, theme TEXT);

stats(youtube_id TEXT, date TEXT, views INT, likes INT, comments INT,
      PRIMARY KEY(youtube_id, date));

tokens(id INTEGER PK CHECK(id=1), access TEXT, refresh TEXT, expiry TEXT);
```

## 5. Keamanan & Kredensial

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → env di backend, diisi detta via Secure Vault (tidak via chat, tidak di repo).
- Token OAuth terenkripsi (Fernet, key di env) di SQLite. Tidak pernah dikirim ke frontend.
- Dashboard hanya terima data yang sudah dibersihkan (tidak ada token/secret di response API).
- CORS: backend hanya terima origin dashboard.

## 6. Fase Pembangunan

| Fase | Isi | Butuh detta |
|------|-----|-------------|
| 1 | Dashboard UI + queue lokal (tanpa YouTube) | — |
| 2 | Backend + OAuth YouTube + tab Statistik live | Buat OAuth client di Google Cloud Console (10 mnt), isi client ID/secret via Secure Vault, klik Connect |
| 3 | Auto-uploader + scheduler | — |
| 4 | Cron generate harian (aku yang generate) | — |

## 7. Yang Harus Detta Siapkan (Fase 2)

1. [Google Cloud Console](https://console.cloud.google.com) → project baru → Enable **YouTube Data API v3**.
2. Credentials → Create Credentials → OAuth client ID → tipe **Web application**.
3. Authorized redirect URI: `https://<backend>/api/youtube/callback` (aku kasih URL pastinya nanti).
4. (Opsional tapi disarankan) OAuth consent screen → tambahkan email sendiri sebagai Test User.
5. Isi Client ID + Client Secret via Secure Vault yang aku siapkan.

## 7b. Fase 5 (opsional): Facebook
- Auto-post Reels ke Halaman Facebook via Graph API + tarik insights (views/likes).
- Catatan: API optimal untuk Halaman/Page. Akun pribadi mode Profesional dibatasi API-nya.
- Perlu: Facebook App + Page access token (detta setup via Meta for Developers).

## 8. Risiko & Batasan Jujur
1. **VM ephemeral:** backend jalan di VM-ku. Kalau VM di-replace, systemd service harus auto-start (aku setup). Home dir persisten jadi DB aman.
2. **Kuota YouTube:** kalau >6 upload/hari → 403 quotaExceeded sampai reset tengah malam US time.
3. **Generate gagal:** model video kadang nolak prompt (pernah kejadian untuk pocong+lingkaran). Antrian hari itu kosong → dashboard kasih tau, tidak diam-diam.
4. **Label AI:** YouTube mewajibkan label konten AI ("altered content"). Uploader set otomatis `status` sesuai — detta tetap wajib cek kepatuhan per video di YouTube Studio.
5. **Hak cipta audio:** video generated tanpa musik (sesuai saran). Kalau detta tambah musik manual, tanggung jawab sendiri.

## 9. Estimasi

- Fase 1 (dashboard): 1 sesi kerja.
- Fase 2 (backend + OAuth): 1–2 sesi (tergantung setup Google Cloud detta).
- Fase 3–4: 1 sesi.

---

*Ditulis 2026-10-02. Menunggu GO dari detta untuk mulai Fase 1.*
