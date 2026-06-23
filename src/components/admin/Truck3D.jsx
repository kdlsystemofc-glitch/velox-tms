import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Visualização 3D de uma carreta com a carga empacotada (vanilla three.js).
 * Coordenadas em metros: x = comprimento, y = altura, z = largura.
 * O conjunto é centrado na origem (x e z) para a órbita girar em torno da carga.
 *
 * @param {Array} boxes  caixas posicionadas (saída de packLoad): {x,y,z,l,w,h,color}
 * @param {number} truckL comprimento útil (m)
 * @param {number} truckW largura útil (m)
 * @param {number} truckH altura útil (m)
 * @param {number} height altura do canvas em px
 */
export default function Truck3D({ boxes = [], truckL, truckW, truckH, height = 380 }) {
  const mountRef = useRef(null);
  const refs = useRef({}); // { renderer, scene, camera, controls, content }

  // Monta a cena uma vez.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(8, 14, 10);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.25);
    dir2.position.set(-8, 6, -10);
    scene.add(dir2);

    const content = new THREE.Group();
    scene.add(content);

    refs.current = { renderer, scene, camera, controls, content, mount };

    let raf;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth || width;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [height]);

  // (Re)constrói carreta + carga quando muda.
  useEffect(() => {
    const r = refs.current;
    if (!r.scene) return;
    const L = Number(truckL) || 13.6;
    const W = Number(truckW) || 2.4;
    const H = Number(truckH) || 2.7;

    // Limpa conteúdo anterior.
    const content = r.content;
    while (content.children.length) {
      const c = content.children.pop();
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }

    const ox = -L / 2, oz = -W / 2; // centraliza em x e z

    // Chassi.
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(L + 0.4, 0.18, W + 0.1),
      new THREE.MeshStandardMaterial({ color: 0x334155 })
    );
    chassis.position.set(0, -0.12, 0);
    content.add(chassis);

    // Baú (container translúcido) + arestas.
    const bau = new THREE.Mesh(
      new THREE.BoxGeometry(L, H, W),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.12, depthWrite: false })
    );
    bau.position.set(0, H / 2, 0);
    content.add(bau);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W)),
      new THREE.LineBasicMaterial({ color: 0x475569 })
    );
    edges.position.set(0, H / 2, 0);
    content.add(edges);

    // Cabine (frente, lado -x).
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, H * 0.8, W * 0.96),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b })
    );
    cab.position.set(ox - 0.95, H * 0.4, 0);
    content.add(cab);

    // Rodas.
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.28, 18);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const axleX = [ox + 1.2, ox + L * 0.62, ox + L * 0.62 + 1.1, ox - 0.6];
    for (const wx of axleX) {
      for (const wz of [oz + 0.15, oz + W - 0.15]) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, -0.25, wz);
        content.add(wheel);
      }
    }

    // Caixas da carga.
    for (const b of boxes) {
      const geo = new THREE.BoxGeometry(b.l, b.h, b.w);
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.color || "#64748b") });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(ox + b.x + b.l / 2, b.y + b.h / 2, oz + b.z + b.w / 2);
      content.add(mesh);
      const be = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.35 })
      );
      be.position.copy(mesh.position);
      content.add(be);
    }

    // Enquadra a câmera conforme o tamanho do baú.
    const maxDim = Math.max(L, W, H);
    r.camera.position.set(L * 0.55, H * 1.7 + maxDim * 0.3, W * 2.4 + maxDim * 0.6);
    r.controls.target.set(0, H / 2, 0);
    r.controls.update();
  }, [boxes, truckL, truckW, truckH]);

  return <div ref={mountRef} className="w-full rounded-lg overflow-hidden border-2 border-slate-300" style={{ height }} />;
}
