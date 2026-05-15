// ======================================
// Zentrale app.js – Importe
// ======================================

import * as DOM from "./dom.js";
import { escapeRegExp, createTTSFilename } from "./utils.js";
import { updatePreview, validateForm, flashCopyButton } from "./ui.js";
import { generateTTS, hideTTSLinks } from "./tts.js";
import {
    loadHistory,
    saveToHistory,
    deleteHistoryEntry,
    updateHistoryVisibility
} from "./history.js";
import {
    getActiveLang,
    setActiveLang,
    getAllLangs,
    getProcessedUrls,
    getLangConfig
} from "./config.js";
import { getCachedAudio, cacheAudio, getCacheStats } from "./tts-cache.js";


// ======================================
// Sprach-Dropdown initialisieren
// ======================================

function initLanguageSelector() {
    const selector = document.getElementById("languageSelector");
    if (!selector) return;
    
    const langs = getAllLangs();
    const activeLang = getActiveLang();
    
    selector.innerHTML = "";
    
    langs.forEach(lang => {
        const option = document.createElement("option");
        option.value = lang.code;
        option.textContent = `${lang.flag} ${lang.name}`;
        option.selected = lang.code === activeLang;
        selector.appendChild(option);
    });
    
    selector.addEventListener("change", (event) => {
        setActiveLang(event.target.value);
        validateForm();
        updatePreview();
        loadHistory(validateForm, updatePreview);
        updatePageTitle();
    });
}

function updatePageTitle() {
    const lang = getLangConfig();
    if (lang) {
        document.title = `Anki-Helfer ${lang.name}`;
        const h1 = document.querySelector("h1");
        if (h1) {
            h1.textContent = `Anki-Helfer ${lang.flag} ${lang.name}`;
        }
    }
}


// ======================================
// Lokale Puffer für sentence / word
// ======================================

DOM.sentenceField.value = localStorage.getItem("anki_sentence") || "";
DOM.wordField.value = localStorage.getItem("anki_word") || "";


// ======================================
// Event Listener
// ======================================

// Satz-Eingabe
DOM.sentenceField.addEventListener("input", () => {
    localStorage.setItem("anki_sentence", DOM.sentenceField.value);
    validateForm();
    updatePreview();
});

// Doppelklick auf Wort im Satz
DOM.sentenceField.addEventListener("dblclick", () => {
    const start = DOM.sentenceField.selectionStart;
    const end   = DOM.sentenceField.selectionEnd;
    const selectedText = DOM.sentenceField.value
        .substring(start, end)
        .trim();

    if (selectedText.length > 0) {
        DOM.wordField.value = selectedText;
        localStorage.setItem("anki_word", selectedText);
        validateForm();
        updatePreview();
    }
});

// Wort-Eingabe
DOM.wordField.addEventListener("input", () => {
    localStorage.setItem("anki_word", DOM.wordField.value);
    validateForm();
    updatePreview();
});

// Kopier-Buttons
DOM.copySentenceButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(DOM.sentenceField.value);
    flashCopyButton(DOM.copySentenceButton);
});

DOM.copyWordButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(DOM.wordField.value);
    flashCopyButton(DOM.copyWordButton);
});

// Alles löschen
DOM.clearButton.addEventListener("click", () => {
    DOM.sentenceField.value = "";
    DOM.wordField.value = "";
    DOM.preview.innerHTML = "";
    validateForm();
    updatePreview();
    DOM.sentenceField.focus();
});

// Verlauf löschen
DOM.clearHistoryButton.addEventListener("click", () => {
    if (confirm("Verlauf wirklich löschen?")) {
        localStorage.removeItem("anki_history");
        loadHistory(validateForm, updatePreview);
    }
});

// History ein-/ausklappen
DOM.toggleHistoryButton.addEventListener("click", () => {
    const collapsed = localStorage.getItem("historyCollapsed") === "true";
    localStorage.setItem("historyCollapsed", (!collapsed).toString());
    updateHistoryVisibility();
});

// TTS-Checkbox
DOM.enableTTS.addEventListener("change", () => {
    if (!DOM.enableTTS.checked) {
        hideTTSLinks();
    }
});

// Formular absenden (MIT CACHE-LOGIK)
DOM.form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const sentenceRaw = DOM.sentenceField.value.trim();
    const wordRaw     = DOM.wordField.value.trim();

    if (!sentenceRaw || !wordRaw) return;

    // Im Verlauf speichern (mit aktuellem Sprach-Code)
    saveToHistory(sentenceRaw, wordRaw, getActiveLang(), validateForm, updatePreview);

    // Cache-Key: sprachcode + satz (einfach und eindeutig)
    const cacheId = `${getActiveLang()}_${sentenceRaw}`;
    
    // TTS generieren oder aus Cache laden
    if (DOM.enableTTS.checked) {
        DOM.ttsStatus.textContent = "Prüfe Cache ...";
        
        // 1. Cache prüfen
        const cachedUrl = await getCachedAudio(cacheId);
        
        if (cachedUrl) {
            // Aus Cache verwenden
            DOM.downloadLink.href = cachedUrl;
            DOM.downloadLink.download = createTTSFilename(sentenceRaw);
            DOM.downloadLink.style.display = "inline-block";
            DOM.ttsStatus.textContent = "✅ TTS aus Cache geladen.";
            console.log("📦 Cache-Treffer:", cacheId);
        } else {
            // 2. Neu generieren
            const audioBlob = await generateTTS(sentenceRaw);
            
            // 3. In Cache speichern
            if (audioBlob) {
                await cacheAudio(cacheId, audioBlob);
                console.log("💾 Audio gecacht:", cacheId);
            }
        }
    } else {
        hideTTSLinks();
    }

    // URLs aus Konfiguration holen und öffnen
    const urls = getProcessedUrls(sentenceRaw, wordRaw);
    urls.forEach(url => window.open(url, "_blank"));
});


// ======================================
// Cache-Info beim Start anzeigen (optional)
// ======================================

async function showCacheInfo() {
    const stats = await getCacheStats();
    console.log(`📦 TTS-Cache: ${stats.entries}/${stats.maxEntries} Einträge (${stats.totalSizeKB} KB)`);
}


// ======================================
// Initialisierung
// ======================================

initLanguageSelector();
updatePageTitle();
validateForm();
updatePreview();
loadHistory(validateForm, updatePreview);
updateHistoryVisibility();
showCacheInfo();