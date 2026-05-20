# Optional OCR language data

Tesseract.js can use local language data, but Chinese language packs are large.
This project keeps OCR language data on the free Project Naptha tessdata CDN by default.

If you need a fully offline OCR build, download the required `.traineddata.gz`
files into a local tessdata folder and override `window.WEBCODING_TESSDATA_PATHS`
before OCR starts.
