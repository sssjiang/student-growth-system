import assert from "node:assert/strict";
import { scanProject } from "./scan.mjs";
import { nodes, edges, credentialFlow } from "../src/model.js";
import { buildCity, interactions, journey, types } from "../src/city/model.js";

const project = scanProject();
const paths = new Set(project.files.map((file) => file.path));
const ids = new Set(nodes.map((node) => node.id));
assert.equal(ids.size, nodes.length, "Module IDs must be unique");
for (const node of nodes) {
  for (const prefix of node.paths)
    assert(
      project.files.some((file) =>
        prefix.endsWith("/")
          ? file.path.startsWith(prefix)
          : file.path === prefix,
      ),
      `Missing module source: ${prefix}`,
    );
}
for (const [from, to] of edges)
  assert(ids.has(from) && ids.has(to), `Invalid edge ${from} → ${to}`);
for (const step of credentialFlow) {
  assert(ids.has(step.node), `Invalid flow node: ${step.node}`);
  assert(paths.has(step.file), `Missing flow evidence: ${step.file}`);
  assert(
    project.files
      .find((file) => file.path === step.file)
      .content.includes(step.term),
    `Missing source anchor: ${step.term}`,
  );
}
for (const file of project.files) {
  assert(
    !/(?:^|\/)\.|\/uploads\//.test(file.path),
    `Excluded path leaked: ${file.path}`,
  );
  for (const dependency of file.imports)
    assert(paths.has(dependency), `Unresolved dependency ${dependency}`);
}
const routes = project.files.find(
  (file) => file.path === "backend/routes/student_files.py",
);
assert(
  routes.endpoints.some(
    (endpoint) =>
      endpoint.method === "GET / POST" &&
      endpoint.path === "/api/student/files",
  ),
  "Multi-method Flask endpoint must be scanned",
);
const api = project.files.find(
  (file) => file.path === "frontend/src/api/StudentAPI.js",
);
assert(
  api.imports.includes("frontend/src/api/baseApi.js"),
  "Relative JS imports must resolve",
);
assert(
  routes.imports.includes("backend/services/credential_queue.py"),
  "Python project imports must resolve",
);
console.log(
  `Architecture verified: ${nodes.length} modules, ${edges.length} curated relationships, ${project.files.length} source files, ${project.importCount} static imports, ${credentialFlow.length} flow anchors.`,
);
const city = buildCity(project.files);
assert.equal(city.roots.length, 2);
assert.equal(
  city.files.length,
  project.files.filter((file) => /^(frontend|backend)\//.test(file.path))
    .length,
);
for (const item of city.all.values()) {
  if (!item.directory) {
    assert(types[item.type]);
    assert(item.responsibility);
    assert(city.all.get(item.parent)?.directory);
    continue;
  }
  for (const child of item.children) {
    assert(
      child.x >= item.x && child.z >= item.z,
      `Child starts outside directory: ${child.path}`,
    );
    assert(
      child.x + child.width <= item.x + item.width &&
        child.z + child.depthSize <= item.z + item.depthSize,
      `Child exceeds directory: ${child.path}`,
    );
    for (const sibling of item.children) {
      if (sibling === child) continue;
      const overlap =
        child.x < sibling.x + sibling.width &&
        child.x + child.width > sibling.x &&
        child.z < sibling.z + sibling.depthSize &&
        child.z + child.depthSize > sibling.z;
      assert(
        !overlap,
        `Overlapping file lots: ${child.path} / ${sibling.path}`,
      );
    }
  }
}
for (const edge of interactions)
  assert(city.all.has(edge.from) && city.all.has(edge.to));
for (const step of journey) assert(city.all.has(step.file));
assert.equal(
  city.all.get("backend/services/credential_analysis.py").type,
  "factory",
);
assert(
  city.all
    .get("backend/tasks.py")
    .symbols.some((symbol) => symbol.name === "analyze_credential_task"),
);
console.log(
  `City verified: ${city.files.length} buildings, ${city.directories.size} nested directories, ${Object.keys(types).length} building types; containment, non-overlap and journey references pass.`,
);
