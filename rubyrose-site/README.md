# Ruby Rose France — Web sitesi

Ruby Rose France (Sèvres, Paris) kozmetik formülasyon laboratuvarı için hazırlanmış, bağımsız (framework'süz) tanıtım sitesi.

- `index.html` — tek sayfa, uzun kaydırmalı ana sayfa (FR / EN / PT / TR dil seçimi)
- `mentions-legales.html` — yasal bilgiler ve gizlilik politikası
- `assets/css/style.css`, `assets/js/main.js` — stil ve etkileşimler (harici kütüphane yok, yalnızca Google Fonts)
- `assets/img/` — firmanın mevcut sitesinden alınıp WebP'ye dönüştürülmüş görseller

Yerelde görüntülemek için:

```bash
cd rubyrose-site && python3 -m http.server 8000
```

Notlar:
- İletişim formunun arka ucu yok; istemci tarafında doğrulanır ve `mailto:` ile e-posta taslağı hazırlar.
- Tüm sayısal ve kurumsal bilgiler firmanın kendi sitesinden ve kamuya açık kayıtlardan alınmıştır; sertifika iddiası yapılmamıştır.

v2 ("Pigment"):
- `assets/js/src/main.js` (davranış, i18n, form) ve `assets/js/src/fx.js` (WebGL pigment shader, imleç izi, renk geçişi, mercek, damla, pipet, harita) okunabilir kaynaklardır; sayfa küçültülmüş `assets/js/main.js` ve `assets/js/fx.js` dosyalarını yükler. Değişiklikten sonra: `npx terser assets/js/src/fx.js -c -m -o assets/js/fx.js` (main.js için de aynısı).
- WebGL yoksa veya `prefers-reduced-motion` etkinse hero statik CSS degrade + fotoğrafa döner.

v3 ("Product first"):
- Model/yüz fotoğrafları kaldırıldı; hero'da WebGL pigment shader üzerinde 6 ürün kesiti yörüngede döner (`fx.js` → orbit), altında "pigment pour" sıvı geçişi vardır.
- Yeni "Nos produits" bölümü (Teint · Joues · Lèvres · Yeux): `assets/img/products/` kesitleri, 3 derinlikli paralaks, etiket kartı, maskara/gloss mikro animasyonları.
- Classic ton gezgini `assets/img/classic/manifest.json` verisini kullanır (veri `src/main.js` içinde gömülüdür); ambalaj ve swatch görselleri şeffaf arka planlı WebP'ye dönüştürülmüştür.
- Türkçe (TR) dördüncü dil olarak eklendi (index + yasal sayfa).
