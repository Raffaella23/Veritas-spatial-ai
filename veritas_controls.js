// veritas_controls.js (VERSIONE CORRETTA)
// Gestisce l'input da tastiera (WASD / Frecce) per muovere l'agente
export class AgentControls {
  constructor() {
    this.keys = { forward: false, backward: false, left: false, right: false };
    this.speed = 1.5; // m/s (velocità umana media ~1.4 m/s)

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  onKey(event, isPressed) {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp': this.keys.forward = isPressed; break;
      case 'KeyS': case 'ArrowDown': this.keys.backward = isPressed; break;
      case 'KeyA': case 'ArrowLeft': this.keys.left = isPressed; break;
      case 'KeyD': case 'ArrowRight': this.keys.right = isPressed; break;
    }
    event.preventDefault();
  }

  // Restituisce il vettore di movimento direzionale (normalizzato, frame-independent)
  getMovementVector(deltaTime = 0.033) {
    const move = { x: 0, y: 0, z: 0 }; // ← Y = 0 (Rapier gestisce gravità)
    const scaledSpeed = this.speed * deltaTime; // ← Scalato a deltaTime (frame-independent)
    
    if (this.keys.forward) move.z -= scaledSpeed;
    if (this.keys.backward) move.z += scaledSpeed;
    if (this.keys.left) move.x -= scaledSpeed;
    if (this.keys.right) move.x += scaledSpeed;
    
    return move;
  }
}

export default AgentControls;