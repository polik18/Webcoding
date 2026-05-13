<divlay="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Zaawansowany, w pełni oparty na przeglądarce IDE i menedżer dokumentów</strong></p>
  <p>Brak backendu • W pełni lokalny • Wysoka wydajność</p>

[angielski](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Francja](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<godz./>

## 🌟 Przegląd

WebPad++ to zintegrowane środowisko programistyczne (IDE) nowej generacji, które działa **w 100% w przeglądarce internetowej**. Nie potrzebujesz backendu, baz danych ani instalacji lokalnych, możesz pisać kod, uruchamiać Python, tworzyć strony internetowe, zarządzać arkuszami kalkulacyjnymi i wyodrębniać tekst z plików PDF – wszystko lokalnie na swoim komputerze, bez opóźnień.

## ✨ Kluczowe funkcje

### 💻 Edycja i wykonanie kodu
- **Inteligentny edytor**: Obsługiwany przez Ace Editor z podświetlaniem składni, technologią IntelliSense i dopasowywaniem nawiasów.
- **Natychmiastowa realizacja**: 
  - Uruchom **HTML/CSS/JS** z podglądem na żywo.
  - Uruchom **Python** lokalnie bezpośrednio w przeglądarce poprzez Pyodide.
- **Wbudowany Linter i Formatter**: Wykrywanie błędów składniowych w czasie rzeczywistym i upiększanie jednym kliknięciem dla HTML, CSS i JS.
- **Code Diff**: Porównaj dowolne dwa pliki obok siebie za pomocą naszej przeglądarki łączenia obrazów.

### 📄 Profesjonalny pakiet dokumentów
- **Markdown i synchronizacja wizualna**: Płynne przełączanie między kodem Markdown a edytorem wizualnym tekstu sformatowanego (WYSIWYG).
- **Spreadsheet Engine**: otwieraj, edytuj, sortuj i stosuj formuły matematyczne (np. `=SUMA(A1:A5)`) do plików `.xlsx` i `.csv`.
- **Narzędzia PDF i Word**: przeglądaj pliki PDF, edytuj pliki DOCX w trybie tekstu sformatowanego i wyodrębniaj tekst za pomocą wbudowanych analizatorów.
- **Eksportowanie**: Konwertuj i pobieraj pliki w formatach DOCX, XLSX, CSV i PDF.

### 🌐 Zaawansowane narzędzia
- **Przeciągnij i upuść folder**: przeciągnij całe katalogi projektu ze swojego systemu operacyjnego bezpośrednio do WebPad++.
- **Narzędzia SEO**: Wbudowane generatory wizualne dla plików `sitemap.xml` i `robots.txt` w celu zwiększenia rankingu wyszukiwania Twojej witryny.
- **OCR obrazu**: prześlij lub zrób zdjęcie dokumentu i automatycznie wyodrębnij tekst za pomocą Tesseract.js.
- **Pakiet kodów QR**: natychmiast generuj kody QR lub dekoduj je za pomocą kamery internetowej.

## 🛠 Obsługiwane formaty

| Formatuj | Importuj i przeglądaj | Edytuj | Eksport |
|--------|-------------------|------|-------|
| **HTML/JS/CSS** | ✅Tak | ✅ Kod i podgląd na żywo | ✅ ZIP / plik |
| **Przecena** | ✅Tak | ✅ Kod i synchronizacja WYSIWYG | ✅lekarz |
| **XLSX / CSV** | ✅ Siatka arkusza kalkulacyjnego | ✅ Formuły i sortowanie | ✅XLSX/CSV |
| **PDF** | ✅ Przeglądarka | ✅ Wyodrębnij tekst | ✅PDF/DOCX |
| **DOCX** | ✅ Bogaty renderer HTML| ✅ WYSIWYG | ✅ DOCX / PDF |

## 🚀 Jak używać

1. **Pierwsze kroki**: Po prostu otwórz plik „index.html” w dowolnej nowoczesnej przeglądarce internetowej.
2. **Zarządzanie plikami**: Kliknij menu `☰`, aby otworzyć Eksplorator plików. Kliknij prawym przyciskiem myszy, aby utworzyć pliki, lub po prostu przeciągnij i upuść foldery do okna.
3. **Uruchamiający kod**: Otwórz dowolny skrypt i kliknij przycisk ▶️ **Uruchom** lub naciśnij `Ctrl+Enter`.
4. **Narzędzia i SEO**: Użyj górnego paska narzędzi, aby uzyskać dostęp do narzędzia OCR, skanera kodów QR lub generatora mapy witryny/robotów.
5. **Języki**: WebPad++ obsługuje 30 języków globalnych! Aby natychmiast przełączyć się, użyj menu rozwijanego w prawym górnym rogu.

## 🔐 Prywatność i bezpieczeństwo

WebPad++ działa całkowicie po stronie klienta. Twój kod, dokumenty i dane nigdy nie opuszczają Twojego komputera. Wszystko jest trwale przechowywane przy użyciu natywnej bazy danych IndexedDB Twojej przeglądarki. Możesz kliknąć **Resetuj wszystko**, aby bezpiecznie wyczyścić wszystkie dane.