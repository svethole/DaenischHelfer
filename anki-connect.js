import { getAnkiConfig, getActiveLang, getAnkiPort } from "./config.js";


// ======================================
// Anki Connect Plus Integration
// ======================================
function getAnkiUrl() {
    return `http://localhost:${getAnkiPort()}`;
}

const ANKI_VERSION = 6;

// ======================================
// Anki-Karte erstellen (Editor öffnen)
// ======================================

export async function createAnkiCard(sentence, word, audioBlob, lang) {
    try {
        const ankiConfig = getAnkiConfig();
        
        if (!ankiConfig) {
            alert("⚠️ Keine Anki-Konfiguration für die aktive Sprache gefunden.");
            return false;
        }
        
        // 1. Audio-Blob als Base64 kodieren
        const base64Audio = audioBlob ? await blobToBase64(audioBlob) : null;
        
        // 2. Dateiname für Audio generieren
        const filename = audioBlob 
            ? `anki_tts_${Date.now()}.mp3` 
            : null;
        
        // 3. Felder dynamisch befüllen
        const fields = {};
        fields[ankiConfig.fields.sentence] = sentence;
        fields[ankiConfig.fields.word] = word;
        
        // 4. Request-Payload bauen
        const payload = {
            action: "guiAddCards",
            params: {
                note: {
                    deckName: ankiConfig.deck,
                    modelName: ankiConfig.model,
                    fields: fields,
                    audio: audioBlob ? [{
                        filename: filename,
                        data: base64Audio,
                        fields: [ankiConfig.fields.audio]
                    }] : []
                }
            },
            version: ANKI_VERSION
        };
        
        // 5. Request senden
        const response = await fetch(getAnkiUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        console.log("✅ Anki-Karte erstellt:", result.result);
        return true;
        
    } catch (error) {
        console.error("❌ Anki-Fehler:", error.message);
        
        // Benutzerfreundliche Fehlermeldung
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
            alert("⚠️ Anki ist nicht erreichbar.\n\nBitte stelle sicher, dass:\n• Anki geöffnet ist\n• Anki Connect Plus installiert ist");
        } else if (error.message.includes("model was not found")) {
            const cfg = getAnkiConfig();
            alert(`⚠️ Notiztyp nicht gefunden: "${cfg?.model}"\n\nBitte prüfe den Namen in der api-config.js`);
        } else if (error.message.includes("deck was not found")) {
            const cfg = getAnkiConfig();
            alert(`⚠️ Deck nicht gefunden: "${cfg?.deck}"\n\nBitte prüfe den Namen in der api-config.js`);
        } else {
            alert(`⚠️ Fehler beim Erstellen der Anki-Karte:\n\n${error.message}`);
        }
        
        return false;
    }
}

// ======================================
// Anki-Verbindung testen
// ======================================

export async function testAnkiConnection() {
    try {
        const response = await fetch(getAnkiUrl(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "version",
                version: ANKI_VERSION
            })
        });
        
        if (!response.ok) return false;
        
        const result = await response.json();
        return result.error === null;
        
    } catch (error) {
        return false;
    }
}

// ======================================
// Hilfsfunktion: Blob → Base64
// ======================================

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // "data:audio/mpeg;base64,..." → nur den Base64-Teil
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}