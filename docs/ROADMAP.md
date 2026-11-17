# 🗺️ WinAMP Retro Player — Yol Haritası

Bu belge, mevcut sürümde **gerçekten çalışan** özellikler ile planlanan işleri ayırır.

---

## ✅ Tamamlananlar (v1.0.0)

| Özellik | Durum |
| --- | --- |
| Winamp 2.9x görsel dili (275×116 Main/EQ, resize Playlist) | Tamamlandı |
| Kenarlıksız, yalnızca oyuncudan oluşan arayüz (frameless Electron) | Tamamlandı |
| Panellere tam oturan pencere (boşluksuz yerleşim, `window:fit`) | Tamamlandı |
| Ayrı playlist penceresi (↗ / ↙) ve iki pencere arası durum senkronu | Tamamlandı |
| Tema uyumlu playlist kaydırma çubuğu | Tamamlandı |
| Windowshade (▢; tarayıcıda başlığa çift tık) | Tamamlandı |
| 1.5x görsel büyütme (`Ctrl+D`) | Tamamlandı |
| "It really whips the llama's ass!" hakkında penceresi ve synth sesi | Tamamlandı |
| Gerçek yerel dosya oynatma + sürükle-bırak | Tamamlandı |
| Gerçek süre, seek, otomatik sıradaki parça, repeat, shuffle | Tamamlandı |
| 10 bant EQ + preamp + presetler + canlı grafik | Tamamlandı |
| 18 çubuk spectrum analizörü | Tamamlandı |
| Sistem tepsisi (göster/gizle, oynat, sonraki/önceki, çıkış) | Tamamlandı |
| Global medya tuşları | Tamamlandı |
| Tek örnek kilidi, tepsiye gizlenme | Tamamlandı |
| Uygulama içi URL / internet radyosu ekleme | Tamamlandı |
| Tip kontrolü + GitHub Actions cross-platform build/release | Tamamlandı |

---

## 🎯 v1.1.0 — Masaüstü deneyimini derinleştirme

- **Main ve EQ için de ayrı pencere**: bugün yalnızca playlist ayrılabiliyor; üç panelin bağımsız `BrowserWindow`'ları ve 12 px yaklaşınca kenetlenme / grup sürükleme.
- **ID3 / Vorbis metadata**: sanatçı, albüm, yıl, tür ve kapak görseli; `Alt+3` bilgi penceresi.
- **Çalma listesi kalıcılığı**: uygulama kapanıp açıldığında playlist ve son konumun korunması; `.m3u` içe/dışa aktarma.
- **Shoutcast / radio directory**: hazır istasyon listesi ve `.pls` / `.m3u` akış desteği.
- **Gerçek bitrate / sample rate göstergesi**: `AudioContext` ve dosya metadatasından okuma.

## 🎯 v1.2.0 — Entegrasyonlar ve kişiselleştirme

- **Discord Rich Presence**: "Listening to … on Winamp 2.9" durumu.
- **`.wsz` tema yükleyici**: klasik Winamp skinlerini içe aktarma.
- **Ses seviyesi medya tuşları** ve isteğe bağlı özel global kısayollar.
- **Mini player / masaüstü widget** modu.

---

## 🔧 Teknik borç ve altyapı

| İş | Öncelik | Not |
| --- | --- | --- |
| Electron 33 → güncel major sürüm | Yüksek | 33 desteği sona erdi; güvenlik güncellemesi gerekli |
| macOS imzalama + notarization | Yüksek | Şu an imzasız; Gatekeeper uyarısı verir |
| Otomatik testler (Vitest + Playwright) | Orta | Oynatma durumu ve playlist mantığı için birim testleri |
| ESLint + Prettier | Orta | Kod stili ve erken hata yakalama |
| CSP ve güvenlik sertleştirmesi | Orta | `file://` yerine özel protokol, mümkünse `sandbox: true` |
| Universal macOS paketi (x64 + arm64) | Düşük | CI runner arm64 üretiyor |
| Vite 5 → güncel sürüm | Düşük | Breaking change riski düşük |
| Çoklu dil (TR/EN) | Düşük | Arayüz şu an Türkçe/İngilizce karışık |

---

## ❌ Kapsam dışı

- Winamp Pro / Nullsoft ticari özellikleri ve orijinal binary'lerin yeniden dağıtımı.
- Şu an için video oynatma veya kütüphane tarama (library) özellikleri.
