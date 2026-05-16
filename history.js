import {
    historyList,
    historyListContainer,
    sentenceField,
    wordField,
    toggleHistoryButton,
    downloadLink,
    loadMoreButton,
    showAllButton,
    showDefaultButton
} from "./dom.js";

import { getLangConfig } from "./config.js";
import {
    loadHistory as loadHistoryFromDB,
    saveToHistory as saveToHistoryToDB,
    deleteHistoryEntry as deleteFromDB,
    getCachedAudio,
    hasAudio
} from "./tts-cache.js";

// ======================================
// Pagination-State
// ======================================

const DEFAULT_PAGE_SIZE = 10;
let currentOffset = 0;
let allHistoryEntries = [];
let isLoadingAll = false;

// ======================================
// History laden (mit Pagination)
// ======================================

export async function loadHistory(
    validateForm,
    updatePreview,
    onHistoryClick = null,
    resetPagination = true
) {
    // Daten aus DB holen
    allHistoryEntries = await loadHistoryFromDB();

    if (resetPagination) {
        currentOffset = 0;
        isLoadingAll = false;
    }

    renderHistory(validateForm, updatePreview, onHistoryClick);
    updatePaginationButtons();
}

function renderHistory(validateForm, updatePreview, onHistoryClick) {
    historyList.innerHTML = "";

    // Welche Einträge anzeigen?
    let entriesToShow;

    if (isLoadingAll) {
        entriesToShow = allHistoryEntries;
    } else {
        entriesToShow = allHistoryEntries.slice(0, currentOffset + DEFAULT_PAGE_SIZE);
    }

    if (entriesToShow.length === 0) {
        historyList.innerHTML = '<div class="text-muted text-center mt-md">Keine Einträge vorhanden</div>';
        return;
    }

    entriesToShow.forEach((entry) => {
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
            await deleteHistoryEntry(entry.id, validateForm, updatePreview, onHistoryClick);
        });

        historyList.appendChild(item);
    });
}

// ======================================
// Pagination-Buttons aktualisieren
// ======================================

function updatePaginationButtons() {
    const total = allHistoryEntries.length;
    const shown = isLoadingAll ? total : Math.min(currentOffset + DEFAULT_PAGE_SIZE, total);
    const remaining = total - shown;

    // "Nächste 10" Button
    if (loadMoreButton) {
        if (isLoadingAll || remaining <= 0) {
            loadMoreButton.disabled = true;
            loadMoreButton.textContent = "Nächste 10";
        } else {
            loadMoreButton.disabled = false;
            const nextCount = Math.min(remaining, DEFAULT_PAGE_SIZE);
            loadMoreButton.textContent = `Nächste ${nextCount}`;
        }
    }

    // "Alle anzeigen" Button
    if (showAllButton) {
        showAllButton.disabled = isLoadingAll || total <= DEFAULT_PAGE_SIZE;
    }

    // "Standardansicht" Button
    if (showDefaultButton) {
        // Deaktiviert, wenn: nur Standardansicht aktiv oder total <= 10
        const isDefaultView = !isLoadingAll && currentOffset === 0;
        showDefaultButton.disabled = isDefaultView || total <= DEFAULT_PAGE_SIZE;
    }
}

// ======================================
// Pagination-Aktionen
// ======================================

export async function loadMore(validateForm, updatePreview, onHistoryClick) {
    if (isLoadingAll) return;

    currentOffset += DEFAULT_PAGE_SIZE;
    await loadHistory(validateForm, updatePreview, onHistoryClick, false);
}

export async function showAll(validateForm, updatePreview, onHistoryClick) {
    isLoadingAll = true;
    currentOffset = 0;
    await loadHistory(validateForm, updatePreview, onHistoryClick, false);
}

export async function showDefault(validateForm, updatePreview, onHistoryClick) {
    isLoadingAll = false;
    currentOffset = 0;
    await loadHistory(validateForm, updatePreview, onHistoryClick, false);
}

// ======================================
// Download-Button
// ======================================

async function updateDownloadButton(historyId, sentence) {
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

// ======================================
// CRUD-Operationen
// ======================================

export async function saveToHistory(sentence, word, lang, validateForm, updatePreview) {
    await saveToHistoryToDB(sentence, word, lang);
    await loadHistory(validateForm, updatePreview);
}

export async function deleteHistoryEntry(id, validateForm, updatePreview, onHistoryClick) {
    await deleteFromDB(id);
    await loadHistory(validateForm, updatePreview, onHistoryClick);
}

// ======================================
// History ein-/ausklappen
// ======================================

export function updateHistoryVisibility() {
    const collapsed = localStorage.getItem("historyCollapsed") === "true";

    if (collapsed) {
        historyListContainer.classList.add("historyCollapsed");
        toggleHistoryButton.textContent = "Letzte Anfragen zeigen";
    } else {
        historyListContainer.classList.remove("historyCollapsed");
        toggleHistoryButton.textContent = "Letzte Anfragen verbergen";
    }
}

// ======================================
// Hilfsfunktionen
// ======================================

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeFilename(text) {
    return text.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}