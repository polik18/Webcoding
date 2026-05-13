<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>En kraftfuld, fuldt browserbaseret IDE- og dokumenthåndtering</strong></p>
  <p>Ingen backend • Fuldt lokalt • Høj ydeevne</p>

[engelsk](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Tysk](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Oversigt

WebPad++ er et næste generations integreret udviklingsmiljø (IDE), der kører **100 % i din webbrowser**. Uden at have brug for en backend, databaser eller lokale installationer kan du skrive kode, køre Python, bygge websteder, administrere regneark og udtrække tekst fra PDF-filer – alt sammen lokalt på din maskine med nul latency.

## ✨ Nøglefunktioner

### 💻 Koderedigering og udførelse
- **Intelligent Editor**: Drevet af Ace Editor med syntaksfremhævning, IntelliSense og matchning af parentes.
- **Øjeblikkelig udførelse**: 
  - Kør **HTML/CSS/JS** med en live side-by-side forhåndsvisning.
  - Kør **Python** lokalt direkte i browseren via Pyodide.
- **Indbygget Linter & Formatter**: Syntaksfejlregistrering i realtid og forskønnelse med et enkelt klik til HTML, CSS og JS.
- **Kodeforskel**: Sammenlign to filer side om side med vores visuelle flettefremviser.

### 📄 Professional Document Suite
- **Markdown & Visual Sync**: Skift problemfrit mellem Markdown-kode og en visuel Rich Text-editor (WYSIWYG).
- **Spreadsheet Engine**: Åbn, rediger, sorter og anvend matematiske formler (f.eks. `=SUM(A1:A5)`) på `.xlsx`- og `.csv`-filer.
- **PDF- og Word-værktøjer**: Se PDF'er, rediger DOCX-filer i rich-text-tilstand, og udtræk tekst via indbyggede parsere.
- **Eksporter**: Konverter og download filer på tværs af DOCX-, XLSX-, CSV- og PDF-formater.

### 🌐 Avancerede hjælpeprogrammer
- **Folder Drag & Drop**: Træk hele projektmapper fra dit OS direkte ind i WebPad++.
- **SEO-værktøjer**: Indbyggede visuelle generatorer til `sitemap.xml` og `robots.txt` for at øge dit websteds søgerangering.
- **Billed OCR**: Upload eller tag et billede af et dokument og udtræk automatisk teksten ved hjælp af Tesseract.js.
- **QR Code Suite**: Generer QR-koder øjeblikkeligt eller afkode dem ved hjælp af dit webcam.

## 🛠 Understøttede formater

| Format | Importer og se | Rediger | Eksporter |
|--------|---------------|--------|--------|
| **HTML/JS/CSS** | ✅ Ja | ✅ Kode & Live Preview | ✅ ZIP / Fil |
| **Markdown** | ✅ Ja | ✅ Kode & WYSIWYG Sync | ✅ MD |
| **XLSX / CSV** | ✅ Regnearksgitter | ✅ Formler & sortering | ✅ XLSX / CSV |
| **PDF** | ✅ Seer | ✅ Uddrag tekst | ✅ PDF / DOCX |
| **DOCX** | ✅ Rich HTML Render| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Sådan bruges

1. **Kom godt i gang**: Du skal blot åbne `index.html` i enhver moderne webbrowser.
2. **Filhåndtering**: Klik på menuen `☰` for at åbne File Explorer. Højreklik for at oprette filer, eller træk og slip mapper ind i vinduet.
3. **Kørselskode**: Åbn ethvert script, og klik på knappen ▶️ **Kør** eller tryk på `Ctrl+Enter`.
4. **Værktøjer og SEO**: Brug den øverste værktøjslinje til at få adgang til OCR-værktøjet, QR-kodescanneren eller Sitemap/Robots-generatoren.
5. **Sprog**: WebPad++ understøtter 30 globale sprog! Brug rullemenuen øverst til højre for at skifte med det samme.

## 🔐 Privatliv og sikkerhed

WebPad++ fungerer udelukkende på klientsiden. Din kode, dokumenter og data forlader aldrig din computer. Alt gemmes vedvarende ved hjælp af din browsers oprindelige IndexedDB. Du kan klikke på **Nulstil alle** for at slette alle data sikkert.