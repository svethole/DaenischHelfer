import {
    sentenceField,
    wordField,
    preview,
    startButton,
    ankiConnectButton
} from "./dom.js";

import { escapeRegExp } from "./utils.js";

export function updatePreview() {

    const sentence =
    sentenceField.value;

    const word =
    wordField.value.trim();

    if (!sentence || !word) {

        preview.innerHTML = "";

        return;
    }

    const regex =
    new RegExp(
        `(${escapeRegExp(word)})`,
               "gi"
    );

    preview.innerHTML =
    sentence.replace(
        regex,
        '<span class="highlight">$1</span>'
    );
}

export function validateForm() {
    const isValid = sentenceField.value.trim() && wordField.value.trim();
    
    startButton.disabled = !isValid;
    
    // Anki-Connect-Button: aktiv wenn Formular gültig UND (TTS deaktiviert ODER Audio existiert)
    if (ankiConnectButton) {
        ankiConnectButton.disabled = !isValid;
    }
}

export function flashCopyButton(button) {
    // Pulsier-Effekt
    button.classList.add("copy-flash");

    // Nach der Animation wieder entfernen
    setTimeout(() => {
        button.classList.remove("copy-flash");
    }, 500);
}