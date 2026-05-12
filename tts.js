import {
    downloadLink,
    ttsStatus,
    ttsDragContainer
} from "./dom.js";

import {
    hexToBytes,
    createTTSFilename
} from "./utils.js";

export async function generateTTS(
    sentenceRaw
) {

    // Dein bestehender generateTTS-Code
    ttsStatus.textContent =
    "TTS wird erzeugt ...";

downloadLink.style.display = "none";

try {

    const response = await fetch(
        "https://api.minimax.io/v1/t2a_v2",
        {
            method: "POST",

            headers: {
                "Authorization":
                "Bearer sk-api-A0P8J_zxo6IvyNjfjwrLs01_nazOwjE7X0EkipTw_IjSMh8TOVf0Fe53OD-TGFLFA9DPPiFbfJm2-LbfYx5VnJI8WeUu0Oysi-JhlkHXqj7X8o3awjPZiX0",

                "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

                model: "speech-2.8-hd",

                text: sentenceRaw,

                stream: false,

                voice_setting: {
                    voice_id:
                    "Danish_female_1_v1",

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

        throw new Error(
            "HTTP-Fehler: " +
            response.status
        );
    }

    const data = await response.json();

    if (!data.data.audio) {

        console.log(data);
        throw new Error(
            "Keine Audiodaten erhalten: "
        );
    }

    const bytes =
    hexToBytes(data.data.audio);

    const blob = new Blob(
        [bytes],
        { type: "audio/mpeg" }
    );

    const objectUrl =
    URL.createObjectURL(blob);

    downloadLink.href = objectUrl;

    const filename =
    createTTSFilename(sentenceRaw);

    downloadLink.download =
    filename;

    // ======================================
    // Drag-&-Drop-Link für Anki
    // ======================================

    ttsDragContainer.innerHTML = "";

    const dragLink =
    document.createElement("a");

    dragLink.href =
    objectUrl;

    dragLink.textContent =
        "TTS nach Anki ziehen";

            dragLink.className =
            "ttsDragLink";

            dragLink.download =
            filename;

            dragLink.draggable = true;

            ttsDragContainer.appendChild(
                dragLink
            );

            downloadLink.style.display =
            "inline-block";

            ttsStatus.textContent =
            "TTS erfolgreich erzeugt.";

    }

    catch (error) {

        console.error(error);

        ttsStatus.textContent =
        "Fehler beim Erzeugen der TTS-Datei.";
    }
}

export function hideTTSLinks() {

    downloadLink.style.display =
        "none";

    ttsDragContainer.innerHTML = "";

    ttsStatus.textContent = "";
}