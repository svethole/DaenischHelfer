// ======================================
// Zentrale Datenbank: History + TTS-Cache
// ======================================

const DB_NAME = "anki_data";
const DB_VERSION = 1;
const HISTORY_STORE = "history";
const AUDIO_STORE = "audio";
const MAX_HISTORY_ENTRIES = 100;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // History-Store (Index für Sprache)
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                const historyStore = db.createObjectStore(HISTORY_STORE, {
                    keyPath: "id",
                    autoIncrement: true,
                });
                historyStore.createIndex("lang", "lang", { unique: false });
                historyStore.createIndex("timestamp", "timestamp", { unique: false });
            }

            // Audio-Store
            if (!db.objectStoreNames.contains(AUDIO_STORE)) {
                db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ======================================
// HISTORY-FUNKTIONEN
// ======================================

export async function loadHistory() {
    try {
        const db = await openDB();
        const tx = db.transaction(HISTORY_STORE, "readonly");
        const store = tx.objectStore(HISTORY_STORE);
        const index = store.index("timestamp");

        const entries = await new Promise((resolve, reject) => {
            const request = index.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });

        // Neueste zuerst
        return entries.reverse();
    } catch (error) {
        console.error("Fehler beim Laden der History:", error);
        return [];
    }
}

export async function saveToHistory(sentence, word, lang) {
    try {
        const db = await openDB();
        const tx = db.transaction(HISTORY_STORE, "readwrite");
        const store = tx.objectStore(HISTORY_STORE);

        const entry = {
            sentence,
            word,
            lang,
            timestamp: Date.now(),
            displayTimestamp: new Date().toLocaleString("de-DE"),
        };

        await new Promise((resolve, reject) => {
            const request = store.add(entry);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Alte Einträge löschen
        await pruneHistory(db);
    } catch (error) {
        console.error("Fehler beim Speichern in History:", error);
    }
}

export async function deleteHistoryEntry(id) {
    try {
        const db = await openDB();
        const tx = db.transaction([HISTORY_STORE, AUDIO_STORE], "readwrite");
        const historyStore = tx.objectStore(HISTORY_STORE);
        const audioStore = tx.objectStore(AUDIO_STORE);

        // Eintrag löschen
        await new Promise((resolve, reject) => {
            const request = historyStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Zugehörige Audio-Datei löschen (falls vorhanden)
        const audioId = `audio_${id}`;
        await new Promise((resolve, reject) => {
            const request = audioStore.delete(audioId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Fehler beim Löschen:", error);
    }
}

export async function clearAllHistory() {
    try {
        const db = await openDB();
        const tx = db.transaction([HISTORY_STORE, AUDIO_STORE], "readwrite");

        await new Promise((resolve, reject) => {
            const request = tx.objectStore(HISTORY_STORE).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        await new Promise((resolve, reject) => {
            const request = tx.objectStore(AUDIO_STORE).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Fehler beim Löschen aller Daten:", error);
    }
}

async function pruneHistory(db) {
    const tx = db.transaction(HISTORY_STORE, "readwrite");
    const store = tx.objectStore(HISTORY_STORE);
    const index = store.index("timestamp");

    const allEntries = await new Promise((resolve) => {
        const request = index.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });

    if (allEntries.length > MAX_HISTORY_ENTRIES) {
        // Nach Zeitstempel sortieren (älteste zuerst)
        allEntries.sort((a, b) => a.timestamp - b.timestamp);

        // Überschüssige löschen (inkl. Audio)
        const toDelete = allEntries.slice(0, allEntries.length - MAX_HISTORY_ENTRIES);
        const audioStore = db.transaction(AUDIO_STORE, "readwrite").objectStore(AUDIO_STORE);

        for (const entry of toDelete) {
            store.delete(entry.id);
            audioStore.delete(`audio_${entry.id}`);
        }
    }
}

// ======================================
// AUDIO-FUNKTIONEN
// ======================================

export async function getCachedAudio(historyId) {
    try {
        const db = await openDB();
        const tx = db.transaction(AUDIO_STORE, "readonly");
        const store = tx.objectStore(AUDIO_STORE);

        const result = await new Promise((resolve, reject) => {
            const request = store.get(`audio_${historyId}`);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (result && result.blob) {
            return URL.createObjectURL(result.blob);
        }

        return null;
    } catch (error) {
        console.error("Cache-Lesefehler:", error);
        return null;
    }
}

export async function cacheAudio(historyId, blob) {
    try {
        const db = await openDB();
        const tx = db.transaction(AUDIO_STORE, "readwrite");
        const store = tx.objectStore(AUDIO_STORE);

        await new Promise((resolve, reject) => {
            const request = store.put({
                id: `audio_${historyId}`,
                blob,
                timestamp: Date.now(),
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Cache-Schreibfehler:", error);
    }
}

export async function hasAudio(historyId) {
    try {
        const db = await openDB();
        const tx = db.transaction(AUDIO_STORE, "readonly");
        const store = tx.objectStore(AUDIO_STORE);

        const result = await new Promise((resolve) => {
            const request = store.get(`audio_${historyId}`);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        return !!result;
    } catch (error) {
        return false;
    }
}
