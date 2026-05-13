<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>En kraftfull, helt webbläsarbaserad IDE- och dokumenthanterare</strong></p>
  <p>Ingen backend • Helt lokal • Hög prestanda</p>

[engelska](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Översikt

WebPad++ är en nästa generations Integrated Development Environment (IDE) som körs **100 % i din webbläsare**. Utan att behöva en backend, databaser eller lokala installationer kan du skriva kod, köra Python, bygga webbplatser, hantera kalkylblad och extrahera text från PDF-filer – allt lokalt på din maskin utan latens.

## ✨ Nyckelfunktioner

### 💻 Kodredigering & exekvering
- **Intelligent Editor**: Drivs av Ace Editor med syntaxmarkering, IntelliSense och parentesmatchning.
- **Omedelbar exekvering**: 
  - Kör **HTML/CSS/JS** med en live-sida vid sida-förhandsgranskning.
  - Kör **Python** lokalt direkt i webbläsaren via Pyodide.
- **Inbyggd Linter & Formatter**: Syntaxfel i realtid och försköna med ett klick för HTML, CSS och JS.
- **Kodskillnad**: Jämför två valfria filer sida vid sida med vår visuella sammanslagningsvisare.

### 📄 Professional Document Suite
- **Markdown & Visual Sync**: Växla sömlöst mellan Markdown-kod och en visuell redigerare för Rich Text (WYSIWYG).
- **Spreadsheet Engine**: Öppna, redigera, sortera och tillämpa matematiska formler (t.ex. `=SUM(A1:A5)`) på `.xlsx`- och `.csv`-filer.
- **PDF- och Word-verktyg**: Visa PDF-filer, redigera DOCX-filer i rich-text-läge och extrahera text via inbyggda tolkar.
- **Exportera**: Konvertera och ladda ner filer i DOCX-, XLSX-, CSV- och PDF-format.

### 🌐 Avancerade verktyg
- **Mapp Dra & Drop**: Dra hela projektkataloger från ditt operativsystem direkt till WebPad++.
- **SEO-verktyg**: Inbyggda visuella generatorer för `sitemap.xml` och `robots.txt` för att öka din webbplatss sökrankning.
- **Bild OCR**: Ladda upp eller ta ett foto av ett dokument och extrahera texten automatiskt med Tesseract.js.
- **QR Code Suite**: Generera QR-koder direkt eller avkoda dem med din webbkamera.

## 🛠 Format som stöds

| Format | Importera och visa | Redigera | Exportera |
|--------|---------------|--------|--------|
| **HTML/JS/CSS** | ✅ Ja | ✅ Kod & Live Preview | ✅ ZIP / fil |
| **Markdown** | ✅ Ja | ✅ Kod & WYSIWYG Sync | ✅ MD |
| **XLSX / CSV** | ✅ Kalkylbladsrutnät | ✅ Formler & Sortering | ✅ XLSX / CSV |
| **PDF** | ✅ Titta | ✅ Extrahera text | ✅ PDF / DOCX |
| **DOCX** | ✅ Rich HTML Render| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Hur man använder

1. **Komma igång**: Öppna helt enkelt `index.html` i vilken modern webbläsare som helst.
2. **Filhantering**: Klicka på menyn `☰` för att öppna Filutforskaren. Högerklicka för att skapa filer, eller helt enkelt dra och släpp mappar i fönstret.
3. **Körkod**: Öppna valfritt skript och klicka på knappen ▶️ **Kör** eller tryck på `Ctrl+Enter`.
4. **Verktyg och SEO**: Använd det övre verktygsfältet för att komma åt OCR-verktyget, QR-kodskannern eller generatorn för webbplatskartor/robotar.
5. **Språk**: WebPad++ stöder 30 globala språk! Använd rullgardinsmenyn uppe till höger för att byta direkt.

## 🔐 Sekretess och säkerhet

WebPad++ fungerar helt på klientsidan. Din kod, dina dokument och din data lämnar aldrig din dator. Allt lagras konstant med din webbläsares inbyggda IndexedDB. Du kan klicka på **Återställ alla** för att rensa all data på ett säkert sätt.