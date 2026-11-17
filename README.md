# ⚡ WinAMP 2.9x Retro Player

React + TypeScript + Web Audio API + Electron ile geliştirilmiş, 90'ların efsanevi **Winamp 2.9x** görünümünü taklit eden çapraz platform müzik çalar.

> Bu proje bir hayran çalışmasıdır; Winamp / Nullsoft ile resmi bir bağlantısı yoktur.

---

## ✨ Özellikler

### Arayüz
- **Sabit boyutlu ana pencere ve ekolayzer**: her biri tam **275 × 116 px**.
- **Boyutlandırılabilir playlist**: minimum 275 × 116 px, sağ alt köşeden sürüklenerek büyütülür.
- **Sadece oyuncu arayüzü**: ana pencere, ekolayzer ve playlist 275 px genişlikte dikey olarak 0 px boşlukla yığılır; ekstra başlık, panel veya çerçeve yoktur. Masaüstünde pencere kenarlıksız (frameless) açılır.
- **Panellere tam oturan pencere**: masaüstünde pencere yüksekliği/ genişliği panellerin toplam ölçüsüne kilitlenir (min = max). Panel katlanınca, EQ/PL kapatılınca veya 1.5x moda geçilince pencere anında küçülür/büyür; panellerin altında veya sağında boş arka plan kalmaz.
- **Ayrılabilir playlist**: başlıktaki ↗ düğmesi playlist'i ayrı, serbestçe taşınabilen ve boyutlandırılabilen ikinci bir pencereye alır; o sırada ana pencere yalnızca Main + EQ'ya küçülür. ↙ ile playlist ana pencereye geri yapışır. Seçim, silme, dosya ekleme ve oynatma komutları iki pencere arasında senkron kalır.
- **Windowshade**: başlık çubuğundaki ▢ düğmesi pencereyi 14 px'lik mini bara döndürür (tarayıcıda başlığa çift tıklama da çalışır).
- **Temalı playlist kaydırma çubuğu**: Winamp'ın metal düğme görünümüyle uyumlu, sürüklenebilir ve track'e tıklayarak sayfa atlayan özel çubuk (native overlay scrollbar'lar temalandırılamadığı için gizlenir).
- **1.5x büyütme** (`Ctrl+D`) — yüksek DPI ekranlarda okunabilirlik için görsel ölçekleme.
- **Clutterbar (O / A / I / D / V)**: seçenekler menüsü, her zaman üstte, parça bilgisi, 1.5x boyut ve görselleştirici döngüsü (spectrum → osiloskop → kapalı).
- **Parça bilgisi penceresi (I)**: başlık, sanatçı, süre, kaynak türü; yerel dosyalarda ad/boyut/MIME, akışlarda URL.
- Orijinal renk paleti, 3D kabartmalı çerçeveler, yeşil LCD, kayan şarkı yazısı ve spectrum analizörü.

### Ses
- **Gerçek oynatma**: yerel dosyalar (`<input type=file>` / sürükle-bırak) ve `http(s)` akış URL'leri.
- **Gerçek süre ve zaman**: `loadedmetadata` / `timeupdate` / `ended` olaylarıyla senkron ilerleme, tıklanabilir seek bar.
- **Otomatik sıradaki parça**, tekrar (playlist sonunda başa dönme) ve karıştırma (shuffle).
- **10 bantlık parametrik ekolayzer** (60 Hz – 16 kHz), preamp, hazır presetler ve canlı spline grafiği.
- **Ayar kalıcılığı**: EQ, preamp ve ses seviyesi AudioContext açılmadan önce değiştirilse bile ilk çalıntıda uygulanır.
- **18 çubuklu spectrum analizörü** (`fftSize: 512`), tepe noktası düşüşü animasyonu.
- **Dahili retro synth**: paketle gelen 6 demo parça gerçek ses dosyası içermez; çalındıklarında 90'lar tarzı prosedürel synth beat üretilir. Kendi dosyalarınız her zaman gerçek ses olarak çalar.

### Masaüstü (Electron)
- **Kenarlıksız (frameless) pencere**: işletim sistemi çerçevesi ve menü çubuğu yok; pencere yalnızca Winamp panellerinden oluşur. Başlık çubuklarından sürüklenir.
- **Boşluksuz yerleşim**: pencere panellerin ölçüsüne kilitlenir; elle boyutlandırma boş arka plan üretmez.
- **Ayrı playlist penceresi**: playlist yapışık değilken kendi penceresinde konumlandırılır ve durum iki pencere arasında IPC ile senkron tutulur.
- **Sistem tepsisi**: göster/gizle, oynat/duraklat, durdur, sonraki/önceki, çıkış.
- **Global medya tuşları**: Play/Pause, Next, Previous, Stop — uygulama arka plandayken de çalışır.
- **Tek örnek kilidi**: ikinci kez açıldığında mevcut pencere öne gelir.
- **Tepsiye gizlenme**: pencere kapatıldığında uygulama çalışmaya devam eder; tamamen kapatmak için tepsi menüsündeki **Çıkış** kullanılır.
- **Uygulama içi URL ekleme penceresi**: Electron `window.prompt()` desteklemediği için özel modal kullanılır.

### Yapılandırma / CI
- `npm run typecheck` ve build öncesi otomatik tip kontrolü.
- GitHub Actions ile Windows (NSIS + portable), macOS (dmg + zip) ve Linux (AppImage + deb) derlemeleri.
- `v*` etiketi atıldığında tüm paketler tek bir GitHub Release'e yüklenir.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js **20+**
- npm **10+**

### Komutlar

```bash
# Bağımlılıkları yükle (lockfile ile birebir kurulum)
npm ci

# Tarayıcıda geliştirme (http://localhost:3000)
npm run dev

# Vite + Electron birlikte (masaüstü geliştirme)
npm run electron:dev

# Tip kontrolü
npm run typecheck

# Üretim derlemesi (tip kontrolü + vite build)
npm run build

# İşletim sistemine özel kurulum paketlerini üret
npm run electron:build

# Önceden derlenmiş uygulamayı Electron'da aç
npm start
```

`npm run electron:dev`, Vite sunucusunu başlatır ve `VITE_DEV_SERVER_URL` ile Electron'u açar. Renderer tarafında hot reload çalışır; `electron/main.js` veya `preload.js` değişikliklerinde komutu yeniden başlatmak gerekir.

### Paketleme notları
- Çıktılar `release/` klasörüne yazılır.
- macOS paketleri **imzasız** üretilir (`identity: null`); dağıtım öncesi imzalama/notarization eklenmelidir. İmzasız uygulamayı ilk açılışta Gatekeeper engellerse Sağ tık → **Aç** kullanın.
- CI'daki `macos-latest` runner Apple Silicon'dır; üretilen macOS paketi **arm64**'tür. Intel için yerel olarak `npx electron-builder --mac --x64` çalıştırılabilir.

---

## ⌨️ Kısayollar

| Tuş | İşlev |
| --- | --- |
| `Space` | Oynat / Duraklat |
| `C` | Duraklat |
| `V` | Durdur |
| `Z` / `B` | Önceki / Sonraki |
| `Ctrl+D` | 1.5x büyütme |
| `Alt+G` | Ekolayzeri göster/gizle |
| `Alt+W` | Playlist'i göster/gizle |
| Başlıktaki ▢ | Windowshade |
| Başlıktaki ↗ | Playlist'i ayrı pencereye al (Electron) |
| Başlıktaki ↙ | Playlist'i ana pencereye yapıştır (ayrı pencerede) |
| Başlık çubuğunu sürükle | Pencereyi taşı (Electron) |

Ana penceredeki **clutterbar** düğmeleri: **O** seçenekler menüsü, **A** her zaman üstte (Electron), **I** parça bilgisi, **D** 1.5x boyut, **V** görselleştirici döngüsü.

---

## 📂 Proje Yapısı

```
WinAMP-retro-player/
├─ .github/workflows/build.yml   # Win / macOS / Linux CI + release
├─ build/                        # Uygulama ve tepsi ikonları
├─ docs/
│  ├─ ARCHITECTURE.md            # Ses motoru, durum akışı ve Electron mimarisi
│  └─ ROADMAP.md                 # Gelecek özellikler
├─ electron/
│  ├─ main.js                    # Pencere, tray, global kısayollar, IPC
│  └─ preload.js                 # contextBridge API (medya tuşları, pencere kontrolleri)
├─ src/
│  ├─ audio/AudioEngine.ts       # Web Audio grafiği + HTMLAudioElement yaşam döngüsü
│  ├─ components/                # MainWindow, Equalizer, Playlist (DetachedPlaylist dahil), modaller
│  ├─ hooks/useFitElectronWindow.ts  # Pencereyi panellerin ölçüsüne oturtur
│  ├─ types/                     # Track / PlaybackState / playlist senkron tipleri
│  ├─ App.tsx                    # Oynatma durumu, playlist ve yerleşim yönetimi
│  └─ index.css                  # Winamp 2.9x görsel dili
├─ index.html
├─ electron-builder.json
└─ package.json
```

`preview.html`, projenin ilk statik prototipidir; uygulama derlemesine dahil değildir ve Tailwind'i CDN'den çeker.

---

## 🧱 Mimari Özeti

- **Renderer**: Tek React ağacı içinde üç "pencere" bileşeni; 275 px genişlikte dikey yığın olarak çizilir ve sayfa üzerinde başka arayüz yoktur. Electron tarafında pencere kenarlıksızdır ve panellerin toplam ölçüsüne kilitlenir. Playlist istenirse ayrı bir OS penceresine alınabilir (`?panel=playlist`); manyetik kenetlenme veya grup sürükleme yoktur.
- **Ses**: `HTMLAudioElement → MediaElementSource → Preamp → 10 × BiquadFilter → StereoPanner → MasterGain → Analyser → Destination`.
- **Durum**: Oynatma durumu `App.tsx` içinde tutulur; motor olayları (`timeupdate`, `durationchange`, `ended`, `error`) callback'lerle React'e akar.
- **Electron**: `preload.js` yalnızca dar bir API yüzeyi açar (`contextIsolation: true`, `nodeIntegration: false`); dosyalar renderer'da `blob:` URL olarak yüklenir, `webSecurity` kapatılmaz.

Ayrıntılar için [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🔄 CI / Release

- `main`'e push ve PR'larda: üç işletim sistemi için derleme + artifact yükleme (release oluşturulmaz).
- `v*` etiketi push edildiğinde: derlemeler tamamlanınca tek bir **GitHub Release** oluşturulur ve tüm kurulum dosyaları eklenir.

```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## 📋 Bilinen Sınırlar

- Main ve EQ hâlâ tek pencerede birlikte durur; yalnızca playlist ayrı pencereye alınabilir. Manyetik kenetlenme ve grup sürükleme yoktur.
- Kenarlıksız pencerede başlık çubuğu sürükleme alanı olduğu için çift tıklayla windowshade Electron'da çalışmaz; `▢` düğmesi kullanılır.
- `m3u` / `pls` çalma listesi dosyaları ve ID3 etiket düzenleme yoktur.
- Tarayıcı/Chromium codec desteği geçerlidir; her format her platformda çalmayabilir.
- Electron 33 kullanılmaktadır; güncel Electron sürümüne yükseltme ayrı bir iş olarak planlanmıştır.

---

## 📄 Lisans

[MIT](LICENSE) © 2026 Idris Katar
