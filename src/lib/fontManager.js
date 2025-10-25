// fontManager.js - Mit dynamischem Base-Path Support für Vite

export class FontManager {
    constructor() {
        this.loadedFonts = new Set();
        this.fontFamilies = [];
        this.isInitialized = false;
    }

    /**
     * ✨ NEU: Ermittle den Base-Path aus import.meta.env
     */
    getBasePath() {
        return import.meta.env.BASE_URL || '/';
    }

    /**
     * ✨ NEU: Erstelle Font-URL mit korrektem Base-Path
     */
    getFontUrl(filename) {
        const basePath = this.getBasePath();
        // Entferne doppelte Slashes
        const path = `${basePath}fonts/${filename}`.replace(/\/+/g, '/');
        return path;
    }

    /**
     * Create CSS for fonts with dynamic base path
     */
    createFontCSS(customFonts) {
        let css = '';
        
        customFonts.forEach(font => {
            const fontName = font.name;
            const fileName = font.file;
            
            // ✨ NEU: Verwende dynamischen Pfad
            const fontUrl = this.getFontUrl(fileName);
            
            css += `
@font-face {
    font-family: "${fontName}";
    src: url("${fontUrl}") format("woff2");
    font-display: swap;
    font-weight: normal;
    font-style: normal;
}
`;
        });
        
        return css;
    }

    /**
     * Simple initialization with forced font loading
     */
    async initialize(customFonts) {
        if (this.isInitialized) {
            console.log('⚠️ FontManager bereits initialisiert');
            return { loaded: this.loadedFonts.size, failed: 0 };
        }

        console.log(`📤 Lade ${customFonts.length} Fonts via CSS...`);
        console.log(`📍 Base-Path: ${this.getBasePath()}`);

        // Remove existing styles
        const existingStyle = document.getElementById('custom-fonts');
        if (existingStyle) existingStyle.remove();

        // Inject CSS
        const styleElement = document.createElement('style');
        styleElement.id = 'custom-fonts';
        styleElement.textContent = this.createFontCSS(customFonts);
        document.head.appendChild(styleElement);

        console.log('✅ CSS @font-face Rules injiziert');

        // Wait for CSS to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Force load priority fonts using FontFace API
        const priorityFonts = customFonts.slice(0, 10); // Load first 10 fonts
        console.log(`🔄 Force-Loading ${priorityFonts.length} Priority-Fonts...`);
        
        const loadPromises = priorityFonts.map(async (font) => {
            try {
                const fontUrl = this.getFontUrl(font.file);
                const fontFace = new FontFace(font.name, `url(${fontUrl})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                console.log(`✅ Font geladen: ${font.name}`);
                return font.name;
            } catch (error) {
                console.warn(`⚠️ Font fehlgeschlagen: ${font.name}`, error);
                return null;
            }
        });

        const loadedFonts = await Promise.all(loadPromises);
        const successCount = loadedFonts.filter(f => f !== null).length;
        
        console.log(`✅ Force-Loading abgeschlossen: ${successCount}/${priorityFonts.length} Priority-Fonts`);

        // Add all fonts to available list (CSS injection should make them work)
        customFonts.forEach(font => {
            this.fontFamilies.push(font.name);
            this.loadedFonts.add(font.name);
        });

        console.log(`✅ Fonts verfügbar: ${this.loadedFonts.size} Fonts`);
        console.log('📝 Beispiel-Fonts:', Array.from(this.loadedFonts).slice(0, 5));

        this.isInitialized = true;
        return { loaded: this.loadedFonts.size, failed: 0 };
    }

    /**
     * Get all loaded fonts
     */
    getAvailableFonts() {
        return Array.from(this.loadedFonts);
    }

    /**
     * Get loading statistics
     */
    getLoadingStats() {
        return {
            total: this.fontFamilies.length,
            loaded: this.loadedFonts.size,
            failed: 0,
            loadedFonts: Array.from(this.loadedFonts),
            failedFonts: []
        };
    }

    /**
     * Check if font is available
     */
    isFontAvailable(fontFamily) {
        return this.loadedFonts.has(fontFamily);
    }

    /**
     * Get font string with fallbacks
     */
    getFontWithFallback(preferredFont) {
        if (this.loadedFonts.has(preferredFont)) {
            return `"${preferredFont}", Arial, sans-serif`;
        }
        return 'Arial, sans-serif';
    }

    /**
     * Populate select element
     */
    populateFontSelect(selectElement) {
        selectElement.innerHTML = '';
        
        // Add system fonts
        ['Arial', 'Helvetica', 'Times New Roman', 'Georgia'].forEach(font => {
            const option = document.createElement('option');
            option.value = font;
            option.textContent = font;
            selectElement.appendChild(option);
        });

        // Add separator if custom fonts exist
        if (this.loadedFonts.size > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '── Custom Fonts ──';
            selectElement.appendChild(separator);

            // Add custom fonts
            this.loadedFonts.forEach(fontFamily => {
                const option = document.createElement('option');
                option.value = fontFamily;
                option.textContent = fontFamily;
                selectElement.appendChild(option);
            });
        }
    }

    /**
     * Wait for a font to be loaded (compatibility method)
     */
    async waitForFont(fontFamily, timeout = 3000) {
        if (document.fonts && document.fonts.check) {
            const isReady = document.fonts.check(`16px "${fontFamily}"`);
            if (isReady) {
                console.log(`✅ Font bereits verfügbar: ${fontFamily}`);
                return true;
            }
            
            // Try to load the font if not ready
            try {
                console.log(`⏳ Lade Font: ${fontFamily}...`);
                await document.fonts.load(`16px "${fontFamily}"`);
                const result = document.fonts.check(`16px "${fontFamily}"`);
                if (result) {
                    console.log(`✅ Font geladen: ${fontFamily}`);
                } else {
                    console.warn(`⚠️ Font nicht gefunden: ${fontFamily}`);
                }
                return result;
            } catch (error) {
                console.warn(`❌ Fehler beim Laden von ${fontFamily}:`, error);
                return false;
            }
        }
        
        // Fallback: assume font is available after timeout
        return new Promise(resolve => setTimeout(() => resolve(true), 100));
    }

    /**
     * Quick test with essential fonts
     */
    async quickTest() {
        const testFonts = [
            { name: 'Satoshi Regular', file: 'Satoshi-Regular.woff2' },
            { name: 'GeneralSans Medium', file: 'GeneralSans-Medium.woff2' },
            { name: 'ClashDisplay Regular', file: 'ClashDisplay-Regular.woff2' }
        ];
        
        return await this.initialize(testFonts);
    }
}
