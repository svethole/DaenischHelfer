// ======================================
// TTS-Cache mit IndexedDB
// ======================================

const DB_NAME = "anki_tts_cache";
const DB_VERSION = 1;
const STORE_NAME = "audioFiles";
const MAX_CACHE_ENTRIES = 20;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ======================================
// Cache prüfen
// ======================================

export async function getCachedAudio(id) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        
        const result = await new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        
        if (result && result.blob) {
            // Timestamp aktualisieren (für LRU)
            await updateTimestamp(db, id);
            return URL.createObjectURL(result.blob);
        }
        
        return null;
    } catch (error) {
        console.error("Cache-Lesefehler:", error);
        return null;
    }
}

// ======================================
// Audio speichern
// ======================================

export async function cacheAudio(id, blob) {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        
        await new Promise((resolve, reject) => {
            const request = store.put({
                id,
                blob,
                timestamp: Date.now()
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        
        // Alte Einträge löschen
        await pruneCache(db);
        
    } catch (error) {
        console.error("Cache-Schreibfehler:", error);
    }
}

// ======================================
// Timestamp aktualisieren (für LRU)
// ======================================

async function updateTimestamp(db, id) {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    const result = await new Promise((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
    
    if (result) {
        result.timestamp = Date.now();
        store.put(result);
    }
}

// ======================================
// Cache bereinigen (älteste Einträge löschen)
// ======================================

async function pruneCache(db) {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    const allEntries = await new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
    });
    
    if (allEntries.length > MAX_CACHE_ENTRIES) {
        // Nach Zeitstempel sortieren (älteste zuerst)
        allEntries.sort((a, b) => a.timestamp - b.timestamp);
        
        // Überschüssige löschen
        const toDelete = allEntries.slice(0, allEntries.length - MAX_CACHE_ENTRIES);
        
        for (const entry of toDelete) {
            store.delete(entry.id);
        }
        
        console.log(`🧹 Cache bereinigt: ${toDelete.length} alte Einträge gelöscht`);
    }
}

// ======================================
// Cache-Statistik (optional, für Debugging)
// ======================================

export async function getCacheStats() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        
        const allEntries = await new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
        
        let totalSize = 0;
        allEntries.forEach(entry => {
            totalSize += entry.blob.size;
        });
        
        return {
            entries: allEntries.length,
            totalSizeKB: Math.round(totalSize / 1024),
            maxEntries: MAX_CACHE_ENTRIES
        };
    } catch (error) {
        return { entries: 0, totalSizeKB: 0, maxEntries: MAX_CACHE_ENTRIES };
    }
}