// veritas_vision_sender.js (VERSIONE CORRETTA)
// Cattura la visione dell'agente e invia al backend per l'analisi

let lastCaptureTime = 0;

/**
 * Cattura la visione corrente dal renderer e invia al backend.
 * 
 * @param {THREE.WebGLRenderer} renderer - Il renderer WebGL
 * @param {string} apiUrl - URL dell'endpoint di analisi (default: localhost:8000)
 * @param {Object} options - Opzioni di configurazione
 * @param {number} options.maxWidth - Larghezza max canvas (default: 512)
 * @param {number} options.maxHeight - Altezza max canvas (default: 512)
 * @param {number} options.throttleMs - Millisecondi minimi tra due catture
 */
export async function captureAndSendVision(renderer, apiUrl = 'http://localhost:8000/analyze', options = {}) {
  const { maxWidth = 512, maxHeight = 512, throttleMs = 1000 } = options;

  const now = Date.now();
  if (now - lastCaptureTime < throttleMs) {
    return { skipped: true, reason: 'throttled' };
  }
  lastCaptureTime = now;

  try {
    const sourceCanvas = renderer.domElement;
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = maxHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0, maxWidth, maxHeight);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const base64Data = imageData.split(',')[1];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data })
    });

    if (!response.ok) {
      throw new Error(`Brain server error: ${response.status}`);
    }

    const result = await response.json();
    return { skipped: false, result };
  } catch (error) {
    console.error('Errore invio visione:', error);
    return { skipped: false, error: error.message };
  }
}