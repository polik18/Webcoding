<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Erőteljes, teljes mértékben böngésző alapú IDE és dokumentumkezelő</strong></p>
  <p>Nincs háttérrendszer • Teljesen helyi • Nagy teljesítmény</p>

[angol](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Áttekintés

A WebPad++ egy következő generációs integrált fejlesztési környezet (IDE), amely **100%-ban fut a webböngészőben**. Anélkül, hogy háttérrendszerre, adatbázisokra vagy helyi telepítésekre lenne szüksége, kódot írhat, Pythont futtathat, webhelyeket készíthet, táblázatokat kezelhet, és szöveget bonthat ki PDF-ekből – mindezt helyben, a gépén nulla késleltetéssel.

## ✨ Főbb jellemzők

### 💻 Kódszerkesztés és -végrehajtás
- **Intelligens szerkesztő**: Az Ace Editor hajtotta szintaktikai kiemeléssel, IntelliSense programmal és zárójel-illesztéssel.
- **Azonnali végrehajtás**: 
  - Futtassa a **HTML/CSS/JS** fájlt élő, egymás melletti előnézettel.
  - Futtassa a **Pythont** helyileg közvetlenül a böngészőben a Pyodide-on keresztül.
- **Beépített Linter & Formatter**: Valós idejű szintaktikai hibák észlelése és egy kattintással történő szépítés a HTML, CSS és JS számára.
- **Kóddiff.**: Hasonlítson össze két fájlt egymás mellett a vizuális egyesítés megjelenítőnkkel.

### 📄 Professzionális dokumentumcsomag
- **Markdown & Visual Sync**: Zökkenőmentesen válthat a Markdown kód és a Rich Text (WYSIWYG) vizuális szerkesztő között.
- **Spreadsheet Engine**: Nyissa meg, szerkessze, rendezze és alkalmazza a matematikai képleteket (pl. "=SUM(A1:A5)") ".xlsx" és ".csv" fájlokra.
- **PDF és Word Tools**: PDF-fájlok megtekintése, DOCX-fájlok szerkesztése rich-text módban, és szöveg kibontása a beépített elemzőkkel.
- **Exportálás**: Fájlok konvertálása és letöltése DOCX, XLSX, CSV és PDF formátumban.

### 🌐 Speciális segédprogramok
- **Folder Drag & Drop**: Húzzon teljes projektkönyvtárakat az operációs rendszerről közvetlenül a WebPad++-ba.
- **SEO eszközök**: Beépített vizuális generátorok a "sitemap.xml" és a "robots.txt" fájlokhoz, hogy javítsák webhelye keresési rangsorát.
- **Kép OCR**: Töltse fel vagy készítsen fényképet egy dokumentumról, és automatikusan kivonja a szöveget a Tesseract.js segítségével.
- **QR Code Suite**: Azonnal generál QR-kódokat, vagy dekódolja őket webkamerája segítségével.

## 🛠 Támogatott formátumok

| Formátum | Import & View | Szerkesztés | Export |
|--------|---------------|------|--------|
| **HTML/JS/CSS** | ✅ Igen | ✅ Kód és élő előnézet | ✅ ZIP / Fájl |
| **Lejegyzés** | ✅ Igen | ✅ Kód és WYSIWYG Sync | ✅ MD |
| **XLSX / CSV** | ✅ Táblázatrács | ✅ Képletek és válogatás | ✅ XLSX / CSV |
| **PDF** | ✅ Néző | ✅ Szöveg kivonat | ✅ PDF / DOCX |
| **DOCX** | ✅ Rich HTML Render| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Használata

1. **Kezdő lépések**: Egyszerűen nyissa meg az "index.html" fájlt bármely modern webböngészőben.
2. **Fájlkezelés**: Kattintson a "☰" menüre a Fájlkezelő megnyitásához. Kattintson a jobb gombbal fájlok létrehozásához, vagy egyszerűen húzza át a mappákat az ablakba.
3. **Futtatási kód**: Nyissa meg bármelyik szkriptet, és kattintson a ▶️ **Futtatás** gombra, vagy nyomja meg a Ctrl+Enter billentyűkombinációt.
4. **Eszközök és keresőoptimalizálás**: A felső eszköztár segítségével érheti el az OCR-eszközt, a QR-kód-leolvasót vagy a Webhelytérkép-/Robot-generátort.
5. **Nyelvek**: A WebPad++ 30 globális nyelvet támogat! Az azonnali váltáshoz használja a jobb felső sarokban található legördülő menüt.

## 🔐 Adatvédelem és biztonság

A WebPad++ teljes mértékben kliens oldalon működik. Kódja, dokumentumai és adatai soha nem hagyják el a számítógépet. Mindent folyamatosan tárol a böngésző natív IndexedDB-je. Az összes adat biztonságos törléséhez kattintson a **Összes visszaállítása** lehetőségre.