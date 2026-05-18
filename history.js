import {
    historyList,
    historyListContainer,
    sentenceField,
    wordField,
    toggleHistoryButton,
    downloadLink,
    firstPageButton,
    prevPageButton,
    nextPageButton,
    lastPageButton,
    showAllButton,
    showDefaultButton,
    pageSizeSelect,
    customPageSize,
    pageSizeWarning,
    paginationInfo
} from "./dom.js";

import { getLangConfig } from "./config.js";
import {
    loadHistory as loadHistoryFromDB,
    saveToHistory as saveToHistoryToDB,
    deleteHistoryEntry as deleteFromDB,
    getCachedAudio,
    hasAudio
} from "./tts-cache.js";
import { escapeHtml, sanitizeFilename } from "./utils.js";
import { loadAudioForHistory } from "./audio-player.js";

// ======================================
// Pagination-State
// ======================================

const DEFAULT_PAGE_SIZE = 10;
let currentPage = 0;
let pageSize = DEFAULT_PAGE_SIZE;
let allHistoryEntries = [];
let isLoadingAll = false;
let isCustomMode = false;

// ======================================
// Initialisierung
// ======================================

export function initPagination() {
    // Event-Listener für Dropdown
    pageSizeSelect.addEventListener("change", () => {
        const value = pageSizeSelect.value;

        if (value === "custom") {
            // Benutzerdefiniert-Modus aktivieren
            isCustomMode = true;
            customPageSize.classList.remove("hidden");
            customPageSize.focus();
        } else if (value === "all") {
            // Alle anzeigen
            isCustomMode = false;
            customPageSize.classList.add("hidden");
            pageSizeWarning.classList.add("hidden");
            showAllEntries();
        } else {
            // Feste Größe
            isCustomMode = false;
            customPageSize.classList.add("hidden");
            pageSizeWarning.classList.add("hidden");
            pageSize = parseInt(value);
            currentPage = 0;
            isLoadingAll = false;
            renderCurrentPage();
            updateAllButtonLabels();
        }
    });

    // Event-Listener für benutzerdefinierte Eingabe
    customPageSize.addEventListener("input", () => {
        const value = customPageSize.value.trim();

        if (value === "") {
            pageSizeWarning.classList.add("hidden");
            customPageSize.classList.remove("error");
            return;
        }

        const num = parseInt(value);

        if (isNaN(num) || num < 1) {
            pageSizeWarning.classList.remove("hidden");
            customPageSize.classList.add("error");
        } else {
            pageSizeWarning.classList.add("hidden");
            customPageSize.classList.remove("error");
            pageSize = Math.min(num, allHistoryEntries.length);
            currentPage = 0;
            isLoadingAll = false;
            renderCurrentPage();
            updateAllButtonLabels();
        }
    });

    // Enter-Taste im Custom-Feld
    customPageSize.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const num = parseInt(customPageSize.value);
            if (!isNaN(num) && num >= 1) {
                pageSize = Math.min(num, allHistoryEntries.length);
                currentPage = 0;
                isLoadingAll = false;
                renderCurrentPage();
                updateAllButtonLabels();
            }
        }
    });
}

// ======================================
// History laden
// ======================================

export async function loadHistory(
    validateForm,
    updatePreview,
    onHistoryClick = null,
    resetPagination = true
) {
    allHistoryEntries = await loadHistoryFromDB();

    if (resetPagination) {
        currentPage = 0;
        isLoadingAll = false;
        pageSize = parseInt(pageSizeSelect.value) || DEFAULT_PAGE_SIZE;
        updateAllButtonLabels();
    }

    renderCurrentPage(validateForm, updatePreview, onHistoryClick);
    updatePaginationButtons();
    updatePaginationInfo();
}

function renderCurrentPage(validateForm, updatePreview, onHistoryClick) {
    historyList.innerHTML = "";

    let entriesToShow;

    if (isLoadingAll) {
        entriesToShow = allHistoryEntries;
    } else {
        const start = currentPage * pageSize;
        const end = start + pageSize;
        entriesToShow = allHistoryEntries.slice(start, end);
    }

    if (entriesToShow.length === 0) {
        historyList.innerHTML = '<div class="text-muted text-center mt-md">Keine Einträge vorhanden</div>';
        return;
    }

    entriesToShow.forEach((entry, arrayIndex) => {
        const item = document.createElement("div");
        item.className = "historyItem";

        const langConfig = getLangConfig(entry.lang);
        const flag = langConfig ? langConfig.flag : "";

        // Zähler berechnen (globale Position)
        const globalIndex = isLoadingAll
            ? arrayIndex + 1
            : (currentPage * pageSize) + arrayIndex + 1;

        item.innerHTML = `
        <span class="historyIndex">${globalIndex}</span>
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

            await updateDownloadButton(entry.id, entry.sentence);

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
// Button-Labels aktualisieren
// ======================================

function updateAllButtonLabels() {
    const label = isLoadingAll ? "Alle" : pageSize;
    const labels = document.querySelectorAll(".page-size-label");
    labels.forEach(el => {
        el.textContent = label;
    });

    // Nächste-Seite-Button: dynamische Anzahl
    if (!isLoadingAll) {
        const start = (currentPage + 1) * pageSize;
        const remaining = allHistoryEntries.length - start;
        const nextCount = Math.min(pageSize, Math.max(0, remaining));
        nextPageButton.querySelector(".page-size-label").textContent = nextCount || pageSize;
    }
}

// ======================================
// Button-Zustände aktualisieren
// ======================================

function updatePaginationButtons() {
    const total = allHistoryEntries.length;
    const totalPages = Math.ceil(total / pageSize);
    const isFirstPage = currentPage === 0;
    const isLastPage = currentPage >= totalPages - 1;

    // << Erste
    firstPageButton.disabled = isFirstPage || isLoadingAll || total === 0;

    // < Vorige
    prevPageButton.disabled = isFirstPage || isLoadingAll || total === 0;

    // Nächste >
    nextPageButton.disabled = isLastPage || isLoadingAll || total === 0;

    // Letzte >>
    lastPageButton.disabled = isLastPage || isLoadingAll || total === 0;

    // Alle anzeigen
    showAllButton.disabled = isLoadingAll || total <= pageSize;

    // Standardansicht
    const isDefaultView = !isLoadingAll && currentPage === 0 && pageSize === DEFAULT_PAGE_SIZE;
    showDefaultButton.disabled = isDefaultView || total === 0;
}

function updatePaginationInfo() {
    if (!paginationInfo) return;

    const total = allHistoryEntries.length;

    if (total === 0) {
        paginationInfo.textContent = "Keine Einträge";
        return;
    }

    if (isLoadingAll) {
        paginationInfo.textContent = `Alle ${total} Einträge`;
        return;
    }

    const start = currentPage * pageSize + 1;
    const end = Math.min(start + pageSize - 1, total);
    paginationInfo.textContent = `Zeige ${start}–${end} von ${total} Einträgen`;
}

// ======================================
// Pagination-Aktionen
// ======================================

export async function goToFirstPage(validateForm, updatePreview, onHistoryClick) {
    currentPage = 0;
    isLoadingAll = false;
    await loadHistory(validateForm, updatePreview, onHistoryClick, false);
}

export async function goToPrevPage(validateForm, updatePreview, onHistoryClick) {
    if (currentPage > 0) {
        currentPage--;
        isLoadingAll = false;
        await loadHistory(validateForm, updatePreview, onHistoryClick, false);
    }
}

export async function goToNextPage(validateForm, updatePreview, onHistoryClick) {
    const totalPages = Math.ceil(allHistoryEntries.length / pageSize);
    if (currentPage < totalPages - 1) {
        currentPage++;
        isLoadingAll = false;
        await loadHistory(validateForm, updatePreview, onHistoryClick, false);
    }
}

export async function goToLastPage(validateForm, updatePreview, onHistoryClick) {
    const totalPages = Math.ceil(allHistoryEntries.length / pageSize);
    currentPage = Math.max(0, totalPages - 1);
    isLoadingAll = false;
    await loadHistory(validateForm, updatePreview, onHistoryClick, false);
}

export async function showAllEntries() {
    isLoadingAll = true;
    currentPage = 0;

    // Dropdown auf "Alle" setzen
    pageSizeSelect.value = "all";
    customPageSize.classList.add("hidden");
    pageSizeWarning.classList.add("hidden");
    isCustomMode = false;

    updateAllButtonLabels();
    renderCurrentPage();
    updatePaginationButtons();
    updatePaginationInfo();
}

export async function showDefaultView(validateForm, updatePreview, onHistoryClick) {
    isLoadingAll = false;
    currentPage = 0;
    pageSize = DEFAULT_PAGE_SIZE;

    // Dropdown zurücksetzen
    pageSizeSelect.value = DEFAULT_PAGE_SIZE;
    customPageSize.classList.add("hidden");
    pageSizeWarning.classList.add("hidden");
    isCustomMode = false;

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
            // Audio-Player laden
            await loadAudioForHistory(historyId);
        }
    } else {
        // Player verstecken
        const { resetPlayer } = await import("./audio-player.js");
        resetPlayer();
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