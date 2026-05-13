import os
import json
from deep_translator import GoogleTranslator

# Master dictionary of new keys in English
NEW_KEYS = {
    "seo": {
        "auditTab": "Audit & Preview",
        "sitemapTab": "Sitemap Generator",
        "robotsTab": "Robots.txt",
        "schemaTab": "Schema.org",
        "scoreTitle": "SEO Audit Score",
        "previewTitle": "Google Search Preview",
        "desc": "Analyze your content for technical SEO issues and preview how it appears in search results.",
        "auditTitle": "Current Page Audit",
        "reanalyze": "Reanalyze",
        "notAnalyzed": "Not Analyzed",
        "clickToAnalyze": "Click Reanalyze to get optimization suggestions"
    },
    "ocr": {
        "initialTitle": "No Image Selected",
        "initialSub": "Select a source from the left or drag an image here",
        "startBtn": "Start Recognition",
        "resetBtn": "Start Over",
        "saveBtn": "Save to File",
        "langLabel": "Language Setting",
        "sourceLabel": "Input Source",
        "resultLabel": "Recognition Result (Editable)",
        "camera": "Take Photo",
        "upload": "Upload Image",
        "paste": "Paste Image",
        "modeLabel": "Recognition Mode",
        "modeDoc": "Document (Scan/Screenshot)",
        "modePhoto": "Photo (Mobile Camera)",
        "modeLine": "Single Line (Label/Receipt)",
        "modeDesc": "Document mode works best for flat and structured text.",
        "gvisionTitle": "Google Vision API",
        "gvisionHighAcc": "High Accuracy",
        "gvisionDesc": "Enter API Key to use Google Cloud Vision engine. Up to 99% accuracy for Traditional Chinese. Free 1000 requests/month.",
        "gvisionLink": "How to get a free API Key"
    },
    "recent": {
        "title": "Recent Access",
        "clear": "Clear History",
        "empty": "No recent records found.",
        "desc": "Quickly reopen your recently accessed files and project folders."
    }
}

LOCALES_DIR = "/Users/huangjianzhe/Documents/github/Webcoding/Webcoding/locales"

def translate_recursive(master, target, translator):
    updated = False
    for key, value in master.items():
        if key not in target:
            if isinstance(value, dict):
                target[key] = {}
                translate_recursive(value, target[key], translator)
                updated = True
            else:
                try:
                    translated = translator.translate(value)
                    target[key] = translated
                    print(f"  Translated [{key}]: {value} -> {translated}")
                    updated = True
                except Exception as e:
                    print(f"  Error translating {key}: {e}")
                    target[key] = value # Fallback to English
        elif isinstance(value, dict):
            if translate_recursive(value, target[key], translator):
                updated = True
    return updated

def main():
    files = [f for f in os.listdir(LOCALES_DIR) if f.endswith(".json")]
    
    for filename in files:
        lang_code = filename.replace(".json", "")
        # Adjust lang code for deep-translator
        dt_lang = lang_code
        if lang_code == "zh-TW": dt_lang = "zh-TW"
        elif lang_code == "zh-CN": dt_lang = "zh-CN"
        elif lang_code == "he": dt_lang = "iw"  # Hebrew fix
        
        print(f"Checking {filename} (Lang: {dt_lang})...")
        
        path = os.path.join(LOCALES_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        translator = GoogleTranslator(source="en", target=dt_lang)
        
        if translate_recursive(NEW_KEYS, data, translator):
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated {filename}")
        else:
            print(f"No new keys needed for {filename}")

if __name__ == "__main__":
    main()
