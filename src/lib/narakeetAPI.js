// narakeetAPI.js - Narakeet Text-to-Speech API Integration

/**
 * Narakeet Text-to-Speech API Client
 * Konvertiert Text zu Audio und gibt eine Audio-Datei zurück
 */
export class NarakeetAPI {
    constructor(apiKey = null) {
        // API-Key wird vom Server-Proxy verwendet (nicht mehr im Frontend benötigt)
        this.apiKey = apiKey || '';
        this.baseUrl = '/visualizer/api/tts'; // Server-Proxy-Endpoint
        this.isProcessing = false;

        // Verfügbare Narakeet-Stimmen (Stand 2025)
        this.popularVoices = {
            de: [
                // Weiblich
                { id: 'marlene', name: 'Marlene (Weiblich)', lang: 'de-DE' },
                { id: 'martina', name: 'Martina (Weiblich)', lang: 'de-DE' },
                { id: 'klara', name: 'Klara (Weiblich)', lang: 'de-DE' },
                { id: 'saskia', name: 'Saskia (Weiblich, Jung)', lang: 'de-DE' },
                { id: 'gertrud', name: 'Gertrud (Weiblich, Warm)', lang: 'de-DE' },
                // Männlich
                { id: 'hans', name: 'Hans (Männlich)', lang: 'de-DE' },
                { id: 'andreas', name: 'Andreas (Männlich, Jung)', lang: 'de-DE' },
                { id: 'bruno', name: 'Bruno (Männlich)', lang: 'de-DE' },
                { id: 'dietrich', name: 'Dietrich (Männlich, Jung)', lang: 'de-DE' },
                { id: 'florian', name: 'Florian (Männlich)', lang: 'de-DE' }
            ],
            en: [
                // US Female
                { id: 'joanna', name: 'Joanna (US, Female)', lang: 'en-US' },
                { id: 'linda', name: 'Linda (US, Female, Young)', lang: 'en-US' },
                { id: 'betty', name: 'Betty (US, Female, Warm)', lang: 'en-US' },
                { id: 'jessica', name: 'Jessica (US, Female)', lang: 'en-US' },
                // US Male
                { id: 'matthew', name: 'Matthew (US, Male)', lang: 'en-US' },
                { id: 'matt', name: 'Matt (US, Male)', lang: 'en-US' },
                { id: 'ben', name: 'Ben (US, Male)', lang: 'en-US' },
                { id: 'chris', name: 'Chris (US, Male)', lang: 'en-US' },
                // UK
                { id: 'amy', name: 'Amy (UK, Female)', lang: 'en-GB' },
                { id: 'brian', name: 'Brian (UK, Male)', lang: 'en-GB' }
            ],
            es: [
                { id: 'lucia', name: 'Lucia (Español, Femenino)', lang: 'es-ES' },
                { id: 'enrique', name: 'Enrique (Español, Masculino)', lang: 'es-ES' }
            ],
            fr: [
                { id: 'celine', name: 'Celine (Français, Féminin)', lang: 'fr-FR' },
                { id: 'mathieu', name: 'Mathieu (Français, Masculin)', lang: 'fr-FR' }
            ],
            it: [
                { id: 'carla', name: 'Carla (Italiano, Femminile)', lang: 'it-IT' },
                { id: 'giorgio', name: 'Giorgio (Italiano, Maschile)', lang: 'it-IT' }
            ]
        };
    }

    /**
     * Prüft ob API-Key gesetzt ist (immer true, da Server-Proxy verwendet wird)
     */
    hasApiKey() {
        return true; // Server handhabt API-Key
    }

    /**
     * Gibt alle verfügbaren Stimmen zurück
     */
    getAllVoices() {
        const allVoices = [];
        Object.keys(this.popularVoices).forEach(lang => {
            allVoices.push(...this.popularVoices[lang]);
        });
        return allVoices;
    }

    /**
     * Generiert Audio aus Text
     * @param {string} text - Der zu konvertierende Text
     * @param {object} options - Optionen für die Generierung
     * @returns {Promise<Blob>} Audio-Datei als Blob
     */
    async generateAudio(text, options = {}) {
        if (!text || text.trim().length === 0) {
            throw new Error('Text darf nicht leer sein.');
        }

        if (this.isProcessing) {
            throw new Error('Eine Generierung läuft bereits. Bitte warten.');
        }

        this.isProcessing = true;

        try {
            const {
                voice = 'vicki',
                format = 'mp3',
                speed = 1.0,
                volume = 'medium'
            } = options;

            console.log(`[Narakeet] Generiere Audio: ${text.substring(0, 50)}... (Stimme: ${voice})`);

            // Request an Server-Proxy senden
            const response = await fetch('/visualizer/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text,
                    voice,
                    speed,
                    volume,
                    format
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`API-Fehler (${response.status}): ${errorData.error || 'Unknown error'}`);
            }

            const blob = await response.blob();
            console.log(`[Narakeet] Audio erfolgreich generiert (${(blob.size / 1024).toFixed(2)} KB)`);

            return blob;

        } catch (error) {
            console.error('[Narakeet] Fehler bei der Audio-Generierung:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Erstellt eine Audio-Datei mit Metadaten
     * @param {Blob} audioBlob - Audio-Blob
     * @param {string} text - Original-Text
     * @param {string} voice - Verwendete Stimme
     * @returns {File} Audio-File mit Metadaten
     */
    createAudioFile(audioBlob, text, voice) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const fileName = `TTS_${voice}_${timestamp}.mp3`;

        return new File([audioBlob], fileName, {
            type: 'audio/mpeg',
            lastModified: Date.now()
        });
    }

    /**
     * Batch-Generierung: Mehrere Texte gleichzeitig
     * @param {Array} textArray - Array mit {text, voice, name} Objekten
     * @returns {Promise<Array>} Array mit generierten Audio-Files
     */
    async generateBatch(textArray, onProgress = null) {
        if (!this.hasApiKey()) {
            throw new Error('Kein API-Key gesetzt.');
        }

        const results = [];
        const total = textArray.length;

        for (let i = 0; i < total; i++) {
            const item = textArray[i];

            if (onProgress) {
                onProgress(i + 1, total, item.name || `Item ${i + 1}`);
            }

            try {
                const audioBlob = await this.generateAudio(item.text, {
                    voice: item.voice || 'vicki',
                    format: 'mp3'
                });

                const fileName = item.name || `TTS_${item.voice || 'vicki'}_${i + 1}.mp3`;
                const audioFile = new File([audioBlob], fileName, {
                    type: 'audio/mpeg',
                    lastModified: Date.now()
                });

                results.push({ success: true, file: audioFile, name: fileName });

                // Kurze Pause zwischen Requests (API Rate Limiting)
                if (i < total - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error) {
                console.error(`Fehler bei Item ${i + 1}:`, error);
                results.push({ success: false, error: error.message, name: item.name || `Item ${i + 1}` });
            }
        }

        return results;
    }
}

export default NarakeetAPI;
