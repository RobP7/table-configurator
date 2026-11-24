import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MODEL_FACTORIES, type TableModel } from "./models";

interface Props {
  /** Range id, e.g. "the-wrekin". */
  rangeId: string;
  /** Table length in cm — the model is rebuilt to this length. */
  lengthCm: number;
  /** Selected catalogue leg id (the model shows the matching leg when it has one). */
  legId: string | null;
  /** Shown over the viewer, e.g. when the selected leg has no 3D model yet. */
  note?: string;
}

const PRESETS: { label: string; az: number | null; el: number; dist: number; under?: boolean }[] = [
  { label: "3/4", az: null, el: 13, dist: 1 },
  { label: "Front", az: 0, el: 8, dist: 1 },
  { label: "End", az: 90, el: 12, dist: 0.92 },
  { label: "Above", az: -15, el: 60, dist: 0.95 },
  { label: "Underside", az: -30, el: -16, dist: 0.65, under: true },
];

export function TableViewer3D({ rangeId, lengthCm, legId, note }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setLength: (l: number) => void; setLeg: (id: string | null) => void; preset: (i: number) => void } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef({ lengthCm, legId });
  latest.current = { lengthCm, legId };

  // Build the scene once per range.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    setReady(false);
    setFailed(false);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = "scene-canvas";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f2ee);
    const pm = new THREE.PMREMGenerator(renderer);
    const envRT = pm.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.35;
    const camera = new THREE.PerspectiveCamera(24, 1, 0.05, 60);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xe6dfd2, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(1.6, 3.4, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.004;
    Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 12 });
    scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: 0.14 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.38, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 9;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2 + 0.4; // lets people look up at the underside
    controls.autoRotateSpeed = 1.1;

    let model: TableModel | null = null;
    let dist = 5;
    let lastL = latest.current.lengthCm;
    const setView = (azDeg: number, elDeg: number, d: number, under = false) => {
      const a = THREE.MathUtils.degToRad(azDeg), e = THREE.MathUtils.degToRad(elDeg);
      controls.target.set(0, under ? 0.5 : 0.38, 0);
      camera.position.set(d * Math.cos(e) * Math.sin(a), controls.target.y + d * Math.sin(e), d * Math.cos(e) * Math.cos(a));
      controls.update();
    };
    const baseDist = (L: number) => 3.2 + (L / 100) * 1.2;

    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w / h < 1 ? (24 / (w / h)) * 0.85 : 24;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    MODEL_FACTORIES[rangeId]?.()
      .then((m) => {
        if (disposed) { m.dispose(); return; }
        model = m;
        scene.add(m.group);
        m.setLeg(latest.current.legId);
        m.setLength(latest.current.lengthCm);
        lastL = latest.current.lengthCm;
        dist = baseDist(lastL);
        setView(m.home.az, m.home.el, dist);
        api.current = {
          setLength: (l) => {
            // keep the camera framing the table when its length changes
            const k = baseDist(l) / baseDist(lastL);
            lastL = l;
            if (Math.abs(k - 1) > 1e-3) {
              camera.position.sub(controls.target).multiplyScalar(k).add(controls.target);
              controls.update();
            }
            m.setLength(l);
          },
          setLeg: (id) => { m.setLeg(id); m.setLength(lastL); },
          preset: (i) => {
            const p = PRESETS[i];
            setView(p.az ?? m.home.az, p.el, baseDist(latest.current.lengthCm) * p.dist, p.under);
          },
        };
        setReady(true);
      })
      .catch(() => { if (!disposed) setFailed(true); });

    return () => {
      disposed = true;
      api.current = null;
      ro.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      if (model) { scene.remove(model.group); model.dispose(); }
      envRT.dispose();
      pm.dispose();
      floor.geometry.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [rangeId]);

  // Length / leg changes update the model in place (camera stays where the customer left it).
  useEffect(() => { api.current?.setLength(lengthCm); }, [lengthCm, ready]);
  useEffect(() => { api.current?.setLeg(legId); }, [legId, ready]);

  return (
    <div className="viewer3d">
      <div ref={host} className="viewer3d__host" />
      {!ready && !failed && <div className="viewer3d__loading"><span className="loader-pill">Loading table…</span></div>}
      {failed && <div className="viewer3d__loading"><span className="loader-pill">Couldn’t start the 3D view</span></div>}
      {ready && (
        <>
          <div className="viewer3d__presets" role="group" aria-label="Camera views">
            {PRESETS.map((p, i) => (
              <button key={p.label} type="button" className="viewer3d__preset" onClick={() => api.current?.preset(i)}>
                {p.label}
              </button>
            ))}
          </div>
          {note ? <p className="real-gallery__note">{note}</p> : <div className="app__hint">Drag to rotate · Scroll to zoom</div>}
        </>
      )}
    </div>
  );
}
