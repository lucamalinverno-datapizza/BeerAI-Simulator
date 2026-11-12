import * as THREE from 'three';

/**
 * Shared, locally generated materials and textures (no remote assets).
 * Industrial palette: brushed stainless steel, copper, concrete, painted steel.
 */
let cache: ReturnType<typeof build> | null = null;

function noiseCanvas(size: number, base: [number, number, number], amp: number, joints: boolean, blotches = 40): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(size, size);
  let seed = 1234567;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < size * size; i++) {
    const n = (rnd() - 0.5) * amp + (rnd() < 0.004 ? -amp * 1.5 : 0);
    img.data[i * 4] = base[0] + n;
    img.data[i * 4 + 1] = base[1] + n;
    img.data[i * 4 + 2] = base[2] + n;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // soft blotches
  for (let k = 0; k < blotches; k++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.025 + rnd() * 0.03})`;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 10 + rnd() * size * 0.12, 0, Math.PI * 2);
    g.fill();
  }
  if (joints) {
    g.strokeStyle = 'rgba(60,60,60,0.55)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, size - 2, size - 2);
  }
  return c;
}

function brushedCanvas(size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 1600; i++) {
    const y = rnd() * size;
    const v = 110 + Math.floor(rnd() * 60);
    g.strokeStyle = `rgba(${v},${v},${v},0.35)`;
    g.lineWidth = rnd() * 1.2 + 0.2;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(size, y + (rnd() - 0.5) * 2);
    g.stroke();
  }
  return c;
}

function build() {
  const concreteTex = new THREE.CanvasTexture(noiseCanvas(512, [168, 170, 166], 22, true));
  concreteTex.wrapS = concreteTex.wrapT = THREE.RepeatWrapping;
  concreteTex.repeat.set(10, 6);
  concreteTex.colorSpace = THREE.SRGBColorSpace;
  concreteTex.anisotropy = 4;

  const asphaltTex = new THREE.CanvasTexture(noiseCanvas(256, [96, 99, 103], 14, false, 0));
  asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
  asphaltTex.repeat.set(60, 60);
  asphaltTex.colorSpace = THREE.SRGBColorSpace;

  const brushed = new THREE.CanvasTexture(brushedCanvas(256));
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
  brushed.repeat.set(1, 4);

  const steel = new THREE.MeshStandardMaterial({ color: '#cfd4d9', metalness: 0.88, roughness: 0.3, roughnessMap: brushed, envMapIntensity: 1.1 });
  const steelDark = new THREE.MeshStandardMaterial({ color: '#8d959c', metalness: 0.8, roughness: 0.4 });
  const steelGhost = new THREE.MeshStandardMaterial({
    color: '#cfd4d9',
    metalness: 0.4,
    roughness: 0.3,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const copper = new THREE.MeshStandardMaterial({ color: '#c47a48', metalness: 0.92, roughness: 0.3, envMapIntensity: 1.2 });
  const concrete = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.92, metalness: 0 });
  const asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.95, metalness: 0 });
  const wall = new THREE.MeshStandardMaterial({ color: '#e4e7ea', roughness: 0.88, metalness: 0.02, side: THREE.FrontSide });
  const wallBand = new THREE.MeshStandardMaterial({ color: '#59636d', roughness: 0.8, metalness: 0.1 });
  const ceiling = new THREE.MeshStandardMaterial({ color: '#b9c0c7', roughness: 0.9, metalness: 0.05, side: THREE.FrontSide });
  const truss = new THREE.MeshStandardMaterial({ color: '#7d8892', roughness: 0.6, metalness: 0.5 });
  const column = new THREE.MeshStandardMaterial({ color: '#3d5a80', roughness: 0.55, metalness: 0.35 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#e8b10a', roughness: 0.55, metalness: 0.1 });
  const safetyLine = new THREE.MeshStandardMaterial({ color: '#e7c11a', roughness: 0.7, metalness: 0 });
  const whiteLine = new THREE.MeshStandardMaterial({ color: '#f1f3f4', roughness: 0.7, metalness: 0 });
  const rackUpright = new THREE.MeshStandardMaterial({ color: '#2f5b8f', roughness: 0.5, metalness: 0.35 });
  const rackBeam = new THREE.MeshStandardMaterial({ color: '#e4691c', roughness: 0.5, metalness: 0.3 });
  const wood = new THREE.MeshStandardMaterial({ color: '#b78c5a', roughness: 0.85, metalness: 0 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#2b2e31', roughness: 0.75, metalness: 0.1 });
  const machineBody = new THREE.MeshStandardMaterial({ color: '#dfe3e6', roughness: 0.45, metalness: 0.35 });
  const machineAccent = new THREE.MeshStandardMaterial({ color: '#2467ff', roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: '#bcd6ea', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  const darkPanel = new THREE.MeshStandardMaterial({ color: '#1d2730', roughness: 0.5, metalness: 0.2 });
  const truckCab = new THREE.MeshStandardMaterial({ color: '#f4f5f6', roughness: 0.4, metalness: 0.3 });
  const truckTrailer = new THREE.MeshStandardMaterial({ color: '#dfe5ec', roughness: 0.6, metalness: 0.2 });
  const tire = new THREE.MeshStandardMaterial({ color: '#1b1c1d', roughness: 0.9, metalness: 0 });
  const dockDoor = new THREE.MeshStandardMaterial({ color: '#9aa4ad', roughness: 0.6, metalness: 0.4 });
  const lampEmissive = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 1.6, roughness: 0.4 });
  const insulation = new THREE.MeshStandardMaterial({ color: '#b9c0c6', metalness: 0.75, roughness: 0.38 });

  return {
    steel,
    steelDark,
    steelGhost,
    copper,
    concrete,
    asphalt,
    wall,
    wallBand,
    ceiling,
    truss,
    column,
    yellow,
    safetyLine,
    whiteLine,
    rackUpright,
    rackBeam,
    wood,
    rubber,
    machineBody,
    machineAccent,
    glass,
    darkPanel,
    truckCab,
    truckTrailer,
    tire,
    dockDoor,
    lampEmissive,
    insulation,
  };
}

export function getMaterials() {
  if (!cache) cache = build();
  return cache;
}

/** Physical-looking liquid colours for products (scene only; UI uses brand colours). */
const LIQUID = ['#e2a12b', '#6a2d16', '#b8641f', '#d7c46a', '#8a1f2b'];
const liquidMats = new Map<string, THREE.MeshStandardMaterial>();
export function liquidMaterial(productIndex: number): THREE.MeshStandardMaterial {
  const key = String(productIndex % LIQUID.length);
  let m = liquidMats.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: LIQUID[productIndex % LIQUID.length], roughness: 0.25, metalness: 0, transparent: true, opacity: 0.92 });
    liquidMats.set(key, m);
  }
  return m;
}
export const liquidColor = (productIndex: number): string => LIQUID[productIndex % LIQUID.length];

/** Canvas-generated text texture (system font fallback, no remote font loading). */
const texCache = new Map<string, THREE.CanvasTexture>();
export function textTexture(
  lines: string[],
  opts: { width?: number; height?: number; bg?: string; fg?: string; font?: string; align?: CanvasTextAlign; border?: string } = {},
): THREE.CanvasTexture {
  const key = JSON.stringify([lines, opts]);
  const hit = texCache.get(key);
  if (hit) return hit;
  const w = opts.width ?? 512;
  const h = opts.height ?? 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  if (opts.bg) {
    g.fillStyle = opts.bg;
    g.fillRect(0, 0, w, h);
  }
  if (opts.border) {
    g.strokeStyle = opts.border;
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  }
  g.fillStyle = opts.fg ?? '#111F2D';
  g.textAlign = opts.align ?? 'center';
  g.textBaseline = 'middle';
  const lh = h / (lines.length + 0.4);
  lines.forEach((line, i) => {
    let font = opts.font ?? `600 ${Math.round(lh * 0.62)}px Poppins, "Helvetica Neue", Arial, sans-serif`;
    g.font = font;
    // Auto-fit: shrink the font until the line fits the texture width.
    let px = Number(/(\d+)px/.exec(font)?.[1] ?? 32);
    while (g.measureText(line).width > w - 40 && px > 10) {
      px -= 2;
      font = font.replace(/\d+px/, `${px}px`);
      g.font = font;
    }
    const x = g.textAlign === 'left' ? 24 : w / 2;
    g.fillText(line, x, lh * (i + 0.7));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}
