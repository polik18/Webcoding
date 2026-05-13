<div alinhar="centro">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Um IDE e gerenciador de documentos poderoso e totalmente baseado em navegador</strong></p>
  <p>Sem back-end • Totalmente local • Alto desempenho</p>

[Inglês](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Alemão](docs/locales/README-de.md)

</div>

<h/>

## 🌟 Visão geral

WebPad++ é um ambiente de desenvolvimento integrado (IDE) de última geração que roda **100% em seu navegador**. Sem precisar de back-end, bancos de dados ou instalações locais, você pode escrever código, executar Python, criar sites, gerenciar planilhas e extrair texto de PDFs – tudo localmente em sua máquina com latência zero.

## ✨ Principais recursos

### 💻 Edição e execução de código
- **Editor Inteligente**: Desenvolvido por Ace Editor com realce de sintaxe, IntelliSense e correspondência de colchetes.
- **Execução instantânea**: 
  - Execute **HTML/CSS/JS** com uma visualização lado a lado ao vivo.
  - Execute **Python** localmente diretamente no navegador via Pyodide.
- **Linter e formatador integrados**: detecção de erros de sintaxe em tempo real e embelezamento com um clique para HTML, CSS e JS.
- **Diferença de código**: compare dois arquivos lado a lado com nosso visualizador de mesclagem visual.

### 📄 Conjunto de documentos profissionais
- **Markdown e Visual Sync**: alterne perfeitamente entre o código Markdown e um editor visual Rich Text (WYSIWYG).
- **Mecanismo de planilha**: Abra, edite, classifique e aplique fórmulas matemáticas (por exemplo, `=SUM(A1:A5)`) a arquivos `.xlsx` e `.csv`.
- **Ferramentas de PDF e Word**: visualize PDFs, edite arquivos DOCX no modo rich text e extraia texto por meio de analisadores integrados.
- **Exportação**: converta e baixe arquivos nos formatos DOCX, XLSX, CSV e PDF.

### 🌐 Utilitários avançados
- **Arrastar e soltar pastas**: arraste diretórios inteiros do projeto do seu sistema operacional diretamente para o WebPad++.
- **Ferramentas de SEO**: Geradores visuais integrados para `sitemap.xml` e `robots.txt` para aumentar a classificação de pesquisa do seu site.
- **OCR de imagem**: carregue ou tire uma foto de um documento e extraia automaticamente o texto usando Tesseract.js.
- **QR Code Suite**: Gere códigos QR instantaneamente ou decodifique-os usando sua webcam.

## 🛠 Formatos Suportados

| Formato | Importar e visualizar | Editar | Exportar |
|--------|---------------|------|--------|
| **HTML/JS/CSS** | ✅ Sim | ✅ Código e visualização ao vivo | ✅ ZIP/Arquivo |
| **Marcação** | ✅ Sim | ✅ Sincronização de código e WYSIWYG | ✅ MD |
| **XLSX/CSV** | ✅ Grade de planilha | ✅ Fórmulas e classificação | ✅XLSX/CSV |
| **PDF** | ✅ Visualizador | ✅ Extrair texto | ✅PDF/DOCX |
| **DOCX** | ✅ Renderização HTML rica | ✅ WYSIWYG | ✅ DOCX/PDF |

## 🚀 Como usar

1. **Primeiros passos**: Basta abrir `index.html` em qualquer navegador moderno.
2. **Gerenciamento de arquivos**: Clique no menu `☰` para abrir o Explorador de Arquivos. Clique com o botão direito para criar arquivos ou simplesmente arraste e solte as pastas na janela.
3. **Código em execução**: Abra qualquer script e clique no botão ▶️ **Executar** ou pressione `Ctrl+Enter`.
4. **Ferramentas e SEO**: Use a barra de ferramentas superior para acessar a ferramenta OCR, scanner de QR Code ou gerador de Sitemap/robôs.
5. **Idiomas**: O WebPad++ suporta 30 idiomas globais! Use o menu suspenso no canto superior direito para mudar instantaneamente.

## 🔐 Privacidade e segurança

O WebPad++ opera inteiramente no lado do cliente. Seu código, documentos e dados nunca saem do seu computador. Tudo é armazenado de forma persistente usando o IndexedDB nativo do seu navegador. Você pode clicar em **Redefinir tudo** para limpar todos os dados com segurança.