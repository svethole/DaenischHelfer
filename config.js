import { CONFIG } from "./api-config.js";

// CONFIG für das Info-Overlay verfügbar machen
export { CONFIG };

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

// ======================================
// Anki Connect Konfiguration
// ======================================

export function getAnkiConfig(langCode = null) {
    const lang = getLangConfig(langCode);
    if (!lang || !lang.anki) return null;
    
    // Globale Einstellung: Anki komplett aus?
    if (CONFIG.ankiConnect && CONFIG.ankiConnect.enabled === false) return null;
    
    // Sprachebene: Anki für diese Sprache deaktiviert?
    if (lang.anki.enabled === false) return null;
    
    return {
        deck: lang.anki.deck,
        model: lang.anki.model,
        fields: {
            sentence: lang.anki.fields.sentence || "Sentence",
            word: lang.anki.fields.word || "Word",
            audio: lang.anki.fields.audio || "Audio"
        }
    };
}

export function isAnkiEnabled() {
    return CONFIG.ankiConnect && CONFIG.ankiConnect.enabled !== false;
}

// Prüfen, ob Anki für eine bestimmte Sprache aktiv ist
export function isAnkiEnabledForLang(langCode = null) {
    const code = langCode || activeLang;
    const lang = getLangConfig(code);
    
    // Global aus?
    if (!isAnkiEnabled()) return false;
    
    // Keine Anki-Konfiguration für diese Sprache?
    if (!lang || !lang.anki) return false;
    
    // Explizit deaktiviert?
    if (lang.anki.enabled === false) return false;
    
    return true;
}

export function getAnkiPort() {
    return (CONFIG.ankiConnect && CONFIG.ankiConnect.port) || 8765;
}
