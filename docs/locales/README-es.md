<div align="centro">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Un potente IDE y administrador de documentos totalmente basado en navegador</strong></p>
  <p>Sin backend • Totalmente local • Alto rendimiento</p>

[Inglés](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [English](docs/locales/README-es.md) | [Francés](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Descripción general

WebPad++ es un entorno de desarrollo integrado (IDE) de próxima generación que se ejecuta **100% en su navegador web**. Sin necesidad de un backend, bases de datos o instalaciones locales, puede escribir código, ejecutar Python, crear sitios web, administrar hojas de cálculo y extraer texto de archivos PDF, todo localmente en su máquina con latencia cero.

## ✨ Características clave

### 💻 Edición y ejecución de código
- **Editor inteligente**: Desarrollado por Ace Editor con resaltado de sintaxis, IntelliSense y coincidencia de corchetes.
- **Ejecución instantánea**: 
  - Ejecute **HTML/CSS/JS** con una vista previa en vivo en paralelo.
  - Ejecute **Python** localmente directamente en el navegador a través de Pyodide.
- **Linter y formateador integrados**: detección de errores de sintaxis en tiempo real y embellecimiento con un solo clic para HTML, CSS y JS.
- **Diferencia de código**: compare dos archivos uno al lado del otro con nuestro visor de combinación visual.

### 📄 Suite de documentos profesionales
- **Markdown y Visual Sync**: alterna sin problemas entre código Markdown y un editor visual de texto enriquecido (WYSIWYG).
- **Motor de hojas de cálculo**: abra, edite, ordene y aplique fórmulas matemáticas (por ejemplo, `=SUM(A1:A5)`) a archivos `.xlsx` y `.csv`.
- **Herramientas de PDF y Word**: vea archivos PDF, edite archivos DOCX en modo de texto enriquecido y extraiga texto mediante analizadores integrados.
- **Exportación**: convierta y descargue archivos en formatos DOCX, XLSX, CSV y PDF.

### 🌐 Utilidades avanzadas
- **Arrastrar y soltar carpetas**: arrastre directorios completos de proyectos desde su sistema operativo directamente a WebPad++.
- **Herramientas SEO**: generadores visuales integrados para `sitemap.xml` y `robots.txt` para mejorar el ranking de búsqueda de su sitio.
- **OCR de imagen**: cargue o tome una foto de un documento y extraiga automáticamente el texto usando Tesseract.js.
- **QR Code Suite**: genera códigos QR al instante o decodificalos usando tu cámara web.

## 🛠 Formatos admitidos

| Formato | Importar y ver | Editar | Exportar |
|--------|---------------|------|--------|
| **HTML/JS/CSS** | ✅ Sí | ✅ Código y vista previa en vivo | ✅ ZIP / Archivo |
| **Rebaja** | ✅ Sí | ✅ Código y sincronización WYSIWYG | ✅ Médico |
| **XLSX/CSV** | ✅ Cuadrícula de hoja de cálculo | ✅ Fórmulas y clasificación | ✅XLSX/CSV |
| **PDF** | ✅ Visor | ✅ Extraer texto | ✅PDF/DOCX |
| **DOCX** | ✅ Representación HTML enriquecida| ✅WYSIWYG | ✅ DOCX/PDF |

## 🚀 Cómo utilizar

1. **Comenzando**: Simplemente abra `index.html` en cualquier navegador web moderno.
2. **Administración de archivos**: Haga clic en el menú `☰` para abrir el Explorador de archivos. Haga clic derecho para crear archivos o simplemente arrastre y suelte carpetas en la ventana.
3. **Código de ejecución**: abra cualquier script y haga clic en el botón ▶️ **Ejecutar** o presione `Ctrl+Entrar`.
4. **Herramientas y SEO**: use la barra de herramientas superior para acceder a la herramienta OCR, al escáner de códigos QR o al generador de mapas del sitio/robots.
5. **Idiomas**: ¡WebPad++ admite 30 idiomas globales! Utilice el menú desplegable en la parte superior derecha para cambiar instantáneamente.

## 🔐 Privacidad y seguridad

WebPad++ opera completamente del lado del cliente. Su código, documentos y datos nunca salen de su computadora. Todo se almacena de forma persistente utilizando el IndexedDB nativo de su navegador. Puede hacer clic en **Restablecer todo** para borrar todos los datos de forma segura.