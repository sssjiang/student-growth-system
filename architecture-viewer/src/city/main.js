import project, { mountReindex } from '../project-data.js';
import { buildCity, types, interactions, journey } from "./model.js";
import { createCityScene } from "./scene.js";
import "./style.css";

const city = buildCity(project.files);
const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const state = {
  selected: null,
  mode: "contains",
  query: "",
  flow: false,
  step: 0,
  timer: null,
  flat: false,
};
let scene;
$("#city-app").innerHTML = `
<header class="city-header"><a href="./index.html" class="city-brand"><span>知</span>知行 <i>/</i> CODE CAMPUS <small>02</small></a><nav><a href="./index.html">系统架构</a><a href="./city.html" class="active">文件建筑群</a></nav><span class="snapshot">● 本地源码快照</span></header>
<div class="city-layout"><aside class="city-sidebar"><div class="eyebrow">PROJECT EXPLORER</div><h1>代码，也有自己的城市。</h1><p class="sidebar-intro">两座园区，每栋建筑各司其职。</p><label class="city-search">⌕ <input id="city-search" type="search" placeholder="搜索文件、职责、建筑类型…" aria-label="搜索文件或职责" /></label><div class="tree-heading"><span>目录即街区</span><button id="home">↖ 全部园区</button></div><div id="city-tree"></div><div class="sidebar-bottom"><span class="eyebrow">GUIDED JOURNEY</span><button id="journey-start"><b>一份凭证的跨城之旅</b><span>前端提交 → 后端分析 → 教师审核 ↗</span></button><p>${city.files.length} 栋文件建筑 · ${city.directories.size} 个目录<br />只读源码地图 · 不连接业务数据</p></div></aside>
<main class="city-main"><div class="city-heading"><div><span class="eyebrow">SOFTWARE, AS A PLACE</span><h2>前后端代码园区</h2><p>建筑形态代表职责，街区边界代表归属，连线代表协作。</p></div><button id="flat-toggle" class="border-button">▦ 目录平面</button></div><div class="relation-switch" role="group" aria-label="关系类型"><button data-mode="contains" class="active">▧ 包含关系</button><button data-mode="imports">↗ 文件导入</button><button data-mode="interactions">⇢ 业务交互</button><span id="relation-caption">目录 → 子目录 → 文件 → 内部声明</span></div><div id="breadcrumbs"></div><div class="city-viewport"><div id="city-scene"></div><div id="city-flat" hidden></div><div id="city-empty" hidden>没有匹配的文件<button id="search-reset">清除搜索</button></div><div class="campus-key"><span><i></i> FRONTEND / 前端建筑群</span><span><i></i> BACKEND / 后端建筑群</span></div><div class="camera-tools"><button id="zoom-in" aria-label="放大">＋</button><button id="zoom-out" aria-label="缩小">−</button><button id="camera-home" aria-label="全景视角">⌖</button></div><div class="city-hint">点击建筑查看 · 双击目录树聚焦 · 拖动旋转 · 滚轮缩放</div></div><section id="journey" hidden></section><footer class="city-footer"><span id="city-status"></span><span>蓝色实线：静态导入 · 金色虚线：人工整理的业务协作</span></footer></main>
<aside id="city-inspector" class="city-inspector"></aside></div>
<dialog id="city-source"><header><div><span class="eyebrow">SOURCE INSPECTOR</span><h3 id="city-source-title"></h3></div><button id="source-close" aria-label="关闭源码">✕</button></header><pre id="city-source-code"></pre></dialog>`;

mountReindex($('.city-header'));

function stop() {
  clearInterval(state.timer);
  state.timer = null;
}
function select(path, focus = false) {
  state.selected = path;
  if (focus) scene?.fit(path);
  render();
}
function matches() {
  const query = state.query.trim().toLowerCase();
  return new Set(
    city.files
      .filter(
        (file) =>
          !query ||
          `${file.path} ${file.title} ${file.responsibility} ${types[file.type].name}`
            .toLowerCase()
            .includes(query),
      )
      .map((file) => file.path),
  );
}
function renderTree() {
  const filtered = matches();
  function branch(item) {
    if (!item.directory)
      return !filtered.has(item.path)
        ? ""
        : `<button class="tree-file ${state.selected === item.path ? "active" : ""}" data-select="${esc(item.path)}" title="${esc(item.title)}"><span style="color:${types[item.type].color}">${types[item.type].glyph}</span>${esc(item.name)}</button>`;
    if (
      state.query &&
      ![...filtered].some((path) => path.startsWith(`${item.path}/`))
    )
      return "";
    const open =
      item.depth === 0 ||
      state.query ||
      state.selected?.startsWith(`${item.path}/`) ||
      state.selected === item.path;
    return `<details ${open ? "open" : ""}><summary><button data-select="${esc(item.path)}" class="${state.selected === item.path ? "active" : ""}">▱ ${esc(item.name)}<small>${item.fileCount}</small></button></summary><div class="tree-children">${item.children.map(branch).join("")}</div></details>`;
  }
  $("#city-tree").innerHTML = city.roots.map(branch).join("");
}
function fileLink(path, caption = "") {
  const file = city.all.get(path);
  if (!file) return "";
  return `<button class="inspector-link" data-select="${esc(path)}"><span style="color:${file.directory ? "#aac5b8" : types[file.type].color}">${file.directory ? "▱" : types[file.type].glyph}</span><span><b>${esc(file.name)}</b><small>${esc(caption || (file.directory ? `${file.fileCount} 个文件 · ${file.path}` : file.title))}</small></span><i>↗</i></button>`;
}
function inspector() {
  const item = city.all.get(state.selected);
  if (!item) {
    $("#city-inspector").innerHTML =
      `<div class="eyebrow">A FIELD GUIDE TO YOUR CODE</div><div class="inspector-emblem">⌂</div><h2>让职责成为<br />看得见的建筑。</h2><p class="inspector-copy">从园区进入街区，再走进文件。点击任意建筑，了解它负责什么、内部有什么，以及如何与其他建筑合作。</p><div class="city-stats"><div><strong>${city.files.length}</strong><small>文件建筑</small></div><div><strong>${city.directories.size}</strong><small>目录街区</small></div></div><h3>建筑图鉴 <small>10 TYPOLOGIES</small></h3><div class="typology-list">${Object.entries(
        types,
      )
        .map(
          ([id, type]) =>
            `<button data-type="${id}"><span style="color:${type.color}">${type.glyph}</span><span><b>${type.name}</b><small>${type.meaning}</small></span><i>${city.files.filter((file) => file.type === id).length}</i></button>`,
        )
        .join(
          "",
        )}</div><p class="inspector-note">建筑高度不代表重要程度。核心职责人工整理，其余按路径与代码声明推断；可进入源码核对。</p>`;
    return;
  }
  if (item.directory) {
    $("#city-inspector").innerHTML =
      `<div class="inspector-top"><span class="eyebrow">DIRECTORY / CONTAINMENT</span><button id="selection-close" aria-label="关闭详情">✕</button></div><div class="inspector-emblem">▱</div><h2>${esc(item.name)} 街区</h2><code class="path-code">${esc(item.path)}</code><p class="inspector-copy">包含 ${item.children.filter((child) => child.directory).length} 个直接子目录、${item.children.filter((child) => !child.directory).length} 个直接文件，共 ${item.fileCount} 个后代文件。边界来自实际目录结构。</p><button class="focus-button" data-focus="${esc(item.path)}">⌖ 进入这个街区</button>${item.depth ? `<h3>父目录</h3>${fileLink(item.path.split("/").slice(0, -1).join("/"))}` : ""}<h3>直接包含 <small>CHILDREN</small></h3>${item.children.map((child) => fileLink(child.path)).join("")}`;
    return;
  }
  const incoming = city.files.filter((file) =>
    file.imports.includes(item.path),
  );
  const links = interactions.filter(
    (edge) => edge.from === item.path || edge.to === item.path,
  );
  $("#city-inspector").innerHTML =
    `<div class="inspector-top"><span class="eyebrow">FILE / ${types[item.type].name}</span><button id="selection-close" aria-label="关闭详情">✕</button></div><div class="inspector-emblem" style="color:${types[item.type].color}">${types[item.type].glyph}</div><h2>${esc(item.title)}</h2><code class="path-code">${esc(item.path)}</code><p class="inspector-copy">${esc(item.responsibility)}</p><span class="evidence-tag">${item.evidence}</span><div class="file-actions"><button class="focus-button" data-focus="${esc(item.path)}">⌖ 定位建筑</button><button class="border-button" data-source="${esc(item.path)}">查看源码 ↗</button></div><h3>归属街区 <small>CONTAINED BY</small></h3>${fileLink(item.parent)}<div class="inspector-metrics"><span>${item.lines} 行源码</span><span>${item.symbols.length} 个识别声明</span><span>${item.endpoints.length} 个接口</span></div><h3>它使用的文件 <small>${item.imports.length} IMPORTS</small></h3>${item.imports.map((path) => fileLink(path)).join("") || '<p class="empty-copy">未识别到项目内静态导入。</p>'}<h3>哪些文件使用它 <small>${incoming.length} IMPORTERS</small></h3>${incoming.map((file) => fileLink(file.path)).join("") || '<p class="empty-copy">未识别到项目内导入方。</p>'}<h3>业务交互 <small>CURATED</small></h3>${links.map((edge) => `<div class="interaction-evidence"><span>${edge.kind} · ${esc(edge.label)}</span>${fileLink(edge.from === item.path ? edge.to : edge.from, edge.from === item.path ? "本文件发起 → 对方接收" : "对方发起 → 本文件接收")}<small>源码依据：${esc(edge.evidence)}</small></div>`).join("") || '<p class="empty-copy">尚未整理该文件的跨模块业务交互。</p>'}<h3>建筑内部 <small>DECLARATIONS</small></h3>${item.symbols.map((symbol) => `<button class="symbol-row" data-source="${esc(item.path)}" data-line="${symbol.line}"><span>${symbol.kind === "class" ? "C" : "ƒ"}</span><code>${esc(symbol.name)}</code><small>L${symbol.line} ↗</small></button>`).join("") || `<p class="empty-copy">${item.path.endsWith(".css") ? "样式规则" : item.path.endsWith(".json") ? "资源词条" : item.path.endsWith(".sql") ? "数据表声明" : "未识别到函数或类"}，可查看完整源码。</p>`}${item.endpoints.length ? `<h3>接口入口</h3>${item.endpoints.map((endpoint) => `<button class="endpoint-row" data-source="${esc(item.path)}" data-line="${endpoint.line}"><small>${endpoint.method}</small><code>${esc(endpoint.path)}</code></button>`).join("")}` : ""}<p class="inspector-note">导入与声明采用轻量静态扫描，不等同于完整运行调用图。文件包含函数和类；其他文件属于目录，不属于本文件。</p>`;
}
function renderFlat() {
  const filtered = matches(),
    selected = city.all.get(state.selected);
  $("#city-flat").innerHTML = city.roots
    .map(
      (root) =>
        `<section><h3>${root.name === "frontend" ? "前端" : "后端"}建筑群 <small>${root.fileCount} FILES</small></h3><div class="flat-buildings">${city.files
          .filter(
            (file) =>
              file.path.startsWith(`${root.path}/`) &&
              filtered.has(file.path) &&
              (!selected?.directory ||
                file.path.startsWith(`${selected.path}/`)),
          )
          .map(
            (file) =>
              `<button data-select="${esc(file.path)}" class="${state.selected === file.path ? "selected" : ""}"><span style="color:${types[file.type].color}">${types[file.type].glyph}</span><b>${esc(file.title)}</b><code>${esc(file.path)}</code></button>`,
          )
          .join("")}</div></section>`,
    )
    .join("");
}
function renderJourney() {
  $("#journey").hidden = !state.flow;
  if (!state.flow) return;
  const step = journey[state.step];
  $("#journey").innerHTML =
    `<div class="journey-heading"><strong>凭证跨城之旅</strong><span>人工整理的过程演示 · 非实时调用</span><button id="journey-play">${state.timer ? "Ⅱ 暂停" : state.step === journey.length - 1 ? "↻ 重播" : "▶ 播放"}</button><button id="journey-close" aria-label="关闭流程">✕</button></div><div class="journey-steps">${journey.map((step, index) => `<button data-step="${index}" class="${index === state.step ? "active" : ""}"><span>${String(index + 1).padStart(2, "0")}</span>${step.title}</button>`).join("")}</div><p>${esc(step.description)}</p>`;
}
function render() {
  const filtered = matches();
  scene?.update(
    state.selected,
    state.mode,
    state.query ? filtered : null,
    state.flow ? journey.map((step) => step.file) : [],
  );
  renderTree();
  inspector();
  renderFlat();
  renderJourney();
  const path = state.selected?.split("/") || [];
  $("#breadcrumbs").innerHTML =
    `<button id="breadcrumb-home">园区全景</button>${path.map((segment, index) => `<span>/</span><button data-select="${esc(path.slice(0, index + 1).join("/"))}">${esc(segment)}</button>`).join("")}`;
  $("#city-status").textContent =
    `${filtered.size} / ${city.files.length} 个文件 · 已索引 ${project.importCount} 条项目静态导入`;
  $("#city-empty").hidden = filtered.size > 0;
  document
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.classList.toggle("active", button.dataset.mode === state.mode),
    );
  $("#relation-caption").textContent =
    state.mode === "contains"
      ? "目录 → 子目录 → 文件 → 内部声明"
      : state.mode === "imports"
        ? "选择文件显示直接导入与反向导入 · 箭头由使用方指向被使用方"
        : "选择文件显示 HTTP / 异步任务 / 写入关系 · 人工整理";
}
function showSource(path, line = 1) {
  const file = city.all.get(path);
  if (!file || file.directory) return;
  $("#city-source-title").textContent = path;
  $("#city-source-code").innerHTML = file.content
    .split("\n")
    .map(
      (text, index) =>
        `<span id="line-${index + 1}" class="${index + 1 === line ? "highlight" : ""}"><i>${index + 1}</i><code>${esc(text) || " "}</code></span>`,
    )
    .join("");
  if (!$("#city-source").open) $("#city-source").showModal();
  requestAnimationFrame(() =>
    $(`#line-${line}`)?.scrollIntoView({ block: "center" }),
  );
}
function reset() {
  stop();
  Object.assign(state, { selected: null, flow: false, query: "" });
  $("#city-search").value = "";
  scene?.fit();
  render();
}
function flat(enabled) {
  state.flat = enabled;
  $("#city-scene").hidden = enabled;
  $("#city-flat").hidden = !enabled;
  $(".camera-tools").hidden = enabled;
  $("#flat-toggle").textContent = enabled ? "◇ 三维园区" : "▦ 目录平面";
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.select) {
    stop();
    select(button.dataset.select);
  } else if (button.dataset.focus) scene?.fit(button.dataset.focus);
  else if (button.dataset.source)
    showSource(button.dataset.source, Number(button.dataset.line || 1));
  else if (button.dataset.mode) {
    state.mode = button.dataset.mode;
    render();
  } else if (button.dataset.type) {
    state.query = types[button.dataset.type].name;
    $("#city-search").value = state.query;
    render();
  } else if (button.dataset.step !== undefined) {
    stop();
    state.step = Number(button.dataset.step);
    select(journey[state.step].file);
  } else
    switch (button.id) {
      case "home":
      case "breadcrumb-home":
        reset();
        break;
      case "camera-home":
        scene?.fit();
        break;
      case "zoom-in":
        scene?.zoom(1.25);
        break;
      case "zoom-out":
        scene?.zoom(0.8);
        break;
      case "selection-close":
        state.selected = null;
        render();
        break;
      case "flat-toggle":
        if (scene) flat(!state.flat);
        break;
      case "source-close":
        $("#city-source").close();
        break;
      case "search-reset":
        state.query = "";
        $("#city-search").value = "";
        render();
        break;
      case "journey-start":
        stop();
        Object.assign(state, {
          flow: true,
          query: "",
          step: 0,
          mode: "interactions",
        });
        $("#city-search").value = "";
        scene?.fit();
        select(journey[0].file);
        break;
      case "journey-close":
        reset();
        break;
      case "journey-play":
        if (state.timer) stop();
        else {
          if (state.step === journey.length - 1) state.step = 0;
          state.selected = journey[state.step].file;
          state.timer = setInterval(() => {
            state.step++;
            state.selected = journey[state.step].file;
            if (state.step === journey.length - 1) stop();
            render();
          }, 2500);
        }
        render();
        break;
    }
});
$("#city-tree").addEventListener("dblclick", (event) => {
  const button = event.target.closest("[data-select]");
  if (button) scene?.fit(button.dataset.select);
});
$("#city-search").addEventListener("input", (event) => {
  stop();
  state.query = event.target.value;
  state.flow = false;
  state.selected = null;
  render();
});
try {
  scene = createCityScene($("#city-scene"), city, (path) => {
    stop();
    select(path);
  });
  if (innerWidth < 700) flat(true);
} catch (error) {
  console.warn("Using directory view because WebGL is unavailable.", error);
  $("#city-scene").replaceChildren();
  flat(true);
  $("#flat-toggle").disabled = true;
  $("#flat-toggle").textContent = "二维视图 · WebGL 不可用";
}
render();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    stop();
    scene?.dispose();
  });
