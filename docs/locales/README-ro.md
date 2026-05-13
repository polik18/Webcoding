<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Un IDE și un manager de documente puternic, complet bazat pe browser</strong></p>
  <p>Fără backend • Complet local • Performanță ridicată</p>

[Engleză](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Prezentare generală

WebPad++ este un mediu de dezvoltare integrat (IDE) de ultimă generație care rulează **100% în browserul dvs. web**. Fără a avea nevoie de un backend, baze de date sau instalări locale, puteți scrie cod, rula Python, construi site-uri web, gestiona foi de calcul și extrage text din PDF-uri, totul local pe computer, fără latență.

## ✨ Caracteristici cheie

### 💻 Editarea și execuția codului
- **Editor inteligent**: oferit de Ace Editor cu evidențiere de sintaxă, IntelliSense și potrivire între paranteze.
- **Execuție instantanee**: 
  - Rulați **HTML/CSS/JS** cu o previzualizare în direct alăturată.
  - Rulați **Python** local direct în browser prin Pyodide.
- **Linter & Formatter încorporat**: detectarea erorilor de sintaxă în timp real și înfrumusețarea cu un singur clic pentru HTML, CSS și JS.
- **Cod Diff**: comparați oricare două fișiere unul lângă altul cu vizualizatorul nostru vizual de îmbinare.

### 📄 Professional Document Suite
- **Markdown & Visual Sync**: Comutați fără probleme între codul Markdown și un editor vizual Rich Text (WYSIWYG).
- **Spreadsheet Engine**: deschideți, editați, sortați și aplicați formule matematice (de exemplu, `=SUM(A1:A5)`) la fișierele `.xlsx` și `.csv`.
- **Instrumente PDF și Word**: Vizualizați PDF-uri, editați fișiere DOCX în modul text îmbogățit și extrageți text prin analizoare încorporate.
- **Export**: convertiți și descărcați fișiere în formatele DOCX, XLSX, CSV și PDF.

### 🌐 Utilități avansate
- **Folder Drag & Drop**: trageți întregi directoare de proiect din sistemul de operare direct în WebPad++.
- **Instrumente SEO**: generatoare vizuale încorporate pentru `sitemap.xml` și `robots.txt` pentru a îmbunătăți clasarea în căutarea site-ului dvs.
- **Image OCR**: Încărcați sau faceți o fotografie a unui document și extrageți automat textul folosind Tesseract.js.
- **QR Code Suite**: generați coduri QR instantaneu sau decodați-le folosind camera web.

## 🛠 Formate acceptate

| Format | Import și vizualizare | Editează | Export |
|--------|----------------|------|--------|
| **HTML/JS/CSS** | ✅ Da | ✅ Cod și previzualizare live | ✅ ZIP / Fișier |
| **Markdown** | ✅ Da | ✅ Sincronizare cod și WYSIWYG | ✅ MD |
| **XLSX / CSV** | ✅ Grilă de foi de calcul | ✅ Formule și sortare | ✅ XLSX / CSV |
| **PDF** | ✅ Vizualizator | ✅ Extrage text | ✅ PDF/DOCX |
| **DOCX** | ✅ Randare HTML bogat| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Cum se utilizează

1. **Noțiuni introductive**: Pur și simplu deschideți `index.html` în orice browser web modern.
2. **File Management**: Faceți clic pe meniul `☰` pentru a deschide File Explorer. Faceți clic dreapta pentru a crea fișiere sau pur și simplu trageți și plasați folderele în fereastră.
3. **Cod de rulare**: deschideți orice script și faceți clic pe butonul ▶️ **Run** sau apăsați `Ctrl+Enter`.
4. **Instrumente și SEO**: utilizați bara de instrumente de sus pentru a accesa instrumentul OCR, scanerul de coduri QR sau generatorul de Sitemap/Roboți.
5. **Limbi**: WebPad++ acceptă 30 de limbi globale! Utilizați meniul drop-down din dreapta sus pentru a comuta instantaneu.

## 🔐 Confidențialitate și securitate

WebPad++ funcționează în întregime pe partea clientului. Codul, documentele și datele dvs. nu părăsesc computerul. Totul este stocat în mod persistent folosind IndexedDB nativ al browserului dumneavoastră. Puteți da clic pe **Resetați toate** pentru a șterge toate datele în siguranță.