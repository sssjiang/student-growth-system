import { defineConfig } from "vite";
import { scanProject, projectRoot } from "./scripts/scan.mjs";
import path from "node:path";
import { installIndexEndpoint } from './scripts/index-server.mjs';

export default defineConfig({
  base: "./",
  build: {
    target: 'esnext',
    rollupOptions: { input: { main: "index.html", city: "city.html" } },
  },
  plugins: [
    {
      name: "project-architecture",
      resolveId(id) {
        if (id === "virtual:project") return "\0virtual:project";
      },
      load(id) {
        if (id === "\0virtual:project")
          return `export default ${JSON.stringify(scanProject())}`;
      },
      configureServer(server) {
        installIndexEndpoint(server);
        const roots = ["frontend", "backend", "docker-compose.yml"].map(
          (item) => path.join(projectRoot, item),
        );
        server.watcher.add(roots);
        const refresh = (file) => {
          if (
            !roots.some(
              (root) => file === root || file.startsWith(`${root}${path.sep}`),
            )
          )
            return;
          if (
            !/(?:\.(?:[cm]?jsx?|py|sql|css|json|yml|txt|html|conf)|\/Dockerfile)$/.test(
              file,
            ) ||
            /\/(?:uploads|__pycache__|\.venv|node_modules|dist)\//.test(file)
          )
            return;
          const module = server.moduleGraph.getModuleById("\0virtual:project");
          if (module) server.moduleGraph.invalidateModule(module);
          server.ws.send({ type: "full-reload" });
        };
        server.watcher
          .on("change", refresh)
          .on("add", refresh)
          .on("unlink", refresh);
      },
      configurePreviewServer(server) {
        installIndexEndpoint(server);
      },
    },
  ],
});
