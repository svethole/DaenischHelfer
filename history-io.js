import { loadHistory as loadHistoryFromDB, saveToHistory as saveToHistoryToDB, getCachedAudio, hasAudio } from "./tts-cache.js";
import { loadHistory } from "./history.js";
import { clearAllHistory } from "./tts-cache.js";

// ======================================
// History exportieren (als ZIP mit Audio)
// ======================================

export async function exportHistory() {
    try {
        const history = await loadHistoryFromDB();

        if (history.length === 0) {
            alert("Keine Einträge zum Exportieren vorhanden.");
            return;
        }

        // Nur die neuesten Einträge (max. 100) mit Audio exportieren
        const entriesWithAudio = [];
        const maxAudioEntries = 100;

        for (const entry of history) {
            if (entriesWithAudio.length >= maxAudioEntries) break;

            const audioBlob = await getCachedAudioAsBlob(entry.id);
            entriesWithAudio.push({
                entry: {
                    sentence: entry.sentence,
                    word: entry.word,
                    lang: entry.lang,
                    timestamp: entry.timestamp,
                    displayTimestamp: entry.displayTimestamp
                },
                hasAudio: !!audioBlob,
                audioBlob: audioBlob
            });
        }

        // Export-JSON erstellen (ohne Audio-Daten)
        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            entryCount: entriesWithAudio.length,
            entries: entriesWithAudio.map(e => ({
                ...e.entry,
                _hasAudio: e.hasAudio  // Marker für den Import
            }))
        };

        // ZIP erstellen
        const zip = new JSZip();

        // JSON-Datei hinzufügen
        const jsonString = JSON.stringify(exportData, null, 2);
        zip.file("anki-helfer-history.json", jsonString);

        // Audio-Dateien hinzufügen (in Unterordner)
        const audioFolder = zip.folder("audio");
        let audioCount = 0;

        for (const item of entriesWithAudio) {
            if (item.audioBlob) {
                // Dateiname: ID + Satzanfang (für Lesbarkeit)
                const safeName = item.entry.sentence
                .replace(/[^a-zA-Z0-9æøåäöüß ]/g, "")
                .trim()
                .substring(0, 30)
                .replace(/\s+/g, "_") || "audio";

                const filename = `${item.entry.timestamp}_${safeName}.mp3`;
                audioFolder.file(filename, item.audioBlob);
                audioCount++;
            }
        }

        // ZIP generieren
        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });

        const url = URL.createObjectURL(zipBlob);

        // Download auslösen
        const date = new Date().toISOString().slice(0, 10);
        const filename = `anki-helfer-backup-${date}.zip`;

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Statistik
        const jsonSize = (new Blob([jsonString]).size / 1024).toFixed(1);
        const zipSize = (zipBlob.size / 1024).toFixed(1);
        const reduction = ((1 - zipBlob.size / (new Blob([jsonString]).size + audioCount * 100 * 1024)) * 100).toFixed(0);

        console.log(`📤 Exportiert: ${entriesWithAudio.length} Einträge, ${audioCount} Audio-Dateien`);
        console.log(`   ZIP-Größe: ${zipSize} KB`);

    } catch (error) {
        console.error("Fehler beim Exportieren:", error);
        alert("Fehler beim Exportieren der History.");
    }
}

// ======================================
// Audio-Blob aus IndexedDB als Blob holen
// ======================================

async function getCachedAudioAsBlob(historyId) {
    try {
        const audioUrl = await getCachedAudio(historyId);
        if (!audioUrl) return null;

        const response = await fetch(audioUrl);
        return await response.blob();
    } catch (error) {
        return null;
    }
}

// ======================================
// History importieren (aus ZIP-Datei)
// ======================================

export async function importHistory(file, validateForm, updatePreview, onHistoryClick) {
    try {
        const filename = file.name.toLowerCase();
        if (!filename.endsWith(".zip") && !filename.endsWith(".json")) {
            alert("Bitte eine .zip- oder .json-Datei auswählen.");
            return;
        }

        let importData;
        let audioFiles = {};  // Map: timestamp_safename.mp3 → Blob

        if (filename.endsWith(".zip")) {
            // ZIP extrahieren
            const zip = await JSZip.loadAsync(file);

            // JSON-Datei finden
            const jsonFile = zip.file("anki-helfer-history.json");
            if (!jsonFile) {
                throw new Error("Keine 'anki-helfer-history.json' im ZIP-Archiv gefunden.");
            }

            const jsonText = await jsonFile.async("text");
            importData = JSON.parse(jsonText);

            // Audio-Dateien extrahieren
            const audioFolder = zip.folder("audio");
            if (audioFolder) {
                const audioFileNames = Object.keys(zip.files).filter(name =>
                name.startsWith("audio/") && !name.endsWith("/")
                );

                for (const name of audioFileNames) {
                    const audioBlob = await zip.file(name).async("blob");
                    const shortName = name.replace("audio/", "");
                    audioFiles[shortName] = audioBlob;
                }
            }

            console.log(`   ${Object.keys(audioFiles).length} Audio-Dateien im ZIP gefunden.`);
        } else {
            // Direkt JSON (kein Audio)
            const text = await file.text();
            importData = JSON.parse(text);
        }

        // Validierung
        if (!importData.entries || !Array.isArray(importData.entries)) {
            throw new Error("Ungültiges Dateiformat: 'entries'-Array fehlt.");
        }

        if (importData.entries.length === 0) {
            alert("Die Datei enthält keine Einträge.");
            return;
        }

        // Bestätigung
        const audioInfo = Object.keys(audioFiles).length > 0
        ? ` (inkl. ${Object.keys(audioFiles).length} Audio-Dateien)`
        : "";

        const action = confirm(
            `Möchtest du die importierten Einträge...\n\n` +
            `• Mit "OK" zur bestehenden History hinzufügen\n` +
            `• Mit "Abbrechen" die bestehende History ersetzen?\n\n` +
            `${importData.entries.length} Einträge${audioInfo} in der Import-Datei.`
        );

        if (!action) {
            await clearAllHistory();
        }

        // Einträge importieren (älteste zuerst, damit Reihenfolge stimmt)
        const entries = importData.entries.reverse();
        let importedCount = 0;
        let importedAudioCount = 0;

        for (const entry of entries) {
            if (entry.sentence && entry.word && entry.lang) {
                // History-Eintrag mit ORIGINAL-Timestamps speichern
                const entryId = await saveToHistoryWithReturn(
                    entry.sentence,
                    entry.word,
                    entry.lang,
                    entry.timestamp,           // ← Original-Timestamp
                    entry.displayTimestamp     // ← Original-Anzeige-Timestamp
                );

                // Audio zuordnen (falls vorhanden)
                if (entry._hasAudio && entryId) {
                    const matchingAudio = findMatchingAudio(entry, audioFiles);
                    if (matchingAudio) {
                        await cacheAudioFromImport(entryId, matchingAudio);
                        importedAudioCount++;
                    }
                }

                importedCount++;
            }
        }

        console.log(`📥 ${importedCount} Einträge importiert, ${importedAudioCount} Audio-Dateien wiederhergestellt.`);
        await loadHistory(validateForm, updatePreview, onHistoryClick);

        alert(`${importedCount} Einträge erfolgreich importiert.\n${importedAudioCount} Audio-Dateien wiederhergestellt.`);

    } catch (error) {
        console.error("Fehler beim Importieren:", error);
        alert("Fehler beim Importieren. Bitte stelle sicher, dass die Datei gültig ist.");
    }
}

// ======================================
// Hilfsfunktion: Audio-Datei zu Eintrag finden
// ======================================

function findMatchingAudio(entry, audioFiles) {
    const safeName = entry.sentence
    .replace(/[^a-zA-Z0-9æøåäöüß ]/g, "")
    .trim()
    .substring(0, 30)
    .replace(/\s+/g, "_") || "audio";

    const expectedName = `${entry.timestamp}_${safeName}.mp3`;

    // Direkter Match
    if (audioFiles[expectedName]) {
        return audioFiles[expectedName];
    }

    // Fallback: Suche nach Datei mit passendem Timestamp
    for (const [name, blob] of Object.entries(audioFiles)) {
        if (name.startsWith(entry.timestamp)) {
            return blob;
        }
    }

    return null;
}

// ======================================
// Hilfsfunktion: Eintrag speichern mit ID-Rückgabe
// (Original-Timestamps bleiben erhalten)
// ======================================

async function saveToHistoryWithReturn(sentence, word, lang, originalTimestamp, originalDisplayTimestamp) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("anki_data", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const tx = db.transaction("history", "readwrite");
            const store = tx.objectStore("history");

            const entry = {
                sentence,
                word,
                lang,
                timestamp: originalTimestamp || Date.now(),
                       displayTimestamp: originalDisplayTimestamp || new Date().toLocaleString("de-DE")
            };

            const addRequest = store.add(entry);
            addRequest.onsuccess = () => resolve(addRequest.result);
            addRequest.onerror = () => reject(addRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// ======================================
// Hilfsfunktion: Audio aus Import in Cache speichern
// ======================================

async function cacheAudioFromImport(historyId, blob) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("anki_data", 1);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const tx = db.transaction("audio", "readwrite");
            const store = tx.objectStore("audio");

            const putRequest = store.put({
                id: `audio_${historyId}`,
                blob,
                timestamp: Date.now()
            });

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

// ======================================
// File-Input-Listener einrichten
// ======================================

export function initHistoryIO(validateForm, updatePreview, onHistoryClick) {
    const exportButton = document.getElementById("exportHistoryButton");
    const importButton = document.getElementById("importHistoryButton");
    const fileInput = document.getElementById("importFileInput");

    if (exportButton) {
        exportButton.addEventListener("click", exportHistory);
    }

    if (importButton && fileInput) {
        importButton.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
                importHistory(file, validateForm, updatePreview, onHistoryClick);
                fileInput.value = "";
            }
        });
    }
}