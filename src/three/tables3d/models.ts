import * as THREE from "three";
import caradocEdges from "./caradocEdges.json";
import lawleyOutline from "./lawleyOutline.json";
import raglethEdgesRaw from "./raglethEdges.json";
import myndProfile from "./myndProfile.json";
import haughmondLegRows from "./haughmondLegRows.json";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// The four photographed tables, built as real 3D models. Everything is measured/fitted from the
// product photos; textures are wrapped from the photos themselves (see public/3d/<range>/).

export interface TableModel {
  group: THREE.Group;
  /** Rebuild for a new table length (cm). */
  setLength: (lengthCm: number) => void;
  /** Choose the leg (catalogue leg id). Unknown ids keep the range's default leg. */
  setLeg: (legId: string | null) => void;
  home: { az: number; el: number };
  /** Camera distance (m) that frames the table at this length; the viewer's default is used when absent. */
  dist?: (lengthCm: number) => number;
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
  const LEG = { w: 7, plateL: 22, plateW: 12, plateT: 0.6, rS: 28.7, hub: 33.9, rLShort: 51.9, rLLong: 72, rLXL: 92 };
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
    // 160–180cm: standard leg · 200–240cm: longer leg · 260–300cm: longest leg
    const rL = L >= 260 ? LEG.rLXL : L >= 200 ? LEG.rLLong : LEG.rLShort;
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

// =====================================================================================
// THE MYND — round oak top on a black Tulip pedestal
// =====================================================================================
export async function createMynd(env: THREE.Texture | null): Promise<TableModel> {
  const TABLE_H = 0.75, TOP_T = 0.037;
  const [tex, edgeTex] = await Promise.all([loadTex(`${BASE}/mynd/top.jpg`, false), loadTex(`${BASE}/mynd/edge.jpg`, false)]);
  edgeTex.wrapS = THREE.RepeatWrapping;
  const group = new THREE.Group();

  // pedestal: lathe of the radius profile fitted to the photo's silhouette
  const pedTop = TABLE_H - TOP_T;
  const pts = myndProfile.h.map((h, i) => new THREE.Vector2(myndProfile.r[i] / 100, Math.min(h / 100, pedTop)));
  pts.unshift(new THREE.Vector2(0, 0));
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x070707, roughness: 0.5, metalness: 0, side: THREE.DoubleSide });
  if (env) { pedMat.envMap = env; pedMat.envMapIntensity = 0.1; } // soft reflections off the black powder-coat
  const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pts, 160), pedMat);
  pedestal.castShadow = true;
  const cap = new THREE.Mesh(new THREE.CircleGeometry(pts[pts.length - 1].x, 64), pedMat);
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = pedTop;
  group.add(pedestal, cap);

  const topMat = new THREE.MeshBasicMaterial({ map: tex });
  const underMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 });
  if (env) { underMat.envMap = env; underMat.envMapIntensity = 0.2; }
  const edgeMat = new THREE.MeshBasicMaterial({ map: edgeTex });

  // soft contact shadow under the pedestal
  const c2 = document.createElement("canvas");
  c2.width = c2.height = 256;
  const g2 = c2.getContext("2d")!;
  const grad = g2.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, "rgba(0,0,0,.20)"); grad.addColorStop(0.55, "rgba(0,0,0,.10)"); grad.addColorStop(1, "rgba(0,0,0,0)");
  g2.fillStyle = grad; g2.fillRect(0, 0, 256, 256);
  const blobTex = new THREE.CanvasTexture(c2);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.001;
  group.add(blob);

  let top: THREE.Mesh | null = null;
  return {
    group,
    home: { az: 0, el: 16 },
    dist: (L) => 3.38 * (L / 110),
    setLength(L) {
      if (top) { group.remove(top); top.geometry.dispose(); }
      const r = L / 200;
      top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, TOP_T, 200), [edgeMat, topMat, underMat]);
      const g = top.geometry, uvA = g.attributes.uv, grp = g.groups[2];
      for (let k = grp.start; k < grp.start + grp.count; k++) { const vi = g.index!.getX(k); uvA.setY(vi, 1 - uvA.getY(vi)); }
      top.position.y = TABLE_H - TOP_T / 2;
      top.castShadow = true;
      group.add(top);
    },
    setLeg() {},
    dispose() {
      disposeGroup(group);
      tex.dispose(); edgeTex.dispose(); blobTex.dispose();
      [pedMat, topMat, underMat, edgeMat].forEach((m) => m.dispose());
    },
  };
}

// =====================================================================================
// THE HAUGHMOND — thick reclaimed-oak slab on wooden trestle legs
// =====================================================================================
export async function createHaughmond(): Promise<TableModel> {
  const D = { width: 90, height: 75, topT: 7.6 };
  const LEG = { inset: 25.5, footX: 21.7, footZ: 74.4, bearerX: 17.5, bearerZ: 58.5, bearerH: 6 };
  // Column profile read off the close-up of the leg: [height above the floor (cm), width across the table (cm)]
  const COL: Pt[] = [
    [12, 33], [16, 33], [16, 28], [21, 28], [21, 24.6], [25.5, 24.6], [25.5, 28.7], [30.5, 28.7],
    [30.5, 31], [31.5, 35.5], [33.5, 38.6], [35.5, 36], [37, 32], [37, 29.5], [44, 29.5], [44.6, 28.8],
    [47, 25], [50, 22.4], [53, 22.8], [56, 26], [58.8, 29.7], [61.4, 30.5]];
  const legRows = haughmondLegRows as number[][];

  const [tex, longTex, endTex, legTex, closeTex, footTex] = await Promise.all([
    loadTex(`${BASE}/haughmond/top.jpg`, false), loadTex(`${BASE}/haughmond/edge_long.jpg`, false), loadTex(`${BASE}/haughmond/edge_end.jpg`, false),
    loadTex(`${BASE}/haughmond/leg.jpg`, false), loadTex(`${BASE}/haughmond/legclose.jpg`, false), loadTex(`${BASE}/haughmond/foot.jpg`, false),
  ]);
  [tex, longTex, endTex, legTex].forEach((t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; });
  footTex.wrapS = footTex.wrapT = THREE.MirroredRepeatWrapping;
  const mk = (map: THREE.Texture, rough = 0.85) => wood(map, rough, 0.2);
  const topMat = mk(tex), longMat = mk(longTex), endMat = mk(endTex), legMat = mk(legTex, 0.8);
  [topMat, longMat, endMat].forEach((m) => m.color.setScalar(0.88)); // match the photo's slightly deeper brown
  // the column wears the close-up photo of the leg, warped onto its profile so the edges line up exactly
  const colMat = new THREE.MeshBasicMaterial({ map: closeTex, side: THREE.DoubleSide });
  const footMat = mk(footTex, 0.8);
  footMat.emissive = new THREE.Color(0xffffff); footMat.emissiveMap = footTex; footMat.emissiveIntensity = 0.25;

  function buildTop(L: number): THREE.Mesh {
    const T = D.topT, W = D.width;
    const g = new THREE.BoxGeometry(L * M, T * M, W * M);
    const uv = g.attributes.uv;
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z — scale the long-side photos along the length
    for (let gi = 4; gi <= 5; gi++) {
      const grp = g.groups[gi];
      for (let k = grp.start; k < grp.start + grp.count; k++) { const vi = g.index!.getX(k); uv.setX(vi, uv.getX(vi) * (L / 184.5)); }
    }
    uv.needsUpdate = true;
    const m = new THREE.Mesh(g, [endMat, endMat, topMat, topMat, longMat, longMat]);
    m.castShadow = true; m.receiveShadow = true;
    m.position.y = (D.height - T / 2) * M;
    return m;
  }

  function column(): THREE.Mesh {
    const THICK = 0.87, N = 32, EXP = 5, R0 = 12, R1 = 188, H1 = 61.4, H0 = 12, WS = 0.6;
    const COLs: Pt[] = COL.filter(([h]) => h >= 13.4).map(([h, w]): Pt => [h, w * WS]);
    if (COL[0][0] < 13.4) COLs.unshift([13.4, 33 * WS]);
    const dense: Pt[] = [COLs[0]];
    for (let k = 1; k < COLs.length; k++) {
      const [ha, wa] = COLs[k - 1], [hb, wb] = COLs[k];
      if (Math.abs(hb - ha) < 1e-6) { dense.push([hb, wb]); continue; }
      const n = Math.max(1, Math.round(Math.abs(hb - ha) / 0.6));
      for (let i = 1; i <= n; i++) dense.push([ha + ((hb - ha) * i) / n, wa + ((wb - wa) * i) / n]);
    }
    const rowAt = (h: number) => Math.min(R1, Math.max(R0, R0 + ((H1 - h) / (H1 - H0)) * (R1 - R0)));
    const rowInfo = (row: number): Pt => { const [a, b] = legRows[Math.min(299, Math.max(0, Math.round(row)))]; return [(a + b) / 2, b - a]; };
    const ring = (w: number, t: number): Pt[] => Array.from({ length: N }, (_, i): Pt => {
      const a = (i / N) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      return [Math.sign(c) * Math.pow(Math.abs(c), 2 / EXP) * w / 2, Math.sign(sn) * Math.pow(Math.abs(sn), 2 / EXP) * t / 2];
    });
    const uvOf = (h: number, z: number, x: number, w: number): Pt => {
      const t = w * THICK, row = rowAt(h), [cxp, pw] = rowInfo(row);
      const coord = Math.abs(x) / (t / 2) > Math.abs(z) / (w / 2) ? x / (t / 2) : z / (w / 2); // side faces reuse the photo too
      return [(cxp + (coord * 0.9 * pw) / 2) / 300, 1 - row / 300];
    };
    const parts: THREE.BufferGeometry[] = [];
    const runs: Pt[][] = [];
    let cur: Pt[] = [dense[0]];
    for (let k = 1; k < dense.length; k++) {
      if (Math.abs(dense[k][0] - dense[k - 1][0]) < 1e-6) { runs.push(cur); cur = [dense[k]]; } else cur.push(dense[k]);
    }
    runs.push(cur);
    const mkRun = (run: Pt[]) => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      run.forEach(([h, w]) => ring(w, w * THICK).forEach(([z, x]) => { pos.push(x * M, h * M, z * M); uv.push(...uvOf(h, z, x, w)); }));
      for (let k = 0; k < run.length - 1; k++)
        for (let i = 0; i < N; i++) {
          const a = k * N + i, b = k * N + ((i + 1) % N), c = (k + 1) * N + i, d = (k + 1) * N + ((i + 1) % N);
          idx.push(a, c, b, b, c, d);
        }
      return geo(pos, uv, idx).toNonIndexed();
    };
    runs.forEach((r) => { if (r.length > 1) parts.push(mkRun(r)); });
    const flat = (h: number, wA: number, wB: number, up: boolean) => {
      const A = ring(wA, wA * THICK), B = ring(wB, wB * THICK), pos: number[] = [], uv: number[] = [];
      const v = (p: Pt, w: number) => { pos.push(p[1] * M, h * M, p[0] * M); uv.push(...uvOf(h, p[0], p[1], w)); };
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const tris: [Pt, number][][] = up
          ? [[[A[i], wA], [B[i], wB], [A[j], wA]], [[A[j], wA], [B[i], wB], [B[j], wB]]]
          : [[[A[i], wA], [A[j], wA], [B[i], wB]], [[A[j], wA], [B[j], wB], [B[i], wB]]];
        tris.forEach((t) => t.forEach(([p, w]) => v(p, w)));
      }
      return geo(pos, uv, null);
    };
    for (let k = 1; k < dense.length; k++)
      if (Math.abs(dense[k][0] - dense[k - 1][0]) < 1e-6) { const [h, w0] = dense[k - 1], [, w1] = dense[k]; parts.push(flat(h, w0, w1, w1 < w0)); }
    parts.push(flat(dense[dense.length - 1][0], dense[dense.length - 1][1], 0.01, true));
    const merged = mergeGeometries(parts)!;
    parts.forEach((p) => p.dispose());
    const m = new THREE.Mesh(merged, colMat);
    m.castShadow = true;
    return m;
  }

  function foot(): THREE.BufferGeometry {
    // fitted foot: low at the ends (2.6 cm), sweeping up to 12.9 cm where it meets the column
    const hz = LEG.footZ / 2, topPts: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const z = hz - (i / 24) * 2 * hz, t = Math.abs(z) / hz, e = (1 - Math.cos(Math.PI * Math.pow(Math.max(0, 1 - t), 0.97))) / 2;
      topPts.push([z, 2.6 + (12.9 - 2.6) * e]);
    }
    const pp: Pt[] = [[hz, 0], ...topPts, [-hz, 0]];
    const shape = new THREE.Shape(pp.map(([z, y]) => new THREE.Vector2(z * M, y * M)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: LEG.footX * M, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, -LEG.footX * M / 2);
    g.rotateY(Math.PI / 2);
    const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getZ(i) / 0.75 + 0.5, (p.getX(i) + p.getY(i)) * 3.5);
    return g;
  }

  function buildLegs(L: number): THREE.Group {
    // from 260cm the trestles move in a little so they stay under the longer top
    const inset = LEG.inset + Math.max(0, L - 240) * 0.3;
    const g = new THREE.Group(), xl = L / 2 - inset, hu = D.height - D.topT;
    [-xl, xl].forEach((x) => {
      const t = new THREE.Group();
      t.position.x = x * M;
      const f = new THREE.Mesh(foot(), footMat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(LEG.bearerX * M, LEG.bearerH * M, LEG.bearerZ * M), legMat);
      b.position.y = (hu - LEG.bearerH / 2) * M;
      [f, b].forEach((m) => { m.castShadow = true; m.receiveShadow = true; t.add(m); });
      t.add(column());
      g.add(t);
    });
    return g;
  }

  const group = new THREE.Group();
  let top: THREE.Mesh | null = null, legs: THREE.Group | null = null;
  return {
    group,
    home: { az: -35, el: 14 },
    setLength(L) {
      if (top) { group.remove(top); top.geometry.dispose(); }
      if (legs) { group.remove(legs); disposeGroup(legs); }
      top = buildTop(L); group.add(top);
      legs = buildLegs(L); group.add(legs);
    },
    setLeg() {},
    dispose() {
      disposeGroup(group);
      [tex, longTex, endTex, legTex, closeTex, footTex].forEach((t) => t.dispose());
      [topMat, longMat, endMat, legMat, colMat, footMat].forEach((m) => m.dispose());
    },
  };
}

export const MODEL_FACTORIES: Record<string, (env: THREE.Texture | null) => Promise<TableModel>> = {
  "the-mynd": createMynd,
  "the-caradoc": createCaradoc,
  "the-lawley": createLawley,
  "the-wrekin": createWrekin,
  "the-ragleth": createRagleth,
  "the-haughmond": createHaughmond,
};
/** Catalogue leg ids each 3D model can show (any other leg keeps the default base and shows a note). */
export const MODEL_LEGS: Record<string, string[]> = {
  "the-mynd": ["mynd-pedestal"],
  "the-caradoc": ["bold-center-double-x"],
  "the-lawley": ["lawley-star"],
  "the-wrekin": ["wrekin-star"],
  "the-ragleth": ["light-spider-oak-140", "light-spider-oak-180"],
  "the-haughmond": ["haughmond-trestle"],
};
