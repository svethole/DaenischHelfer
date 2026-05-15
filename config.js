import { CONFIG } from "./api-config.js";

// ======================================
// Aktive Sprache verwalten
// ======================================

let activeLang = localStorage.getItem("anki_activeLang") || CONFIG.defaultLang;

export function getActiveLang() {
    return activeLang;
}

export function setActiveLang(langCode) {
    if (CONFIG.langs[langCode]) {
        activeLang = langCode;
        localStorage.setItem("anki_activeLang", langCode);
    }
}

// ======================================
// Konfiguration für aktive Sprache abrufen
// ======================================

export function getLangConfig(langCode = null) {
    const code = langCode || activeLang;
    return CONFIG.langs[code] || null;
}

export function getAllLangs() {
    return Object.entries(CONFIG.langs).map(([code, config]) => ({
        code,
        name: config.name,
        flag: config.flag
    }));
}

// ======================================
// API-Key
// ======================================

export function getApiKey() {
    return CONFIG.apiKey;
}

// ======================================
// TTS-Konfiguration
// ======================================

export function getTTSConfig(langCode = null) {
    const lang = getLangConfig(langCode);
    if (!lang) return null;
    
    return {
        model: lang.ttsModel,
        voiceId: lang.voiceId
    };
}

// ======================================
// URLs mit Platzhaltern ersetzen
// ======================================

export function getProcessedUrls(sentence, word, langCode = null) {
    const lang = getLangConfig(langCode);
    if (!lang) return [];
    
    const encodedSentence = encodeURIComponent(sentence);
    const encodedWord = encodeURIComponent(word);
    
    return lang.urls.map(url => {
        return url
            .replace(/\$\{sentence\}/g, encodedSentence)
            .replace(/\$\{word\}/g, encodedWord);
    });
}