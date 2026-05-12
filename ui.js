import {
    sentenceField,
    wordField,
    preview,
    startButton
} from "./dom.js";

import { escapeRegExp }
from "./utils.js";

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

    startButton.disabled = !(
        sentenceField.value.trim() &&
        wordField.value.trim()
    );
}

export function flashCopyButton(button) {

    const originalBackground =
    button.style.background;

    button.style.background =
    "#2e7d32";

setTimeout(() => {

    button.style.background =
    originalBackground;

}, 500);
}