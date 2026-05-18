import { getCachedAudio } from "./tts-cache.js";

// ======================================
// Audio-Player State
// ======================================

let audio = null;
let currentHistoryId = null;
let isPlaying = false;

// DOM-Referenzen (werden bei Init gesetzt)
let playPauseButton = null;
let stopButton = null;
let seekBar = null;
let currentTimeDisplay = null;
let durationDisplay = null;
let playerContainer = null;

// ======================================
// Player initialisieren
// ======================================

export function initAudioPlayer() {
    playPauseButton = document.getElementById("playPauseButton");
    stopButton = document.getElementById("stopButton");
    seekBar = document.getElementById("audioSeekBar");
    currentTimeDisplay = document.getElementById("audioCurrentTime");
    durationDisplay = document.getElementById("audioDuration");
    playerContainer = document.getElementById("audioPlayerContainer");

    if (!playPauseButton) return;

    // Event-Listener
    playPauseButton.addEventListener("click", togglePlayPause);
    stopButton.addEventListener("click", stopAudio);
    seekBar.addEventListener("input", seek);
}

// ======================================
// Audio für einen History-Eintrag laden
// ======================================

export async function loadAudioForHistory(historyId) {
    // Wenn dasselbe Audio bereits geladen ist, nichts tun
    if (currentHistoryId === historyId && audio) {
        return;
    }

    // Altes Audio stoppen und aufräumen
    destroyAudio();

    const audioUrl = await getCachedAudio(historyId);

    if (audioUrl) {
        audio = new Audio(audioUrl);
        audio.preload = "auto";

        audio.addEventListener("loadedmetadata", () => {
            if (durationDisplay) {
                durationDisplay.textContent = formatTime(audio.duration);
            }
            if (seekBar) {
                seekBar.max = audio.duration;
            }
            if (playerContainer) {
                playerContainer.classList.remove("hidden");
            }
        });

        audio.addEventListener("timeupdate", () => {
            if (seekBar) {
                seekBar.value = audio.currentTime;
            }
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = formatTime(audio.currentTime);
            }
        });

        audio.addEventListener("ended", () => {
            isPlaying = false;
            updatePlayButton();
        });

        audio.addEventListener("error", () => {
            console.error("Audio-Fehler");
            destroyAudio();
        });

        currentHistoryId = historyId;

        if (playerContainer) {
            playerContainer.classList.remove("hidden");
        }
    }
}

// ======================================
// Player-Steuerung
// ======================================

function togglePlayPause() {
    if (!audio) return;

    if (isPlaying) {
        audio.pause();
    } else {
        audio.play().catch(err => {
            console.error("Audio konnte nicht abgespielt werden:", err);
        });
    }

    isPlaying = !isPlaying;
    updatePlayButton();
}

function stopAudio() {
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    isPlaying = false;
    updatePlayButton();

    if (seekBar) seekBar.value = 0;
    if (currentTimeDisplay) currentTimeDisplay.textContent = "0:00";
}

function seek() {
    if (!audio || !seekBar) return;
    audio.currentTime = parseFloat(seekBar.value);
}

function updatePlayButton() {
    if (!playPauseButton) return; // Guard: Button noch nicht initialisiert

    if (isPlaying) {
        playPauseButton.textContent = "⏸️";
        playPauseButton.title = "Pause";
    } else {
        playPauseButton.textContent = "▶️";
        playPauseButton.title = "Abspielen";
    }
}

// ======================================
// Audio zurücksetzen (bei neuem Satz)
// ======================================

export function resetPlayer() {
    destroyAudio();
    if (playerContainer) {
        playerContainer.classList.add("hidden");
    }
}

function destroyAudio() {
    if (audio) {
        audio.pause();
        audio.src = "";
        audio = null;
    }
    currentHistoryId = null;
    isPlaying = false;

    // updatePlayButton nur aufrufen, wenn Buttons bereits initialisiert sind
    if (playPauseButton) {
        updatePlayButton();
    }

    if (seekBar) seekBar.value = 0;
    if (currentTimeDisplay) currentTimeDisplay.textContent = "0:00";
    if (durationDisplay) durationDisplay.textContent = "0:00";
}

// ======================================
// Hilfsfunktion: Zeit formatieren
// ======================================

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}