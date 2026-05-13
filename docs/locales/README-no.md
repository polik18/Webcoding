<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>En kraftig, fullstendig nettleserbasert IDE- og dokumentbehandling</strong></p>
  <p>Ingen backend • Helt lokal • Høy ytelse</p>

[Engelsk](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Oversikt

WebPad++ er en neste generasjons Integrated Development Environment (IDE) som kjører **100 % i nettleseren din**. Uten å trenge en backend, databaser eller lokale installasjoner, kan du skrive kode, kjøre Python, bygge nettsteder, administrere regneark og trekke ut tekst fra PDF-filer – alt lokalt på maskinen din uten forsinkelse.

## ✨ Nøkkelfunksjoner

### 💻 Koderedigering og utførelse
- **Intelligent Editor**: Drevet av Ace Editor med syntaksutheving, IntelliSense og brakett-matching.
- **Øyeblikkelig kjøring**: 
  - Kjør **HTML/CSS/JS** med en live side-by-side forhåndsvisning.
  - Kjør **Python** lokalt direkte i nettleseren via Pyodide.
- **Innebygd Linter & Formatter**: Syntaksfeildeteksjon i sanntid og ett-klikks forskjønning for HTML, CSS og JS.
- **Kodeforskjell**: Sammenlign to filer side ved side med vår visuelle flettevisning.

### 📄 Professional Document Suite
- **Markdown & Visual Sync**: Veksle sømløst mellom Markdown-kode og en rik tekst (WYSIWYG) visuell editor.
- **Spreadsheet Engine**: Åpne, rediger, sorter og bruk matematiske formler (f.eks. `=SUM(A1:A5)`) på `.xlsx`- og `.csv`-filer.
- **PDF- og Word-verktøy**: Se PDF-er, rediger DOCX-filer i rik tekst-modus, og trekk ut tekst via innebygde parsere.
- **Eksporter**: Konverter og last ned filer på tvers av DOCX-, XLSX-, CSV- og PDF-formater.

### 🌐 Avanserte verktøy
- **Mappe Dra og slipp**: Dra hele prosjektkataloger fra operativsystemet ditt rett inn i WebPad++.
- **SEO-verktøy**: Innebygde visuelle generatorer for `sitemap.xml` og `robots.txt` for å øke nettstedets søkerangering.
- **Bilde OCR**: Last opp eller ta et bilde av et dokument og trekk ut teksten automatisk ved hjelp av Tesseract.js.
- **QR Code Suite**: Generer QR-koder umiddelbart eller dekod dem ved hjelp av webkameraet ditt.

## 🛠 Støttede formater

| Format | Importer og se | Rediger | Eksporter |
|--------|--------------|--------|--------|
| **HTML/JS/CSS** | ✅ Ja | ✅ Kode og live forhåndsvisning | ✅ ZIP / fil |
| **Markdown** | ✅ Ja | ✅ Kode & WYSIWYG Sync | ✅ MD |
| **XLSX / CSV** | ✅ Regnearkrutenett | ✅ Formler og sortering | ✅ XLSX / CSV |
| **PDF** | ✅ Seer | ✅ Trekk ut tekst | ✅ PDF / DOCX |
| **DOCX** | ✅ Rich HTML Render| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Slik bruker du

1. **Kom i gang**: Bare åpne `index.html` i en hvilken som helst moderne nettleser.
2. **Filbehandling**: Klikk på `☰`-menyen for å åpne filutforskeren. Høyreklikk for å lage filer, eller dra og slipp mapper inn i vinduet.
3. **Kjørekode**: Åpne et hvilket som helst skript og klikk på ▶️ **Kjør**-knappen eller trykk `Ctrl+Enter`.
4. **Verktøy og SEO**: Bruk den øverste verktøylinjen for å få tilgang til OCR-verktøyet, QR-kodeskanneren eller Sitemap/Robots-generatoren.
5. **Språk**: WebPad++ støtter 30 globale språk! Bruk rullegardinmenyen øverst til høyre for å bytte umiddelbart.

## 🔐 Personvern og sikkerhet

WebPad++ opererer helt på klientsiden. Koden, dokumentene og dataene dine forlater aldri datamaskinen. Alt lagres vedvarende ved å bruke nettleserens opprinnelige IndexedDB. Du kan klikke på **Tilbakestill alle** for å slette alle data på en sikker måte.