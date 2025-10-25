/**
 * main.js - Modular architecture with FontManager, TextManager, GridManager and FotoManager
 */
import { Visualizers } from './visualizers.js';
import { Player } from './player.js';
import { Recorder } from './recorder.js';
import { CanvasManager } from './canvasManager.js';
import { FontManager } from './fontManager.js';
import { TextManager } from './textManager.js';
import { GridManager } from './gridManager.js';
import { FotoManager } from './fotoManager.js';
import { CUSTOM_FONTS } from './fonts.js';
import { NarakeetAPI } from './narakeetAPI.js';

// --- Translation Data ---
const translations = {
    de: {
        pageTitle: "Audio Visualizer Pro",
        homeIconAriaLabel: "Zur Startseite",
        appTitle: "Audio Visualizer Pro",
        appSubtitle: "Erstelle einzigartige Videos mit spektakulären Audio-Visualisierungen.",
        uploadLabel: "1. Audiodateien hochladen",
        bgImageLabel: "2. Bilder-Galerie",
        bgColorLabel: "Hintergrundfarbe",
        visualizerLabel: "3. Visualisierung wählen",
        visualizerToggleLabel: "An/Aus",
        visualizerToggleTitle: "Visualizer an- oder ausschalten",
        visualizerColorLabel: "Farbe",
        visualizerColorTitle: "Visualizer-Farbe wählen",
        resolutionLabel: "4. Auflösung wählen",
        res720p: "720p HD",
        res1080p: "1080p Full HD",
        res1440p: "1440p QHD",
        qualityLabel: "5. Videoqualität (Bitrate)",
        qualityStandard: "Standard (4 Mbps)",
        qualityHigh: "Hoch (8 Mbps)",
        qualityUltra: "Ultra (15 Mbps)",
        statusInitial: "Bitte eine oder mehrere Audiodateien hochladen.",
        statusHasTrack: "Audio geladen. Bereit für die Aufnahme.",
        statusReady: (w, h) => `🟡 Aufnahme bereit (${w}x${h}). Jetzt aufnehmen...`,
        statusRecording: "🔴 Aufnahme läuft...",
        statusPaused: "⏸️ Aufnahme pausiert. Bearbeiten Sie den Canvas.",
        prepareRecBtn: "Aufnahme vorbereiten",
        startRecBtn: "Aufnahme starten",
        pauseRecBtn: "Aufnahme pausieren",
        resumeRecBtn: "Aufnahme fortsetzen",
        stopRecBtn: "Aufnahme stoppen & speichern",
        deleteBtn: "Canvas zurücksetzen",
        noFileLoaded: "Keine Datei geladen",
        previewHeader: "Video-Vorschau",
        downloadBtn: "Video herunterladen",
        closePreviewBtn: "Schliessen",
        deleteTrackTitle: "Diesen Titel aus der Playlist entfernen",
        recStatusUploading: (mb) => `Video wird hochgeladen (${mb}MB)...`,
        recStatusProcessing: "Video wird verarbeitet...",
        recStatusDownloadReady: "Video bereit zum Download!",
        recStatusUploadFailed: "Server-Upload fehlgeschlagen, direkter Download...",
        recMimeInfo: (type, w, h, mb) => `Format: ${type} | Auflösung: ${w}x${h} | Größe: ${mb}MB`,
        uploadButtonDefault: "Dateien auswählen",
        uploadButtonWithFiles: (n) => `${n} Datei(en) ausgewählt`,
        bgImageButtonDefault: "Bild zum Canvas hinzufügen",
        bgImageAddNew: "+ Neue Bilder hochladen",
        bgImageNoImage: "Kein Bild",
        setAsBackgroundTitle: "Als vollflächigen Hintergrund festlegen",
        setAsWorkspaceBgTitle: "Als Workspace-Hintergrund festlegen",
        workspaceRequiredWarning: "Bitte zuerst einen Social Media Workspace auswählen!",
        textSettingsLabel: "Texteinstellungen",
        textInputLabel: "Neuer Text",
        placeholderNewText: "Hier Text eingeben...",
        addTextBtn: "Hinzufügen",
        fontFamilyLabel: "Schriftart",
        textColorLabel: "Textfarbe",
        textOpacityLabel: "Text-Deckkraft",
        fontSizeLabel: "Schriftgrösse",
        shadowColorLabel: "Schattenfarbe",
        shadowBlurLabel: "Schatten-Unschärfe",
        shadowXLabel: "Schatten X-Offset",
        shadowYLabel: "Schatten Y-Offset",
        repeatBtnTitle: "Wiederholung umschalten (Playlist / Einzeln)",
        playlistHeader: "Wiedergabeliste",
        clearPlaylistBtn: "Alles löschen",
        gridSettingsLabel: "Raster-Einstellungen",
        gridToggleLabel: "Raster anzeigen",
        gridToggleTitle: "Raster ein/aus",
        snapToggleLabel: "An Raster fangen",
        snapToggleTitle: "Snap-to-Grid ein/aus",
        gridSizeLabel: "Rastergröße",
        gridColorLabel: "Rasterfarbe",
        gridOpacityLabel: "Raster-Transparenz",
        workspaceSettingsLabel: "Social Media Arbeitsbereich",
        workspaceSelectLabel: "Arbeitsbereich wählen",
        workspaceNone: "Kein Arbeitsbereich",
        workspaceToggleLabel: "Rahmen anzeigen",
        workspaceToggleTitle: "Arbeitsbereich-Rahmen ein/aus",
        workspaceInfo: "Der gelbe Rahmen zeigt den optimalen Bereich für Ihr gewähltes Social Media Format an. Beim Video-Export wird nur dieser Bereich in der exakten Auflösung aufgenommen.",
        fotoSettingsLabel: "Bildeinstellungen",
        fotoPresetLabel: "Filter-Preset",
        brightnessLabel: "Helligkeit",
        contrastLabel: "Kontrast",
        saturationLabel: "Sättigung",
        opacityLabel: "Deckkraft",
        blurLabel: "Unschärfe",
        hueRotateLabel: "Farbton",
        grayscaleLabel: "Graustufen",
        sepiaLabel: "Sepia",
        invertLabel: "Invertieren",
        resetFotoBtn: "Filter zurücksetzen"
    },
    en: {
        pageTitle: "Audio Visualizer Pro",
        homeIconAriaLabel: "Back to Home",
        appTitle: "Audio Visualizer Pro",
        appSubtitle: "Create unique videos with spectacular audio visualizations.",
        uploadLabel: "1. Upload Audio Files",
        bgImageLabel: "2. Image Gallery",
        bgColorLabel: "Background Color",
        visualizerLabel: "3. Choose Visualization",
        visualizerToggleLabel: "On/Off",
        visualizerToggleTitle: "Toggle visualizer on or off",
        visualizerColorLabel: "Color",
        visualizerColorTitle: "Choose visualizer color",
        resolutionLabel: "4. Choose Resolution",
        res720p: "720p HD",
        res1080p: "1080p Full HD",
        res1440p: "1440p QHD",
        qualityLabel: "5. Video Quality (Bitrate)",
        qualityStandard: "Standard (4 Mbps)",
        qualityHigh: "High (8 Mbps)",
        qualityUltra: "Ultra (15 Mbps)",
        statusInitial: "Please upload one or more audio files.",
        statusHasTrack: "Audio loaded. Ready to record.",
        statusReady: (w, h) => `🟡 Ready to record (${w}x${h}). Start recording now...`,
        statusRecording: "🔴 Recording in progress...",
        statusPaused: "⏸️ Recording paused. Feel free to edit the canvas.",
        prepareRecBtn: "Prepare Recording",
        startRecBtn: "Start Recording",
        pauseRecBtn: "Pause Recording",
        resumeRecBtn: "Resume Recording",
        stopRecBtn: "Stop & Save Recording",
        deleteBtn: "Reset Canvas",
        noFileLoaded: "No file loaded",
        previewHeader: "Video Preview",
        downloadBtn: "Download Video",
        closePreviewBtn: "Close",
        deleteTrackTitle: "Remove this track from the playlist",
        recStatusUploading: (mb) => `Uploading video (${mb}MB)...`,
        recStatusProcessing: "Processing video...",
        recStatusDownloadReady: "Video ready for download!",
        recStatusUploadFailed: "Server upload failed, using direct download...",
        recMimeInfo: (type, w, h, mb) => `Format: ${type} | Resolution: ${w}x${h} | Size: ${mb}MB`,
        uploadButtonDefault: "Choose Files",
        uploadButtonWithFiles: (n) => `${n} file(s) selected`,
        bgImageButtonDefault: "Add Image to Canvas",
        bgImageAddNew: "+ Add new images",
        bgImageNoImage: "No Image",
        setAsBackgroundTitle: "Set as fullscreen background",
        setAsWorkspaceBgTitle: "Set as workspace background",
        workspaceRequiredWarning: "Please select a social media workspace first!",
        textSettingsLabel: "Text Settings",
        textInputLabel: "New Text",
        placeholderNewText: "Enter text here...",
        addTextBtn: "Add Text",
        fontFamilyLabel: "Font Family",
        textColorLabel: "Text Color",
        textOpacityLabel: "Text Opacity",
        fontSizeLabel: "Font Size",
        shadowColorLabel: "Shadow Color",
        shadowBlurLabel: "Shadow Blur",
        shadowXLabel: "Shadow X-Offset",
        shadowYLabel: "Shadow Y-Offset",
        repeatBtnTitle: "Toggle Repeat (Playlist / Single)",
        playlistHeader: "Playlist",
        clearPlaylistBtn: "Clear All",
        gridSettingsLabel: "Grid Settings",
        gridToggleLabel: "Show Grid",
        gridToggleTitle: "Toggle grid on/off",
        snapToggleLabel: "Snap to Grid",
        snapToggleTitle: "Toggle snap-to-grid on/off",
        gridSizeLabel: "Grid Size",
        gridColorLabel: "Grid Color",
        gridOpacityLabel: "Grid Opacity",
        workspaceSettingsLabel: "Social Media Workspace",
        workspaceSelectLabel: "Choose Workspace",
        workspaceNone: "No Workspace",
        workspaceToggleLabel: "Show Frame",
        workspaceToggleTitle: "Toggle workspace frame on/off",
        workspaceInfo: "The yellow frame shows the optimal area for your chosen social media format. Video export will capture only this area in exact resolution.",
        fotoSettingsLabel: "Image Settings",
        fotoPresetLabel: "Filter Preset",
        brightnessLabel: "Brightness",
        contrastLabel: "Contrast",
        saturationLabel: "Saturation",
        opacityLabel: "Opacity",
        blurLabel: "Blur",
        hueRotateLabel: "Hue",
        grayscaleLabel: "Grayscale",
        sepiaLabel: "Sepia",
        invertLabel: "Invert",
        resetFotoBtn: "Reset Filters"
    }
};

async function saveFileWithPicker(blob, suggestedName) {
  if (window.showSaveFilePicker) {
    const baseMimeType = blob.type.split(';')[0];
    const extension = baseMimeType.includes('mp4') ? '.mp4' : '.webm';
    
    const options = {
      suggestedName: suggestedName,
      types: [{
        description: 'Video File',
        accept: { [baseMimeType]: [extension] },
      }],
    };
    try {
      const fileHandle = await window.showSaveFilePicker(options);
      const writableStream = await fileHandle.createWritable();
      await writableStream.write(blob);
      await writableStream.close();
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Error saving file:', err);
    }
  } else {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
    // --- Centralized Application State ---
    const appState = {
        currentLanguage: localStorage.getItem('visualizerLanguage') || 'de',
        audioContext: null,
        analyser: null,
        sourceNode: null,
        outputGain: null,
        recorder: null,
        player: null,
        canvasManager: null,
        fontManager: null,
        textManager: null,
        gridManager: null,
        fotoManager: null,
        narakeetAPI: null,
        visualizerAnimationFrameId: null,
        galleryImages: [],
        isVisualizerEnabled: true,
        visualizerColor: '#6ea8fe',
        lastVideoBlob: null,
        activeTextEditor: null,
        textEditorListeners: null,
        canvasContainer: null,
    };


    // --- Elements ---
    const allLangElements = document.querySelectorAll('[data-lang-key]');
    const allLangPlaceholders = document.querySelectorAll('[data-lang-placeholder]');
    const allLangTitles = document.querySelectorAll('[data-lang-title]');
    const langSwitcher = document.getElementById('lang-switcher');
    const audioPlayer = document.getElementById('audioPlayer');
    const canvas = document.getElementById('audio-visualizer');
    const visualizerSelect = document.getElementById('visualizerSelect');
    const visualizerToggle = document.getElementById('visualizerToggle');
    const visualizerColorInput = document.getElementById('visualizerColor');
    const statusBox = document.getElementById('statusBox');
    const prepareRecBtn = document.getElementById('prepareRecBtn');
    const pauseResumeRecBtn = document.getElementById('pauseResumeRecBtn');
    const stopRecBtn = document.getElementById('stopRecBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const resultsPanel = document.getElementById('results-panel');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const bgImageDropdownBtn = document.getElementById('bgImageDropdownBtn');
    const bgImageDropdown = document.getElementById('bgImageDropdown');
    const bgImageFile = document.getElementById('bgImageFile');
    const bgColorInput = document.getElementById('bgColorInput');
    
    const playerUI = {
        playPauseBtn: document.getElementById('playPauseBtn'),
        stopPlayerBtn: document.getElementById('stopPlayerBtn'),
        shuffleBtn: document.getElementById('shuffleBtn'),
        repeatBtn: document.getElementById('repeatBtn'),
        clearPlaylistBtn: document.getElementById('clearPlaylistBtn'),
        nextBtn: document.getElementById('nextBtn'),
        prevBtn: document.getElementById('prevBtn'),
        progressBar: document.getElementById('progressBar'),
        progressBarContainer: document.getElementById('progressBarContainer'),
        trackName: document.getElementById('trackName'),
        timer: document.getElementById('timer'),
        duration: document.getElementById('duration'),
        trackInfo: document.getElementById('trackInfo'),
        playlistContainer: document.getElementById('playlist-container'),
        fileInput: document.getElementById('audioFile'),
        volumeBtn: document.getElementById('volumeBtn'),
        volumeSlider: document.getElementById('volumeSlider'),
        volumeIcon: document.getElementById('volumeIcon'),
        volumeMuteIcon: document.getElementById('volumeMuteIcon'),
    };

    const textControls = {
        textInput: document.getElementById('textInput'),
        addTextBtn: document.getElementById('addTextBtn'),
        fontSelect: document.getElementById('fontSelect'),
        textColorInput: document.getElementById('textColorInput'),
        fontSizeInput: document.getElementById('fontSizeInput'),
        textOpacityInput: document.getElementById('textOpacityInput'),
        shadowColorInput: document.getElementById('shadowColorInput'),
        shadowBlurInput: document.getElementById('shadowBlurInput'),
        shadowXInput: document.getElementById('shadowXInput'),
        shadowYInput: document.getElementById('shadowYInput')
    };

    const fotoControls = {
        container: document.getElementById('foto-settings'),
        brightnessInput: document.getElementById('brightnessInput'),
        brightnessValue: document.getElementById('brightnessValue'),
        contrastInput: document.getElementById('contrastInput'),
        contrastValue: document.getElementById('contrastValue'),
        saturationInput: document.getElementById('saturationInput'),
        saturationValue: document.getElementById('saturationValue'),
        opacityInput: document.getElementById('opacityInput'),
        opacityValue: document.getElementById('opacityValue'),
        blurInput: document.getElementById('blurInput'),
        blurValue: document.getElementById('blurValue'),
        hueRotateInput: document.getElementById('hueRotateInput'),
        hueRotateValue: document.getElementById('hueRotateValue'),
        grayscaleInput: document.getElementById('grayscaleInput'),
        grayscaleValue: document.getElementById('grayscaleValue'),
        sepiaInput: document.getElementById('sepiaInput'),
        sepiaValue: document.getElementById('sepiaValue'),
        invertInput: document.getElementById('invertInput'),
        invertValue: document.getElementById('invertValue'),
        presetSelect: document.getElementById('fotoPresetSelect'),
        resetButton: document.getElementById('resetFotoBtn')
    };

    const workspaceControls = {
        workspaceSelect: document.getElementById('workspaceSelect'),
        workspaceToggle: document.getElementById('workspaceToggle')
    };
    
    const recordingCanvas = document.createElement('canvas');
    const recordingCtx = recordingCanvas.getContext('2d');

    // --- Robust In-Canvas-Text-Editing ---
    function startTextEditing(textObject) {
        if (appState.activeTextEditor) {
            stopTextEditing();
        }
        appState.canvasManager.setEditing(true);
        const bounds = appState.canvasManager.getObjectBounds(textObject, canvas);
        if (!bounds || !appState.canvasContainer) {
            console.error("Could not get bounds for text object.", textObject);
            appState.canvasManager.setEditing(false);
            return;
        }
        const textarea = document.createElement('textarea');
        textarea.id = 'canvas-text-editor';
        textarea.value = textObject.text;
        const absSize = textObject.relSize * canvas.height;
        textarea.style.position = 'absolute';
        textarea.style.left = `${bounds.x}px`;
        textarea.style.top = `${bounds.y}px`;
        textarea.style.width = `${bounds.width + 20}px`;
        textarea.style.height = `${bounds.height + 10}px`;
        textarea.style.font = `bold ${absSize}px "${textObject.fontFamily}"`;
        textarea.style.color = textObject.color;
        textarea.style.textAlign = 'center';
        textarea.style.lineHeight = `${absSize * 1.2}px`;
        textarea.style.backgroundColor = 'transparent';
        textarea.style.border = '1px dashed #6ea8fe';
        textarea.style.outline = 'none';
        textarea.style.padding = '0';
        textarea.style.margin = '0';
        textarea.style.resize = 'none';
        textarea.style.overflow = 'hidden';
        textarea.style.whiteSpace = 'pre-wrap';
        textarea.style.zIndex = '100';
        
        appState.canvasContainer.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        appState.activeTextEditor = textarea;
        appState.textEditorListeners = {
            onInput: () => {
                if (!appState.activeTextEditor || !textObject) return;
                textObject.text = textarea.value;
                const newBounds = appState.canvasManager.getObjectBounds(textObject, canvas);
                if (newBounds) {
                    textarea.style.width = `${newBounds.width + 20}px`;
                    textarea.style.height = `${newBounds.height + 10}px`;
                    textarea.style.left = `${newBounds.x}px`;
                    textarea.style.top = `${newBounds.y}px`;
                }
                redrawStaticallyIfNeeded();
            },
            onKeyDown: (e) => {
                if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') {
                    e.preventDefault();
                    stopTextEditing();
                }
            },
            onBlur: stopTextEditing
        };
        textarea.addEventListener('input', appState.textEditorListeners.onInput);
        textarea.addEventListener('blur', appState.textEditorListeners.onBlur);
        textarea.addEventListener('keydown', appState.textEditorListeners.onKeyDown);
    }

    function stopTextEditing() {
        const { activeTextEditor, textEditorListeners } = appState;
        if (!activeTextEditor) return;
        
        appState.activeTextEditor = null;
        appState.textEditorListeners = null;

        if (textEditorListeners) {
            activeTextEditor.removeEventListener('input', textEditorListeners.onInput);
            activeTextEditor.removeEventListener('blur', textEditorListeners.onBlur);
            activeTextEditor.removeEventListener('keydown', textEditorListeners.onKeyDown);
        }
        if (appState.canvasContainer && appState.canvasContainer.contains(activeTextEditor)) {
            appState.canvasContainer.removeChild(activeTextEditor);
        }
        
        appState.canvasManager.setEditing(false);
        redrawStaticallyIfNeeded();
    }

    function setLanguage(lang) {
        if (!translations[lang]) return;
        appState.currentLanguage = lang;
        localStorage.setItem('visualizerLanguage', lang);
        document.documentElement.lang = lang;
        allLangElements.forEach(el => {
            const key = el.dataset.langKey;
            const translation = translations[lang][key];
            if (translation && typeof translation === 'string') {
                 el.textContent = translation;
            }
        });
        allLangPlaceholders.forEach(el => {
            const key = el.dataset.langPlaceholder;
            const translation = translations[lang][key];
            if (translation) {
                el.placeholder = translation;
            }
        });
        allLangTitles.forEach(el => {
            const key = el.dataset.langTitle;
            const translation = translations[lang][key];
            if(translation) {
                el.setAttribute('title', translation);
            }
        });
        if(visualizerSelect) {
            visualizerSelect.querySelectorAll('option').forEach(option => {
                const key = option.value;
                if (Visualizers[key]) {
                    const nameKey = `name_${lang}`;
                    option.textContent = Visualizers[key][nameKey] || Visualizers[key].name_de || key;
                }
            });
        }
        if (langSwitcher) {
            langSwitcher.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === lang);
            });
        }
        if (appState.player) appState.player.renderPlaylist();
        updateUIState();
        renderBgImageDropdown();
    }

    function updateUIState() {
        const langDict = translations[appState.currentLanguage];
        const hasTrack = appState.player && appState.player.playlist.length > 0;
        const isPrepared = appState.recorder && appState.recorder.isPrepared;
        const isRecording = appState.recorder && appState.recorder.isActive;
        const isPaused = appState.recorder && appState.recorder.isPaused;

        if(prepareRecBtn) prepareRecBtn.style.display = isRecording ? 'none' : 'inline-flex';
        if(pauseResumeRecBtn) pauseResumeRecBtn.style.display = isRecording ? 'inline-flex' : 'none';

        // Button-Text dynamisch ändern: "Vorbereiten" oder "Starten"
        if (prepareRecBtn) {
            if (isPrepared && !isRecording) {
                prepareRecBtn.textContent = langDict.startRecBtn;
                prepareRecBtn.disabled = false;
            } else {
                prepareRecBtn.textContent = langDict.prepareRecBtn;
                prepareRecBtn.disabled = isPrepared;
            }
        }
        
        if (stopRecBtn) stopRecBtn.disabled = !isPrepared && !isRecording && !isPaused;
        if (pauseResumeRecBtn) pauseResumeRecBtn.disabled = !isRecording;

        const isCanvasEmpty = appState.canvasManager ? appState.canvasManager.isCanvasEmpty() : true;
        if (deleteBtn) deleteBtn.disabled = isCanvasEmpty;
        
        if (playerUI.clearPlaylistBtn) playerUI.clearPlaylistBtn.disabled = !hasTrack;

        if (isPaused) {
            statusBox.textContent = langDict.statusPaused;
            statusBox.className = 'status-box paused';
            if(pauseResumeRecBtn) pauseResumeRecBtn.textContent = langDict.resumeRecBtn;
        } else if (isRecording) {
            statusBox.textContent = langDict.statusRecording;
            statusBox.className = 'status-box recording';
            if(pauseResumeRecBtn) pauseResumeRecBtn.textContent = langDict.pauseRecBtn;
        } else if (isPrepared) {
            statusBox.textContent = langDict.statusReady(recordingCanvas.width, recordingCanvas.height);
            statusBox.className = 'status-box ready';
        } else if (hasTrack) {
            statusBox.textContent = langDict.statusHasTrack;
            statusBox.className = 'status-box';
        } else {
            statusBox.textContent = langDict.statusInitial;
            statusBox.className = 'status-box';
            if(playerUI.trackName) playerUI.trackName.textContent = langDict.noFileLoaded;
        }

        document.querySelectorAll('.delete-track-btn').forEach(btn => {
            btn.title = langDict.deleteTrackTitle;
        });

        const fileUploadText = document.getElementById('fileUploadText');
        if (fileUploadText) {
            if (appState.player && appState.player.playlist.length > 0) {
                fileUploadText.textContent = langDict.uploadButtonWithFiles(appState.player.playlist.length);
            } else {
                fileUploadText.textContent = langDict.uploadButtonDefault;
            }
        }

        const bgImageDropdownText = document.getElementById('bgImageDropdownText');
        if(bgImageDropdownText) bgImageDropdownText.textContent = langDict.bgImageButtonDefault;
    }

    function renderBgImageDropdown() {
        if (!bgImageDropdown) return;
        const langDict = translations[appState.currentLanguage];
        const existingItems = bgImageDropdown.querySelectorAll('.custom-dropdown-item:not(.add-new)');
        existingItems.forEach(item => item.remove());

        if (appState.galleryImages.length === 0) {
            const noImageItem = document.createElement('div');
            noImageItem.className = 'custom-dropdown-item disabled';
            noImageItem.innerHTML = `<span class="dropdown-item-name">${langDict.bgImageNoImage}</span>`;
            bgImageDropdown.insertBefore(noImageItem, bgImageDropdown.querySelector('.add-new'));
        }

        appState.galleryImages.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';
            const nameSpan = document.createElement('span');
            nameSpan.className = 'dropdown-item-name';
            nameSpan.textContent = img.name;
            nameSpan.addEventListener('click', () => {
                appState.canvasManager.addImage(img.imageObject);
                bgImageDropdown.style.display = 'none';
            });
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'dropdown-item-actions';
            
            // Button: Als globalen Hintergrund setzen
            const setBgBtn = document.createElement('button');
            setBgBtn.className = 'gallery-btn';
            setBgBtn.title = langDict.setAsBackgroundTitle;
            setBgBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 15-5-5h3V9h4v4h3l-5 5z"></path></svg>`;
            setBgBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                appState.canvasManager.setBackground(img.imageObject);
                bgImageDropdown.style.display = 'none';
            });
            
            // NEU: Button für Workspace-Hintergrund
            const setWorkspaceBgBtn = document.createElement('button');
            setWorkspaceBgBtn.className = 'gallery-btn workspace-bg-btn';
            setWorkspaceBgBtn.title = langDict.setAsWorkspaceBgTitle;
            setWorkspaceBgBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"></path></svg>`;
            setWorkspaceBgBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const success = appState.canvasManager.setWorkspaceBackground(img.imageObject);
                if (success) {
                    bgImageDropdown.style.display = 'none';
                } else {
                    alert(langDict.workspaceRequiredWarning);
                }
            });
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'gallery-btn remove-btn';
            removeBtn.title = 'Bild aus Galerie entfernen';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeGalleryImage(index);
            });
            
            actionsDiv.appendChild(setBgBtn);
            actionsDiv.appendChild(setWorkspaceBgBtn);
            actionsDiv.appendChild(removeBtn);
            item.appendChild(nameSpan);
            item.appendChild(actionsDiv);
            bgImageDropdown.insertBefore(item, bgImageDropdown.querySelector('.add-new'));
        });
        
        // NEU: Thumbnail-Galerie auch aktualisieren
        renderGalleryThumbnails();
    }

    // NEU: Thumbnail-Galerie oberhalb des Canvas
    function renderGalleryThumbnails() {
        const container = document.getElementById('gallery-thumbnails-container');
        const thumbnailsDiv = document.getElementById('gallery-thumbnails');
        
        if (!container || !thumbnailsDiv) {
            console.warn('[Thumbnails] Container nicht gefunden');
            return;
        }
        
        // Container anzeigen/verstecken basierend auf Bilderanzahl
        if (appState.galleryImages.length === 0) {
            container.style.display = 'none';
            return;
        } else {
            container.style.display = 'block';
        }
        
        // Thumbnails erstellen
        thumbnailsDiv.innerHTML = '';
        console.log('[Thumbnails] Erstelle', appState.galleryImages.length, 'Thumbnails');
        
        appState.galleryImages.forEach((img, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'gallery-thumb';
            thumb.title = `Linksklick: Zum Canvas hinzufügen\nRechtsklick: Weitere Optionen`;
            
            const imgElement = document.createElement('img');
            imgElement.src = img.url;
            imgElement.alt = img.name;
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'gallery-thumb-name';
            nameLabel.textContent = img.name;
            
            thumb.appendChild(imgElement);
            thumb.appendChild(nameLabel);
            
            // Linksklick: Bild zum Canvas hinzufügen
            thumb.addEventListener('click', (e) => {
                console.log('[Thumbnails] Linksklick auf:', img.name);
                appState.canvasManager.addImage(img.imageObject);
            });
            
            // Rechtsklick: Kontextmenü anzeigen
            thumb.addEventListener('contextmenu', (e) => {
                console.log('[Thumbnails] Rechtsklick auf:', img.name);
                e.preventDefault();
                e.stopPropagation();
                showThumbnailContextMenu(e, img);
            });
            
            thumbnailsDiv.appendChild(thumb);
        });
        
        console.log('[Thumbnails] Rendering abgeschlossen');
    }
   // NEU: Kontextmenü für Thumbnails
  // NEU: Kontextmenü für Thumbnails
    function showThumbnailContextMenu(event, imageData) {
        const langDict = translations[appState.currentLanguage];
        
        // Altes Menü entfernen falls vorhanden
        const oldMenu = document.querySelector('.thumbnail-context-menu');
        if (oldMenu) {
            oldMenu.remove();
        }
        
        // Neues Menü erstellen
        const menu = document.createElement('div');
        menu.className = 'thumbnail-context-menu';
        
        // Position relativ zum Viewport (für position: fixed)
        const x = Math.min(event.clientX, window.innerWidth - 220);
        const y = Math.min(event.clientY, window.innerHeight - 200);
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Helper-Funktion zum Schließen des Menüs
        const closeMenu = () => {
            menu.remove();
            document.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('contextmenu', handleOutsideClick);
        };
        
        // Option 1: Zum Canvas hinzufügen
        const addToCanvasItem = document.createElement('div');
        addToCanvasItem.className = 'thumbnail-context-menu-item';
        addToCanvasItem.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            <span>${appState.currentLanguage === 'de' ? 'Zum Canvas hinzufügen' : 'Add to Canvas'}</span>
        `;
        addToCanvasItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            appState.canvasManager.addImage(imageData.imageObject);
            closeMenu();
        });
        
        // Option 2: Als globalen Hintergrund
        const setGlobalBgItem = document.createElement('div');
        setGlobalBgItem.className = 'thumbnail-context-menu-item';
        setGlobalBgItem.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 15-5-5h3V9h4v4h3l-5 5z"></path></svg>
            <span>${langDict.setAsBackgroundTitle}</span>
        `;
        setGlobalBgItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            appState.canvasManager.setBackground(imageData.imageObject);
            closeMenu();
        });
        
        // Option 3: Als Workspace-Hintergrund
        const setWorkspaceBgItem = document.createElement('div');
        setWorkspaceBgItem.className = 'thumbnail-context-menu-item';
        setWorkspaceBgItem.innerHTML = `
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"></path></svg>
            <span>${langDict.setAsWorkspaceBgTitle}</span>
        `;
        setWorkspaceBgItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const success = appState.canvasManager.setWorkspaceBackground(imageData.imageObject);
            if (!success) {
                alert(langDict.workspaceRequiredWarning);
            }
            closeMenu();
        });
        
        menu.appendChild(addToCanvasItem);
        menu.appendChild(setGlobalBgItem);
        menu.appendChild(setWorkspaceBgItem);
        
        document.body.appendChild(menu);
        
        // Handler für Klicks außerhalb des Menüs
        const handleOutsideClick = (e) => {
            if (!menu.contains(e.target)) {
                closeMenu();
            }
        };
        
        // Mit Verzögerung registrieren, damit das aktuelle contextmenu Event nicht sofort triggert
        setTimeout(() => {
            document.addEventListener('click', handleOutsideClick);
            document.addEventListener('contextmenu', handleOutsideClick);
        }, 50);
    }
    function removeGalleryImage(index) {
        if (index < 0 || index >= appState.galleryImages.length) return;
        const removedImage = appState.galleryImages.splice(index, 1)[0];
        const canvasState = appState.canvasManager.getCanvasState();
        
        // Globalen Hintergrund prüfen (kann Objekt oder direktes Image sein)
        if (canvasState.background) {
            const bgImageObject = canvasState.background.imageObject || canvasState.background;
            if (bgImageObject === removedImage.imageObject) {
                appState.canvasManager.setBackground(null);
            }
        }
        
        // Workspace-Hintergrund prüfen
        if (canvasState.workspaceBackground && canvasState.workspaceBackground.imageObject === removedImage.imageObject) {
            appState.canvasManager.workspaceBackground = null;
        }
        
        appState.canvasManager.removeImageBySource(removedImage.imageObject);

        URL.revokeObjectURL(removedImage.url);
        updateUIState();
        renderBgImageDropdown();
        redrawStaticallyIfNeeded();
    }
    
    async function initializeApplication() {
        appState.canvasContainer = document.createElement('div');
        appState.canvasContainer.style.position = 'relative';
        canvas.parentNode.insertBefore(appState.canvasContainer, canvas);
        appState.canvasContainer.appendChild(canvas);

        appState.fontManager = new FontManager();
        await appState.fontManager.initialize(CUSTOM_FONTS);
        
        appState.textManager = new TextManager(
            appState.fontManager, 
            redrawStaticallyIfNeeded, 
            updateUIState
        );

        appState.gridManager = new GridManager(canvas);
        appState.fotoManager = new FotoManager(redrawStaticallyIfNeeded);

        // Narakeet API mit fest hinterlegtem Key (Pro-Feature)
        const NARAKEET_API_KEY = 'rPqWwEFnbq5MDmxYGtAaY4b4mKkjE7xR8fplS8Ng';
        appState.narakeetAPI = new NarakeetAPI(NARAKEET_API_KEY);

        const canvasDependencies = {
            textManager: appState.textManager,
            gridManager: appState.gridManager,
            fotoManager: appState.fotoManager,
            onObjectSelected: (activeObject) => {
                // Prüfen ob Bild ausgewählt (normal, background oder workspace-background)
                const isImage = activeObject && (
                    activeObject.type === 'image' || 
                    activeObject.type === 'background' || 
                    activeObject.type === 'workspace-background'
                );
                
                appState.fotoManager.updateUIVisibility(fotoControls, isImage);
                
                if (isImage) {
                    appState.fotoManager.updateUIFromSettings(fotoControls, activeObject);
                }
                
                if (activeObject && activeObject.type === 'text') {
                    appState.textManager.setActiveObject(activeObject);
                } else {
                    appState.textManager.setActiveObject(null);
                }
            },
            onTextDoubleClick: startTextEditing,
            onStateChange: updateUIState,
            redraw: redrawStaticallyIfNeeded,
            redrawCallback: redrawStaticallyIfNeeded
        };
        
        appState.canvasManager = new CanvasManager(canvas, canvasDependencies);
        
        appState.player = new Player(audioPlayer, playerUI, updateUIState);
        
        appState.textManager.setupUIHandlers(textControls);
        appState.fotoManager.setupUIHandlers(fotoControls);
        appState.canvasManager.setupInteractionHandlers(); 

        setupEventListeners();
        populateVisualizerSelect();
        populateFotoPresets();
        resizeCanvas();
        setLanguage(appState.currentLanguage);
    }

    async function initAudioContextAndAnalyser() {
        if (appState.audioContext) return;
        appState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (appState.audioContext.state === 'suspended') await appState.audioContext.resume();
        
        appState.analyser = appState.audioContext.createAnalyser();
        appState.analyser.fftSize = 1024;
        appState.analyser.smoothingTimeConstant = 0.8;
        
        appState.sourceNode = appState.audioContext.createMediaElementSource(audioPlayer);
        appState.outputGain = appState.audioContext.createGain();
        appState.outputGain.gain.value = audioPlayer.volume;
        
        const visualizerGain = appState.audioContext.createGain();
        visualizerGain.gain.value = 1.2;
        const recordingDest = appState.audioContext.createMediaStreamDestination();
        
        // ================== ÄNDERUNG START ==================
        const recorderCallbacks = {
            onStateChange: updateUIState,
            onForceRedraw: forceRedrawRecordingFrame
        };
        appState.recorder = new Recorder(recordingCanvas, appState.player, audioPlayer, recordingDest.stream, { prepareRecBtn, stopRecBtn, statusBox }, recorderCallbacks);

        // Lokalen Download-Modus als Standard aktivieren
        const downloadModeSelect = document.getElementById('downloadModeSelect');
        if (downloadModeSelect && downloadModeSelect.value === 'local') {
            appState.recorder.enableDirectDownloadMode();
            console.log('[INIT] Lokaler Download-Modus aktiviert');
        }
        // =================== ÄNDERUNG ENDE ===================

        appState.sourceNode.connect(appState.outputGain);
        appState.sourceNode.connect(visualizerGain);
        appState.outputGain.connect(appState.audioContext.destination);
        visualizerGain.connect(appState.analyser);
        visualizerGain.connect(recordingDest);
    }

 function drawVisualizer() {
	 
    appState.visualizerAnimationFrameId = requestAnimationFrame(drawVisualizer);
    if (!appState.analyser || !appState.canvasManager) return;

    // --- Step 1: Always draw the user-facing canvas ---
    const ctx = canvas.getContext('2d');
    appState.canvasManager.draw(ctx);

    // --- Step 2: Check if the visualizer effect should be drawn ---
    const isActuallyPlaying = !audioPlayer.paused;
    const shouldDrawVisualizerEffect = appState.isVisualizerEnabled && !audioPlayer.muted && isActuallyPlaying;

    if (shouldDrawVisualizerEffect) {
        const bufferLength = appState.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const visualizer = Visualizers[visualizerSelect.value];
        if (visualizer) {
            if (visualizer.needsTimeData) {
                appState.analyser.getByteTimeDomainData(dataArray);
            } else {
                appState.analyser.getByteFrequencyData(dataArray);
            }
            visualizer.draw(ctx, dataArray, bufferLength, canvas.width, canvas.height, appState.visualizerColor);
        }
    }

    // --- Step 3: Recording logic with proper pause handling ---
if (appState.recorder && appState.recorder.isActive) {
    // Visualizer-Callback vorbereiten (NUR wenn nicht pausiert UND Audio spielt)
    let visualizerCallback = null;

    if (!appState.recorder.isPaused) {
        const isActuallyPlaying = !audioPlayer.paused;
        const shouldDrawVisualizerEffect = appState.isVisualizerEnabled && !audioPlayer.muted && isActuallyPlaying;

        if (shouldDrawVisualizerEffect && Visualizers[visualizerSelect.value]) {
            visualizerCallback = (ctx) => {
                const bufferLength = appState.analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                if (Visualizers[visualizerSelect.value].needsTimeData) {
                    appState.analyser.getByteTimeDomainData(dataArray);
                } else {
                    appState.analyser.getByteFrequencyData(dataArray);
                }
                Visualizers[visualizerSelect.value].draw(ctx, dataArray, bufferLength, ctx.canvas.width, ctx.canvas.height, appState.visualizerColor);
            };
        }
    }

    // Canvas zeichnen (mit oder ohne Workspace-Preset) + Visualizer
    if (appState.canvasManager.workspacePreset) {
        appState.canvasManager.drawForRecording(recordingCtx, visualizerCallback);
    } else {
        appState.canvasManager.draw(recordingCtx);
        if (visualizerCallback) visualizerCallback(recordingCtx);
    }

    // Frame manuell erfassen (immer, auch während Pause)
    const track = appState.recorder.currentCanvasStream?.getVideoTracks()[0];
    if (track) {
        track.requestFrame();
    }
}
}

    function stopAndResetVisualizer() {
        if (appState.visualizerAnimationFrameId) {
            cancelAnimationFrame(appState.visualizerAnimationFrameId);
            appState.visualizerAnimationFrameId = null;
        }
        if(appState.canvasManager) appState.canvasManager.draw(canvas.getContext('2d'));
    }

    function redrawStaticallyIfNeeded() {
        if (!appState.visualizerAnimationFrameId) {
            requestAnimationFrame(() => {
                if(appState.canvasManager) appState.canvasManager.draw(canvas.getContext('2d'));
            });
        }
    }

   function forceRedrawRecordingFrame() {
    if (!appState.recorder || !appState.recorder.isActive) return;

    console.log("Forcing a redraw of the recording frame.");
    
    // Einfach einmal durchzeichnen - der Loop übernimmt den Rest
    if (appState.canvasManager.workspacePreset) {
        appState.canvasManager.drawForRecording(recordingCtx);
    } else {
        appState.canvasManager.draw(recordingCtx);
    }
}

    function populateVisualizerSelect() {
        if (!visualizerSelect) return;
        for (const key in Visualizers) {
            const option = document.createElement('option');
            option.value = key;
            const nameKey = `name_${appState.currentLanguage}`;
            option.textContent = Visualizers[key][nameKey] || Visualizers[key].name_de || key;
            visualizerSelect.appendChild(option);
        }
        visualizerSelect.value = 'bars';
    }

    function populateFotoPresets() {
        const presetSelect = fotoControls.presetSelect;
        if (!presetSelect) return;

        // WICHTIG: Alte Optionen zuerst löschen!
        presetSelect.innerHTML = '';

        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = appState.currentLanguage === 'de' ? 'Kein Filter' : 'No Filter';
        presetSelect.appendChild(noneOption);

        const presets = appState.fotoManager.getAvailablePresets();
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = appState.currentLanguage === 'de' ? preset.name_de : preset.name_en;
            presetSelect.appendChild(option);
        });
    }

    function resizeCanvas() {
        const computedStyle = getComputedStyle(canvas);
        const cssWidth = parseInt(computedStyle.width);
        if (canvas.width !== cssWidth) canvas.width = cssWidth;
        if (canvas.height !== cssWidth * (9/16)) canvas.height = cssWidth * (9/16);
        redrawStaticallyIfNeeded();
    }
    
    // --- Event Listener Setup ---

    function setupLanguageSwitcher() {
        if (langSwitcher) {
            langSwitcher.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    setLanguage(e.target.dataset.lang);
                }
            });
        }
    }

    function setupCanvasControls() {
        if (bgImageDropdownBtn) {
            bgImageDropdownBtn.addEventListener('click', () => {
                if(bgImageDropdown) {
                    bgImageDropdown.style.display = bgImageDropdown.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
        if (bgImageFile) {
            bgImageFile.addEventListener('change', (e) => {
                for(const file of e.target.files) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            appState.galleryImages.push({ name: file.name, url: event.target.result, imageObject: img });
                            renderBgImageDropdown();
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
                bgImageFile.value = '';
                if(bgImageDropdown) bgImageDropdown.style.display = 'none';
            });
        }
        if (bgColorInput) {
            bgColorInput.addEventListener('input', (e) => {
                appState.canvasManager.setBackground(e.target.value);
            });
        }
        if (visualizerColorInput) {
            visualizerColorInput.addEventListener('input', (e) => {
                appState.visualizerColor = e.target.value;
                redrawStaticallyIfNeeded();
            });
        }
        if (visualizerToggle) {
            visualizerToggle.addEventListener('change', (e) => {
                appState.isVisualizerEnabled = e.target.checked;
                redrawStaticallyIfNeeded();
            });
        }
        if (visualizerSelect) {
            visualizerSelect.addEventListener('change', () => {
                if (Visualizers[visualizerSelect.value]?.init) {
                    Visualizers[visualizerSelect.value].init(canvas.width, canvas.height);
                }
                redrawStaticallyIfNeeded();
            });
        }
    }
    
    function setupGridControls() {
        const gridToggle = document.getElementById('gridToggle');
        const snapToggle = document.getElementById('snapToggle');
        const gridSizeInput = document.getElementById('gridSizeInput');
        const gridColorInput = document.getElementById('gridColorInput');
        const gridOpacityInput = document.getElementById('gridOpacityInput');

        if (gridToggle) {
            gridToggle.addEventListener('change', (e) => {
                appState.gridManager.setVisibility(e.target.checked);
                redrawStaticallyIfNeeded();
            });
        }
        if (snapToggle) {
            snapToggle.addEventListener('change', (e) => {
                appState.gridManager.setSnapToGrid(e.target.checked);
            });
        }
        if (gridSizeInput) {
            gridSizeInput.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                appState.gridManager.setGridSize(size);
                document.getElementById('gridSizeValue').textContent = size + 'px';
                redrawStaticallyIfNeeded();
            });
        }
        if (gridColorInput && gridOpacityInput) {
            const updateGridColor = () => {
                const color = gridColorInput.value;
                const opacity = parseInt(gridOpacityInput.value) / 100;
                appState.gridManager.setGridColor(color, opacity);
                document.getElementById('gridOpacityValue').textContent = `${parseInt(gridOpacityInput.value)}%`;
                redrawStaticallyIfNeeded();
            };
            gridColorInput.addEventListener('input', updateGridColor);
            gridOpacityInput.addEventListener('input', updateGridColor);
            updateGridColor();
        }
    }
    
    function setupWorkspaceControls() {
        if (workspaceControls.workspaceSelect) {
            workspaceControls.workspaceSelect.addEventListener('change', (e) => {
                appState.canvasManager.setWorkspacePreset(e.target.value || null);
            });
        }
        if (workspaceControls.workspaceToggle) {
            workspaceControls.workspaceToggle.addEventListener('change', (e) => {
                appState.canvasManager.showWorkspaceOutline = e.target.checked;
                redrawStaticallyIfNeeded();
            });
        }
    }
    
function setupRecordingControls() {
    // Download-Modus Event Listener
    const downloadModeSelect = document.getElementById('downloadModeSelect');
    if (downloadModeSelect) {
        downloadModeSelect.addEventListener('change', () => {
            if (appState.recorder) {
                if (downloadModeSelect.value === 'local') {
                    appState.recorder.enableDirectDownloadMode();
                    console.log('[MAIN] Download-Modus: Lokal');
                } else {
                    appState.recorder.enableServerUploadMode();
                    console.log('[MAIN] Download-Modus: Server');
                }
            }
        });
        // Standardmäßig lokalen Modus aktivieren
        if (appState.recorder && downloadModeSelect.value === 'local') {
            appState.recorder.enableDirectDownloadMode();
        }
    }

    // ================== NEU: Play-Button Handler für Aufnahme ohne Musik ==================
    // ENTFERNT: Play-Button startet jetzt keine Aufnahme mehr
    // Die Aufnahme wird über den "Aufnahme starten" Button gestartet
    // =====================================================================================

    if (prepareRecBtn) {
        prepareRecBtn.addEventListener('click', async () => {
            await initAudioContextAndAnalyser();

            // Prüfen ob bereits vorbereitet
            if (appState.recorder?.isPrepared && !appState.recorder.isActive) {
                // AUFNAHME STARTEN (ohne automatisch Player zu starten)
                console.log('[MAIN] Starte Aufnahme...');
                appState.recorder.start();
                
                // Visualizer-Loop starten für Canvas-Animation
                if (!appState.visualizerAnimationFrameId) {
                    drawVisualizer();
                }
                
                updateUIState();
            } else {
                // AUFNAHME VORBEREITEN
                let width, height;
                if (appState.canvasManager.workspacePreset) {
                    const preset = appState.canvasManager.workspacePreset;
                    width = preset.width;
                    height = preset.height;
                    appState.canvasManager.prepareForRecording(recordingCanvas);
                } else {
                    [width, height] = document.getElementById('resolutionSelect').value.split('x').map(Number);
                    recordingCanvas.width = width;
                    recordingCanvas.height = height;
                }
                const videoBitsPerSecond = parseInt(document.getElementById('qualitySelect').value, 10);
                
                if (appState.recorder) {
                    appState.recorder.prepare({ videoBitsPerSecond });
                }
            }
        });
    }
    if (pauseResumeRecBtn) {
        // ================== ÄNDERUNG START ==================
        pauseResumeRecBtn.addEventListener('click', () => {
            if (!appState.recorder) return;
        
            if (appState.recorder.isPaused) {
                appState.recorder.resume();
            } else {
                appState.recorder.pause();
            }
        });
        // =================== ÄNDERUNG ENDE ===================
    }
    if (stopRecBtn) {
        stopRecBtn.addEventListener('click', async () => {
            const langDict = translations[appState.currentLanguage];
            
            statusBox.textContent = langDict.recStatusProcessing || "Video wird verarbeitet, bitte warten...";
            statusBox.className = 'status-box processing';
            stopRecBtn.disabled = true;
            if (pauseResumeRecBtn) pauseResumeRecBtn.disabled = true;

            if (appState.player) appState.player.stop();
            
            if (appState.recorder) {
                appState.lastVideoBlob = await appState.recorder.stop();
            }
            
            if (appState.lastVideoBlob) {
                const videoSizeMB = (appState.lastVideoBlob.size / 1024 / 1024).toFixed(2);
                statusBox.textContent = `✅ Video erfolgreich erstellt! (${videoSizeMB} MB)`;
                statusBox.className = 'status-box success';
                
                const previewVideo = document.getElementById('preview');
                const downloadLink = document.getElementById('downloadLink');
                
                if (previewVideo && downloadLink && resultsPanel) {
                    const videoURL = URL.createObjectURL(appState.lastVideoBlob);
                    previewVideo.src = videoURL;
                    
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                    const filename = `audio-visualizer-${timestamp}.webm`;
                    
                    downloadLink.download = filename;
                    downloadLink.blob = appState.lastVideoBlob;
                    
                    resultsPanel.style.display = 'block';
                    
                    const videoInfoDiv = document.getElementById('videoInfo');
                    if (videoInfoDiv) {
                        const mimeType = appState.lastVideoBlob.type;
                        videoInfoDiv.textContent = langDict.recMimeInfo(
                            mimeType, 
                            recordingCanvas.width, 
                            recordingCanvas.height, 
                            videoSizeMB
                        );
                    }
                }
            } else {
                statusBox.textContent = "❌ Fehler beim Erstellen des Videos";
                statusBox.className = 'status-box error';
            }
            
            updateUIState();
        });
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (appState.recorder?.isActive) await appState.recorder.stop();
            appState.canvasManager.reset();
            appState.textManager.clear();
            appState.lastVideoBlob = null;
            if (bgColorInput) bgColorInput.value = '#000000';
            updateUIState();
            redrawStaticallyIfNeeded();
        });
    }
}

    function setupMediaControls() {
        if (audioPlayer) {
            audioPlayer.addEventListener('playing', async () => {
                if (!appState.audioContext) await initAudioContextAndAnalyser();
                if (appState.audioContext?.state === 'suspended') await appState.audioContext.resume();
                
                // Aufnahme wird NICHT automatisch gestartet - nur über den "Aufnahme starten" Button
                
                if (!appState.visualizerAnimationFrameId) {
                    drawVisualizer();
                }
            });
            audioPlayer.addEventListener('pause', () => {
                if (!appState.recorder || !appState.recorder.isPaused) {
                    stopAndResetVisualizer();
                }
            });
            audioPlayer.addEventListener('ended', () => {
                // Player hat KEINEN Einfluss auf die Aufnahme
                // Aufnahme läuft weiter, auch wenn Track zu Ende ist
                // User muss Aufnahme manuell über "Aufnahme stoppen" Button beenden
            });
             audioPlayer.addEventListener('volumechange', () => {
                if(appState.outputGain) appState.outputGain.gain.value = audioPlayer.volume;
            });
        }
    }

    function setupGlobalListeners() {
        document.addEventListener('click', (e) => {
            if (bgImageDropdownBtn && !bgImageDropdownBtn.contains(e.target) && bgImageDropdown && !bgImageDropdown.contains(e.target)) {
                bgImageDropdown.style.display = 'none';
            }
        });
        
        if (closePreviewBtn) {
            closePreviewBtn.addEventListener('click', () => {
                if (resultsPanel) resultsPanel.style.display = 'none';
                const previewVideo = document.getElementById('preview');
                if(previewVideo) {
                    previewVideo.pause();
                    if(previewVideo.src.startsWith('blob:')) {
                        URL.revokeObjectURL(previewVideo.src);
                    }
                    previewVideo.src = "";
                }
                appState.lastVideoBlob = null;
                const downloadLink = document.getElementById('downloadLink');
                if(downloadLink) downloadLink.blob = null;
                updateUIState();
            });
        }
        
        const downloadLink = document.getElementById('downloadLink'); 
        if(downloadLink) {
            downloadLink.addEventListener('click', async (e) => { 
                e.preventDefault(); 
                if (e.currentTarget.blob) {
                    await saveFileWithPicker(e.currentTarget.blob, e.currentTarget.download);
                } 
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (appState.activeTextEditor) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (document.activeElement.tagName.toLowerCase() !== 'input' && document.activeElement.tagName.toLowerCase() !== 'textarea') {
                    const activeObject = appState.canvasManager.activeObject;
                    if (activeObject) {
                        if (activeObject.type === 'text') {
                            appState.textManager.delete(activeObject);
                        } else {
                            appState.canvasManager.deleteActiveObject();
                        }
                    }
                }
            }
        });

        window.addEventListener('resize', resizeCanvas);
    }

    function setupTextToSpeech() {
        const ttsTextarea = document.getElementById('ttsText');
        const ttsVoiceSelect = document.getElementById('ttsVoice');
        const ttsSpeedSelect = document.getElementById('ttsSpeed');
        const generateBtn = document.getElementById('generateTtsBtn');
        const ttsStatus = document.getElementById('ttsStatus');

        if (!generateBtn) return;

        // Audio generieren Button
        generateBtn.addEventListener('click', async () => {
            const text = ttsTextarea.value.trim();
            const voice = ttsVoiceSelect.value;
            const speed = parseFloat(ttsSpeedSelect.value);

            if (!text) {
                showTtsStatus('Bitte Text eingeben', 'error');
                return;
            }

            if (!appState.narakeetAPI.hasApiKey()) {
                showTtsStatus('Bitte API-Key eingeben', 'error');
                return;
            }

            try {
                generateBtn.disabled = true;
                showTtsStatus('Audio wird generiert...', 'processing');

                const audioBlob = await appState.narakeetAPI.generateAudio(text, {
                    voice,
                    speed,
                    format: 'mp3'
                });

                const audioFile = appState.narakeetAPI.createAudioFile(audioBlob, text, voice);

                // Audio zur Playlist hinzufügen
                await initAudioContextAndAnalyser();
                await appState.player.addFiles([audioFile]);

                showTtsStatus(`✓ Audio generiert: ${audioFile.name}`, 'success');

                // Optional: Text-Feld leeren
                // ttsTextarea.value = '';

            } catch (error) {
                console.error('[TTS] Fehler:', error);
                showTtsStatus(`Fehler: ${error.message}`, 'error');
            } finally {
                generateBtn.disabled = false;
            }
        });

        function showTtsStatus(message, type = 'info') {
            if (!ttsStatus) return;

            ttsStatus.textContent = message;
            ttsStatus.className = `tts-status tts-status-${type}`;

            if (type === 'success') {
                setTimeout(() => {
                    ttsStatus.textContent = '';
                    ttsStatus.className = 'tts-status';
                }, 5000);
            }
        }
    }

    function setupEventListeners() {
        setupLanguageSwitcher();
        setupCanvasControls();
        setupGridControls();
        setupWorkspaceControls();
        setupRecordingControls();
        setupMediaControls();
        setupTextToSpeech();
        setupGlobalListeners();
    }
    
    // --- Start Application ---
    initializeApplication();
});