import { readdirSync, readFileSync, lstatSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const allowedExtension = /\.(jsx?|py|sql|css|json)$/;

export function scanProject() {
  const files = [];
  function add(relative) {
    const absolute = path.join(projectRoot, relative);
    // Deleted whitelist files should disappear from the index, not break rebuilding.
    const info = lstatSync(absolute, { throwIfNoEntry: false });
    if (!info || info.isSymbolicLink() || !info.isFile()) return;
    const content = readFileSync(absolute, "utf8");
    files.push({
      path: relative,
      lines: content.split("\n").length,
      content,
      imports: [],
      endpoints: [],
    });
  }
  function walk(relative) {
    for (const item of readdirSync(path.join(projectRoot, relative), {
      withFileTypes: true,
    })) {
      if (
        item.isSymbolicLink() ||
        item.name.startsWith(".") ||
        ["node_modules", "__pycache__", "uploads", "dist"].includes(item.name)
      )
        continue;
      const next = `${relative}/${item.name}`;
      if (item.isDirectory()) walk(next);
      else if (allowedExtension.test(item.name)) add(next);
    }
  }
  walk("frontend/src");
  walk("backend");
  for (const relative of [
    "docker-compose.yml",
    "frontend/Dockerfile",
    "backend/Dockerfile",
    "frontend/package.json",
    "frontend/jsconfig.json",
    "frontend/vite.config.js",
    "frontend/eslint.config.js",
    "frontend/prettier.config.cjs",
    "frontend/index.html",
    "frontend/nginx.conf",
    "frontend/scripts/check-i18n.mjs",
    "backend/requirements.txt",
    "backend/requirements-ai.txt",
    "backend/requirements-ocr.txt",
  ])
    add(relative);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const filePaths = new Set(files.map((file) => file.path));
  function resolve(candidate, python = false) {
    const candidates = python
      ? [`${candidate}.py`, `${candidate}/__init__.py`]
      : [
          candidate,
          `${candidate}.js`,
          `${candidate}.jsx`,
          `${candidate}.css`,
          `${candidate}/index.js`,
          `${candidate}/index.jsx`,
        ];
    return candidates.find((item) => filePaths.has(item));
  }
  for (const file of files) {
    const isPython = file.path.endsWith(".py");
    const pattern = isPython
      ? /\bfrom\s+([\w.]+)\s+import\b|^\s*import\s+([\w.]+)/gm
      : /\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?['"]([^'"]+)['"]/g;
    for (const match of file.content.matchAll(pattern)) {
      const specifier = match[1] || match[2];
      let candidate;
      if (isPython) {
        if (specifier.startsWith(".")) continue;
        candidate = `backend/${specifier.replaceAll(".", "/")}`;
      } else if (specifier.startsWith("@/"))
        candidate = `frontend/src/${specifier.slice(2)}`;
      else if (specifier.startsWith("."))
        candidate = path.posix.normalize(
          path.posix.join(path.posix.dirname(file.path), specifier),
        );
      if (candidate) {
        const target = resolve(candidate, isPython);
        if (target && target !== file.path && !file.imports.includes(target))
          file.imports.push(target);
      }
    }
    for (const match of file.content.matchAll(
      /@(?:bp|app)\.(get|post|put|delete|patch|route)\(\s*["']([^"']+)["']([\s\S]*?)\)/g,
    )) {
      const methods =
        match[1] === "route"
          ? (
              match[3]
                .match(/methods\s*=\s*\[([^\]]+)\]/)?.[1]
                .match(/[A-Z]+/g) || ["GET"]
            ).join(" / ")
          : match[1].toUpperCase();
      file.endpoints.push({
        method: methods,
        path: match[2],
        line: file.content.slice(0, match.index).split("\n").length,
      });
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    files,
    importCount: files.reduce((sum, file) => sum + file.imports.length, 0),
  };
}
