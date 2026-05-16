// ======================================
// Zentrale app.js – Importe
// ======================================

import * as DOM from "./dom.js";
import { updatePreview, validateForm, flashCopyButton } from "./ui.js";
import { generateTTS } from "./tts.js";
import {
    loadHistory,
    saveToHistory,
    updateHistoryVisibility,
    initPagination,
    goToFirstPage,
    goToPrevPage,
    goToNextPage,
    goToLastPage,
    showAllEntries,
    showDefaultView
} from "./history.js";
import {
    getActiveLang,
    setActiveLang,
    getAllLangs,
    getProcessedUrls,
    getLangConfig
} from "./config.js";
import {
    cacheAudio,
    clearAllHistory
} from "./tts-cache.js";


// ======================================
// Sprach-Dropdown und Titel
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
        updatePageTitle();
        validateForm();
        updatePreview();
        loadHistory(validateForm, updatePreview, onHistoryLanguageChange);
    });
}

function updatePageTitle(langCode = null) {
    const lang = getLangConfig(langCode);
    if (lang) {
        document.title = `Anki-Helfer ${lang.name}`;
        const h1 = document.querySelector("h1");
        if (h1) {
            h1.textContent = `Anki-Helfer ${lang.flag} ${lang.name}`;
        }
    }
}

function onHistoryLanguageChange(langCode) {
    // Dropdown aktualisieren
    const selector = document.getElementById("languageSelector");
    if (selector) {
        selector.value = langCode;
    }
    
    // Titel aktualisieren
    setActiveLang(langCode);
    updatePageTitle(langCode);
}

// ======================================
// Download-Button zurücksetzen
// ======================================

function hideDownloadButton() {
    DOM.downloadLink.style.display = "none";
    DOM.downloadLink.href = "#";
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
    hideDownloadButton();
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
        hideDownloadButton();
    }
});

// Wort-Eingabe
DOM.wordField.addEventListener("input", () => {
    localStorage.setItem("anki_word", DOM.wordField.value);
    validateForm();
    updatePreview();
    hideDownloadButton();
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
    hideDownloadButton();
    validateForm();
    updatePreview();
    DOM.sentenceField.focus();
});

// Verlauf löschen
DOM.clearHistoryButton.addEventListener("click", async () => {
    if (confirm("Verlauf wirklich löschen?")) {
        await clearAllHistory();
        await loadHistory(validateForm, updatePreview, onHistoryLanguageChange);
        hideDownloadButton();
    }
});

// History ein-/ausklappen
DOM.toggleHistoryButton.addEventListener("click", () => {
    const collapsed = localStorage.getItem("historyCollapsed") === "true";
    localStorage.setItem("historyCollapsed", (!collapsed).toString());
    updateHistoryVisibility();
});

// ======================================
// Pagination-Buttons
// ======================================

function setupPaginationButtons() {
    DOM.firstPageButton.addEventListener("click", () => {
        goToFirstPage(validateForm, updatePreview, onHistoryLanguageChange);
    });

    DOM.prevPageButton.addEventListener("click", () => {
        goToPrevPage(validateForm, updatePreview, onHistoryLanguageChange);
    });

    DOM.nextPageButton.addEventListener("click", () => {
        goToNextPage(validateForm, updatePreview, onHistoryLanguageChange);
    });

    DOM.lastPageButton.addEventListener("click", () => {
        goToLastPage(validateForm, updatePreview, onHistoryLanguageChange);
    });

    DOM.showAllButton.addEventListener("click", () => {
        showAllEntries();
    });

    DOM.showDefaultButton.addEventListener("click", () => {
        showDefaultView(validateForm, updatePreview, onHistoryLanguageChange);
    });
}

// TTS-Checkbox
DOM.enableTTS.addEventListener("change", () => {
    if (!DOM.enableTTS.checked) {
        hideDownloadButton();
        DOM.ttsStatus.textContent = "";
    }
});

// Formular absenden
DOM.form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const sentenceRaw = DOM.sentenceField.value.trim();
    const wordRaw     = DOM.wordField.value.trim();

    if (!sentenceRaw || !wordRaw) return;

    const currentLang = getActiveLang();

    // TTS generieren und ID erhalten
    let historyId = null;
    let audioGenerated = false;

    if (DOM.enableTTS.checked) {
        DOM.ttsStatus.textContent = "TTS wird erzeugt ...";
        
        const audioBlob = await generateTTS(sentenceRaw);
        
        if (audioBlob) {
            // Erst History-Eintrag erstellen, dann ID für Audio nutzen
            const entryId = Date.now(); // Temporäre ID
            await saveToHistory(sentenceRaw, wordRaw, currentLang, validateForm, updatePreview);
            
            // Jetzt die echte ID aus der DB holen und Audio speichern
            const { loadHistory } = await import("./tts-cache.js");
            const history = await loadHistory();
            const lastEntry = history[0]; // Neuester Eintrag
            
            if (lastEntry) {
                await cacheAudio(lastEntry.id, audioBlob);
                audioGenerated = true;
            }
        }
    } else {
        DOM.ttsStatus.textContent = "";
    }

    // Immer History speichern (falls nicht schon durch TTS-Logik geschehen)
    if (!audioGenerated) {
        await saveToHistory(sentenceRaw, wordRaw, currentLang, validateForm, updatePreview);
    }

    // Download-Button aktualisieren
    if (audioGenerated) {
        // Button bleibt sichtbar durch loadHistory
    } else {
        hideDownloadButton();
    }

    // URLs öffnen
    const urls = getProcessedUrls(sentenceRaw, wordRaw);
    urls.forEach(url => window.open(url, "_blank"));
});


// ======================================
// Initialisierung
// ======================================

initPagination();
setupPaginationButtons();
initLanguageSelector();
updatePageTitle();
validateForm();
updatePreview();
loadHistory(validateForm, updatePreview, onHistoryLanguageChange);
updateHistoryVisibility();
hideDownloadButton();
