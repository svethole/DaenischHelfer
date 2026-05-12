const form = document.getElementById("ankiForm");
const sentenceField = document.getElementById("sentence");
const wordField = document.getElementById("word");
const startButton = document.getElementById("startButton");
const preview = document.getElementById("preview");

const copySentenceButton =
document.getElementById("copySentence");

const copyWordButton =
document.getElementById("copyWord");

const clearButton =
document.getElementById("clearButton");

const downloadLink =
document.getElementById("downloadLink");

const ttsStatus =
document.getElementById("ttsStatus");

const historyList =
document.getElementById("historyList");

const clearHistoryButton =
    document.getElementById(
        "clearHistoryButton"
    );

const toggleHistoryButton =
    document.getElementById(
        "toggleHistoryButton"
    );

const ttsDragContainer =
    document.getElementById(
        "ttsDragContainer"
    );

const enableTTS =
    document.getElementById(
        "enableTTS"
    );

// ======================================
// Letzte Eingaben laden
// ======================================

sentenceField.value =
localStorage.getItem("anki_sentence") || "";

wordField.value =
localStorage.getItem("anki_word") || "";


// ======================================
// Formular validieren
// ======================================

function validateForm() {

    const sentenceFilled =
    sentenceField.value.trim() !== "";

    const wordFilled =
    wordField.value.trim() !== "";

    startButton.disabled =
    !(sentenceFilled && wordFilled);

    loadHistory();
    updateHistoryVisibility();

    updatePreview();
}


// ======================================
// Vorschau mit Hervorhebung
// ======================================

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updatePreview() {

    const sentence = sentenceField.value;
    const word = wordField.value.trim();

    if (!sentence || !word) {
        preview.innerHTML = "";
        return;
    }

    const regex =
    new RegExp(`(${escapeRegExp(word)})`, "gi");

    const highlighted =
    sentence.replace(
        regex,
        '<span class="highlight">$1</span>'
    );

    preview.innerHTML = highlighted;
}

function hexToBytes(hex) {

    const bytes = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {

        bytes[i / 2] =
        parseInt(hex.substr(i, 2), 16);

    }

    return bytes;
}

function transliterateToAscii(text) {

    return text

    // Dänische Zeichen ersetzen
    .replace(/æ/gi, "ae")
    .replace(/ø/gi, "oe")
    .replace(/å/gi, "aa")

    // Umlaute
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")

    // Unicode normalisieren
    .normalize("NFD")

    // Diakritika entfernen
    .replace(/[\u0300-\u036f]/g, "")

    // Alles außer ASCII-Buchstaben/Zahlen/_ entfernen
    .replace(/[^a-zA-Z0-9 ]/g, "")

    // Mehrfache Leerzeichen reduzieren
    .replace(/\s+/g, " ")

    .trim();
}



function generateRandomString(length = 8) {

    const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    for (let i = 0; i < length; i++) {

        result +=
        chars.charAt(
            Math.floor(Math.random() * chars.length)
        );
    }

    return result;
}

function createTTSFilename(sentence) {

    // Erste drei Wörter
    const firstWords =
    transliterateToAscii(sentence)
    .split(" ")
    .slice(0, 3)
    .join("_");

    // Timestamp
    const now = new Date();

    const timestamp =
    now.getFullYear().toString() +

    String(now.getMonth() + 1)
    .padStart(2, "0") +

    String(now.getDate())
    .padStart(2, "0") +

    "_" +

    String(now.getHours())
    .padStart(2, "0") +

    String(now.getMinutes())
    .padStart(2, "0") +

    String(now.getSeconds())
    .padStart(2, "0");

    // Zufallsstring
    const randomPart =
    generateRandomString(8);

    return `${firstWords}_${timestamp}_${randomPart}.mp3`;
}

async function generateTTS(sentenceRaw) {

    ttsStatus.textContent =
    "TTS wird erzeugt ...";

    downloadLink.style.display = "none";

    try {

        const response = await fetch(
            "https://api.minimax.io/v1/t2a_v2",
            {
                method: "POST",

                headers: {
                    "Authorization":
                    "Bearer sk-api-A0P8J_zxo6IvyNjfjwrLs01_nazOwjE7X0EkipTw_IjSMh8TOVf0Fe53OD-TGFLFA9DPPiFbfJm2-LbfYx5VnJI8WeUu0Oysi-JhlkHXqj7X8o3awjPZiX0",

                    "Content-Type":
                    "application/json"
                },

                body: JSON.stringify({

                    model: "speech-2.8-hd",

                    text: sentenceRaw,

                    stream: false,

                    voice_setting: {
                        voice_id:
                        "Danish_female_1_v1",

                        speed: 1,
                        vol: 1,
                        pitch: 0
                    },

                    audio_setting: {
                        sample_rate: 32000,
                        bitrate: 128000,
                        format: "mp3",
                            channel: 1
                    },

                    language_boost: "auto",

                    voice_modify: {
                        pitch: 0,
                        intensity: 0,
                        timbre: 0
                    },

                    output_format: "hex"

                })

            }
        );

        if (!response.ok) {

            throw new Error(
                "HTTP-Fehler: " +
                response.status
            );
        }

        const data = await response.json();

        if (!data.data.audio) {

            console.log(data);
            throw new Error(
                "Keine Audiodaten erhalten: "
            );
        }

        const bytes =
        hexToBytes(data.data.audio);

        const blob = new Blob(
            [bytes],
            { type: "audio/mpeg" }
        );

        const objectUrl =
        URL.createObjectURL(blob);

        downloadLink.href = objectUrl;

        const filename =
        createTTSFilename(sentenceRaw);

        downloadLink.download =
        filename;

        // ======================================
        // Drag-&-Drop-Link für Anki
        // ======================================

        ttsDragContainer.innerHTML = "";

        const dragLink =
        document.createElement("a");

        dragLink.href =
        objectUrl;

        dragLink.textContent =
        "TTS nach Anki ziehen";

            dragLink.className =
            "ttsDragLink";

            dragLink.download =
            filename;

            dragLink.draggable = true;

            ttsDragContainer.appendChild(
                dragLink
            );

            downloadLink.style.display =
            "inline-block";

            ttsStatus.textContent =
            "TTS erfolgreich erzeugt.";

    }

    catch (error) {

        console.error(error);

        ttsStatus.textContent =
        "Fehler beim Erzeugen der TTS-Datei.";
    }
}

// ======================================
// Historie
// ======================================

function loadHistory() {

    const history =
    JSON.parse(
        localStorage.getItem(
            "anki_history"
        ) || "[]"
    );

    historyList.innerHTML = "";

    history.forEach((entry, index) => {

        const item =
        document.createElement("div");

        item.className =
        "historyItem";

        item.innerHTML = `

        <div class="historyContent">

        <div class="historySentence">
        ${entry.sentence}
        </div>

        <div class="historyWord">
        ${entry.word}
        </div>

        <div class="historyTimestamp">
        ${entry.timestamp}
        </div>

        </div>

        <button
        class="deleteHistoryButton"
        title="Eintrag löschen">

        🗑

        </button>
        `;

        // ==================================
        // Klick auf Eintrag
        // ==================================

        item.querySelector(
            ".historyContent"
        ).addEventListener(
            "click",
            () => {

                sentenceField.value =
                entry.sentence;

                wordField.value =
                entry.word;

                validateForm();

                updatePreview();

                sentenceField.focus();
            }
        );



        // ==================================
        // Löschen
        // ==================================

        item.querySelector(
            ".deleteHistoryButton"
        ).addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                deleteHistoryEntry(index);
            }
        );

        historyList.appendChild(item);

    });

}

function saveToHistory(sentence, word) {

    const history =
    JSON.parse(
        localStorage.getItem(
            "anki_history"
        ) || "[]"
    );

    const now = new Date();

    const timestamp =
    now.toLocaleString("de-DE");

    history.unshift({
        sentence,
        word,
        timestamp
    });

    // Nur letzte 100 behalten
    const trimmedHistory =
    history.slice(0, 100);

    localStorage.setItem(
        "anki_history",
        JSON.stringify(trimmedHistory)
    );

    loadHistory();
}

function deleteHistoryEntry(index) {

    const history =
    JSON.parse(
        localStorage.getItem(
            "anki_history"
        ) || "[]"
    );

    history.splice(index, 1);

    localStorage.setItem(
        "anki_history",
        JSON.stringify(history)
    );

    loadHistory();
}

// ======================================
// History ein-/ausklappen
// ======================================

function updateHistoryVisibility() {

    const collapsed =
    localStorage.getItem(
        "historyCollapsed"
    ) === "true";

    if (collapsed) {

        historyList.classList.add(
            "historyCollapsed"
        );

        toggleHistoryButton.textContent =
        "Letzte Anfragen zeigen";

    } else {

        historyList.classList.remove(
            "historyCollapsed"
        );

        toggleHistoryButton.textContent =
        "Letzte Anfragen verbergen";
    }
}



toggleHistoryButton.addEventListener(
    "click",
    () => {

        const collapsed =
        localStorage.getItem(
            "historyCollapsed"
        ) === "true";

        localStorage.setItem(
            "historyCollapsed",
            (!collapsed).toString()
        );

        updateHistoryVisibility();
    }
);

function hideTTSLinks() {

    downloadLink.style.display =
    "none";

    ttsDragContainer.innerHTML = "";

    ttsStatus.textContent = "";
}

// ======================================
// Event Listener
// ======================================

sentenceField.addEventListener("input", () => {

    localStorage.setItem(
        "anki_sentence",
        sentenceField.value
    );

    validateForm();
});

// ======================================
// Doppelklick auf Wort im Satz
// ======================================

sentenceField.addEventListener("dblclick", () => {

    const start =
    sentenceField.selectionStart;

    const end =
    sentenceField.selectionEnd;

    const selectedText =
    sentenceField.value
    .substring(start, end)
    .trim();

    if (selectedText.length > 0) {

        wordField.value = selectedText;

        localStorage.setItem(
            "anki_word",
            selectedText
        );

        validateForm();
    }

});

wordField.addEventListener("input", () => {

    localStorage.setItem(
        "anki_word",
        wordField.value
    );

    validateForm();
});

// ======================================
// Kopierfunktionen
// ======================================

function flashCopyButton(button) {

    const originalBackground =
    button.style.background;

    button.style.background = "#2e7d32";

    setTimeout(() => {

        button.style.background =
        originalBackground;

    }, 500);
}


copySentenceButton.addEventListener(
    "click",
    async () => {

        await navigator.clipboard.writeText(
            sentenceField.value
        );

        flashCopyButton(copySentenceButton);
    }
);


copyWordButton.addEventListener(
    "click",
    async () => {

        await navigator.clipboard.writeText(
            wordField.value
        );

        flashCopyButton(copyWordButton);
    }
);

// ======================================
// Alles löschen
// ======================================

clearButton.addEventListener("click", () => {

    sentenceField.value = "";
    wordField.value = "";

    preview.innerHTML = "";

    validateForm();

    sentenceField.focus();

});

// ======================================
// Verlauf löschen
// ======================================

clearHistoryButton.addEventListener(
    "click",
    () => {

        if (
            confirm(
                "Verlauf wirklich löschen?"
            )
        ) {

            localStorage.removeItem(
                "anki_history"
            );

            loadHistory();
        }
    }
);

enableTTS.addEventListener(
    "change",
    () => {

        if (!enableTTS.checked) {

            hideTTSLinks();
        }
    }
);

// ======================================
// Start
// ======================================

form.addEventListener("submit", function(event) {

    event.preventDefault();

    const sentenceRaw =
    sentenceField.value.trim();

    const wordRaw =
    wordField.value.trim();

    saveToHistory(
        sentenceRaw,
        wordRaw
    );

    const sentence =
    encodeURIComponent(sentenceRaw);

    const word =
    encodeURIComponent(wordRaw);


    // ==================================
    // Browser-TTS
    // ==================================

    if (enableTTS.checked) {

        generateTTS(sentenceRaw);

    } else {

        hideTTSLinks();
    }


    // ==================================
    // URLs
    // ==================================

    const deeplUrl =
    `https://www.deepl.com/translator#da/de/${sentence}`;

    const ordnetUrl =
    `https://ordnet.dk/ddo/ordbog?query=${word}`;

    const langenscheidtUrl =
    `https://de.langenscheidt.com/daenisch-deutsch/${word}`;

    const forvoUrl =
    `https://forvo.com/search/${word}/da/`;

    const imageSearchUrl =
    `https://www.google.com/search?tbm=isch&q=${word}`;

    const urls = [
        deeplUrl,
        ordnetUrl,
        langenscheidtUrl,
        forvoUrl,
        imageSearchUrl
    ];

    urls.forEach(url => {
        window.open(url, "_blank");
    });

});


// Initialisierung
validateForm();