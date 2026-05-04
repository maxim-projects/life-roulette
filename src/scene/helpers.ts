import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  type Scene,
} from 'three';

export interface PlayerFigure {
  group: Group;
  body: Mesh<CylinderGeometry, MeshStandardMaterial>;
  head: Mesh<SphereGeometry, MeshStandardMaterial>;
}

function createNameSprite(playerName: string): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D context unavailable');
  }

  context.fillStyle = 'rgba(10, 12, 18, 0.78)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#90a7d7';
  context.lineWidth = 4;
  context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  context.fillStyle = '#ffffff';
  context.font = 'bold 30px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(playerName, canvas.width / 2, canvas.height / 2);

  const texture = new CanvasTexture(canvas);
  const material = new SpriteMaterial({ map: texture, transparent: true });
  const sprite = new Sprite(material);
  sprite.scale.set(1.45, 0.54, 1);
  sprite.position.set(0, 1.55, 0);
  return sprite;
}

export function createTable(): Mesh<CylinderGeometry, MeshStandardMaterial> {
  const geometry = new CylinderGeometry(2.2, 2.5, 0.28, 24);
  const material = new MeshStandardMaterial({
    color: '#5a3829',
    roughness: 0.82,
    metalness: 0.08,
  });
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.position.set(0, -0.14, 0);
  return mesh;
}

export function createPlayerFigure(playerName: string): PlayerFigure {
  const group = new Group();
  const bodyMaterial = new MeshStandardMaterial({
    color: '#6b86bd',
    emissive: '#000000',
  });
  const body = new Mesh(new CylinderGeometry(0.17, 0.22, 0.82, 12), bodyMaterial);
  body.position.set(0, 0.42, 0);
  body.castShadow = true;

  const head = new Mesh(
    new SphereGeometry(0.18, 18, 18),
    new MeshStandardMaterial({ color: '#d7c5a6', emissive: '#000000' }),
  );
  head.position.set(0, 0.96, 0);
  head.castShadow = true;

  group.add(body, head, createNameSprite(playerName));
  return { group, body, head };
}

export function createGunPlaceholder(): Mesh<BoxGeometry, MeshStandardMaterial> {
  const geometry = new BoxGeometry(0.52, 0.12, 0.2);
  const material = new MeshStandardMaterial({
    color: '#3d465a',
    roughness: 0.35,
    metalness: 0.85,
  });
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.position.set(0, 0.16, 0);
  return mesh;
}

export function setupLighting(scene: Scene): void {
  const ambient = new AmbientLight('#5f7099', 1.4);
  const key = new AmbientLight('#ffffff', 0.3);
  scene.add(ambient, key);
}

export function arrangePlayersAroundCircle(
  figures: Array<{ id: string; figure: PlayerFigure }>,
  radius = 1.95,
): Map<string, Vector3> {
  const positions = new Map<string, Vector3>();

  figures.forEach((entry, index) => {
    const angle = (index / figures.length) * Math.PI * 2;
    const position = new Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    );
    entry.figure.group.position.copy(position);
    entry.figure.group.lookAt(0, 0.45, 0);
    positions.set(entry.id, position);
  });

  return positions;
}

export function createOverlayPlane(): Mesh<PlaneGeometry, MeshStandardMaterial> {
  return new Mesh(
    new PlaneGeometry(5, 5),
    new MeshStandardMaterial({
      color: '#0b111d',
      transparent: true,
      opacity: 0.02,
    }),
  );
}
