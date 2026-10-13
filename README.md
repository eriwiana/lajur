# Lajur

Tonton beberapa live YouTube sekaligus (maksimal 4) di satu halaman. Live chat hanya dimuat untuk tile yang sedang difokuskan, dan ikut pindah saat fokus pindah. Login memakai akun YouTube kamu sendiri lewat embed resmi.

> Status: MVP awal, hanya diuji di desktop (Chromium dan Safari). Firefox belum diuji.

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test parser URL dan state
npm run build      # output di dist/
```

Wajib dibuka lewat `http://localhost`, bukan `file://`. Chat embed membutuhkan hostname (`embed_domain`).

## Cara pakai

1. Tempel satu atau beberapa URL/ID YouTube (pisah spasi atau koma), klik **Tambah**.
2. Klik **Fokus** pada sebuah tile: audio tile itu menyala, yang lain di-mute, dan chat pindah ke tile itu.
3. Daftar video dan fokus tersimpan di URL hash (`#v=ID1,ID2&f=ID1`), jadi bisa di-share atau di-refresh.

Format yang dikenali: `watch?v=`, `youtu.be/`, `/live/`, `/embed/`, `/shorts/`, dan ID 11 karakter.

## Struktur

| File | Isi |
| --- | --- |
| `src/youtube.ts` | Semua yang bergantung pada YouTube: parser URL, URL embed/chat, kontrol audio |
| `src/state.ts` | Serialisasi state ke URL hash, batas jumlah tile |
| `src/main.ts` | UI dan DOM |

Perubahan perilaku embed YouTube sebaiknya hanya menyentuh `src/youtube.ts`.

## Batasan yang diketahui

- Tidak semua video boleh di-embed, dan chat bisa dimatikan atau khusus member.
- Autoplay hanya jalan dalam keadaan muted. Setelah membuka link yang sudah berisi fokus, audio baru menyala setelah kamu klik **Fokus**.
- Kontrol audio memakai `postMessage` ke iframe player. Cara ini bisa berhenti bekerja kalau YouTube mengubah perilakunya.
- Chat memakai akun Google yang aktif di youtube.com pada browsermu, dan butuh third-party cookie untuk youtube.com. Kalau tombol "Sign in to chat" memilih akun yang salah, ganti akun default di Google, pakai profil browser terpisah, atau izinkan cookie pihak ketiga untuk situs ini. Halaman ini tidak bisa memilih akun.
- Tampilan chat (warna latar/teks) dikendalikan YouTube dan bisa berbeda antar browser.
- Di produksi, chat dan player hanya bekerja pada domain yang sesuai dengan `embed_domain`/`origin`. Uji ulang setelah deploy.

## Kepatuhan

Proyek ini hanya menampilkan embed resmi YouTube. Jangan menambahkan proxy, pengunduhan, atau pemblokiran iklan. Siapa pun yang men-deploy bertanggung jawab atas kepatuhan pada [YouTube Terms of Service](https://www.youtube.com/t/terms) dan kebijakan API/embed terbaru.

Proyek ini tidak berafiliasi dengan, dan tidak didukung oleh, YouTube atau Google.

## Lisensi

[MIT](LICENSE). Ganti `<NAMA PEMEGANG HAK CIPTA>` di `LICENSE` dengan namamu sebelum dipublikasikan.
