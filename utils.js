export function escapeRegExp(string) {
    return string.replace(
        /[.*+?^${}()|[\]\\]/g,
                          '\\$&'
    );
}

export function hexToBytes(hex) {

    const bytes =
    new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {

        bytes[i / 2] =
        parseInt(hex.substr(i, 2), 16);
    }

    return bytes;
}

export function transliterateToAscii(text) {

    return text

    .replace(/æ/gi, "ae")
    .replace(/ø/gi, "oe")
    .replace(/å/gi, "aa")

    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[^a-zA-Z0-9 ]/g, "")

    .replace(/\s+/g, " ")

    .trim();
}

export function generateRandomString(
    length = 8
) {

    const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";

    for (let i = 0; i < length; i++) {

        result += chars.charAt(
            Math.floor(
                Math.random() * chars.length
            )
        );
    }

    return result;
}

export function createTTSFilename(sentence) {

    const firstWords =
    transliterateToAscii(sentence)
    .split(" ")
    .slice(0, 3)
    .join("_");

    const now = new Date();

    const timestamp =
    now.getFullYear().toString() +

    String(now.getMonth() + 1)
    .padStart(2, "0") +

    String(now.getDate())
    .padStart(2, "0") +

    "_" +

    String(now.getHours())
    .padStart(2, "0") +

    String(now.getMinutes())
    .padStart(2, "0") +

    String(now.getSeconds())
    .padStart(2, "0");

    const randomPart =
    generateRandomString(8);

    return `${firstWords}_${timestamp}_${randomPart}.mp3`;
}

export function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

export function sanitizeFilename(text) {
    return text.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
}