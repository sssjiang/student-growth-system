import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/addons/renderers/CSS2DRenderer.js";
import { types, interactions } from "./model.js";

export function createCityScene(container, city, onSelect) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor("#e3e9e6");
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-70, 70, 50, -50, 0.1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2.25;
  controls.minPolarAngle = 0.2;
  controls.minZoom = 0.5;
  controls.maxZoom = 16;
  const labels = new CSS2DRenderer();
  labels.domElement.className = "city-labels";
  container.append(labels.domElement);
  scene.add(new THREE.AmbientLight("#bcdad7", 2));
  const sun = new THREE.DirectionalLight("#ffe7c0", 3.2);
  sun.position.set(-40, 80, 30);
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#91b9e0", 1.2);
  fill.position.set(40, 20, -30);
  scene.add(fill);
  const grid = new THREE.GridHelper(600, 120, "#b2c1b9", "#cdd7d1");
  grid.position.y = -0.25;
  scene.add(grid);
  const objects = new Map(),
    hitTargets = [],
    labelsList = [],
    relationGroup = new THREE.Group();
  scene.add(relationGroup);
  let dirty = true,
    selected = null,
    currentMode = "contains",
    matches = null;
  controls.addEventListener("change", () => {
    dirty = true;
  });
  const material = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.75,
      metalness: 0.1,
      ...extra,
    });
  function box(group, width, height, depth, x, y, z, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      material(color),
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  function cylinder(group, radius, height, x, y, z, color, sides = 16) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, sides),
      material(color),
    );
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  function building(file) {
    const group = new THREE.Group();
    const color = types[file.type].color;
    const dark = "#3e5958",
      glass = "#d0e9d9";
    box(group, 4.3, 0.18, 4.3, 0, 0.15, 0, "#304747");
    if (file.type === "gate") {
      box(group, 0.65, 2.6, 1.5, -1.15, 1.4, 0, color);
      box(group, 0.65, 2.6, 1.5, 1.15, 1.4, 0, color);
      box(group, 3.1, 0.7, 1.7, 0, 2.9, 0, color);
      box(group, 2.8, 0.13, 0.3, 0, 1.2, 0.6, glass);
    } else if (file.type === "station") {
      box(group, 2.4, 1.2, 2.3, 0, 0.85, 0, color);
      cylinder(group, 0.11, 3.6, 0.5, 2, 0, color, 6);
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        material(glass),
      );
      dish.position.set(0.5, 3.1, 0);
      dish.rotation.z = -0.8;
      group.add(dish);
    } else if (file.type === "factory") {
      box(group, 3.1, 1.5, 2.6, 0, 1, 0, color);
      for (let i = 0; i < 3; i++) {
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.85, 0.9, 4),
          material(color),
        );
        roof.position.set(-1 + i, 2.1, 0);
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
      }
      cylinder(group, 0.25, 3.2, 1, 1.9, -1, dark, 8);
    } else if (file.type === "warehouse") {
      for (let i = 0; i < 3; i++)
        cylinder(group, 1.25, 0.65, 0, 0.65 + i * 0.7, 0, i % 2 ? dark : color);
      cylinder(group, 1.28, 0.12, 0, 2.45, 0, glass);
    } else if (file.type === "tower") {
      box(group, 1.25, 3.2, 1.25, 0, 1.9, 0, dark);
      box(group, 2.2, 1, 2.2, 0, 3.5, 0, color);
      box(group, 2.35, 0.2, 2.35, 0, 4.1, 0, glass);
      cylinder(group, 0.08, 1, 0, 4.6, 0, color, 6);
    } else if (file.type === "lab") {
      box(group, 2.8, 1.3, 2.8, 0, 0.9, 0, color);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        material(glass),
      );
      dome.position.y = 1.55;
      group.add(dome);
    } else if (file.type === "hall" || file.type === "library") {
      box(group, 3, 1.5, 2.5, 0, 1, -0.2, dark);
      for (let i = 0; i < 4; i++)
        cylinder(group, 0.15, 1.8, -1.2 + i * 0.8, 1.15, 1.1, color, 8);
      box(group, 3.3, 0.3, 2.9, 0, 2.15, 0, color);
      if (file.type === "hall") {
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(2.1, 0.9, 4),
          material(color),
        );
        roof.rotation.y = Math.PI / 4;
        roof.scale.z = 0.8;
        roof.position.y = 2.75;
        group.add(roof);
      } else
        for (let i = 0; i < 4; i++)
          box(group, 0.4, 0.8, 0.25, -1 + i * 0.65, 1.1, 1.5, color);
    } else if (file.type === "studio") {
      box(group, 3, 0.75, 2.8, 0, 0.65, 0, dark);
      box(group, 3.2, 0.22, 3, 0, 1.5, 0, color);
      box(group, 1.1, 0.7, 1.1, -0.7, 1.1, -0.6, glass);
      box(group, 1.1, 0.35, 1.1, 0.65, 0.95, 0.65, color);
    } else {
      box(group, 2.8, 1.5, 2.5, 0, 1, 0, color);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.1, 1.2, 4),
        material(dark),
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 2.25;
      roof.scale.z = 0.9;
      group.add(roof);
    }
    if (!["gate", "warehouse"].includes(file.type))
      box(group, 0.65, 0.75, 0.09, 0, 0.72, 1.3, "#172d30");
    return group;
  }
  function label(item, y, directory) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = directory
      ? `district-label depth-${item.depth}`
      : "building-label";
    element.textContent = directory
      ? `${item.name} / ${item.fileCount}`
      : item.title;
    element.title = directory
      ? item.path
      : `${item.title}：${item.responsibility}`;
    element.addEventListener("click", () => onSelect(item.path));
    const object = new CSS2DObject(element);
    object.position.set(
      item.x + (directory ? 2 : 2.5),
      y,
      item.z + (directory ? 1 : 3.4),
    );
    if (directory) object.center.set(0, 0.5);
    scene.add(object);
    labelsList.push({ item, object, element, directory });
  }
  for (const item of city.all.values()) {
    if (item.directory) {
      const y = item.depth * 0.07;
      const group = new THREE.Group();
      group.position.set(item.x, y, item.z);
      const color = item.path.startsWith("frontend") ? "#496573" : "#5b6545";
      const plate = box(
        group,
        item.width,
        0.1,
        item.depthSize,
        item.width / 2,
        0,
        item.depthSize / 2,
        color,
      );
      const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(plate.geometry),
        new THREE.LineBasicMaterial({
          color: item.depth ? "#b9cdc0" : "#e1ebd7",
          transparent: true,
          opacity: item.depth ? 0.65 : 0.95,
        }),
      );
      border.position.copy(plate.position);
      group.add(border);
      scene.add(group);
      plate.userData.path = item.path;
      hitTargets.push(plate);
      objects.set(item.path, group);
      label(item, 0.65, true);
    } else {
      const group = building(item);
      group.position.set(item.x + 2.5, 0.6, item.z + 2.5);
      group.traverse((object) => {
        if (object.isMesh) {
          object.userData.path = item.path;
          hitTargets.push(object);
        }
      });
      scene.add(group);
      objects.set(item.path, group);
      label(item, 0.9, false);
    }
  }
  const raycaster = new THREE.Raycaster();
  let pointerStart;
  const tooltip = document.createElement("div");
  tooltip.className = "building-tooltip";
  tooltip.hidden = true;
  container.append(tooltip);
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (event.buttons) {
      tooltip.hidden = true;
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = raycaster.intersectObjects(hitTargets)[0];
    const item = city.all.get(hit?.object.userData.path);
    tooltip.hidden = !item;
    if (item) {
      tooltip.textContent = item.directory
        ? `${item.path} · ${item.fileCount} 个文件`
        : `${item.title}\n${item.path}\n${item.responsibility}`;
      tooltip.style.left = `${Math.max(8, Math.min(rect.width - 270, event.clientX - rect.left + 16))}px`;
      tooltip.style.top = `${Math.max(8, Math.min(rect.height - 115, event.clientY - rect.top + 16))}px`;
    }
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    tooltip.hidden = true;
  });
  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerStart = [event.clientX, event.clientY];
  });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (
      !pointerStart ||
      Math.hypot(
        event.clientX - pointerStart[0],
        event.clientY - pointerStart[1],
      ) > 5
    )
      return;
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = raycaster.intersectObjects(hitTargets)[0];
    if (hit) onSelect(hit.object.userData.path);
  });
  function clearRelations() {
    relationGroup.traverse((object) => {
      object.geometry?.dispose();
      if (object.material) object.material.dispose();
    });
    relationGroup.clear();
  }
  function connect(fromPath, toPath, kind) {
    const from = city.all.get(fromPath),
      to = city.all.get(toPath);
    if (!from || !to) return;
    const a = new THREE.Vector3(
      from.x + from.width / 2,
      3.4,
      from.z + from.depthSize / 2,
    );
    const b = new THREE.Vector3(
      to.x + to.width / 2,
      3.4,
      to.z + to.depthSize / 2,
    );
    const midpoint = a.clone().lerp(b, 0.5);
    midpoint.y += Math.min(15, a.distanceTo(b) * 0.17);
    const curve = new THREE.QuadraticBezierCurve3(a, midpoint, b);
    const color = kind === "import" ? "#2078ba" : "#aa5b16";
    const lineMaterial =
      kind === "import"
        ? new THREE.LineBasicMaterial({ color })
        : new THREE.LineDashedMaterial({ color, dashSize: 1, gapSize: 0.5 });
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
      lineMaterial,
    );
    line.computeLineDistances();
    relationGroup.add(line);
    relationGroup.add(
      new THREE.ArrowHelper(
        curve.getTangent(0.68),
        curve.getPoint(0.68),
        2,
        color,
        1,
        0.65,
      ),
    );
  }
  function fit(path) {
    const item = city.all.get(path);
    const width = item ? Math.max(item.width, 25) : city.totalWidth;
    const depth = item ? Math.max(item.depthSize, 22) : city.depth;
    const x = item ? item.x + item.width / 2 : 0,
      z = item ? item.z + item.depthSize / 2 : 0;
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const half = Math.max(depth * 0.46 + 10, (width / aspect) * 0.6 + 6);
    camera.left = -half * aspect;
    camera.right = half * aspect;
    camera.top = half;
    camera.bottom = -half;
    camera.zoom = 1;
    camera.position.set(x + 8, 110, z + 95);
    controls.target.set(x, 0, z);
    camera.updateProjectionMatrix();
    controls.update();
    dirty = true;
  }
  function update(path, mode, filtered, flowPaths = []) {
    selected = path;
    currentMode = mode;
    matches = filtered;
    clearRelations();
    const selectedItem = city.all.get(path);
    const neighbors = new Set([path, ...flowPaths]);
    if (selectedItem && !selectedItem.directory) {
      if (mode === "imports")
        for (const file of city.files)
          for (const target of file.imports)
            if (file.path === path || target === path) {
              neighbors.add(file.path);
              neighbors.add(target);
              connect(file.path, target, "import");
            }
      if (mode === "interactions")
        for (const edge of interactions)
          if (edge.from === path || edge.to === path) {
            neighbors.add(edge.from);
            neighbors.add(edge.to);
            connect(edge.from, edge.to, "interaction");
          }
    }
    if (flowPaths.length)
      for (let i = 1; i < flowPaths.length; i++)
        connect(flowPaths[i - 1], flowPaths[i], "interaction");
    for (const [id, group] of objects) {
      const item = city.all.get(id);
      if (item.directory) continue;
      const related =
        !path ||
        (selectedItem?.directory
          ? id.startsWith(`${path}/`)
          : mode === "contains" && !flowPaths.length
            ? true
            : neighbors.has(id));
      const dim = !related || (filtered && !filtered.has(id));
      group.traverse((object) => {
        if (object.isMesh) {
          object.material.transparent = dim;
          object.material.opacity = dim ? 0.13 : 1;
          object.material.emissive.set(id === path ? "#658948" : "#000000");
          object.material.emissiveIntensity = 0.4;
        }
      });
    }
    dirty = true;
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    labels.setSize(width, height);
    const aspect = width / height;
    camera.left = -camera.top * aspect;
    camera.right = camera.top * aspect;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  fit();
  let frame;
  function render() {
    frame = requestAnimationFrame(render);
    controls.update();
    if (!dirty || container.hidden || document.hidden) return;
    const visibleWidth = (camera.right - camera.left) / camera.zoom;
    const labelBudget = container.clientWidth / visibleWidth;
    for (const entry of labelsList) {
      const isSelected = selected === entry.item.path;
      const show = entry.directory
        ? entry.item.depth === 0 ||
          (entry.item.depth < 3 && labelBudget > 7) ||
          isSelected
        : isSelected || labelBudget > 14;
      entry.object.visible =
        show && (!matches || entry.directory || matches.has(entry.item.path));
      entry.element.classList.toggle("selected", isSelected);
    }
    renderer.render(scene, camera);
    labels.render(scene, camera);
    dirty = false;
  }
  render();
  return {
    fit,
    update,
    zoom(amount) {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * amount, 0.5, 16);
      camera.updateProjectionMatrix();
      dirty = true;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
