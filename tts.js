import {
    downloadLink,
    ttsStatus,
    ttsDragContainer
} from "./dom.js";

import {
    hexToBytes,
    createTTSFilename
} from "./utils.js";

import { getApiKey, getTTSConfig, getActiveLang } from "./config.js";

export async function generateTTS(sentenceRaw) {
    
    ttsStatus.textContent = "TTS wird erzeugt ...";
    downloadLink.style.display = "none";
    
    const ttsConfig = getTTSConfig();
    const apiKey = getApiKey();
    
    if (!ttsConfig) {
        ttsStatus.textContent = "Fehler: Keine TTS-Konfiguration gefunden.";
        return;
    }
    
    try {
        const response = await fetch(
            "https://api.minimax.io/v1/t2a_v2",
            {
                method: "POST",
                
                headers: {
                    "Authorization": "Bearer " + apiKey,
                    "Content-Type": "application/json"
                },
                
                body: JSON.stringify({
                    model: ttsConfig.model,
                    text: sentenceRaw,
                    stream: false,
                    
                    voice_setting: {
                        voice_id: ttsConfig.voiceId,
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
            throw new Error("HTTP-Fehler: " + response.status);
        }
        
        const data = await response.json();
        
        if (!data.data.audio) {
            console.log(data);
            throw new Error("Keine Audiodaten erhalten");
        }
        
        const bytes = hexToBytes(data.data.audio);
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const objectUrl = URL.createObjectURL(blob);
        
        downloadLink.href = objectUrl;
        
        const filename = createTTSFilename(sentenceRaw);
        downloadLink.download = filename;
        
        // Drag-&-Drop-Link für Anki
        ttsDragContainer.innerHTML = "";
        
        const dragLink = document.createElement("a");
        dragLink.href = objectUrl;
        dragLink.textContent = "TTS nach Anki ziehen";
        dragLink.className = "ttsDragLink";
        dragLink.download = filename;
        dragLink.draggable = true;
        
        ttsDragContainer.appendChild(dragLink);
        
        downloadLink.style.display = "inline-block";
        ttsStatus.textContent = "TTS erfolgreich erzeugt.";
        
    } catch (error) {
        console.error(error);
        ttsStatus.textContent = "Fehler beim Erzeugen der TTS-Datei.";
    }
}

export function hideTTSLinks() {
    downloadLink.style.display = "none";
    ttsDragContainer.innerHTML = "";
    ttsStatus.textContent = "";
}