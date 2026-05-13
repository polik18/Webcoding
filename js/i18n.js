// js/i18n.js

if (window.location.protocol === 'file:') {
    setTimeout(() => {
        alert("⚠️ 偵測到您使用 file:// 直接開啟網頁！\n\n基於瀏覽器安全性限制 (CORS)，無法動態讀取語言包 (.json)。\n請改用本地伺服器開啟 (例如在終端機輸入 python3 -m http.server 8000)。");
    }, 1000);
}

let defaultLang = localStorage.getItem('webpad_lang');
if (!defaultLang) {
    let navLang = navigator.language;
    if (navLang) {
        if (navLang.startsWith('zh')) {
            defaultLang = (navLang === 'zh-CN' || navLang === 'zh-SG') ? 'zh-CN' : 'zh-TW';
        } else {
            defaultLang = navLang.split('-')[0];
        }
    } else {
        defaultLang = 'en';
    }
}

const langSelect = document.getElementById('lang-select');
if (langSelect && !Array.from(langSelect.options).some(opt => opt.value === defaultLang)) {
    defaultLang = 'en';
}

i18next
    .use(i18nextHttpBackend)
    .init({
        lng: defaultLang,
        fallbackLng: 'en',
        load: 'currentOnly',
        backend: {
            loadPath: 'locales/{{lng}}.json',
            queryStringParams: { v: Date.now() }
        }
    })
    .then(function(t) {
        updateLanguageUI();
        
        const select = document.getElementById('lang-select');
        if (Array.from(select.options).some(opt => opt.value === i18next.language)) {
            select.value = i18next.language;
        } else {
            select.value = 'en';
        }

        if (typeof window.onI18nReady === 'function') {
            window.onI18nReady();
        }
    })
    .catch(err => {
        console.error("i18next failed to load", err);
    });

function updateLanguageUI() {
    const rtlLangs = ['ar', 'he'];
    const currentLang = i18next.language.split('-')[0];
    
    if (rtlLangs.includes(currentLang)) {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.removeAttribute('dir');
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerHTML = i18next.t(el.getAttribute('data-i18n'));
    });
    
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = window.t(el.getAttribute('data-i18n-title'));
    });
    
    const nameEl = document.getElementById('file-name');
    if (nameEl.dataset.isDefault !== 'false') {
        nameEl.textContent = i18next.t('nav.defaultFile');
        nameEl.dataset.isDefault = 'true';
    }
}

function changeLanguage(lang) {
    localStorage.setItem('webpad_lang', lang);
    i18next.changeLanguage(lang).then(() => {
        updateLanguageUI();
        if (typeof window.onLanguageChanged === 'function') {
            window.onLanguageChanged();
        }
    });
}

// Ensure global functions are available
window.changeLanguage = changeLanguage;

// Safe translation helper: returns i18next result or English fallback
const _FALLBACKS = {
    'nav.resetAllTitle': 'Reset All',
    'nav.renameNode': 'Rename',
    'nav.renameTitle': 'Rename',
    'messages.errDuplicate': 'already exists in this folder',
    'messages.confirmReset': '⚠️ This will permanently delete ALL files, tabs and settings. This action CANNOT be undone!',
    'messages.errDeleteRoot': 'Cannot delete root folder or no file selected.',
    'messages.confirmDeleteMsg': 'Are you sure you want to delete',
    'messages.cancel': 'Cancel',
    'messages.confirm': 'OK',
    'messages.renameMsg': 'Enter a name (with extension, e.g. index.html):'
};
window.t = (key, opts) => {
    const result = i18next.t(key, opts);
    // i18next returns the key itself when the key is missing
    if (result === key && _FALLBACKS[key]) return _FALLBACKS[key];
    return result;
};
