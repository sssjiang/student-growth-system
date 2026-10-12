import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { nodes, layers, edges } from './model.js';

export function createScene(container, select) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.append(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.domElement.className = 'scene-labels';
  container.append(labels.domElement);
  const scene = new THREE.Scene();
  const architecture = new THREE.Group();
  scene.add(architecture);
  let needsRender = true;
  const camera = new THREE.OrthographicCamera(-13, 13, 13, -13, 0.1, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.addEventListener('change', () => { needsRender = true; });
  controls.enableDamping = true;
  controls.minZoom = 0.65;
  controls.maxZoom = 1.8;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI / 2.3;
  controls.enablePan = true;
  scene.add(new THREE.AmbientLight(0xffffff, 2.3));
  const light = new THREE.DirectionalLight(0xd9e7d8, 3);
  light.position.set(-8, 18, 10);
  scene.add(light);
  const grid = new THREE.GridHelper(70, 70, 0x28382e, 0x1d2a22);
  grid.position.y = -1.3;
  grid.material.transparent = true;
  grid.material.opacity = 0.6;
  scene.add(grid);

  const positions = new Map();
  const objects = new Map();
  const connections = [];
  layers.forEach((layer, i) => {
    const geometry = new THREE.BoxGeometry(23, 0.12, 4.7);
    const plate = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: layer.color, transparent: true, opacity: 0.055, roughness: 0.8, depthWrite: false }));
    plate.position.set(0, (3 - i) * 1.4 - 0.35, (i - 1.5) * 6.5);
    architecture.add(plate);
    const border = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: 0.18 }));
    border.position.copy(plate.position);
    architecture.add(border);
  });
  nodes.forEach(node => {
    const color = layers[node.layer].color;
    const position = new THREE.Vector3((node.column - 1.5) * 5.6, (3 - node.layer) * 1.4, (node.layer - 1.5) * 6.5);
    positions.set(node.id, position);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.4, 2.3), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.2, roughness: 0.5, metalness: 0.2 }));
    mesh.position.copy(position);
    architecture.add(mesh);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-node';
    button.style.setProperty('--node-color', color);
    button.dataset.node = node.id;
    button.innerHTML = `<span class="node-top"><span class="node-symbol">${node.symbol}</span><span class="node-count">${String(node.fileCount).padStart(2, '0')} FILES</span></span><strong>${node.name}</strong><small>${node.tech}</small>`;
    button.addEventListener('click', event => { event.stopPropagation(); select(node.id); });
    const label = new CSS2DObject(button);
    label.position.copy(position).add(new THREE.Vector3(0, 0.7, 0));
    architecture.add(label);
    objects.set(node.id, { mesh, button });
  });
  for (const [from, to] of edges) {
    const a = positions.get(from).clone();
    const b = positions.get(to).clone();
    const midpoint = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 1.2, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, midpoint, b);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(35)), new THREE.LineBasicMaterial({ color: 0x8fc3a0, transparent: true, opacity: 0.26 }));
    architecture.add(line);
    const direction = curve.getTangent(0.72).normalize();
    const arrow = new THREE.ArrowHelper(direction, curve.getPoint(0.72), 0.65, 0x9acbab, 0.35, 0.22);
    architecture.add(arrow);
    connections.push({ from, to, line, arrow });
  }
  function reset(flat = false) {
    controls.target.set(0, 1.8, 0);
    camera.position.set(flat ? 0 : 5, flat ? 36 : 28, flat ? 0.01 : 29);
    camera.zoom = 1;
    controls.update();
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    labels.setSize(width, height);
    const aspect = width / height;
    architecture.scale.x = Math.max(1, aspect / 1.2);
    const halfHeight = Math.max(12, 14.7 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  reset();
  let animation;
  function render() {
    animation = requestAnimationFrame(render);
    if (!container.hidden && document.visibilityState !== 'hidden') {
      controls.update();
      if (needsRender) {
        renderer.render(scene, camera);
        labels.render(scene, camera);
        needsRender = false;
      }
    }
  }
  render();
  return {
    reset,
    zoom(amount) { camera.zoom = THREE.MathUtils.clamp(camera.zoom + amount, 0.65, 1.8); camera.updateProjectionMatrix(); needsRender = true; },
    update(selected, visible, flowNodes = []) {
      needsRender = true;
      for (const [id, { mesh, button }] of objects) {
        const dim = !visible.has(id);
        button.classList.toggle('dim', dim);
        button.classList.toggle('selected', id === selected);
        button.classList.toggle('on-flow', flowNodes.includes(id));
        button.setAttribute('aria-pressed', String(id === selected));
        mesh.material.opacity = dim ? 0.025 : id === selected ? 0.7 : 0.2;
      }
      for (const connection of connections) {
        const relevant = visible.has(connection.from) && visible.has(connection.to);
        const emphasized = selected === connection.from || selected === connection.to;
        connection.line.visible = relevant && (!selected || emphasized || flowNodes.length > 0);
        connection.arrow.visible = connection.line.visible;
        connection.line.material.opacity = emphasized ? 0.8 : 0.22;
      }
    },
    dispose() {
      cancelAnimationFrame(animation);
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => { object.geometry?.dispose(); if (object.material) { for (const material of [object.material].flat()) material.dispose(); } });
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
