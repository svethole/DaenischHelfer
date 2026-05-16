# DaenischHelfer 🇩🇰

Ein browserbasierter Helfer zur einfacheren Erstellung von Anki-Karteikarten für verschiedene Sprachen (derzeit Dänisch und Niederländisch).

## ✨ Features

- **Satzanalyse**: Vorschau mit Hervorhebung des gesuchten Wortes
- **TTS-Generierung**: Text-to-Speech über die Minimax-API mit lokalem Cache (IndexedDB)
- **History**: Speicherung aller Anfragen mit Pagination und Sprach-Flags
- **Mehrsprachig**: Konfigurierbar für verschiedene Sprachen (Dropdown-Umschaltung)
- **URL-Automation**: Öffnet automatisch DeepL, Wörterbücher und Forvo mit den eingegebenen Daten
- **Info-Overlay**: Zeigt Konfiguration, Datenbank-Statistiken und Entwicklerinfos
- **Responsive**: Optimiert für Desktop und Tablet

## 🚀 Installation

### Voraussetzungen

- Ein moderner Browser (Vivaldi, Firefox, Ecosia-Browser)
- Python 3 (für den lokalen Entwicklungsserver) – oder ein anderer lokaler Webserver

### Setup

```bash
# Repository klonen
git clone https://github.com/svethole/DaenischHelfer.git
cd DaenischHelfer

# Konfiguration erstellen
cp api-config.example.js api-config.js
# → api-config.js mit deinem API-Key und Spracheinstellungen bearbeiten

# Lokalen Server starten
python3 -m http.server 8000