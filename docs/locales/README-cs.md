<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Výkonný IDE a správce dokumentů plně založený na prohlížeči</strong></p>
  <p>Žádný backend • Plně místní • Vysoký výkon</p>

[anglicky](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Přehled

WebPad++ je integrované vývojové prostředí (IDE) nové generace, které běží **100 % ve vašem webovém prohlížeči**. Aniž byste potřebovali backend, databáze nebo místní instalace, můžete psát kód, spouštět Python, vytvářet webové stránky, spravovat tabulky a extrahovat text z PDF – to vše lokálně na vašem počítači s nulovou latencí.

## ✨ Klíčové vlastnosti

### 💻 Úprava a spouštění kódu
- **Inteligentní editor**: Používá technologii Ace Editor se zvýrazněním syntaxe, IntelliSense a párováním závorek.
- **Okamžité provedení**: 
  - Spusťte **HTML/CSS/JS** s živým náhledem vedle sebe.
  - Spusťte **Python** lokálně přímo v prohlížeči přes Pyodide.
- **Vestavěný Linter & Formatter**: Detekce syntaktických chyb v reálném čase a zkrášlení HTML, CSS a JS jedním kliknutím.
- **Rozdíl kódu**: Porovnejte libovolné dva soubory vedle sebe pomocí našeho vizuálního prohlížeče sloučení.

### 📄 Professional Document Suite
- **Markdown & Visual Sync**: Bezproblémové přepínání mezi kódem Markdown a vizuálním editorem Rich Text (WYSIWYG).
- **Spreadsheet Engine**: Otevírejte, upravujte, seřaďte a aplikujte matematické vzorce (např. `=SUM(A1:A5)`) na soubory `.xlsx` a `.csv`.
- **PDF & Word Tools**: Prohlížejte soubory PDF, upravujte soubory DOCX v režimu formátovaného textu a extrahujte text pomocí vestavěných analyzátorů.
- **Exportování**: Převádějte a stahujte soubory ve formátech DOCX, XLSX, CSV a PDF.

### 🌐 Pokročilé nástroje
- **Folder Drag & Drop**: Přetáhněte celé adresáře projektu z vašeho OS přímo do WebPad++.
- **Nástroje SEO**: Vestavěné vizuální generátory pro `sitemap.xml` a `robots.txt` pro zvýšení hodnocení vašeho webu ve vyhledávání.
- **Image OCR**: Nahrajte nebo vyfoťte dokument a automaticky extrahujte text pomocí Tesseract.js.
- **QR Code Suite**: Okamžitě generujte QR kódy nebo je dekódujte pomocí webové kamery.

## 🛠 Podporované formáty

| Formát | Import a zobrazení | Upravit | Export |
|--------|---------------|------|--------|
| **HTML/JS/CSS** | ✅ Ano | ✅ Kód a živý náhled | ✅ ZIP / soubor |
| **Markdown** | ✅ Ano | ✅ Synchronizace kódu a WYSIWYG | ✅ MUDr. |
| **XLSX / CSV** | ✅ Tabulková mřížka | ✅ Vzorce a třídění | ✅ XLSX / CSV |
| **PDF** | ✅ Prohlížeč | ✅ Extrahovat text | ✅ PDF / DOCX |
| **DOCX** | ✅ Rich HTML Render| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Jak používat

1. **Začínáme**: Jednoduše otevřete `index.html` v jakémkoli moderním webovém prohlížeči.
2. **Správa souborů**: Klepnutím na nabídku `☰` otevřete Průzkumník souborů. Klepněte pravým tlačítkem myši a vytvořte soubory nebo jednoduše přetáhněte složky do okna.
3. **Spuštění kódu**: Otevřete libovolný skript a klikněte na tlačítko ▶️ **Spustit** nebo stiskněte `Ctrl+Enter`.
4. **Nástroje a SEO**: Použijte horní panel nástrojů pro přístup k nástroji OCR, skeneru QR kódu nebo generátoru souborů Sitemap/robotů.
5. **Jazyky**: WebPad++ podporuje 30 globálních jazyků! Pro okamžité přepnutí použijte rozbalovací nabídku v pravém horním rohu.

## 🔐 Soukromí a zabezpečení

WebPad++ funguje výhradně na straně klienta. Váš kód, dokumenty a data nikdy neopustí váš počítač. Vše je trvale uloženo pomocí nativní IndexedDB vašeho prohlížeče. Kliknutím na **Resetovat vše** bezpečně vymažete všechna data.