# ⚡ WinAMP 2.9x Retro Player

Modern teknolojilerle (React, TypeScript, Web Audio API ve Electron) geliştirilmiş, 90'lar ve 2000'lerin efsanevi **Winamp 2.9x** sürümünün görsel dilini, mekaniklerini ve nostaljisini birebir yaşatan çapraz platform retro müzik çalar.

![Winamp Retro Player](preview.html)

---

## 🌟 Öne Çıkan Özellikler

### 1. Piksel Hassasiyetinde Winamp 2.9x Klasik Tasarım
- **Orijinal Boyutlar & Sabitlik**:
  - **Ana Çalar (Main Player)**: Kesinlikle **sabit 275 x 116 piksel** (boyutlandırılamaz).
  - **Ekolayzer (Equalizer - EQ)**: Kesinlikle **sabit 275 x 116 piksel** (boyutlandırılamaz).
  - **Çalma Listesi (Playlist Window)**: **Boyutlandırılabilir** (minimum 275 x 116 piksel, sağ alt köşeden dilediğinizce genişletilip uzatılabilir).
- **0 Piksel Boşluksuz Manyetik Kenetlenme (Seamless 0px Snap)**:
  - Pencereler birbirine yaklaştığında mıknatıs gibi kenetlenir; kenarlıklar sıfır boşlukla yapışır.
  - Yan yana düzende Main (116px) + EQ (116px) = **232 piksel**, Playlist penceresiyle milimetrik olarak aynı yüksekliktedir.
  - **Otomatik Zincirleme**: EQ kapatıldığında Playlist otomatik olarak Main Player'ın altına yapışır; EQ açıldığında araya girerek düzeni korur.
  - Ana pencere taşındığında ona bağlı olan tüm pencereler grup halinde birlikte taşınır.

### 2. Güçlü Web Audio API Ses Motoru
- **10-Bant Parametrik Ekolayzer**: 60Hz, 170Hz, 310Hz, 600Hz, 1kHz, 3kHz, 6kHz, 12kHz, 14kHz, 16kHz bantlarında `BiquadFilterNode` filtreleri.
- **Preamp & Kazanç Kontrolü**: -12dB ... +12dB arası ön yükseltici ve ana ses.
- **Canlı EQ Grafiği**: Sürgüler hareket ettirildiğinde yeşil spline eğrisi gerçek zamanlı güncellenir.
- **60 FPS Spektrum Analizörü & Osiloskop**: Düşen tepe noktalarıyla (peaks) yeşil/sarı/kırmızı klasik 19-bant spektrum analizörü.
- **Geniş Format Desteği**: MP3, WAV, OGG, FLAC, AAC, M4A ve Web Audio Streams.

### 3. Çapraz Platform ve Otomatik Dağıtım (Cross-Platform & CI/CD)
- **Windows**: `.exe` (NSIS Kurulumcu) ve taşınabilir (portable `.exe`).
- **macOS**: `.dmg` ve `.zip` (Universal: Apple Silicon arm64 + Intel x64).
- **Linux**: `.AppImage` (tek tıkla çalışır) ve `.deb` (Debian / Ubuntu).
- **GitHub Actions**: Projeye her `git push` veya versiyon etiketi (`v*`) eklendiğinde, GitHub sunucuları Windows, macOS ve Linux üzerinde eşzamanlı derleme yaparak kurulum dosyalarını otomatik GitHub Releases sayfasına yükler.

---

## 📐 Pencere Düzenleri

```
[Klasik Dikey Düzen]              [Yan Yana Düzen]
┌───────────────────────┐         ┌───────────────────────┬───────────────────────┐
│     Main Player       │         │     Main Player       │                       │
│      (275 x 116)      │         │      (275 x 116)      │                       │
├───────────────────────┤         ├───────────────────────┤   Playlist Editor     │
│      Equalizer        │         │      Equalizer        │ (275+ x 232+ px,      │
│      (275 x 116)      │         │      (275 x 116)      │  Boyutlandırılabilir) │
├───────────────────────┤         └───────────────────────┤                       │
│    Playlist Editor    │                                 │                       │
│ (275+ x 116+ px,      │                                 │                       │
│  Boyutlandırılabilir) │                                 │                       │
└───────────────────────┘                                 └───────────────────────┘
```

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 20+ LTS
- npm 10+ veya pnpm

### Kurulum ve Çalıştırma
```bash
# Bağımlılıkları yükleyin
npm install

# Geliştirme sunucusunu başlatın (Tarayıcıda test için)
npm run dev

# Masaüstü Electron uygulamasını başlatın
npm run electron:dev

# İşletim sisteminize özel kurulum paketini üretin
npm run build:electron
```

---

## 📂 Proje Yapısı

```
WinAMP-retro-player/
├── .github/
│   └── workflows/
│       └── build.yml             # Win / Mac / Linux otomatik GitHub CI/CD iş akışı
├── docs/
│   ├── ARCHITECTURE.md           # Sistem mimarisi ve pencere kenetlenme mantığı
│   └── ROADMAP.md                # Gelecek özellikler ve yenilikçi fikirler
├── src/
│   ├── audio/                    # Web Audio API motoru, EQ filtreleri, Analyser
│   ├── components/               # MainWindow, Equalizer, Playlist, Controls
│   ├── hooks/                    # useDocking, useAudio, useResize
│   └── assets/                   # Retro piksel fontlar, sarı şimşek simgesi
├── electron/                     # Electron ana süreç (main), preload ve pencere yöneticisi
├── preview.html                  # Çalıştırılabilir interaktif arayüz prototipi
└── package.json
```

---

## ⚡ Lisans
MIT License - Retro müzik severler için sevgiyle hazırlandı.
