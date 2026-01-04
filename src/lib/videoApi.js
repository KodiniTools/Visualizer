/**
 * Video API Service
 *
 * Kommuniziert mit dem FFmpeg Backend Server für:
 * - Video-Upload und Konvertierung (WebM → MP4)
 * - Job-Status Abfragen
 * - Download verarbeiteter Videos
 */

// API Base URL (relativ für NGINX Proxy)
const API_BASE = '/visualizer/api';

/**
 * Prüft ob der Backend-Server verfügbar ist
 */
export async function checkServerHealth() {
  try {
    const response = await fetch('/visualizer/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        status: data.status,
        uptime: data.uptime
      };
    }
    return { available: false, error: 'Server not responding' };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

/**
 * Holt Server-Informationen (FFmpeg Status, Presets etc.)
 */
export async function getServerInfo() {
  try {
    const response = await fetch(`${API_BASE}/info`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      return await response.json();
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error('[VideoAPI] Server info error:', error);
    return null;
  }
}

/**
 * Konvertiert ein Video (WebM → MP4)
 *
 * @param {Blob} videoBlob - Das WebM Video-Blob
 * @param {Object} options - Konvertierungsoptionen
 * @param {string} options.quality - Qualitäts-Preset: 'highest', 'high', 'medium', 'social', 'preview'
 * @param {function} options.onProgress - Progress Callback (0-100)
 * @returns {Promise<{jobId: string, status: string}>}
 */
export async function convertVideo(videoBlob, options = {}) {
  const quality = options.quality || 'high';

  const formData = new FormData();
  formData.append('video', videoBlob, 'recording.webm');
  formData.append('quality', quality);

  try {
    const response = await fetch(`${API_BASE}/convert`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.success && result.jobId) {
      return {
        success: true,
        jobId: result.jobId,
        status: result.status
      };
    }

    throw new Error(result.error || 'Unknown error');
  } catch (error) {
    console.error('[VideoAPI] Convert error:', error);
    throw error;
  }
}

/**
 * Fragt den Status eines Konvertierungs-Jobs ab
 *
 * @param {string} jobId - Die Job-ID
 * @returns {Promise<Object>} Job-Status Objekt
 */
export async function getJobStatus(jobId) {
  try {
    const response = await fetch(`${API_BASE}/status/${jobId}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { status: 'not_found', error: 'Job not found' };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[VideoAPI] Status error:', error);
    throw error;
  }
}

/**
 * Wartet auf Job-Abschluss mit Polling
 *
 * @param {string} jobId - Die Job-ID
 * @param {Object} options - Optionen
 * @param {function} options.onProgress - Progress Callback (0-100)
 * @param {number} options.pollInterval - Polling-Intervall in ms (default: 1000)
 * @param {number} options.timeout - Timeout in ms (default: 1800000 = 30 min)
 * @returns {Promise<Object>} Finales Job-Ergebnis
 */
export async function waitForJob(jobId, options = {}) {
  const pollInterval = options.pollInterval || 1000;
  const timeout = options.timeout || 1800000; // 30 Minuten (für große Videos 100+ MB)
  const onProgress = options.onProgress || (() => {});

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      // Timeout Check
      if (Date.now() - startTime > timeout) {
        reject(new Error('Conversion timeout'));
        return;
      }

      try {
        const status = await getJobStatus(jobId);

        // Progress Callback
        if (status.progress !== undefined) {
          onProgress(status.progress);
        }

        switch (status.status) {
          case 'completed':
            resolve(status);
            return;

          case 'failed':
            reject(new Error(status.error || 'Conversion failed'));
            return;

          case 'processing':
          case 'pending':
            // Weiter pollen
            setTimeout(poll, pollInterval);
            break;

          case 'not_found':
            reject(new Error('Job not found'));
            return;

          default:
            // Unbekannter Status - weiter pollen
            setTimeout(poll, pollInterval);
        }
      } catch (error) {
        // Bei Netzwerkfehlern weiter versuchen
        console.warn('[VideoAPI] Polling error, retrying:', error.message);
        setTimeout(poll, pollInterval * 2);
      }
    };

    // Start Polling
    poll();
  });
}

/**
 * Generiert die Download-URL für eine verarbeitete Datei
 *
 * @param {string} filename - Der Dateiname
 * @param {boolean} cleanup - Ob die Datei nach Download gelöscht werden soll
 * @returns {string} Die vollständige Download-URL
 */
export function getDownloadUrl(filename, cleanup = false) {
  const url = `${API_BASE}/download/${filename}`;
  return cleanup ? `${url}?cleanup=true` : url;
}

/**
 * Löscht eine Datei auf dem Server
 *
 * @param {string} filename - Der Dateiname
 * @returns {Promise<Object>} Ergebnis
 */
export async function cleanupFile(filename) {
  try {
    const response = await fetch(`${API_BASE}/cleanup/${filename}`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    console.warn('[VideoAPI] Cleanup error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generiert die File-URL für statische Dateien
 *
 * @param {string} filename - Der Dateiname
 * @returns {string} Die vollständige File-URL
 */
export function getFileUrl(filename) {
  return `/visualizer/files/${filename}`;
}

/**
 * Kompletter Konvertierungs-Workflow
 *
 * @param {Blob} videoBlob - Das WebM Video-Blob
 * @param {Object} options - Optionen
 * @param {string} options.quality - Qualitäts-Preset
 * @param {function} options.onProgress - Progress Callback (0-100)
 * @param {function} options.onStatusChange - Status Change Callback
 * @returns {Promise<Object>} Ergebnis mit downloadUrl
 */
export async function convertAndWait(videoBlob, options = {}) {
  const onProgress = options.onProgress || (() => {});
  const onStatusChange = options.onStatusChange || (() => {});

  // 1. Upload starten
  onStatusChange('uploading');
  onProgress(5);

  const uploadResult = await convertVideo(videoBlob, {
    quality: options.quality || 'high'
  });

  if (!uploadResult.success) {
    throw new Error('Upload failed');
  }

  // 2. Auf Konvertierung warten
  onStatusChange('converting');
  onProgress(10);

  const result = await waitForJob(uploadResult.jobId, {
    onProgress: (progress) => {
      // Progress von 10-95 mappen (5% für Upload, 5% für Finalisierung)
      const mappedProgress = 10 + (progress * 0.85);
      onProgress(Math.round(mappedProgress));
    },
    pollInterval: 1000,
    timeout: 1800000  // 30 Minuten für große Videos (100+ MB)
  });

  // 3. Ergebnis aufbereiten
  onStatusChange('completed');
  onProgress(100);

  return {
    success: true,
    downloadUrl: getDownloadUrl(result.outputFile),
    fileUrl: getFileUrl(result.outputFile),
    filename: result.outputFile,
    thumbnail: result.thumbnail ? getFileUrl(result.thumbnail) : null,
    info: result.info
  };
}

export default {
  checkServerHealth,
  getServerInfo,
  convertVideo,
  getJobStatus,
  waitForJob,
  getDownloadUrl,
  getFileUrl,
  cleanupFile,
  convertAndWait
};
