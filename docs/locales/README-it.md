<div align="centro">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Un potente IDE e gestore di documenti completamente basato su browser</strong></p>
  <p>Nessun backend • Completamente locale • Prestazioni elevate</p>

[Inglese](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Spagnolo](docs/locales/README-es.md) | [Francese](docs/locales/README-fr.md) | [Tedesco](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Panoramica

WebPad++ è un ambiente di sviluppo integrato (IDE) di nuova generazione che funziona **al 100% nel tuo browser web**. Senza bisogno di backend, database o installazioni locali, puoi scrivere codice, eseguire Python, creare siti Web, gestire fogli di calcolo ed estrarre testo da PDF, il tutto localmente sul tuo computer con zero latenza.

## ✨ Caratteristiche principali

### 💻 Modifica ed esecuzione del codice
- **Intelligent Editor**: basato sulla tecnologia Ace Editor con evidenziazione della sintassi, IntelliSense e corrispondenza delle parentesi.
- **Esecuzione istantanea**: 
  - Esegui **HTML/CSS/JS** con un'anteprima live affiancata.
  - Esegui **Python** localmente direttamente nel browser tramite Pyodide.
- **Linter & Formatter integrati**: rilevamento degli errori di sintassi in tempo reale e abbellimento con un clic per HTML, CSS e JS.
- **Differenza codice**: confronta due file affiancati con il nostro visualizzatore di unione visiva.

### 📄 Suite di documenti professionali
- **Markdown e sincronizzazione visiva**: alterna facilmente tra il codice Markdown e un editor visivo Rich Text (WYSIWYG).
- **Motore di fogli di calcolo**: apri, modifica, ordina e applica formule matematiche (ad esempio, `=SUM(A1:A5)`) ai file `.xlsx` e `.csv`.
- **Strumenti PDF e Word**: visualizza PDF, modifica file DOCX in modalità rich text ed estrai testo tramite parser integrati.
- **Esportazione**: converti e scarica file nei formati DOCX, XLSX, CSV e PDF.

### 🌐 Utilità avanzate
- **Trascina e rilascia cartelle**: trascina intere directory di progetto dal tuo sistema operativo direttamente in WebPad++.
- **Strumenti SEO**: generatori visivi integrati per `sitemap.xml` e `robots.txt` per aumentare il posizionamento del tuo sito nelle ricerche.
- **OCR immagine**: carica o scatta una foto di un documento ed estrai automaticamente il testo utilizzando Tesseract.js.
- **QR Code Suite**: genera codici QR istantaneamente o decodificali utilizzando la tua webcam.

## 🛠 Formati supportati

| Formato | Importa e visualizza | Modifica | Esporta |
|--------|-------|------|--------|
| **HTML/JS/CSS** | ✅ Sì | ✅ Codice e anteprima dal vivo | ✅ ZIP/File |
| **Ribasso** | ✅ Sì | ✅ Sincronizzazione codice e WYSIWYG | ✅MD |
| **XLSX/CSV** | ✅ Griglia del foglio di calcolo | ✅ Formule e ordinamento | ✅ XLSX/CSV |
| **PDF** | ✅ Visualizzatore | ✅ Estrai testo | ✅ PDF/DOCX |
| **DOCX** | ✅ Rendering HTML ricco| ✅WYSIWYG | ✅ DOCX/PDF |

## 🚀 Come usare

1. **Per iniziare**: è sufficiente aprire `index.html` in qualsiasi browser Web moderno.
2. **Gestione file**: fare clic sul menu `☰` per aprire Esplora file. Fare clic con il tasto destro per creare file o semplicemente trascinare e rilasciare le cartelle nella finestra.
3. **Esecuzione del codice**: apri qualsiasi script e fai clic sul pulsante ▶️ **Esegui** o premi `Ctrl+Invio`.
4. **Strumenti e SEO**: utilizza la barra degli strumenti in alto per accedere allo strumento OCR, allo scanner di codici QR o al generatore di mappe del sito/robot.
5. **Lingue**: WebPad++ supporta 30 lingue globali! Utilizza il menu a discesa in alto a destra per passare immediatamente.

## 🔐 Privacy e sicurezza

WebPad++ funziona interamente lato client. Il tuo codice, documenti e dati non lasciano mai il tuo computer. Tutto viene archiviato in modo persistente utilizzando IndexedDB nativo del tuo browser. Puoi fare clic su **Reimposta tutto** per cancellare tutti i dati in modo sicuro.