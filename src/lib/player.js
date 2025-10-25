/**
 * player.js - Handles all audio playback, playlist, and UI logic for the player.
 */
class Player {
    constructor(audioElement, ui, onTrackChange) {
        this.audio = audioElement;
        this.ui = ui;
        this.onTrackChange = onTrackChange;

        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isShuffling = false;
        this.isRepeat = true; // Default: repeat playlist
        this.isPlaying = false;
        this.lastVolume = 1;

        this._setupEventListeners();
        this.loadVolume();
        this._updateUIStyles();
    }

    _updateUIStyles() {
        if (this.ui.shuffleBtn) this.ui.shuffleBtn.style.color = this.isShuffling ? 'var(--accent)' : 'var(--text)';
        if (this.ui.repeatBtn) this.ui.repeatBtn.style.color = this.isRepeat ? 'var(--accent)' : 'var(--text)';
    }

    _setupEventListeners() {
        // Helper function to safely add event listeners
        const addListener = (element, event, handler, elementName) => {
            if (element) {
                element.addEventListener(event, handler);
            } else {
                // Log a warning if a UI element is expected but not found.
                // This helps in debugging if the HTML and JS get out of sync.
                if (elementName) console.warn(`Player UI element "${elementName}" not found.`);
            }
        };

        // File input
        addListener(this.ui.fileInput, 'change', (e) => this.handleFileUpload(e), 'fileInput');

        // Player controls
        addListener(this.ui.playPauseBtn, 'click', () => this.togglePlayPause(), 'playPauseBtn');
        addListener(this.ui.stopPlayerBtn, 'click', () => this.stop(), 'stopPlayerBtn');
        addListener(this.ui.nextBtn, 'click', () => this.nextTrack(), 'nextBtn');
        addListener(this.ui.prevBtn, 'click', () => this.prevTrack(), 'prevBtn');
        addListener(this.ui.shuffleBtn, 'click', () => this.toggleShuffle(), 'shuffleBtn');
        addListener(this.ui.repeatBtn, 'click', () => this.toggleRepeat(), 'repeatBtn');
        addListener(this.ui.clearPlaylistBtn, 'click', () => this.reset(), 'clearPlaylistBtn');

        // Volume controls
        addListener(this.ui.volumeBtn, 'click', () => this.toggleMute(), 'volumeBtn');
        addListener(this.ui.volumeSlider, 'input', (e) => this.setVolume(e.target.value), 'volumeSlider');

        // Audio element events (this.audio is the core element, should always exist)
        addListener(this.audio, 'timeupdate', () => this.updateProgress());
        addListener(this.audio, 'ended', () => this._handleTrackEnd());
        addListener(this.audio, 'play', () => {
            this.isPlaying = true;
            this.updatePlayPauseIcon();
        });
        addListener(this.audio, 'pause', () => {
            this.isPlaying = false;
            this.updatePlayPauseIcon();
        });

        // Progress bar seeking
        addListener(this.ui.progressBarContainer, 'click', (e) => this.seek(e), 'progressBarContainer');
    }

    _handleTrackEnd() {
        // ÄNDERUNG: Kein automatisches Abspielen des nächsten Tracks
        // User muss jeden Track manuell in der Playlist anklicken
        this.isPlaying = false;
        this.updatePlayPauseIcon();
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        this.addFiles(files);
        event.target.value = '';
    }

    /**
     * Fügt Dateien zur Playlist hinzu (für TTS und File Upload)
     * @param {Array<File>} files - Array von File-Objekten
     */
    async addFiles(files) {
        if (!files || files.length === 0) return;

        const playlistWasEmpty = this.playlist.length === 0;

        const newTracks = files.map(file => ({
            file: file,
            name: file.name,
            url: URL.createObjectURL(file)
        }));

        this.playlist = this.playlist.concat(newTracks);
        this.renderPlaylist();

        if (playlistWasEmpty) {
            this.currentTrackIndex = 0;
            this.loadTrack(this.currentTrackIndex);
        } else {
            this.updatePlaylistUI();
        }

        // Notify main script about the change, including the new file count
        if (this.onTrackChange) {
            this.onTrackChange(this.playlist[this.currentTrackIndex], this.playlist.length);
        }
    }

    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        this.currentTrackIndex = index;
        const track = this.playlist[this.currentTrackIndex];
        this.audio.src = track.url;

        this.ui.trackName.textContent = track.name;
        this.ui.trackInfo.style.display = 'flex';
        this.updatePlaylistUI();

        if (this.onTrackChange) {
            this.onTrackChange(track, this.playlist.length);
        }

        this.audio.onloadedmetadata = () => {
            this.ui.duration.textContent = this.formatTime(this.audio.duration);
        };
    }

    renderPlaylist() {
        this.ui.playlistContainer.innerHTML = '';
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.index = index;
            item.addEventListener('click', () => {
                this.loadTrack(index);
                this.play();
            });

            const nameSpan = document.createElement('span');
            nameSpan.textContent = track.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-track-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteTrack(index);
            });

            item.appendChild(nameSpan);
            item.appendChild(deleteBtn);
            this.ui.playlistContainer.appendChild(item);
        });
        this.updatePlaylistUI();
    }

    updatePlaylistUI() {
        const items = this.ui.playlistContainer.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === this.currentTrackIndex);
        });
    }

    play() {
        // Validierung vor dem Abspielen
        if (this.playlist.length === 0) {
            console.warn('[Player] Cannot play: playlist is empty');
            return Promise.resolve();
        }

        if (!this.audio.src) {
            console.warn('[Player] Cannot play: no audio source set');
            // Versuche, aktuellen Track neu zu laden
            if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.playlist.length) {
                console.log('[Player] Reloading current track...');
                this.loadTrack(this.currentTrackIndex);
            }
            return Promise.resolve();
        }

        // Prüfe ob Audio bereit ist
        if (this.audio.readyState < 2) {
            console.log('[Player] Audio not ready (readyState:', this.audio.readyState, '), loading...');
            this.audio.load();
        }

        // Abspielen mit verbesserter Fehlerbehandlung
        return this.audio.play().catch(e => {
            console.error("[Player] Playback Error:", e.name, e.message);
            this.isPlaying = false;
            this.updatePlayPauseIcon();

            // Bei "NotSupportedError" versuche Track neu zu laden
            if (e.name === 'NotSupportedError' && this.currentTrackIndex >= 0 && this.currentTrackIndex < this.playlist.length) {
                console.log('[Player] Attempting to reload track after error...');
                this.loadTrack(this.currentTrackIndex);
                // Erneuter Versuch nach kurzem Delay
                setTimeout(() => {
                    if (this.audio.readyState >= 2) {
                        this.play();
                    }
                }, 100);
            }
        });
    }

    pause() {
        this.audio.pause();
    }

    stop() {
        this.pause();
        this.audio.currentTime = 0;
    }

    togglePlayPause() {
        if (!this.audio.src || this.playlist.length === 0) return;
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    updatePlayPauseIcon() {
        this.ui.playPauseBtn.innerHTML = this.isPlaying
            ? '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>'
            : '<svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
    }

    nextTrack(autoEnded = false) {
        if (this.playlist.length === 0) return;
        if (this.isShuffling) {
            this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        }
        this.loadTrack(this.currentTrackIndex);
        this.play();
    }

    prevTrack() {
        if (this.playlist.length === 0) return;
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadTrack(this.currentTrackIndex);
        this.play();
    }

    deleteTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        const wasPlaying = this.isPlaying;
        const deletedCurrentTrack = (index === this.currentTrackIndex);

        URL.revokeObjectURL(this.playlist[index].url);
        this.playlist.splice(index, 1);

        if (this.playlist.length === 0) {
            this.reset();
            return;
        }

        if (deletedCurrentTrack) {
            this.stop();
            if (this.currentTrackIndex >= this.playlist.length) {
                this.currentTrackIndex = 0;
            }
            this.loadTrack(this.currentTrackIndex);
            if (wasPlaying) this.play();
        } else if (index < this.currentTrackIndex) {
            this.currentTrackIndex--;
        }

        this.renderPlaylist();

        if (this.onTrackChange) {
            this.onTrackChange(this.playlist[this.currentTrackIndex], this.playlist.length);
        }
    }

    toggleShuffle() {
        this.isShuffling = !this.isShuffling;
        this._updateUIStyles();
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        this._updateUIStyles();
    }

    updateProgress() {
        const { duration, currentTime } = this.audio;
        if (duration) {
            this.ui.progressBar.style.width = `${(currentTime / duration) * 100}%`;
            this.ui.timer.textContent = this.formatTime(currentTime);
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    seek(event) {
        const rect = this.ui.progressBarContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const width = this.ui.progressBarContainer.clientWidth;
        if (this.audio.duration) {
            this.audio.currentTime = (clickX / width) * this.audio.duration;
        }
    }

    reset() {
        this.stop();
        this.playlist.forEach(track => URL.revokeObjectURL(track.url));
        this.playlist = [];
        if(this.ui.fileInput) this.ui.fileInput.value = '';
        this.renderPlaylist();
        if(this.ui.trackInfo) this.ui.trackInfo.style.display = 'none';
        if(this.ui.timer) this.ui.timer.textContent = '0:00';
        if(this.ui.duration) this.ui.duration.textContent = '0:00';
        if(this.ui.progressBar) this.ui.progressBar.style.width = '0%';
        if (this.onTrackChange) {
            this.onTrackChange(null, 0); // Notify with no track and 0 files
        }
    }

    setVolume(value, updateSlider = true) {
        this.audio.volume = value;
        if (updateSlider && this.ui.volumeSlider) this.ui.volumeSlider.value = value;
        this.updateVolumeIcon();
        localStorage.setItem('audioPlayerVolume', value);
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.lastVolume = this.audio.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.lastVolume > 0 ? this.lastVolume : 1);
        }
    }

    updateVolumeIcon() {
        if(!this.ui.volumeIcon || !this.ui.volumeMuteIcon) return;
        const isMuted = this.audio.volume === 0;
        this.ui.volumeIcon.style.display = isMuted ? 'none' : 'inline-block';
        this.ui.volumeMuteIcon.style.display = isMuted ? 'inline-block' : 'none';
    }

    loadVolume() {
        const savedVolume = localStorage.getItem('audioPlayerVolume');
        this.setVolume(savedVolume !== null ? parseFloat(savedVolume) : 1);
    }
}

export { Player };