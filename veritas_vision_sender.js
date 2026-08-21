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
 * @param {number} options.throttleMs - Delay minimo tra richieste (default: 2000ms)
 * @param {number} options.jpegQuality - Qualità JPEG 0-1 (default: 0.7)
 * 
 * @returns {Promise<string|null>} Report dal backend, o null se throttled
 */
export async function captureAndSendView(
  renderer,
  apiUrl = 'http://localhost:8000/api/analyze-view',
  options = {}
) {
  const {
    maxWidth = 512,
    maxHeight = 512,
    throttleMs = 2000,    // Max 1 richiesta ogni 2 secondi
    jpegQuality = 0.7
  } = options;

  // ========================================================================
  // 1. Check Throttle (evita troppe richieste al backend)
  // ========================================================================
  const now = Date.now();
  if (now - lastCaptureTime < throttleMs) {
    return null; // Skip questa richiesta
  }
  lastCaptureTime = now;

  try {
    // ====================================================================
    // 2. Ridimensiona canvas per ridurre payload
    // ====================================================================
    const originalCanvas = renderer.domElement;
    const tempCanvas = document.createElement('canvas');
    
    tempCanvas.width = Math.min(originalCanvas.width, maxWidth);
    tempCanvas.height = Math.min(originalCanvas.height, maxHeight);

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from temp canvas');
    }

    ctx.drawImage(
      originalCanvas,
      0, 0,
      originalCanvas.width,
      originalCanvas.height,
      0, 0,
      tempCanvas.width,
      tempCanvas.height
    );

    // ====================================================================
    // 3. Converti a base64 (estrai solo la parte base64, senza data URI)
    // ====================================================================
    const dataUrl = tempCanvas.toDataURL('image/jpeg', jpegQuality);
    // dataUrl è: "data:image/jpeg;base64,<base64_string>"
    // Noi vogliamo solo: "<base64_string>"
    const imageBase64 = dataUrl.split(',')[1];

    if (!imageBase64) {
      throw new Error('Failed to encode canvas as base64');
    }

    // ====================================================================
    // 4. Invia al backend
    // ====================================================================
    console.log(`\ud83d\udcf8 Sending vision to ${apiUrl} (${imageBase64.length} bytes base64)`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_data: imageBase64
      })
    });

    // ====================================================================
    // 5. Controlla risposta HTTP
    // ====================================================================
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // ====================================================================
    // 6. Estrai report e loggalo
    // ====================================================================
    const report = data.report || data.text || 'No report received';

    console.log('\ud83d\udccb Vision Report from Backend:');
    console.log('\u2500'.repeat(50));
    console.log(report);
    console.log('\u2500'.repeat(50));
    console.log(`Tokens used: ${data.tokens_used || '?'}`);

    return report;

  } catch (error) {
    console.error('\u274c Vision capture error:', error.message);
    // Non lanciare l'errore (continua il gioco anche se visione fallisce)
    return null;
  }
}

export default captureAndSendView;