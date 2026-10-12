export const layers = [
  { id: 'experience', name: '用户入口', subtitle: 'EXPERIENCE', color: '#a9c7fa' },
  { id: 'application', name: '接口与权限', subtitle: 'APPLICATION', color: '#bbafe9' },
  { id: 'intelligence', name: '业务与智能', subtitle: 'INTELLIGENCE', color: '#e7c791' },
  { id: 'infrastructure', name: '任务与存储', subtitle: 'INFRASTRUCTURE', color: '#94c7ac' },
];

// Positions and business relationships are curated; file facts come from the source scanner.
export const nodes = [
  { id: 'student', name: '学生端', tech: 'React · 个人成长', layer: 0, column: 0, symbol: 'ST', description: '学生维护个人档案、成绩与成长材料，并通过 AI 学科辅导学习。凭证流程从成长材料页面开始。', paths: ['frontend/src/pages/student/'] },
  { id: 'teacher', name: '教师端', tech: 'React · 教学工作台', layer: 0, column: 1, symbol: 'TE', description: '教师查找学生、导入成绩、查看成长报告、审核凭证并管理教材。', paths: ['frontend/src/pages/teacher/'] },
  { id: 'admin', name: '管理端', tech: 'React · 系统管理', layer: 0, column: 2, symbol: 'AD', description: '管理员维护用户和教材配置，查看 AI 检索记录与服务配置状态。', paths: ['frontend/src/pages/admin/'] },
  { id: 'client', name: 'API 客户端', tech: 'RTK Query · Redux', layer: 0, column: 3, symbol: '↗', description: '前端按角色封装 RTK Query 请求，统一处理身份令牌、响应与错误。Redux 状态与 hooks 管理登录、提示和业务请求。', paths: ['frontend/src/api/', 'frontend/src/store/', 'frontend/src/hooks/', 'frontend/src/routes.jsx', 'frontend/src/App.jsx'] },
  { id: 'files', name: '凭证与文件接口', tech: 'Flask · 上传 / 审核', layer: 1, column: 0, symbol: 'FL', description: '接收成长材料，保存文件与元数据并安排异步分析。教师通过接口读取分析结果，手动通过或驳回凭证。', paths: ['backend/routes/student_files.py', 'backend/routes/credentials.py'] },
  { id: 'education', name: '教学业务接口', tech: 'Flask · 档案 / 成绩', layer: 1, column: 1, symbol: 'ED', description: '提供学生档案、兴趣标签、教师检索、成绩导入与成长报告入口。', paths: ['backend/routes/student.py', 'backend/routes/teacher.py', 'backend/routes/grades.py'] },
  { id: 'ai-routes', name: '教材与辅导接口', tech: 'Flask · Knowledge / Tutor', layer: 1, column: 2, symbol: 'AI', description: '处理教材管理、知识检索与学科对话请求。管理接口提供用户设置和可观测性入口。', paths: ['backend/routes/knowledge.py', 'backend/routes/tutor.py', 'backend/routes/admin.py'] },
  { id: 'auth', name: '应用与权限', tech: 'Flask · JWT / RBAC', layer: 1, column: 3, symbol: 'AU', description: '应用工厂注册接口、初始化存储和数据库；JWT 校验与角色权限保护学生、教师和管理员接口。', paths: ['backend/app.py', 'backend/routes/auth.py', 'backend/routes/security.py', 'backend/routes/common.py', 'backend/routes/__init__.py'] },
  { id: 'analysis', name: '凭证智能分析', tech: 'LangGraph · OCR', layer: 2, column: 0, symbol: '✦', description: '提取 PDF、文档或图片文字，使用模型提取字段，再由程序比对填写信息。不可读材料交由人工核对，AI 不直接决定审核结果。', paths: ['backend/services/credential_analysis.py', 'backend/services/document_extraction.py'] },
  { id: 'report', name: '成绩与人选分析', tech: '回归预测 · Embedding', layer: 2, column: 1, symbol: '↗', description: '程序计算成绩趋势，LangGraph 编排自然语言报告；语义检索根据学生兴趣特长匹配活动人选，支持离线兜底。', paths: ['backend/services/grade_report.py', 'backend/services/semantic_search.py'] },
  { id: 'rag', name: '知识库与 AI 辅导', tech: 'RAG · LangGraph', layer: 2, column: 2, symbol: 'KG', description: '教材解析后切片和建立向量索引，辅导服务检索教材片段并组织带引用的学科回答。', paths: ['backend/services/knowledge_base.py', 'backend/services/tutor.py'] },
  { id: 'observe', name: 'AI 可观测性', tech: '本地记录 · Langfuse 可选', layer: 2, column: 3, symbol: '◎', description: '记录辅导检索与模型流程信息，支持按配置接入 Langfuse。这里的架构地图展示静态关系，不读取运行监测数据。', paths: ['backend/services/observability.py'] },
  { id: 'queue', name: '异步任务', tech: 'Celery · Redis', layer: 3, column: 0, symbol: '⇢', description: '队列分发凭证分析和教材索引任务。Worker 执行业务服务，并通过版本号和任务 ID 防止旧结果覆盖重新提交的材料。Redis 为 Celery 提供消息代理。', paths: ['backend/services/credential_queue.py', 'backend/tasks.py', 'backend/celery_app.py'] },
  { id: 'database', name: '关系数据库', tech: 'SQLite · 持久化', layer: 3, column: 1, symbol: 'DB', description: '存储用户、档案、成绩、凭证元数据、分析结果、教材切片与对话记录。Web 服务与 Worker 共享数据库。', paths: ['backend/database.py', 'backend/schema.sql'] },
  { id: 'storage', name: '文件存储', tech: 'LocalFileStorage · 上传文件', layer: 3, column: 2, symbol: 'FS', description: '保存上传材料，校验文件并处理读取和删除。Docker 部署通过共享卷让 Web 服务与 Worker 访问同一批文件。', paths: ['backend/services/file_storage.py'] },
  { id: 'deployment', name: '部署编排', tech: 'Docker Compose · 4 服务', layer: 3, column: 3, symbol: '▧', description: '编排 frontend、backend、celery-worker 和 redis，配置数据库、上传文件以及 Redis 持久化卷。', paths: ['docker-compose.yml', 'frontend/Dockerfile', 'backend/Dockerfile'] },
];

export const edges = [
  ['student', 'client', '调用'], ['teacher', 'client', '调用'], ['admin', 'client', '调用'],
  ['client', 'files', 'HTTP'], ['client', 'education', 'HTTP'], ['client', 'ai-routes', 'HTTP'], ['client', 'auth', '登录'],
  ['auth', 'database', '用户与权限'], ['files', 'queue', '安排分析'], ['files', 'storage', '保存 / 读取'], ['files', 'database', '凭证记录'],
  ['education', 'report', '分析 / 检索'], ['education', 'database', '档案 / 成绩'],
  ['ai-routes', 'rag', '检索 / 对话'], ['ai-routes', 'queue', '安排索引'], ['ai-routes', 'observe', '读取记录'],
  ['queue', 'analysis', '执行分析'], ['queue', 'rag', '教材索引'], ['queue', 'database', '任务状态 / 结果'], ['queue', 'storage', '读取材料'],
  ['rag', 'database', '教材 / 对话'], ['rag', 'observe', '追踪'],
  ['deployment', 'queue', '运行 Worker / Redis'], ['deployment', 'auth', '运行 Web 服务'],
];

export const credentialFlow = [
  { node: 'student', title: '提交成长材料', detail: '学生选择文件并填写荣誉名称、机构和日期。', file: 'frontend/src/pages/student/FilesPage.jsx', term: 'uploadFile' },
  { node: 'client', title: '发送上传请求', detail: 'StudentAPI 将文件和字段组合为 FormData，POST 到 /api/student/files。', file: 'frontend/src/api/StudentAPI.js', term: 'uploadFile' },
  { node: 'files', title: '保存并创建记录', detail: '文件落盘，凭证与分析记录写入 SQLite，随后提交队列任务。', file: 'backend/routes/student_files.py', term: 'def student_files' },
  { node: 'queue', title: '排队并执行任务', detail: '生成 job_id，通过 Redis / Celery 分发到 credential-analysis 队列，由 Worker 执行。', file: 'backend/services/credential_queue.py', term: 'def enqueue_credential_analysis' },
  { node: 'analysis', title: '提取与一致性核对', detail: 'LangGraph 编排文字提取、字段提取和一致性比较；模型不可用时采用本地规则。', file: 'backend/services/credential_analysis.py', term: 'def _extract_document_node' },
  { node: 'database', title: '写入分析结果', detail: 'Worker 仅在 revision 与 job_id 仍匹配时更新结果，避免旧任务覆盖新提交。', file: 'backend/tasks.py', term: 'def analyze_credential_task' },
  { node: 'teacher', title: '教师查看与审核', detail: '教师页面经凭证接口读取已保存的结果，审核决定由教师作出。', file: 'backend/routes/credentials.py', term: 'def review_credential' },
];
