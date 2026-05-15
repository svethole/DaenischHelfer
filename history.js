import {
    historyList,
    sentenceField,
    wordField,
    toggleHistoryButton,
    downloadLink
} from "./dom.js";

import { getLangConfig } from "./config.js";
import { 
    loadHistory as loadHistoryFromDB,
    saveToHistory as saveToHistoryToDB,
    deleteHistoryEntry as deleteFromDB,
    getCachedAudio,
    hasAudio
} from "./tts-cache.js";

export async function loadHistory(
    validateForm,
    updatePreview,
    onHistoryClick = null
) {
    const history = await loadHistoryFromDB();

    historyList.innerHTML = "";

    history.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "historyItem";

        const langConfig = getLangConfig(entry.lang);
        const flag = langConfig ? langConfig.flag : "";

        item.innerHTML = `
        <div class="historyContent">
        <div class="historySentence">
        ${flag ? flag + " " : ""}${escapeHtml(entry.sentence)}
        </div>
        <div class="historyWord">
        ${escapeHtml(entry.word)}
        </div>
        <div class="historyTimestamp">
        ${entry.displayTimestamp || entry.timestamp}
        </div>
        </div>
        <button
        class="deleteHistoryButton"
        title="Eintrag löschen">
        🗑
        </button>
        `;

        item.querySelector(".historyContent").addEventListener("click", async () => {
            sentenceField.value = entry.sentence;
            wordField.value = entry.word;

            validateForm();
            updatePreview();
            sentenceField.focus();

            // Download-Button für diesen Eintrag aktualisieren
            await updateDownloadButton(entry.id, entry.sentence);
            
            // Callback für Sprach-Update
            if (onHistoryClick) {
                onHistoryClick(entry.lang);
            }
        });

        item.querySelector(".deleteHistoryButton").addEventListener("click", async (event) => {
            event.stopPropagation();
            await deleteHistoryEntry(entry.id, validateForm, updatePreview);
        });

        historyList.appendChild(item);
    });
}

async function updateDownloadButton(historyId, sentence) {
    // Prüfen, ob Audio für diesen Eintrag existiert
    const audioExists = await hasAudio(historyId);
    
    if (audioExists) {
        const audioUrl = await getCachedAudio(historyId);
        if (audioUrl) {
            downloadLink.href = audioUrl;
            downloadLink.download = `tts_${sanitizeFilename(sentence)}.mp3`;
            downloadLink.style.display = "inline-block";
        }
    } else {
        downloadLink.style.display = "none";
        downloadLink.href = "#";
    }
}

export async function saveToHistory(sentence, word, lang, validateForm, updatePreview) {
    await saveToHistoryToDB(sentence, word, lang);
    await loadHistory(validateForm, updatePreview);
}

export async function deleteHistoryEntry(id, validateForm, updatePreview) {
    await deleteFromDB(id);
    await loadHistory(validateForm, updatePreview);
}

export function updateHistoryVisibility() {
    const collapsed = localStorage.getItem("historyCollapsed") === "true";

    if (collapsed) {
        historyList.classList.add("historyCollapsed");
        toggleHistoryButton.textContent = "Letzte Anfragen zeigen";
    } else {
        historyList.classList.remove("historyCollapsed");
        toggleHistoryButton.textContent = "Letzte Anfragen verbergen";
    }
}

// Hilfsfunktionen
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeFilename(text) {
    return text.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}