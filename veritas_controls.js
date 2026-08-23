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
  }

  getMovementVector() {
    let x = 0, z = 0;
    if (this.keys.forward) z -= 1;
    if (this.keys.backward) z += 1;
    if (this.keys.left) x -= 1;
    if (this.keys.right) x += 1;
    return { x, z };
  }
}