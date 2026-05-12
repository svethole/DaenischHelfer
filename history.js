import {
    historyList,
    sentenceField,
    wordField,
    toggleHistoryButton
} from "./dom.js";

export function loadHistory(
    validateForm,
    updatePreview
) {

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

        item.className = "historyItem";

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

        item.querySelector(
            ".deleteHistoryButton"
        ).addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                deleteHistoryEntry(
                    index,
                    validateForm,
                    updatePreview
                );
            }
        );

        historyList.appendChild(item);
    });
}

export function saveToHistory(
    sentence,
    word,
    validateForm,
    updatePreview
) {

    const history =
    JSON.parse(
        localStorage.getItem(
            "anki_history"
        ) || "[]"
    );

    history.unshift({
        sentence,
        word,
        timestamp:
        new Date()
        .toLocaleString("de-DE")
    });

    localStorage.setItem(
        "anki_history",
        JSON.stringify(history.slice(0, 100))
    );

    loadHistory(
        validateForm,
        updatePreview
    );
}

export function deleteHistoryEntry(
    index,
    validateForm,
    updatePreview
) {

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

    loadHistory(
        validateForm,
        updatePreview
    );
}

export function updateHistoryVisibility() {

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

export async function clearAllHistory(validateForm, updatePreview) {
    await saveHistoryToNextcloud([]);
    await loadHistory(validateForm, updatePreview);
}