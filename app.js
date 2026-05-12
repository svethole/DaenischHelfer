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


// ======================================
// Lokale Puffer für sentence / word
// (aus localStorage laden)
// ======================================

DOM.sentenceField.value =
localStorage.getItem("anki_sentence") || "";

DOM.wordField.value =
localStorage.getItem("anki_word") || "";


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

// Formular absenden
DOM.form.addEventListener("submit", function (event) {
    event.preventDefault();

    const sentenceRaw = DOM.sentenceField.value.trim();
    const wordRaw     = DOM.wordField.value.trim();

    // Im Verlauf speichern
    saveToHistory(sentenceRaw, wordRaw, validateForm, updatePreview);

    // TTS generieren, falls Checkbox aktiv
    if (DOM.enableTTS.checked) {
        generateTTS(sentenceRaw);
    } else {
        hideTTSLinks();
    }

    // URLs in neuem Tab öffnen
    const sentence = encodeURIComponent(sentenceRaw);
    const word     = encodeURIComponent(wordRaw);

    const urls = [
        `https://www.deepl.com/translator#da/de/${sentence}`,
        `https://ordnet.dk/ddo/ordbog?query=${word}`,
        `https://de.langenscheidt.com/daenisch-deutsch/${word}`,
        `https://forvo.com/search/${word}/da/`,
        `https://www.google.com/search?tbm=isch&q=${word}`
    ];

    urls.forEach(url => window.open(url, "_blank"));
});


// ======================================
// Initialisierung
// ======================================

validateForm();
updatePreview();
loadHistory(validateForm, updatePreview);
updateHistoryVisibility();