// ======================================
// Anki Connect Plus Integration
// ======================================

const ANKI_CONNECT_URL = "http://localhost:8765";
const ANKI_VERSION = 6;

// ======================================
// Anki-Karte erstellen (Editor öffnen)
// ======================================

export async function createAnkiCard(sentence, word, audioBlob, lang) {
    try {
        // 1. Audio-Blob als Base64 kodieren
        const base64Audio = audioBlob ? await blobToBase64(audioBlob) : null;
        
        // 2. Dateiname für Audio generieren
        const filename = audioBlob 
            ? `anki_tts_${Date.now()}.mp3` 
            : null;
        
        // 3. Request-Payload bauen
        const payload = {
            action: "guiAddCards",
            params: {
                note: {
                    deckName: "Danish::Manuell",
                    modelName: "Danish",
                    fields: {
                        "Sentence": sentence,
                        "Word": word
                    },
                    audio: audioBlob ? [{
                        filename: filename,
                        data: base64Audio,
                        fields: ["Audio"]
                    }] : []
                }
            },
            version: ANKI_VERSION
        };
        
        // 4. Request senden
        const response = await fetch(ANKI_CONNECT_URL, {
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
            alert("⚠️ Anki ist nicht erreichbar.\n\nBitte stelle sicher, dass:\n• Anki geöffnet ist\n• Anki Connect Plus installiert ist\n• Kein anderes Programm Port 8765 blockiert");
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
        const response = await fetch(ANKI_CONNECT_URL, {
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