import { getAllLangs, CONFIG as apiConfig } from "./config.js";
import { loadHistory as loadHistoryFromDB } from "./tts-cache.js";

// ======================================
// Overlay erstellen und verwalten
// ======================================

export function createInfoOverlay() {
    // Prüfen, ob Overlay bereits existiert
    if (document.getElementById("infoOverlay")) {
        toggleOverlay();
        return;
    }

    const overlay = document.createElement("div");
    overlay.id = "infoOverlay";
    overlay.className = "overlay";

    overlay.innerHTML = `
    <div class="overlay-content">
    <div class="overlay-header">
    <h2>📋 Projekt-Informationen</h2>
    <button id="closeOverlayButton" class="overlay-close" title="Schließen">✕</button>
    </div>
    <div class="overlay-body" id="overlayBody">
    <div class="overlay-loading">Lade Informationen...</div>
    </div>
    </div>
    `;

    document.body.appendChild(overlay);

    // Schließen-Button
    document.getElementById("closeOverlayButton").addEventListener("click", toggleOverlay);

    // Klick außerhalb des Contents schließt das Overlay
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            toggleOverlay();
        }
    });

    // ESC-Taste schließt das Overlay
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const overlay = document.getElementById("infoOverlay");
            if (overlay && overlay.style.display === "flex") {
                toggleOverlay();
            }
        }
    });

    // Inhalt asynchron laden
    loadOverlayContent();

    // Einblenden
    overlay.style.display = "flex";
}

function toggleOverlay() {
    const overlay = document.getElementById("infoOverlay");
    if (overlay) {
        if (overlay.style.display === "flex") {
            overlay.style.display = "none";
        } else {
            overlay.style.display = "flex";
        }
    }
}

// Version aus JSON laden
async function getVersion() {
    try {
        const response = await fetch("version.json");
        const data = await response.json();
        return data.version;
    } catch {
        return "?.?.?";
    }
}

// ======================================
// Inhalt laden
// ======================================

async function loadOverlayContent() {
    const body = document.getElementById("overlayBody");
    if (!body) return;

    try {
        const historyData = await loadHistoryFromDB();
        const langs = getAllLangs();

        // Statistiken pro Sprache
        const langStats = {};
        let totalEntries = 0;

        langs.forEach((lang) => {
            const count = historyData.filter((e) => e.lang === lang.code).length;
            langStats[lang.code] = count;
            totalEntries += count;
        });

        // IndexedDB-Größe ermitteln
        const dbSize = await getIndexedDBSize();

        // API-Key maskieren
        const maskedKey = maskApiKey(apiConfig.apiKey);

        const version = await getVersion();

        body.innerHTML = `
        <div class="overlay-section">
        <h3>🔑 API-Key</h3>
        <div class="api-key-display">
        <span id="apiKeyDisplay" class="api-key-masked" title="Klicken zum Ein-/Ausblenden">
        ${maskedKey}
        </span>
        </div>
        </div>

        <div class="overlay-section">
        <h3>🌍 Konfiguration</h3>
        <div class="tree-container">
        ${langs.map((lang) => buildTreeHTML(lang.code, apiConfig.langs[lang.code])).join("")}
        </div>
        </div>

        <div class="overlay-section">
        <h3>💾 Gespeicherte Einträge</h3>
        <div class="stats-container">
        ${langs
            .map(
                (lang) => `
            <div class="stat-row">
            <span class="stat-lang">${lang.flag} ${lang.name}</span>
            <span class="stat-count">${langStats[lang.code] || 0}</span>
            </div>
            `
            )
            .join("")}
            <div class="stat-row stat-total">
            <span>Gesamt</span>
            <span class="stat-count">${totalEntries}</span>
            </div>
            </div>
            </div>

            <div class="overlay-section">
            <h3>📦 Datenbank</h3>
            <div class="stat-row">
            <span>IndexedDB-Größe</span>
            <span class="stat-count">${dbSize} MB</span>
            </div>
            </div>

            <div class="overlay-section">
            <h3>ℹ️ Entwicklerinformationen</h3>
            <div class="dev-info">
            <p>Entwickelt von <strong>DeepSeek</strong> mit Hilfe von Sven-Thorsten Fahrbach 🙂</p>
            <p>
            <strong>Lizenz:</strong>
            <a href="https://creativecommons.org/publicdomain/zero/1.0/legalcode.en"
            target="_blank" rel="noopener">
            Creative Commons 1.0 Universal (CC0)
            </a>
            </p>
            <p>
            <strong>Homepage:</strong>
            <a href="https://github.com/svethole/DaenischHelfer"
            target="_blank" rel="noopener">
            github.com/svethole/DaenischHelfer
            </a>
            </p>
            <p>
            <strong>E-Mail:</strong>
            <a href="mailto:svetho@posteo.uk">svetho@posteo.uk</a>
            </p>
            </div>
            <div class="overlay-section">
                <h3>📦 Version</h3>
                <p><strong>v${version}</strong></p>
            </div>
            </div>
            `;

        // API-Key Klick-Handler
        setupApiKeyToggle(apiConfig.apiKey);

        // Tree-Toggle-Handler
        setupTreeToggles();
    } catch (error) {
        console.error("Fehler beim Laden der Overlay-Daten:", error);
        body.innerHTML = '<div class="overlay-error">Fehler beim Laden der Informationen.</div>';
    }
}

// ======================================
// Baumstruktur für Konfiguration
// ======================================

function buildTreeHTML(langCode, config) {
    const flag = config.flag || "";
    const anki = config.anki || {};
    const ankiEnabled = anki.enabled !== false ? "✅ aktiviert" : "❌ deaktiviert";

    return `
        <div class="tree-node">
            <div class="tree-toggle" data-target="tree-${langCode}">
                <span class="tree-arrow collapsed">▶</span>
                <span class="tree-label">${flag} ${config.name || langCode}</span>
            </div>
            <div class="tree-children collapsed" id="tree-${langCode}">
                
                <!-- TTS-Einstellungen -->
                <div class="tree-section-title">🎵 TTS</div>
                <div class="tree-item">
                    <span class="tree-key">ttsModel:</span>
                    <span class="tree-value">${escapeHtml(config.ttsModel || "-")}</span>
                </div>
                <div class="tree-item">
                    <span class="tree-key">voiceId:</span>
                    <span class="tree-value">${escapeHtml(config.voiceId || "-")}</span>
                </div>
                
                <!-- Anki Connect Einstellungen -->
                <div class="tree-section-title">📋 Anki Connect <span class="tree-badge ${ankiEnabled.includes("✅") ? "badge-ok" : "badge-off"}">${ankiEnabled}</span></div>
                
                <div class="tree-item">
                    <span class="tree-key">Status:</span>
                    <span class="tree-value ${ankiEnabled.includes("✅") ? "" : "text-muted"}">${ankiEnabled}</span>
                </div>
                
                ${
                    anki.deck
                        ? `
                <div class="tree-item">
                    <span class="tree-key">Deck:</span>
                    <span class="tree-value">${escapeHtml(anki.deck)}</span>
                </div>`
                        : ""
                }
                
                ${
                    anki.model
                        ? `
                <div class="tree-item">
                    <span class="tree-key">Notiztyp:</span>
                    <span class="tree-value">${escapeHtml(anki.model)}</span>
                </div>`
                        : ""
                }
                
                ${
                    anki.fields
                        ? `
                <div class="tree-item">
                    <span class="tree-key">Feld-Mapping:</span>
                </div>
                <div class="tree-item tree-indent">
                    <span class="tree-key">Satz →</span>
                    <span class="tree-value">${escapeHtml(anki.fields.sentence || "-")}</span>
                </div>
                <div class="tree-item tree-indent">
                    <span class="tree-key">Wort →</span>
                    <span class="tree-value">${escapeHtml(anki.fields.word || "-")}</span>
                </div>
                <div class="tree-item tree-indent">
                    <span class="tree-key">Audio →</span>
                    <span class="tree-value">${escapeHtml(anki.fields.audio || "-")}</span>
                </div>`
                        : ""
                }
                
                <!-- URLs -->
                <div class="tree-node">
                    <div class="tree-toggle" data-target="tree-${langCode}-urls">
                        <span class="tree-arrow collapsed">▶</span>
                        <span class="tree-key">urls (${(config.urls || []).length})</span>
                    </div>
                    <div class="tree-children collapsed" id="tree-${langCode}-urls">
                        ${(config.urls || [])
                            .map(
                                (url, i) => `
                            <div class="tree-item tree-url">
                                <span class="tree-key">url${i + 1}:</span>
                                <span class="tree-value">
                                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>
                                </span>
                            </div>
                        `
                            )
                            .join("")}
                    </div>
                </div>
                
            </div>
        </div>
    `;
}

function setupTreeToggles() {
    document.querySelectorAll(".tree-toggle").forEach((toggle) => {
        toggle.addEventListener("click", () => {
            const targetId = toggle.getAttribute("data-target");
            const children = document.getElementById(targetId);
            const arrow = toggle.querySelector(".tree-arrow");

            if (children && arrow) {
                const isCollapsed = children.classList.contains("collapsed");

                if (isCollapsed) {
                    children.classList.remove("collapsed");
                    arrow.classList.remove("collapsed");
                    arrow.textContent = "▼";
                } else {
                    children.classList.add("collapsed");
                    arrow.classList.add("collapsed");
                    arrow.textContent = "▶";
                }
            }
        });
    });
}

// ======================================
// API-Key anzeigen/verstecken
// ======================================

function maskApiKey(key) {
    if (!key || key.length < 8) return key;
    const start = key.substring(0, 2);
    const end = key.substring(key.length - 4);
    return `API-Key: <span class="api-key-red">${start}...${end}</span> <span class="api-key-hint">(klicken um vollständigen Schlüssel anzuzeigen)</span>`;
}

function setupApiKeyToggle(fullKey) {
    const display = document.getElementById("apiKeyDisplay");
    if (!display) return;

    let isMasked = true;

    display.addEventListener("click", () => {
        if (isMasked) {
            display.innerHTML = `API-Key: <span class="api-key-red api-key-full">${escapeHtml(fullKey)}</span> <span class="api-key-hint">(klicken zum Verbergen)</span>`;
        } else {
            display.innerHTML = maskApiKey(fullKey);
        }
        isMasked = !isMasked;
    });

    display.style.cursor = "pointer";
}

// ======================================
// IndexedDB-Größe schätzen
// ======================================

async function getIndexedDBSize() {
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            return (usage / (1024 * 1024)).toFixed(2);
        }
    } catch (error) {
        console.error("Fehler beim Ermitteln der DB-Größe:", error);
    }
    return "?";
}

// ======================================
// Hilfsfunktionen
// ======================================

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
