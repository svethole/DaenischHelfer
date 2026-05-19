// ======================================
// App-Konfiguration
// ======================================
// Diese Datei enthält den API-Key und
// Spracheinstellungen.
// Sie ist in .gitignore und wird NICHT committet!

export const CONFIG = {
    apiKey: "sk-api-HIER_DEIN_KEY",

    // Aktive Sprache (kann per Dropdown geändert werden)
    defaultLang: "da",

    // Anki Connect Einstellungen (global)
    ankiConnect: {
        enabled: true,  // false = Button komplett ausblenden
        port: 8765,
        deckPrefix: "",  // Optional: Prefix für Deck-Namen (z.B. "Sprachen::")
        modelPrefix: ""  // Optional: Prefix für Notiztyp-Namen
    },

    // Sprachdefinitionen
    langs: {
        "da": {
            name: "Dänisch",
            flag: "🇩🇰",
            ttsModel: "speech-2.8-hd",
            voiceId: "Danish_female_1_v1",
            anki: {
                enabled: true,
                deck: "Danish::Manuell",
                model: "Danish",
                fields: {
                    sentence: "Sentence",
                    word: "Word",
                    audio: "Audio"
                }
            },
            urls: [
                "https://www.deepl.com/translator#da/de/${sentence}",
                "https://ordnet.dk/ddo/ordbog?query=${word}",
                "https://de.langenscheidt.com/daenisch-deutsch/${word}",
                "https://forvo.com/search/${word}/da/",
                "https://www.google.com/search?tbm=isch&q=${word}"
            ]
        },
        "nl": {
            name: "Niederländisch",
            flag: "🇳🇱",
            ttsModel: "speech-2.8-turbo",
            voiceId: "Dutch_bossy_leader",
            anki: {
                enabled: false
            },
            urls: [
                "https://www.deepl.com/translator#nl/de/${sentence}",
                "https://nl.wiktionary.org/wiki/${word}",
                "https://de.langenscheidt.com/niederlaendisch-deutsch/${word}",
                "https://forvo.com/search/${word}/nl/",
                "https://www.google.com/search?tbm=isch&q=${word}"
            ]
        }
    }
};