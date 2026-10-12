import snapshot from 'virtual:project';
import './reindex.css';

const endpoint = new URL('./__architecture/index', window.location.href);
const flashKey = 'architecture-reindex-result';
async function readIndex(method = 'GET') {
  const response = await fetch(endpoint, { method, cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('当前页面没有本地索引服务，请使用 npm run dev 或 npm run preview 启动。');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || '重新索引失败，请重试。');
  if (!Array.isArray(payload.files) || !payload.generatedAt) throw new Error('索引结果格式异常，请检查本地服务。');
  return payload;
}

let project = snapshot;
let connected = false;
let unavailable = '';
try { project = await readIndex(); connected = true; }
catch (error) { unavailable = error.message; }
export default project;

export function mountReindex(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'reindex-control';
  const time = document.createElement('span');
  time.className = 'reindex-time';
  time.textContent = `${connected ? '索引' : '构建快照'} ${new Date(project.generatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  time.title = `${new Date(project.generatedAt).toLocaleString('zh-CN')} · ${project.files.length} 个文件`;
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'reindex-button'; button.textContent = '↻ 重新索引';
  button.title = '重新读取本地源码，重建文件、目录和静态依赖；将返回地图初始视角。';
  const status = document.createElement('span');
  status.className = 'reindex-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.hidden = true;
  wrapper.append(time, button, status); container.append(wrapper);
  function announce(message, failed = false) { status.textContent = message; status.hidden = false; status.classList.toggle('failed', failed); }
  try {
    const flash = sessionStorage.getItem(flashKey); sessionStorage.removeItem(flashKey);
    if (flash && connected) announce(`索引已更新 · ${project.files.length} 个文件 · ${project.importCount} 条导入关系`);
    else if (flash) announce('刷新后未连接索引服务，当前展示构建快照，请重试。', true);
  } catch { /* Storage may be disabled; indexing does not depend on it. */ }
  if (!connected) time.title = unavailable;
  button.addEventListener('click', async () => {
    button.disabled = true; button.textContent = '↻ 正在索引…'; button.setAttribute('aria-busy', 'true');
    announce('正在读取源码并重建地图…');
    try {
      const next = await readIndex('POST');
      try { sessionStorage.setItem(flashKey, next.generatedAt); } catch { /* optional feedback */ }
      window.location.reload();
    } catch (error) {
      announce(error.name === 'TimeoutError' ? '索引超时，请检查本地服务后重试。' : error.message, true);
      button.disabled = false; button.textContent = '↻ 重新索引'; button.removeAttribute('aria-busy');
    }
  });
}
