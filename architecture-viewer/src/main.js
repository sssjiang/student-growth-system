import project, { mountReindex } from './project-data.js';
import { nodes, layers, edges, credentialFlow } from './model.js';
import { createScene } from './scene.js';
import './style.css';

const $ = selector => document.querySelector(selector);
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const filesFor = node => project.files.filter(file => node.paths.some(prefix => prefix.endsWith('/') ? file.path.startsWith(prefix) : file.path === prefix));
nodes.forEach(node => { node.fileCount = filesFor(node).length; });
const state = { selected: null, layer: null, query: '', mode: '3d', flow: false, step: 0, timer: null, tab: 'overview' };
let scene;

$('#app').innerHTML = `
  <header class="topbar">
    <a class="brand" href="./" aria-label="架构地图首页"><span class="brand-mark">知</span><span>知行 <span class="brand-divider">/</span> <b>Architecture Atlas</b></span><span class="version">PREVIEW 01</span></a>
    <div class="topbar-right"><a class="quiet-button" href="./city.html">⌂ 文件建筑群</a><span class="local-status"><i></i> 本地代码快照</span><button id="export" class="quiet-button">↓ 导出地图数据</button></div>
  </header>
  <div class="workspace">
    <aside class="explorer">
      <div class="project-heading"><span class="eyebrow">WORKSPACE</span><h1>学生成长管理系统</h1><p>探索代码背后的结构与联系</p></div>
      <label class="search"><span>⌕</span><input id="search" type="search" placeholder="搜索模块、文件、接口…" aria-label="搜索模块、文件、接口" /><kbd>/</kbd></label>
      <button id="all" class="nav-overview active"><span>◈</span> 架构总览 <span class="count">${nodes.length}</span></button>
      <div class="section-label">架构层级 <span>4 LAYERS</span></div>
      <nav id="layer-list" aria-label="架构层级">${layers.map((layer, i) => `<div class="layer-group"><button class="layer-button" data-layer="${i}" style="--node-color:${layer.color}"><i></i>${layer.name}<span>04</span></button><div class="module-list">${nodes.filter(node => node.layer === i).map(node => `<button data-select="${node.id}"><span>${node.name}</span><small>${node.fileCount}</small></button>`).join('')}</div></div>`).join('')}</nav>
      <div class="section-label flow-label">业务链路 <span>01 FLOW</span></div>
      <button id="flow-toggle" class="flow-button"><span>⇢</span><span>凭证智能分析<small>从提交到人工审核</small></span><span>↗</span></button>
      <div class="explorer-footer"><span class="repo-dot"></span><div>student-growth-system<small>React + Flask · 单体应用 / 异步任务</small></div></div>
    </aside>
    <main class="main-panel">
      <div class="map-heading"><div><div class="eyebrow">YOUR CODE, IN PERSPECTIVE</div><h2 id="view-title">系统架构总览<span class="live-dot"></span></h2><p id="view-subtitle">从用户入口到数据存储，让每一层关系清晰可见。</p></div><div class="view-switch" aria-label="视图切换"><button id="mode-3d" class="active" aria-pressed="true">◇ 3D 空间</button><button id="mode-2d" aria-pressed="false">▦ 2D 层级</button></div></div>
      <div class="map-stage">
        <div class="map-caption"><span id="visible-count">16 个模块</span><span class="separator">/</span><span>按技术层次组织</span></div>
        <div id="scene" aria-label="三维架构地图，可使用鼠标拖动旋转、滚轮缩放"></div>
        <div id="flat-map" hidden></div>
        <div id="empty-search" hidden>没有匹配的模块或源码<button id="clear-search">清除搜索</button></div>
        <div class="map-legend">${layers.map(layer => `<span><i style="background:${layer.color}"></i>${layer.name}</span>`).join('')}</div>
        <div class="map-tools"><button id="zoom-in" aria-label="放大" title="放大">＋</button><button id="zoom-out" aria-label="缩小" title="缩小">−</button><span></span><button id="reset-camera" aria-label="重置视角" title="重置视角">⌖</button></div>
        <div class="map-hint" id="map-hint">拖动旋转 · 滚轮缩放 · 点击模块探索</div>
      </div>
      <section id="flow-panel" class="flow-panel" hidden aria-label="凭证分析流程演示"></section>
      <div class="bottom-strip"><span><i></i> 源码已索引 <b>${project.files.length}</b> 个文件</span><span>${project.importCount} 条文件导入 · 业务关系人工整理</span><span id="snapshot-time"></span></div>
    </main>
    <aside class="detail-panel" id="detail" aria-label="模块详情"></aside>
  </div>
  <dialog id="source-dialog"><div class="source-header"><div><span class="eyebrow">SOURCE INSPECTOR</span><h3 id="source-title"></h3></div><button id="close-source" aria-label="关闭源码">✕</button></div><p id="source-meta"></p><pre id="source-code"></pre></dialog>
`;

$('#snapshot-time').textContent = `更新于 ${new Date(project.generatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
mountReindex($('.topbar-right'));

function matchingNodes() {
  const query = state.query.trim().toLowerCase();
  return nodes.filter(node => (state.layer === null || node.layer === state.layer) && (!query || `${node.name} ${node.tech} ${node.description}`.toLowerCase().includes(query) || filesFor(node).some(file => file.path.toLowerCase().includes(query) || file.endpoints.some(endpoint => endpoint.path.toLowerCase().includes(query)))));
}
function visibleNodes() {
  const matches = matchingNodes();
  if (state.flow) return new Set(matches.filter(node => credentialFlow.some(step => step.node === node.id)).map(node => node.id));
  if (state.selected && !state.query && state.layer === null) {
    return new Set([state.selected, ...edges.filter(([a, b]) => a === state.selected || b === state.selected).flatMap(([a, b]) => [a, b])]);
  }
  return new Set(matches.map(node => node.id));
}
function select(id) {
  state.selected = id;
  state.tab = 'overview';
  render();
}
function flatMap(visible) {
  $('#flat-map').innerHTML = layers.map((layer, index) => `<section class="flat-layer" style="--node-color:${layer.color}"><div class="flat-layer-title"><span>0${index + 1}</span><strong>${layer.name}</strong><small>${layer.subtitle}</small></div><div class="flat-nodes">${nodes.filter(node => node.layer === index).map(node => `<button class="flat-node ${visible.has(node.id) ? '' : 'dim'} ${state.selected === node.id ? 'selected' : ''}" data-select="${node.id}" aria-pressed="${state.selected === node.id}"><span>${node.symbol}</span><strong>${node.name}</strong><small>${node.tech}</small></button>`).join('')}</div></section>`).join('');
}
function fileButton(file, line) {
  return `<button class="file-button" data-file="${escape(file.path)}" ${line ? `data-line="${line}"` : ''}><span class="file-ext">${file.path.split('.').at(-1).slice(0, 3).toUpperCase()}</span><span><b>${escape(file.path.split('/').at(-1))}</b><small>${escape(file.path)}</small></span><span class="file-lines">${file.lines} L ↗</span></button>`;
}
function renderDetail() {
  const node = nodes.find(item => item.id === state.selected);
  if (!node) {
    $('#detail').innerHTML = `<div class="detail-eyebrow">PROJECT OVERVIEW <span>◈</span></div><div class="overview-icon">⌘</div><h2>一张地图，<br />读懂整个系统。</h2><p class="detail-description">选择一个模块，查看它的职责、源码与上下游关系。也可以沿着一条业务链路，理解系统如何协同工作。</p><div class="stats-grid"><div><strong>${nodes.length}</strong><span>核心模块</span></div><div><strong>${project.files.length}</strong><span>索引文件</span></div><div><strong>${project.files.reduce((n, f) => n + f.endpoints.length, 0)}</strong><span>接口声明</span></div><div><strong>${edges.length}</strong><span>架构关系</span></div></div><div class="detail-section-title">从这里开始 <span>EXPLORE</span></div><button class="start-flow" id="start-flow"><span>✦</span><strong>一份凭证的旅程</strong><p>上传 → 排队 → AI 分析 → 教师审核</p><span class="start-arrow">探索链路 ↗</span></button><div class="reading-guide"><h4>如何阅读这张地图</h4><p><i></i>颜色区分技术层次</p><p><i></i>箭头表示调用、读写或编排方向</p><p><i></i>选择模块后突出它的直接关联</p></div><div class="data-note">源码与接口自动扫描；模块分组和业务关系人工维护。快照不代表实时运行状态。</div>`;
    return;
  }
  const files = filesFor(node);
  const endpoints = files.flatMap(file => file.endpoints.map(endpoint => ({ ...endpoint, file })));
  const relations = edges.filter(([from, to]) => from === node.id || to === node.id);
  $('#detail').innerHTML = `<div class="detail-eyebrow">MODULE INSPECTOR <button id="close-detail" aria-label="关闭模块详情">✕</button></div><div class="module-badge" style="--node-color:${layers[node.layer].color}">${node.symbol}</div><span class="layer-tag" style="color:${layers[node.layer].color}">${layers[node.layer].name}</span><h2>${node.name}</h2><p class="detail-description">${node.description}</p><div class="module-meta"><span>${files.length} 个文件</span><span>${files.reduce((sum, file) => sum + file.lines, 0).toLocaleString()} 行源码</span></div><div class="detail-tabs">${[['overview', '关联'], ['files', '源码'], ['endpoints', `接口 ${endpoints.length}`]].map(([id, name]) => `<button data-tab="${id}" class="${state.tab === id ? 'active' : ''}">${name}</button>`).join('')}</div><div class="tab-content">${state.tab === 'overview' ? `<div class="detail-section-title">直接架构关系 <span>CURATED</span></div>${relations.length ? relations.map(([from, to, label]) => { const outgoing = from === node.id; const other = nodes.find(n => n.id === (outgoing ? to : from)); return `<button class="relation" data-select="${other.id}"><span class="relation-arrow">${outgoing ? '↗' : '↙'}</span><span><strong>${other.name}</strong><small>${outgoing ? '向该模块' : '来自该模块'} · ${label}</small></span><span>→</span></button>`; }).join('') : '<p class="empty-detail">暂无已整理的直接关系。</p>'}<div class="detail-section-title">关键源码 <span>LIVE SNAPSHOT</span></div>${files.slice(0, 3).map(file => fileButton(file)).join('')}` : state.tab === 'files' ? files.map(file => fileButton(file)).join('') : endpoints.length ? endpoints.map(endpoint => `<button class="endpoint" data-file="${escape(endpoint.file.path)}" data-line="${endpoint.line}"><span>${endpoint.method}</span><code>${escape(endpoint.path)}</code><small>${endpoint.file.path.split('/').at(-1)}:${endpoint.line} ↗</small></button>`).join('') : '<p class="empty-detail">此模块没有 Flask 接口声明。</p>'}</div><div class="data-note">点击源码查看行号与静态导入依赖。架构关系为人工整理，不等同于完整调用图。</div>`;
}
function renderFlow() {
  $('#flow-panel').hidden = !state.flow;
  if (!state.flow) return;
  const current = credentialFlow[state.step];
  $('#flow-panel').innerHTML = `<div class="flow-panel-header"><div><span class="flow-indicator"></span><strong>凭证智能分析</strong><span class="simulation-tag">流程演示 · 非实时请求</span></div><div><button id="play-flow" class="play-button">${state.timer ? 'Ⅱ 暂停' : state.step === credentialFlow.length - 1 ? '↻ 重播' : '▶ 播放'}</button><button id="exit-flow" aria-label="退出链路">✕</button></div></div><div class="flow-steps">${credentialFlow.map((step, index) => `<button data-step="${index}" class="${index === state.step ? 'current' : index < state.step ? 'completed' : ''}" aria-current="${index === state.step ? 'step' : 'false'}"><span>${index < state.step ? '✓' : String(index + 1).padStart(2, '0')}</span><strong>${step.title}</strong></button>`).join('')}</div><div class="flow-explanation"><p><b>${String(state.step + 1).padStart(2, '0')} /</b> ${current.detail}</p><button id="flow-source">查看对应源码 ↗</button></div>`;
}
function render() {
  const visible = visibleNodes();
  scene?.update(state.selected, visible, state.flow ? credentialFlow.map(step => step.node) : []);
  flatMap(visible);
  renderDetail();
  renderFlow();
  $('#visible-count').textContent = `${visible.size} 个关联模块`;
  $('#empty-search').hidden = visible.size !== 0;
  $('#view-title').innerHTML = `${state.flow ? '凭证智能分析链路' : state.layer !== null ? layers[state.layer].name : '系统架构总览'}<span class="live-dot"></span>`;
  $('#view-subtitle').textContent = state.flow ? '沿着一份成长材料，理解从提交到审核的完整过程。' : '从用户入口到数据存储，让每一层关系清晰可见。';
  $('#flow-toggle').classList.toggle('active', state.flow);
  $('#all').classList.toggle('active', state.layer === null && !state.flow && !state.selected);
  document.querySelectorAll('[data-layer]').forEach(button => button.classList.toggle('active', Number(button.dataset.layer) === state.layer));
  document.querySelectorAll('.module-list [data-select]').forEach(button => {
    button.classList.toggle('active', button.dataset.select === state.selected);
    button.hidden = !matchingNodes().some(node => node.id === button.dataset.select);
  });
}
function stopPlayback() { clearInterval(state.timer); state.timer = null; }
function toggleFlow(enabled) {
  stopPlayback();
  Object.assign(state, { flow: enabled, step: 0, selected: enabled ? credentialFlow[0].node : null, layer: null, query: '', tab: 'overview' });
  $('#search').value = '';
  render();
}
function setMode(mode) {
  state.mode = mode;
  $('.map-stage').classList.toggle('is-flat', mode === '2d');
  $('#scene').hidden = mode !== '3d';
  $('#flat-map').hidden = mode !== '2d';
  $('.map-tools').hidden = mode === '2d';
  for (const id of ['3d', '2d']) { $(`#mode-${id}`).classList.toggle('active', mode === id); $(`#mode-${id}`).setAttribute('aria-pressed', String(mode === id)); }
  $('#map-hint').textContent = mode === '3d' ? '拖动旋转 · 滚轮缩放 · 点击模块探索' : '点击模块 · 在右侧查看上下游与源码';
}
function showSource(filePath, line = 1) {
  const file = project.files.find(item => item.path === filePath);
  if (!file) return;
  const referencedBy = project.files.filter(item => item.imports.includes(file.path));
  $('#source-title').textContent = file.path;
  $('#source-meta').replaceChildren();
  const summary = document.createElement('span');
  summary.textContent = `${file.lines} 行 · 静态导入 ${file.imports.length} 个项目文件 · 被 ${referencedBy.length} 个文件导入（仅识别部分静态语法）`;
  $('#source-meta').append(summary);
  for (const [label, paths] of [['导入', file.imports], ['被导入', referencedBy.map(item => item.path)]]) {
    if (!paths.length) continue;
    const group = document.createElement('div');
    group.className = 'source-dependencies';
    group.append(`${label}：`);
    for (const path of paths) { const button = document.createElement('button'); button.textContent = path; button.dataset.file = path; group.append(button); }
    $('#source-meta').append(group);
  }
  $('#source-code').innerHTML = file.content.split('\n').map((text, index) => `<span class="source-line ${index + 1 === Number(line) ? 'highlight' : ''}" id="source-line-${index + 1}"><span class="line-number">${index + 1}</span><code>${escape(text) || ' '}</code></span>`).join('');
  if (!$('#source-dialog').open) $('#source-dialog').showModal();
  requestAnimationFrame(() => $(`#source-line-${line}`)?.scrollIntoView({ block: 'center' }));
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.select) { stopPlayback(); select(button.dataset.select); }
  else if (button.dataset.layer !== undefined) { stopPlayback(); state.layer = state.layer === Number(button.dataset.layer) ? null : Number(button.dataset.layer); state.selected = null; state.flow = false; render(); }
  else if (button.dataset.tab) { state.tab = button.dataset.tab; renderDetail(); }
  else if (button.dataset.file) showSource(button.dataset.file, Number(button.dataset.line || 1));
  else if (button.dataset.step !== undefined) { stopPlayback(); state.step = Number(button.dataset.step); select(credentialFlow[state.step].node); }
  else switch (button.id) {
    case 'all': toggleFlow(false); break;
    case 'flow-toggle': toggleFlow(!state.flow); break;
    case 'start-flow': toggleFlow(true); break;
    case 'exit-flow': toggleFlow(false); break;
    case 'close-detail': state.selected = null; render(); break;
    case 'mode-3d': if (scene) setMode('3d'); break;
    case 'mode-2d': setMode('2d'); break;
    case 'zoom-in': scene?.zoom(0.15); break;
    case 'zoom-out': scene?.zoom(-0.15); break;
    case 'reset-camera': scene?.reset(); break;
    case 'close-source': $('#source-dialog').close(); break;
    case 'clear-search': $('#search').value = ''; state.query = ''; render(); break;
    case 'play-flow':
      if (state.timer) stopPlayback();
      else {
        if (state.step === credentialFlow.length - 1) state.step = 0;
        state.selected = credentialFlow[state.step].node;
        state.timer = setInterval(() => { state.step++; state.selected = credentialFlow[state.step].node; state.tab = 'overview'; if (state.step === credentialFlow.length - 1) stopPlayback(); render(); }, 2600);
      }
      render(); break;
    case 'flow-source': {
      const current = credentialFlow[state.step];
      const file = project.files.find(file => file.path === current.file);
      const line = file?.content.split('\n').findIndex(line => line.includes(current.term));
      showSource(current.file, line >= 0 ? line + 1 : 1); break;
    }
    case 'export': {
      const payload = { ...project, files: project.files.map(({ content, ...metadata }) => metadata), nodes, edges, credentialFlow, relationshipSource: 'curated', importSource: 'static-pattern-scan' };
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'architecture-map.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); break;
    }
  }
});
$('#search').addEventListener('input', event => { stopPlayback(); state.query = event.target.value; state.selected = null; state.flow = false; render(); });
document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !$('#source-dialog').open) { event.preventDefault(); $('#search').focus(); } });
try { scene = createScene($('#scene'), id => { stopPlayback(); select(id); }); if (window.innerWidth <= 640) setMode('2d'); }
catch (error) { console.warn('3D unavailable; using the 2D map.', error); $('#scene').replaceChildren(); setMode('2d'); $('#mode-3d').disabled = true; $('#mode-3d').title = '当前环境无法启用 WebGL，已使用二维视图'; }
render();
if (import.meta.hot) import.meta.hot.dispose(() => { stopPlayback(); scene?.dispose(); });
