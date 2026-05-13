<div align="centre">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Un IDE et un gestionnaire de documents puissants, entièrement basés sur un navigateur</strong></p>
  <p>Pas de backend • Entièrement local • Hautes performances</p>

[Anglais](LISEZMOI.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Espagnol](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Allemand](docs/locales/README-de.md)

</div>

<hr/>

## 🌟 Aperçu

WebPad++ est un environnement de développement intégré (IDE) de nouvelle génération qui s'exécute **à 100 % dans votre navigateur Web**. Sans avoir besoin d'un backend, de bases de données ou d'installations locales, vous pouvez écrire du code, exécuter Python, créer des sites Web, gérer des feuilles de calcul et extraire du texte à partir de PDF, le tout localement sur votre ordinateur sans latence.

## ✨ Principales fonctionnalités

### 💻 Édition et exécution de code
- **Intelligent Editor** : Propulsé par Ace Editor avec coloration syntaxique, IntelliSense et correspondance entre crochets.
- **Exécution instantanée** : 
  - Exécutez **HTML/CSS/JS** avec un aperçu côte à côte en direct.
  - Exécutez **Python** localement directement dans le navigateur via Pyodide.
- **Linter et formateur intégrés** : détection des erreurs de syntaxe en temps réel et embellissement en un clic pour HTML, CSS et JS.
- **Code Diff** : comparez deux fichiers côte à côte avec notre visionneuse de fusion visuelle.

### 📄 Suite de documents professionnels
- **Markdown & Visual Sync** : basculez en toute transparence entre le code Markdown et un éditeur visuel Rich Text (WYSIWYG).
- **Spreadsheet Engine** : ouvrez, modifiez, triez et appliquez des formules mathématiques (par exemple, `=SUM(A1:A5)`) aux fichiers `.xlsx` et `.csv`.
- **Outils PDF et Word** : affichez des PDF, modifiez des fichiers DOCX en mode texte enrichi et extrayez du texte via des analyseurs intégrés.
- **Exportation** : convertissez et téléchargez des fichiers aux formats DOCX, XLSX, CSV et PDF.

### 🌐 Utilitaires avancés
- **Drag & Drop de dossier** : faites glisser des répertoires de projet entiers de votre système d'exploitation directement vers WebPad++.
- **Outils SEO** : générateurs visuels intégrés pour `sitemap.xml` et `robots.txt` pour améliorer le classement de recherche de votre site.
- **Image OCR** : téléchargez ou prenez une photo d'un document et extrayez automatiquement le texte à l'aide de Tesseract.js.
- **QR Code Suite** : Générez instantanément des codes QR ou décodez-les à l'aide de votre webcam.

## 🛠 Formats pris en charge

| Formater | Importer et afficher | Modifier | Exporter |
|--------|--------------|------|--------|
| **HTML/JS/CSS** | ✅ Oui | ✅ Code et aperçu en direct | ✅ ZIP / Fichier |
| **Marquage** | ✅ Oui | ✅ Synchronisation du code et du WYSIWYG | ✅MD |
| **XLSX/CSV** | ✅ Grille de feuille de calcul | ✅ Formules & Tri | ✅XLSX/CSV |
| **PDF** | ✅ Visionneuse | ✅ Extraire le texte | ✅PDF/DOCX |
| **DOCX** | ✅ Rendu HTML riche | ✅ WYSIWYG | ✅DOCX/PDF |

## 🚀 Comment utiliser

1. **Mise en route** : ouvrez simplement « index.html » dans n'importe quel navigateur Web moderne.
2. **Gestion des fichiers** : cliquez sur le menu `☰` pour ouvrir l'explorateur de fichiers. Cliquez avec le bouton droit pour créer des fichiers ou faites simplement glisser et déposez des dossiers dans la fenêtre.
3. **Exécution du code** : ouvrez n'importe quel script et cliquez sur le bouton ▶️ **Exécuter** ou appuyez sur `Ctrl+Entrée`.
4. **Outils et référencement** : utilisez la barre d'outils supérieure pour accéder à l'outil OCR, au scanner de code QR ou au générateur de plan de site/robots.
5. **Langues** : WebPad++ prend en charge 30 langues mondiales ! Utilisez le menu déroulant en haut à droite pour changer instantanément.

## 🔐 Confidentialité et sécurité

WebPad++ fonctionne entièrement côté client. Votre code, vos documents et vos données ne quittent jamais votre ordinateur. Tout est stocké de manière persistante à l'aide de l'IndexedDB natif de votre navigateur. Vous pouvez cliquer sur **Réinitialiser tout** pour effacer toutes les données en toute sécurité.