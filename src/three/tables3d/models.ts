import * as THREE from "three";
import caradocEdges from "./caradocEdges.json";
import lawleyOutline from "./lawleyOutline.json";
import raglethEdgesRaw from "./raglethEdges.json";

// The four photographed tables, built as real 3D models. Everything is measured/fitted from the
// product photos; textures are wrapped from the photos themselves (see public/3d/<range>/).

export interface TableModel {
  group: THREE.Group;
  /** Rebuild for a new table length (cm). */
  setLength: (lengthCm: number) => void;
  /** Choose the leg (catalogue leg id). Unknown ids keep the range's default leg. */
  setLeg: (legId: string | null) => void;
  home: { az: number; el: number };
  dispose: () => void;
}

const M = 0.01; // cm -> m
const BASE = `${import.meta.env.BASE_URL}3d`;

async function loadTex(url: string, mirrored = true): Promise<THREE.Texture> {
  const t = await new THREE.TextureLoader().loadAsync(url);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (mirrored) t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  return t;
}
function wood(map: THREE.Texture, roughness: number, env: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map, roughness, metalness: 0, envMapIntensity: env, side: THREE.DoubleSide });
}
function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
}

// ---- helpers shared by the models ----
type Pt = [number, number];

/** Inward normals (mitred) for a closed outline. */
function mitreNormals(pts: Pt[]): { nrm: Pt[]; sgn: number } {
  const N = pts.length;
  let area = 0;
  for (let i = 0; i < N; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % N];
    area += x1 * y2 - x2 * y1;
  }
  const sgn = area > 0 ? 1 : -1;
  const nrm = pts.map((p, i): Pt => {
    const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
    const e1: Pt = [p[0] - a[0], p[1] - a[1]], e2: Pt = [b[0] - p[0], b[1] - p[1]];
    const l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
    const n1: Pt = [(-e1[1] / l1) * sgn, (e1[0] / l1) * sgn], n2: Pt = [(-e2[1] / l2) * sgn, (e2[0] / l2) * sgn];
    const k = 1 / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [(n1[0] + n2[0]) * k, (n1[1] + n2[1]) * k];
  });
  return { nrm, sgn };
}
function arcLengths(pts: Pt[]): number[] {
  const arc = [0];
  let s = 0;
  for (let i = 1; i <= pts.length; i++) {
    s += Math.hypot(pts[i % pts.length][0] - pts[i - 1][0], pts[i % pts.length][1] - pts[i - 1][1]);
    arc.push(s);
  }
  return arc;
}
function geo(pos: number[], uv: number[] | null, idx: number[] | null): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  if (idx) g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** Square-section bar between two centre-line points, cut flat at heights lo / hi (a = upper end, b = lower end, cm). */
function boxBar(a: number[], b: number[], wide: number, thin: number, lo: number, hi: number, withUV = false): THREE.BufferGeometry {
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]);
  const d = A.clone().sub(B).normalize();
  const hd = new THREE.Vector3(d.x, 0, d.z).normalize();
  const n1 = new THREE.Vector3(-hd.z, 0, hd.x), n2 = new THREE.Vector3().crossVectors(d, n1).normalize();
  const P: THREE.Vector3[] = [];
  [lo, hi].forEach((h) => {
    const base = B.clone().add(A.clone().sub(B).multiplyScalar((h - B.y) / (A.y - B.y)));
    [-1, 1].forEach((s1) =>
      [-1, 1].forEach((s2) => {
        const c = base.clone().addScaledVector(n1, (s1 * thin) / 2).addScaledVector(n2, (s2 * wide) / 2);
        c.addScaledVector(d, (h - c.y) / d.y);
        P.push(c);
      }),
    );
  });
  const q = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 2, 6, 4], [1, 5, 7, 3], [0, 4, 5, 1], [2, 3, 7, 6]];
  const pos: number[] = [], uv: number[] = [];
  q.forEach(([i, j, k, l]) =>
    [i, j, k, i, k, l].forEach((v) => {
      const p = P[v];
      pos.push(p.x * M, p.y * M, p.z * M);
      if (withUV) uv.push(p.clone().sub(B).dot(d) / 70, (p.clone().dot(n1) + p.clone().dot(n2)) / 20);
    }),
  );
  return geo(pos, withUV ? uv : null, null);
}

// =====================================================================================
// THE CARADOC — live-edge oak, steel triple-X base
// =====================================================================================
export async function createCaradoc(): Promise<TableModel> {
  const D = { width: 100, height: 75, topT: 4, photoL: 260 };
  const BAR = { w: 11.5, d: 10 };
  const MOUNT = { u: 19, v: 14, t: 0.8 };
  const BASEP = { len: 120, wid: 52, t: 1.2 };
  const tex = await loadTex(`${BASE}/caradoc/top.jpg`);
  const woodMat = wood(tex, 0.62, 0.5);
  const steel = new THREE.MeshStandardMaterial({ color: 0x4c4640, roughness: 0.5, metalness: 0.3 });
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x2e2c2a, roughness: 0.55, metalness: 0.3 });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.5, metalness: 0.7 });

  const wave = (arr: number[], u: number) => {
    const half = ((arr.length - 1) * caradocEdges.step) / 2;
    const period = half * 4;
    let x = (((u + half) % period) + period) % period;
    if (x > half * 2) x = period - x;
    const f = x / caradocEdges.step, i = Math.min(arr.length - 2, Math.floor(f));
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  };
  const R = 1.3;
  const profile = (): Pt[] => {
    const p: Pt[] = [[0.45, 0], [0.0, 0.55], [0.0, D.topT - R]];
    for (let a = 18; a <= 90; a += 18) { const r = (a * Math.PI) / 180; p.push([R * (1 - Math.cos(r)), D.topT - R + R * Math.sin(r)]); }
    return p;
  };
  function buildTop(L: number): THREE.Group {
    const pts: Pt[] = [];
    const n = Math.round(L / 1.5);
    for (let i = 0; i <= n; i++) { const u = -L / 2 + (L * i) / n; pts.push([u, -D.width / 2 + 0.8 + wave(caradocEdges.back, u)]); }
    for (let i = n; i >= 0; i--) { const u = -L / 2 + (L * i) / n; pts.push([u, D.width / 2 - 0.8 + wave(caradocEdges.front, u)]); }
    const N = pts.length, { nrm } = mitreNormals(pts), arc = arcLengths(pts), prof = profile();
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    prof.forEach(([inset, h]) => {
      for (let i = 0; i < N; i++) {
        const x = pts[i][0] + nrm[i][0] * inset, y = pts[i][1] + nrm[i][1] * inset;
        pos.push(x * M, h * M, y * M);
        if (h > D.topT - R - 0.01) uv.push(x / D.photoL + 0.5, y / D.width + 0.5);
        else uv.push(arc[i] / D.photoL, 0.5 + (h / D.topT) * 0.07);
      }
    });
    for (let k = 0; k < prof.length - 1; k++)
      for (let i = 0; i < N; i++) {
        const a = k * N + i, b = k * N + ((i + 1) % N), c = (k + 1) * N + i, d = (k + 1) * N + ((i + 1) % N);
        idx.push(a, c, b, b, c, d);
      }
    const cap = (ring: number, up: boolean) => {
      const contour: THREE.Vector2[] = [];
      for (let i = 0; i < N; i++) contour.push(new THREE.Vector2(pos[(ring * N + i) * 3], pos[(ring * N + i) * 3 + 2]));
      const tri = THREE.ShapeUtils.triangulateShape(contour, []);
      const cp: number[] = [], cu: number[] = [], ci: number[] = [];
      const h = prof[ring][1] * M;
      contour.forEach((c) => { cp.push(c.x, h, c.y); cu.push(c.x / M / D.photoL + 0.5, c.y / M / D.width + 0.5); });
      tri.forEach(([a, b, c]) => (up ? ci.push(a, c, b) : ci.push(a, b, c)));
      return geo(cp, cu, ci);
    };
    const g = new THREE.Group();
    [geo(pos, uv, idx), cap(prof.length - 1, true), cap(0, false)].forEach((gm) => {
      const m = new THREE.Mesh(gm, woodMat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    });
    g.position.y = (D.height - D.topT) * M;
    return g;
  }

  const BARS = [
    { top: -58, bot: -1, row: -1 },
    { top: -10.5, bot: 44.5, row: -1 },
    { top: 10.5, bot: -44.5, row: 1 },
    { top: 58, bot: 1, row: 1 },
  ];
  function buildBase(): THREE.Group {
    const g = new THREE.Group();
    const zb = BASEP.t + 0.4, zt = D.height - D.topT - MOUNT.t;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(BASEP.len * M, BASEP.t * M, BASEP.wid * M), plateMat);
    plate.position.y = (0.4 + BASEP.t / 2) * M; plate.castShadow = plate.receiveShadow = true; g.add(plate);
    BARS.forEach((b) => {
      const dz = zt - zb, du = b.top - b.bot, len = Math.hypot(dz, du);
      const wh = BAR.w / (dz / len);
      const shape = new THREE.Shape();
      shape.moveTo(b.bot - wh / 2, zb); shape.lineTo(b.bot + wh / 2, zb);
      shape.lineTo(b.top + wh / 2, zt); shape.lineTo(b.top - wh / 2, zt); shape.closePath();
      const eg = new THREE.ExtrudeGeometry(shape, { depth: BAR.d, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25, bevelSegments: 2, steps: 1 });
      eg.scale(M, M, M);
      const mesh = new THREE.Mesh(eg, steel);
      mesh.position.z = (b.row > 0 ? 0.05 : -BAR.d - 0.05) * M;
      mesh.castShadow = mesh.receiveShadow = true; g.add(mesh);
      const mp = new THREE.Mesh(new THREE.BoxGeometry(MOUNT.u * M, MOUNT.t * M, MOUNT.v * M), steel);
      const zc = b.row > 0 ? BAR.d / 2 + 0.05 : -BAR.d / 2 - 0.05;
      mp.position.set(b.top * M, (zt + MOUNT.t / 2) * M, zc * M); mp.castShadow = true; g.add(mp);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * M, 0.45 * M, 0.3 * M, 14), boltMat);
        bolt.position.set((b.top + sx * (MOUNT.u / 2 - 1.5)) * M, (zt + MOUNT.t + 0.1) * M, (zc + sz * (MOUNT.v / 2 - 1.5)) * M);
        g.add(bolt);
      });
    });
    return g;
  }

  const group = new THREE.Group();
  group.add(buildBase());
  let top: THREE.Group | null = null;
  return {
    group,
    home: { az: -28, el: 11 },
    setLength(L) {
      if (top) { group.remove(top); disposeGroup(top); }
      top = buildTop(L); group.add(top);
    },
    setLeg() { /* the triple-X base is the only Caradoc base photographed so far */ },
    dispose() { disposeGroup(group); tex.dispose(); },
  };
}

// =====================================================================================
// THE LAWLEY — pebble-shaped oak top, steel spider leg
// =====================================================================================
export async function createLawley(): Promise<TableModel> {
  const D = { width: 100, height: 75, topT: 3.0 };
  const LEG = { hub: 37.7, cLong: 1.81, cShort: 1.0, w: 4.6, plateL: 22, plateW: 12, plateT: 0.6 };
  const [tex, edgeTex] = await Promise.all([loadTex(`${BASE}/lawley/top.jpg`, false), loadTex(`${BASE}/lawley/edge.jpg`, false)]);
  edgeTex.wrapS = THREE.MirroredRepeatWrapping;
  const topMat = wood(tex, 0.7, 0.4), edgeMat = wood(edgeTex, 0.75, 0.3);
  const PROFILE: Pt[] = [[1.2, 0], [0.6, 0.95], [0, 1.9], [0, 2.85], [0.05, 2.97], [0.14, 3.0]];
  function buildTop(L: number, Wd: number): THREE.Group {
    const pts: Pt[] = lawleyOutline.u.map((u, i): Pt => [u * L, lawleyOutline.v[i] * Wd]);
    const N = pts.length, { nrm } = mitreNormals(pts), arc = arcLengths(pts);
    const plen = [0];
    for (let k = PROFILE.length - 2; k >= 0; k--) { const a = PROFILE[k + 1], b = PROFILE[k]; plen.push(plen[plen.length - 1] + Math.hypot(a[0] - b[0], a[1] - b[1])); }
    const total = plen[plen.length - 1];
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    PROFILE.forEach(([inset, h], k) => {
      const frac = plen[PROFILE.length - 1 - k] / total;
      for (let i = 0; i < N; i++) {
        pos.push((pts[i][0] + nrm[i][0] * inset) * M, h * M, (pts[i][1] + nrm[i][1] * inset) * M);
        uv.push(arc[i] / 16, 1 - frac);
      }
    });
    for (let k = 0; k < PROFILE.length - 1; k++)
      for (let i = 0; i < N; i++) {
        const a = k * N + i, b = k * N + ((i + 1) % N), c = (k + 1) * N + i, d = (k + 1) * N + ((i + 1) % N);
        idx.push(a, c, b, b, c, d);
      }
    const cap = (ring: number, up: boolean) => {
      const contour: THREE.Vector2[] = [];
      for (let i = 0; i < N; i++) contour.push(new THREE.Vector2(pos[(ring * N + i) * 3], pos[(ring * N + i) * 3 + 2]));
      const tri = THREE.ShapeUtils.triangulateShape(contour, []);
      const cp: number[] = [], cu: number[] = [], ci: number[] = [];
      const h = PROFILE[ring][1] * M;
      contour.forEach((c) => { cp.push(c.x, h, c.y); cu.push(c.x / M / L + 0.5, 0.5 - c.y / M / Wd); });
      tri.forEach(([a, b, c]) => (up ? ci.push(a, c, b) : ci.push(a, b, c)));
      return geo(cp, cu, ci);
    };
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo(pos, uv, idx), edgeMat), new THREE.Mesh(cap(PROFILE.length - 1, true), topMat), new THREE.Mesh(cap(0, false), topMat));
    g.children.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    g.position.y = (D.height - D.topT) * M;
    return g;
  }
  const steel = new THREE.MeshStandardMaterial({ color: 0x1e1d1c, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide, flatShading: true });
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4, metalness: 0.7 });
  function buildLeg(L: number): THREE.Group {
    const g = new THREE.Group();
    const hu = D.height - D.topT - LEG.plateT;
    // 160–220cm: standard leg. 240–280cm: the long arms reach further along the top for support.
    const cLong = L >= 240 ? 2.33 : LEG.cLong;
    ([[1, 0, cLong], [-1, 0, cLong], [0, 1, LEG.cShort], [0, -1, LEG.cShort]] as number[][]).forEach(([dx, dz, c]) => {
      const up = [-dx * c * (hu - LEG.hub), hu, -dz * c * (hu - LEG.hub)], lo = [dx * c * LEG.hub, 0, dz * c * LEG.hub];
      const m = new THREE.Mesh(boxBar(up, lo, LEG.w, LEG.w, 0, hu), steel); m.castShadow = true; m.receiveShadow = true; g.add(m);
      const pl = new THREE.Mesh(new THREE.BoxGeometry((dx ? LEG.plateL : LEG.plateW) * M, LEG.plateT * M, (dx ? LEG.plateW : LEG.plateL) * M), steel);
      pl.position.set(up[0] * M, (hu + LEG.plateT / 2) * M, up[2] * M); pl.castShadow = true; g.add(pl);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sa, sb]) => {
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * M, 0.5 * M, 0.3 * M, 14), screwMat);
        const al = dx ? LEG.plateL : LEG.plateW, be = dx ? LEG.plateW : LEG.plateL;
        sc.position.set(up[0] * M + sa * (al / 2 - 2.2) * M, (hu - 0.1) * M, up[2] * M + sb * (be / 2 - 2.2) * M);
        g.add(sc);
      });
    });
    return g;
  }
  const group = new THREE.Group();
  let top: THREE.Group | null = null, leg: THREE.Group | null = null;
  return {
    group,
    home: { az: -30, el: 13 },
    setLength(L) {
      if (leg) { group.remove(leg); disposeGroup(leg); }
      leg = buildLeg(L); group.add(leg);
      if (top) { group.remove(top); disposeGroup(top); }
      top = buildTop(L, D.width); group.add(top);
    },
    setLeg() { /* the star base is the only Lawley base photographed so far */ },
    dispose() { disposeGroup(group); tex.dispose(); edgeTex.dispose(); },
  };
}

// =====================================================================================
// THE WREKIN — solid oak plank, steel star base (standard leg 160–220, longer leg 240–300)
// =====================================================================================
export async function createWrekin(): Promise<TableModel> {
  const D = { width: 91, height: 75, topT: 5.1 };
  const LEG = { w: 7, plateL: 22, plateW: 12, plateT: 0.6, rS: 28.7, hub: 33.9, rLShort: 51.9, rLLong: 72 };
  const [tex, endTex, longTex] = await Promise.all([loadTex(`${BASE}/wrekin/top.jpg`, false), loadTex(`${BASE}/wrekin/edge_end.jpg`), loadTex(`${BASE}/wrekin/edge_long.jpg`)]);
  const topMat = wood(tex, 0.72, 0.4), endMat = wood(endTex, 0.72, 0.3), longMat = wood(longTex, 0.72, 0.3);
  const profile = (T: number): Pt[] => [[0.22, 0], [0, 0.22], [0, T - 0.5], [0.08, T - 0.2], [0.32, T]];
  function sideStrip(x0: number, z0: number, x1: number, z1: number, nx: number, nz: number, prof: Pt[], mat: THREE.Material, len: number): THREE.Mesh {
    const dx = x1 - x0, dz = z1 - z0, el = Math.hypot(dx, dz), tx = dx / el, tz = dz / el;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const plen = [0];
    for (let k = prof.length - 2; k >= 0; k--) plen.push(plen[plen.length - 1] + Math.hypot(prof[k + 1][0] - prof[k][0], prof[k + 1][1] - prof[k][1]));
    const total = plen[plen.length - 1], nseg = 2;
    prof.forEach(([ins, h], k) => {
      const frac = plen[prof.length - 1 - k] / total;
      for (let s = 0; s <= nseg; s++) {
        const t = s / nseg, a = -ins + (el + 2 * ins) * t;
        pos.push((x0 + tx * a + nx * ins) * M, h * M, (z0 + tz * a + nz * ins) * M);
        uv.push(((a + ins) / 26) * (el / len), 1 - frac);
      }
    });
    for (let k = 0; k < prof.length - 1; k++) for (let s = 0; s < nseg; s++) {
      const a = k * (nseg + 1) + s, b = a + 1, c = (k + 1) * (nseg + 1) + s, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    return new THREE.Mesh(geo(pos, uv, idx), mat);
  }
  function buildTop(L: number, Wd: number): THREE.Group {
    const T = D.topT, prof = profile(T), g = new THREE.Group(), hl = L / 2, hw = Wd / 2, ins = 0.32;
    const capGeo = (y: number) => {
      const pg = new THREE.PlaneGeometry((L - 2 * ins) * M, (Wd - 2 * ins) * M);
      pg.rotateX(-Math.PI / 2);
      const uv = pg.attributes.uv, p = pg.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / M / L + 0.5, 0.5 - p.getZ(i) / M / Wd);
      pg.translate(0, y * M, 0);
      return pg;
    };
    g.add(new THREE.Mesh(capGeo(T), topMat), new THREE.Mesh(capGeo(0), topMat));
    g.add(sideStrip(-hl, hw, hl, hw, 0, -1, prof, longMat, L));
    g.add(sideStrip(hl, -hw, -hl, -hw, 0, 1, prof, longMat, L));
    g.add(sideStrip(hl, hw, hl, -hw, -1, 0, prof, endMat, Wd));
    g.add(sideStrip(-hl, -hw, -hl, hw, 1, 0, prof, endMat, Wd));
    g.children.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    g.position.y = (D.height - D.topT) * M;
    return g;
  }
  const steel = new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide, flatShading: true });
  const screwMat = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4, metalness: 0.7 });
  function buildLeg(L: number): THREE.Group {
    const g = new THREE.Group();
    const rL = L >= 240 ? LEG.rLLong : LEG.rLShort;
    const hu = D.height - D.topT - LEG.plateT, k = (hu - LEG.hub) / LEG.hub;
    const feet: Pt[] = [[rL, 0], [-rL, 0], [0, LEG.rS], [0, -LEG.rS]];
    const plates: Pt[] = [[-rL * k, 0], [rL * k, 0], [0, -LEG.rS * k], [0, LEG.rS * k]];
    feet.forEach(([fx, fz], i) => {
      const [px, pz] = plates[i];
      const lo = [fx, 0, fz], up = [px, hu, pz], dx = px - fx, dz = pz - fz;
      const m = new THREE.Mesh(boxBar(up, lo, LEG.w, LEG.w, 0, hu), steel); m.castShadow = true; m.receiveShadow = true; g.add(m);
      const ang = Math.atan2(-dz, dx);
      const pl = new THREE.Mesh(new THREE.BoxGeometry(LEG.plateL * M, LEG.plateT * M, LEG.plateW * M), steel);
      pl.position.set(up[0] * M, (hu + LEG.plateT / 2) * M, up[2] * M); pl.rotation.y = ang; pl.castShadow = true; g.add(pl);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sa, sb]) => {
        const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * M, 0.5 * M, 0.3 * M, 14), screwMat);
        const la = sa * (LEG.plateL / 2 - 2.2), lb = sb * (LEG.plateW / 2 - 2.2);
        sc.position.set((up[0] + la * Math.cos(ang) + lb * Math.sin(ang)) * M, (hu - 0.1) * M, (up[2] - la * Math.sin(ang) + lb * Math.cos(ang)) * M);
        g.add(sc);
      });
    });
    return g;
  }
  const group = new THREE.Group();
  let top: THREE.Group | null = null, leg: THREE.Group | null = null;
  return {
    group,
    home: { az: -35, el: 14 },
    setLength(L) {
      if (leg) { group.remove(leg); disposeGroup(leg); }
      if (top) { group.remove(top); disposeGroup(top); }
      leg = buildLeg(L); group.add(leg);
      top = buildTop(L, D.width); group.add(top);
    },
    setLeg() { /* the star base is the only Wrekin base photographed so far */ },
    dispose() { disposeGroup(group); tex.dispose(); endTex.dispose(); longTex.dispose(); },
  };
}

// =====================================================================================
// THE RAGLETH — live-edge oak, solid oak spider leg (Light Spider 140 / 180)
// =====================================================================================
export async function createRagleth(): Promise<TableModel> {
  const D = { width: 90, height: 75, topT: 6.5 };
  const BAR = { wide: 16, thin: 6 };
  const RAIL = { w: 6, t: 1.5, cross: 62 };
  const rS = 27;
  const [tex, longTex, endTex, legTex] = await Promise.all([
    loadTex(`${BASE}/ragleth/top.jpg`, false), loadTex(`${BASE}/ragleth/edge_long.jpg`), loadTex(`${BASE}/ragleth/edge_end.jpg`), loadTex(`${BASE}/ragleth/leg.jpg`),
  ]);
  const topMat = wood(tex, 0.85, 0.25), longMat = wood(longTex, 0.85, 0.2), endMat = wood(endTex, 0.85, 0.2), legMat = wood(legTex, 0.88, 0.12);
  const smooth = (a: number[]) => a.map((_, i) => (a[Math.max(0, i - 2)] + a[Math.max(0, i - 1)] + a[i] + a[Math.min(a.length - 1, i + 1)] + a[Math.min(a.length - 1, i + 2)]) / 5);
  const edges = { step: raglethEdgesRaw.step, left: smooth(raglethEdgesRaw.left), right: smooth(raglethEdgesRaw.right) };
  const wave = (arr: number[], s: number) => {
    const span = (arr.length - 1) * edges.step, period = span * 2;
    let x = ((s % period) + period) % period;
    if (x > span) x = period - x;
    const f = x / edges.step, i = Math.min(arr.length - 2, Math.floor(f));
    return arr[i] + (arr[i + 1] - arr[i]) * (f - i);
  };
  const profile = (T: number): Pt[] => [[0.5, 0], [0, 0.9], [0, T - 1.6], [0.25, T - 1.05], [0.7, T - 0.45], [1.3, T]];
  function buildTop(L: number, W: number): THREE.Group {
    const T = D.topT, prof = profile(T);
    const pts: Pt[] = [], n = Math.round(L / 2);
    for (let i = 0; i <= n; i++) { const x = -L / 2 + (L * i) / n; pts.push([x, -W / 2 + wave(edges.right, x + L / 2)]); }
    for (let i = n; i >= 0; i--) { const x = -L / 2 + (L * i) / n; pts.push([x, W / 2 - wave(edges.left, x + L / 2)]); }
    const N = pts.length, { nrm } = mitreNormals(pts), arc = arcLengths(pts);
    const plen = [0];
    for (let k = prof.length - 2; k >= 0; k--) plen.push(plen[plen.length - 1] + Math.hypot(prof[k + 1][0] - prof[k][0], prof[k + 1][1] - prof[k][1]));
    const total = plen[plen.length - 1];
    const pos: number[] = [], uv: number[] = [], uvEnd: number[] = [];
    prof.forEach(([inset, h], k) => {
      const frac = plen[prof.length - 1 - k] / total;
      for (let i = 0; i < N; i++) {
        pos.push((pts[i][0] + nrm[i][0] * inset) * M, h * M, (pts[i][1] + nrm[i][1] * inset) * M);
        uv.push((pts[i][0] + L / 2) / 158, 1 - frac);
        uvEnd.push(arc[i] / 78, 1 - frac);
      }
    });
    const idxLong: number[] = [], idxEnd: number[] = [];
    for (let k = 0; k < prof.length - 1; k++)
      for (let i = 0; i < N; i++) {
        const a = k * N + i, b = k * N + ((i + 1) % N), c = (k + 1) * N + i, d = (k + 1) * N + ((i + 1) % N);
        ((i === n || i === 2 * n + 1) ? idxEnd : idxLong).push(a, c, b, b, c, d);
      }
    const cap = (ring: number, up: boolean) => {
      const cp: number[] = [], cu: number[] = [], ci: number[] = [], h = prof[ring][1] * M;
      for (let i = 0; i < N; i++) { const x = pos[(ring * N + i) * 3], z = pos[(ring * N + i) * 3 + 2]; cp.push(x, h, z); cu.push(x / M / L + 0.5, 0.5 - z / M / W); }
      for (let i = 0; i < n; i++) {
        const b0 = i, b1 = i + 1, f0 = 2 * n + 1 - i, f1 = 2 * n - i;
        if (up) ci.push(b0, f0, b1, b1, f0, f1); else ci.push(b0, b1, f0, b1, f1, f0);
      }
      return geo(cp, cu, ci);
    };
    const g = new THREE.Group();
    g.add(
      new THREE.Mesh(geo(pos, uv, idxLong), longMat), new THREE.Mesh(geo(pos, uvEnd, idxEnd), endMat),
      new THREE.Mesh(cap(prof.length - 1, true), topMat), new THREE.Mesh(cap(0, false), topMat),
    );
    g.children.forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    g.position.y = (D.height - T) * M;
    return g;
  }
  function buildLeg(rx: number): THREE.Group {
    const g = new THREE.Group();
    const hu = D.height - D.topT;
    ([[rx, 0], [-rx, 0], [0, rS], [0, -rS]] as Pt[]).forEach(([fx, fz]) => {
      const m = new THREE.Mesh(boxBar([-fx, hu, -fz], [fx, 0, fz], BAR.wide, BAR.thin, 0, hu, true), legMat);
      m.castShadow = true; m.receiveShadow = true; g.add(m);
    });
    const long = new THREE.Mesh(new THREE.BoxGeometry(2 * rx * M, RAIL.t * M, RAIL.w * M), legMat);
    long.position.set(0, (hu - RAIL.t / 2) * M, 0);
    const across = new THREE.Mesh(new THREE.BoxGeometry(RAIL.w * M, RAIL.t * M, RAIL.cross * M), legMat);
    across.position.set(0, (hu - RAIL.t / 2) * M, 0);
    [long, across].forEach((r) => { r.castShadow = true; r.receiveShadow = true; g.add(r); });
    return g;
  }
  const group = new THREE.Group();
  let top: THREE.Group | null = null, leg: THREE.Group | null = null;
  let curL = 200, legId: string | null = null;
  // The bars are shallow (~28°), so their flat top ends reach well past the nominal length. Pull the leg in
  // until the whole top end sits at least 3cm inside the end of the table.
  const reach = () => {
    const hu = D.height - D.topT;
    let r = legId === "light-spider-oak-180" ? 90 : legId === "light-spider-oak-140" ? 70 : curL >= 240 ? 90 : 70;
    const reachOut = (x: number) => x + (BAR.wide / 2) * (Math.hypot(2 * x, hu) / hu);
    while (r > 30 && reachOut(r) > curL / 2 - 3) r -= 0.5;
    return r;
  };
  const rebuildLeg = () => { if (leg) { group.remove(leg); disposeGroup(leg); } leg = buildLeg(reach()); group.add(leg); };
  return {
    group,
    home: { az: -30, el: 13 },
    setLength(L) {
      curL = L;
      rebuildLeg();
      if (top) { group.remove(top); disposeGroup(top); }
      top = buildTop(L, D.width); group.add(top);
    },
    setLeg(id) { legId = id; if (leg) rebuildLeg(); },
    dispose() { disposeGroup(group); tex.dispose(); longTex.dispose(); endTex.dispose(); legTex.dispose(); },
  };
}

export const MODEL_FACTORIES: Record<string, () => Promise<TableModel>> = {
  "the-caradoc": createCaradoc,
  "the-lawley": createLawley,
  "the-wrekin": createWrekin,
  "the-ragleth": createRagleth,
};
/** Catalogue leg ids each 3D model can show (any other leg keeps the default base and shows a note). */
export const MODEL_LEGS: Record<string, string[]> = {
  "the-caradoc": ["bold-center-double-x"],
  "the-lawley": ["lawley-star"],
  "the-wrekin": ["wrekin-star"],
  "the-ragleth": ["light-spider-oak-140", "light-spider-oak-180"],
};
