// veritas_rapier_human.js (VERSIONE CORRETTA)
// Gestisce l'Agente 1:1 (tu, il giocatore) usando veritas_physics.js internamente
import * as THREE from 'three';
import { veritasPhysics } from './veritas_physics.js';

export class RapierHumanAgent {
  constructor(scene) {
    this.scene = scene;
    this.physics = veritasPhysics;
    this.agentId = 'player_1:1'; // ID univoco per questo agente

    // Dimensioni umane reali (1:1)
    this.height = 1.75;    // Altezza totale (metri)
    this.radius = 0.35;    // Raggio busto (metri)
    this.eyeHeight = 1.65; // Altezza vista occhi da terra

    // Telecamera (Occhio dell'agente in prima persona)
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  }

  // Inizializza il Mondo Fisico (usa veritas_physics internamente)
  async initPhysics(initialPosition = { x: 0, y: 2, z: 0 }) {
    if (!this.physics.world) {
      console.error('\u274c Physics engine not initialized. Call veritas_physics.initPhysicsEngine() first.');
      return;
    }

    // Crea l'agente 1:1 come uno qualsiasi degli altri agenti
    this.physics.createCapsuleAgent(this.agentId, [
      initialPosition.x,
      initialPosition.y,
      initialPosition.z
    ]);

    console.log('\u2705 Player agent initialized with Rapier physics');
  }

  // Aggiorna la posizione dell'agente e della vista (telecamera)
  update(movementVector = { x: 0, y: 0, z: 0 }, deltaTime = 0.033) {
    if (!this.physics.world || !this.physics.agents.has(this.agentId)) {
      return;
    }

    // Normalizza il vettore di movimento
    const direction = this.normalizeVector3(movementVector);

    // Chiama il motore fisico per aggiornare la posizione dell'agente
    const newPos = this.physics.stepAgent(this.agentId, direction, deltaTime);

    if (!newPos) {
      return;
    }

    // Posiziona la telecamera all'altezza occhi dell'agente
    const eyeYOffset = this.eyeHeight - (this.height / 2);
    this.camera.position.set(
      newPos[0],
      newPos[1] + eyeYOffset,
      newPos[2]
    );
  }

  // Aggiungi collider mesh dell'ambiente (opzionale - fallback per mesh dinamiche)
  addEnvironmentMesh(mesh) {
    if (!mesh || !mesh.geometry) {
      return;
    }

    const geometry = mesh.geometry;
    const { vertices, indices } = this.extractGeometryData(geometry);

    if (!this.physics.world) {
      console.warn('Physics world not ready');
      return;
    }

    // Crea collider trimesh statico per questo mesh
    const trimeshDesc = this.physics.RAPIER.ColliderDesc.trimesh(
      vertices,
      indices
    );
    this.physics.world.createCollider(trimeshDesc);
  }

  // Utility: normalizza vettore 3D
  normalizeVector3(v) {
    const len = Math.sqrt(v.x * v.x + v.z * v.z);
    if (len === 0) return [0, 0, 0];
    return [v.x / len, v.y, v.z / len];
  }

  // Utility: estrai vertici e indici da THREE.Geometry
  extractGeometryData(geometry) {
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) {
      return { vertices: new Float32Array(), indices: new Uint32Array() };
    }

    const vertices = new Float32Array(positionAttribute.array);

    let indices;
    if (geometry.index) {
      indices = new Uint32Array(geometry.index.array);
    } else {
      indices = new Uint32Array(vertices.length / 3);
      for (let i = 0; i < indices.length; i++) {
        indices[i] = i;
      }
    }

    return { vertices, indices };
  }

  // Getter: posizione attuale dell'agente
  getPosition() {
    return this.physics.getAgentPosition(this.agentId);
  }
}

export default RapierHumanAgent;