import { scanProject } from './scan.mjs';

// Available only through the local Vite dev/preview server; no source files are written.
export function installIndexEndpoint(server) {
  server.middlewares.use('/__architecture/index', (request, response, next) => {
    if (request.url.split('?')[0] !== '/') return next();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (!['GET', 'POST'].includes(request.method)) {
      response.statusCode = 405;
      response.setHeader('Allow', 'GET, POST');
      return response.end(JSON.stringify({ error: '不支持的请求方式' }));
    }
    try {
      response.end(JSON.stringify(scanProject()));
    } catch (error) {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: `源码扫描失败（${error.code || 'SCAN_ERROR'}），请检查文件访问权限或终端日志后重试。` }));
      server.config.logger.error(`Architecture indexing failed: ${error.message}`);
    }
  });
}
