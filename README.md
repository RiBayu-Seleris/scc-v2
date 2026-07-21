# Seleris Credit Cover v2

Migrasi frontend **seleris-credit-cover** (Laravel + Vue 3 template VRISTO + Vuex +
Bootstrap/SASS) menjadi SPA murni: **Vue 3 + Vite + Pinia + TailwindCSS, JavaScript
saja (tanpa TypeScript)**. Fungsional dibuat sama persis dengan aslinya — yang
berubah hanya tech stack & tampilan.

> Sumber kebenaran perilaku: repo `seleris-credit-cover` (SCC).
> Daftar kecil penyimpangan yang disengaja (bug di SCC yang tidak layak ditiru)
> dicatat di [docs/BEDA-DARI-SCC.md](docs/BEDA-DARI-SCC.md).

## Menjalankan

```bash
npm install
npm run dev     # pengembangan
npm run build   # produksi (hasil di dist/)
```

Konfigurasi lingkungan di `.env`:

| Variabel | Isi |
| --- | --- |
| `VITE_API_URL` | Base URL API (produksi/staging — sama dengan SCC) |
| `VITE_APP_NAME` | Nama aplikasi di judul tab |

## Peta folder

```
src/
├── lib/
│   ├── api.js          # instance axios terpusat: Bearer token + auto-logout 401
│   ├── auth.js         # sesi login (localStorage) — SATU-satunya tempat key sesi
│   ├── menuFlags.js    # aturan role/partner -> flag menu (gating sidebar)
│   └── services/       # semua panggilan API per modul (submission, claim, dst.)
├── config/
│   ├── menu.js         # SUMBER DATA TUNGGAL menu sidebar (lihat bagian Menu)
│   ├── detailTabs.js   # daftar tab halaman detail (penutupan/klaim/restitusi)
│   └── productionTabs.js
├── stores/             # Pinia: auth (sesi+flags) & ui (tema/sidebar)
├── components/
│   ├── ui/             # komponen dasar (BaseSelect, DataTable, Modal, Card, ...)
│   └── layout/         # Sidebar, Navbar, DetailTabsLayout, dll.
└── views/              # halaman, dikelompokkan per modul
    ├── DashboardHome.vue   # pemilih varian dashboard per role (lihat bawah)
    └── dashboard/          # varian: DashboardStandard (bank/management), DashboardChubb
```

## Aturan main (wajib dibaca sebelum mengubah kode)

1. **Semua panggilan API lewat `src/lib/services/`** — komponen tidak memanggil
   axios langsung. Token & penanganan 401 sudah diurus `lib/api.js`.
2. **Perilaku harus tetap sama dengan SCC.** Kalau menemukan yang aneh, cek dulu
   file aslinya di repo SCC sebelum "memperbaiki" — bisa jadi memang begitu.
3. Komentar ditulis dalam Bahasa Indonesia dan menjelaskan "kenapa", bukan "apa".

## Menu sidebar (per role)

Menu ditentukan **data, bukan HTML**: array `MENU` di `src/config/menu.js`.

- **Menambah menu**: tambah satu objek `{ id, label, icon, route }` (route harus
  terdaftar di `src/router/index.js`).
- **Menyembunyikan permanen**: komentari objeknya.
- **Menampilkan/menyembunyikan per role**: beri properti `flag: 'namaFlag'` atau
  `notFlag: 'namaFlag'`. Daftar flag & aturannya ada di `src/lib/menuFlags.js`
  (contoh: role Broker melihat menu A-B-C-D, role Insurance hanya A-B-C — cukup
  atur flag di sana, `menu.js` tidak perlu diubah).

Catatan: menyembunyikan menu itu UX, bukan keamanan — gerbang aslinya route guard
di router + otorisasi backend.

## Dashboard per role

`views/DashboardHome.vue` memilih varian (meniru dispatcher `dashboard.vue` SCC):

| Kondisi | Varian |
| --- | --- |
| role `Management` | `DashboardStandard` variant `management` |
| role `Bank` / `Branch Bank` / `Broker` | `DashboardStandard` variant `bank` |
| `InsuredCompanyId === '12'` (Chubb) | `DashboardChubb` |
| lainnya | `Dashboard.vue` (utama) |

## Keamanan frontend

- Header keamanan contoh untuk hosting statis: `public/_headers` (CSP, dsb.).
- URL file dari API selalu lewat `lib/sanitize.js` (`safeUrl`) sebelum dibuka.
- Tidak ada secret di kode; token hanya di localStorage + cookie berumur pendek.
