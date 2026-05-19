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
    showDefaultView,
} from "./history.js";
import {
    getActiveLang,
    setActiveLang,
    getAllLangs,
    getProcessedUrls,
    getLangConfig,
    isAnkiEnabled,
    isAnkiEnabledForLang,
} from "./config.js";
import {
    cacheAudio,
    clearAllHistory,
    loadHistory as loadHistoryFromDB,
    getCachedAudio,
} from "./tts-cache.js";
import { createInfoOverlay } from "./info-overlay.js";
import { initAudioPlayer, resetPlayer } from "./audio-player.js";
import { initHistoryIO } from "./history-io.js";
import { testAnkiConnection, createAnkiCard } from "./anki-connect.js";

let lastGeneratedAudioBlob = null;
let lastGeneratedSentence = "";
let lastGeneratedWord = "";

// ======================================
// Anki-Connect-Button Sichtbarkeit
// ======================================

function updateAnkiButtonVisibility() {
    if (!DOM.ankiConnectButton) return;

    if (isAnkiEnabledForLang()) {
        DOM.ankiConnectButton.style.display = "";
    } else {
        DOM.ankiConnectButton.style.display = "none";
    }
}

// ======================================
// Sprach-Dropdown und Titel
// ======================================

function initLanguageSelector() {
    const selector = document.getElementById("languageSelector");
    if (!selector) return;

    const langs = getAllLangs();
    const activeLang = getActiveLang();

    selector.innerHTML = "";

    langs.forEach((lang) => {
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
        updateAnkiButtonVisibility();
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
    resetPlayer();
}

// ======================================
// Anki Connect Status
// ======================================
async function checkAnkiStatus() {
    const statusEl = document.getElementById("ankiStatus");
    if (!statusEl) return;

    const isConnected = await testAnkiConnection();
    statusEl.textContent = isConnected ? "🟢" : "🔴";
    statusEl.title = isConnected ? "Anki verbunden" : "Anki nicht erreichbar";
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
    const end = DOM.sentenceField.selectionEnd;
    const selectedText = DOM.sentenceField.value.substring(start, end).trim();

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
    const wordRaw = DOM.wordField.value.trim();

    if (!sentenceRaw || !wordRaw) return;

    const currentLang = getActiveLang();

    let audioBlob = null;
    let audioGenerated = false;

    // TTS generieren und ID erhalten
    let historyId = null;

    if (DOM.enableTTS.checked) {
        DOM.ttsStatus.textContent = "TTS wird erzeugt ...";

        audioBlob = await generateTTS(sentenceRaw);

        if (audioBlob) {
            // Erst History-Eintrag erstellen, dann ID für Audio nutzen
            const entryId = Date.now(); // Temporäre ID
            await saveToHistory(sentenceRaw, wordRaw, currentLang, validateForm, updatePreview);

            // Jetzt die echte ID aus der DB holen und Audio speichern
            const history = await loadHistoryFromDB(validateForm, updatePreview);
            const lastEntry = history[0]; // Neuester Eintrag

            if (lastEntry) {
                await cacheAudio(lastEntry.id, audioBlob);
                audioGenerated = true;

                // Player automatisch laden
                const { loadAudioForHistory } = await import("./audio-player.js");
                await loadAudioForHistory(lastEntry.id, sentenceRaw);
            }

            // Für Anki-Connect-Button merken
            lastGeneratedAudioBlob = audioBlob;
            lastGeneratedSentence = sentenceRaw;
            lastGeneratedWord = wordRaw;
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

    // Anki-Karte erstellen
    await createAnkiCard(sentenceRaw, wordRaw, audioBlob, currentLang);

    // URLs öffnen
    const urls = getProcessedUrls(sentenceRaw, wordRaw);
    urls.forEach((url) => window.open(url, "_blank"));
});

// ======================================
// Anki Connect Button
// ======================================

if (!isAnkiEnabled()) {
    DOM.ankiConnectButton.style.display = "none";
}

DOM.ankiConnectButton.addEventListener("click", async () => {
    const sentenceRaw = DOM.sentenceField.value.trim();
    const wordRaw = DOM.wordField.value.trim();

    if (!sentenceRaw || !wordRaw) return;

    // Prüfen, ob wir aktuelle Audio-Daten haben
    // (entweder von der letzten Generierung oder aus dem Cache des aktuellen Satzes)
    let audioBlob = lastGeneratedAudioBlob;

    // Wenn sich Satz/Wort geändert hat, Audio aus dem letzten History-Eintrag holen
    if (sentenceRaw !== lastGeneratedSentence || wordRaw !== lastGeneratedWord) {
        audioBlob = null;

        // Aus der History das Audio zum aktuellen Satz suchen
        const history = await loadHistoryFromDB();
        const matchingEntry = history.find((e) => e.sentence === sentenceRaw && e.word === wordRaw);

        if (matchingEntry) {
            const audioUrl = await getCachedAudio(matchingEntry.id);
            if (audioUrl) {
                const response = await fetch(audioUrl);
                audioBlob = await response.blob();
            }
        }
    }

    // Anki-Karte erstellen
    const currentLang = getActiveLang();
    await createAnkiCard(sentenceRaw, wordRaw, audioBlob, currentLang);
});

// ======================================
// Initialisierung
// ======================================

// ======================================
// Info-Button
// ======================================

const infoButton = document.getElementById("infoButton");
if (infoButton) {
    infoButton.addEventListener("click", createInfoOverlay);
}
initPagination();
initHistoryIO(validateForm, updatePreview, onHistoryLanguageChange);
setupPaginationButtons();
initLanguageSelector();
updateAnkiButtonVisibility();
updatePageTitle();
validateForm();
updatePreview();
loadHistory(validateForm, updatePreview, onHistoryLanguageChange);
updateHistoryVisibility();
hideDownloadButton();
initAudioPlayer();
checkAnkiStatus();
