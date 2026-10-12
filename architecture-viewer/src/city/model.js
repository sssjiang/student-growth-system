export const types = {
  gate: {
    name: "关卡",
    meaning: "入口、路由与权限检查",
    color: "#c8b6ef",
    glyph: "⊓",
  },
  hall: {
    name: "办事大厅",
    meaning: "用户页面与交互流程",
    color: "#a7cbdc",
    glyph: "▤",
  },
  workshop: {
    name: "装配工坊",
    meaning: "复用组件与工具",
    color: "#8ec6bd",
    glyph: "⌂",
  },
  station: {
    name: "通信站",
    meaning: "HTTP 请求与状态传递",
    color: "#e6b58b",
    glyph: "⚑",
  },
  factory: {
    name: "处理工厂",
    meaning: "业务计算与 AI 分析",
    color: "#d7c78d",
    glyph: "▥",
  },
  warehouse: {
    name: "仓库",
    meaning: "数据结构与文件存取",
    color: "#9bc397",
    glyph: "▱",
  },
  tower: {
    name: "调度塔",
    meaning: "应用、任务及部署编排",
    color: "#b3bceb",
    glyph: "♜",
  },
  lab: {
    name: "检测实验室",
    meaning: "测试验证与运行观察",
    color: "#ddabbf",
    glyph: "◉",
  },
  studio: {
    name: "设计馆",
    meaning: "视觉样式与布局规则",
    color: "#a9cbb8",
    glyph: "◒",
  },
  library: {
    name: "资料馆",
    meaning: "翻译资源与模块目录",
    color: "#cdb795",
    glyph: "▥",
  },
};

const exact = {
  "backend/app.py": [
    "tower",
    "应用总控塔",
    "创建 Flask 应用，初始化数据库和文件存储，注册路由及健康检查。",
  ],
  "backend/tasks.py": [
    "tower",
    "后台任务调度塔",
    "执行凭证分析和教材索引任务，校验版本与任务身份后写回结果。",
  ],
  "backend/celery_app.py": [
    "station",
    "队列通信站",
    "配置 Celery 的 Redis 消息代理、序列化、重试与 Worker 行为。",
  ],
  "backend/database.py": [
    "warehouse",
    "数据库仓库",
    "管理 SQLite 连接、数据库初始化与迁移。",
  ],
  "backend/schema.sql": [
    "warehouse",
    "数据结构仓库",
    "声明关系表、字段、约束和索引，定义持久化数据结构。",
  ],
  "backend/seed.py": [
    "warehouse",
    "演示数据补给站",
    "向数据库填充演示账号、学生资料和示例业务数据。",
  ],
  "backend/services/credential_queue.py": [
    "tower",
    "分析任务派发塔",
    "创建任务标识和待处理记录，向凭证分析、教材索引队列派发任务。",
  ],
  "backend/services/credential_analysis.py": [
    "factory",
    "凭证核验工厂",
    "编排文字提取、模型字段提取及程序一致性比较，输出凭证分析结果。",
  ],
  "backend/services/document_extraction.py": [
    "factory",
    "文档拆解工厂",
    "从 PDF、DOCX 和图片中提取文字，必要时执行 OCR。",
  ],
  "backend/services/grade_report.py": [
    "factory",
    "成长报告工厂",
    "计算成绩回归趋势，并编排模型或规则生成可解释的成长报告。",
  ],
  "backend/services/semantic_search.py": [
    "factory",
    "人选检索工厂",
    "计算兴趣向量和查询相似度，支持本地语义匹配与关键词兜底。",
  ],
  "backend/services/knowledge_base.py": [
    "library",
    "教材知识馆",
    "组织教材切片、向量索引和混合检索，提供可引用的知识片段。",
  ],
  "backend/services/tutor.py": [
    "factory",
    "学科辅导工厂",
    "编排教材检索和模型对话，生成带教材引用的辅导回答。",
  ],
  "backend/services/file_storage.py": [
    "warehouse",
    "材料文件仓库",
    "校验上传文件并负责命名、落盘与删除。",
  ],
  "backend/services/observability.py": [
    "lab",
    "AI 观察实验室",
    "组织 AI 工作流的追踪信息，按配置连接 Langfuse。",
  ],
  "backend/routes/security.py": [
    "gate",
    "身份检查关卡",
    "验证 JWT 身份并校验访问者角色，保护业务接口。",
  ],
  "backend/routes/common.py": [
    "workshop",
    "接口公共工坊",
    "提供共用错误响应、字段校验和数据库结果序列化。",
  ],
  "backend/routes/__init__.py": [
    "tower",
    "路由注册塔",
    "汇集并注册各个业务 Blueprint。",
  ],
  "frontend/src/main.jsx": [
    "tower",
    "前端启动塔",
    "挂载 React 应用，载入样式与国际化初始化。",
  ],
  "frontend/src/App.jsx": [
    "tower",
    "应用装配塔",
    "装配 Redux Provider、会话路由与全局提示组件。",
  ],
  "frontend/src/routes.jsx": [
    "gate",
    "页面导航关卡",
    "定义页面路径、角色权限和默认跳转关系。",
  ],
  "frontend/src/api/baseApi.js": [
    "station",
    "HTTP 通信总站",
    "统一发送 HTTP 请求，附加身份令牌并处理响应、文件和错误。",
  ],
  "frontend/src/store/authSlice.js": [
    "station",
    "身份状态通信站",
    "共享当前身份、登录与退出操作，连接认证接口和页面。",
  ],
  "frontend/src/store/toastSlice.js": [
    "station",
    "消息广播站",
    "在页面间共享提示通知及展示状态。",
  ],
  "frontend/src/components/ProtectedRoute.jsx": [
    "gate",
    "页面权限关卡",
    "根据登录身份和角色决定放行或跳转。",
  ],
  "frontend/src/utils/exportPdf.js": [
    "workshop",
    "PDF 出版工坊",
    "将页面或报告内容组织为可下载的 PDF。",
  ],
  "frontend/src/utils/files.js": [
    "workshop",
    "文件工具工坊",
    "提供文件展示、格式或下载相关的共用工具。",
  ],
  "frontend/package.json": [
    "library",
    "前端依赖资料馆",
    "声明前端依赖、开发命令和构建命令。",
  ],
  "frontend/jsconfig.json": [
    "tower",
    "路径规划塔",
    "配置 JavaScript 项目范围和路径别名。",
  ],
  "frontend/vite.config.js": [
    "tower",
    "前端构建塔",
    "配置 Vite 开发服务、代理和构建行为。",
  ],
  "frontend/eslint.config.js": [
    "lab",
    "代码规范检测室",
    "配置 JavaScript 与 React 的静态代码检查规则。",
  ],
  "frontend/prettier.config.cjs": [
    "studio",
    "代码排版设计馆",
    "定义代码格式化规则。",
  ],
  "frontend/index.html": [
    "gate",
    "浏览器入口关卡",
    "提供页面文档和前端脚本加载入口。",
  ],
  "frontend/nginx.conf": [
    "gate",
    "Web 服务关卡",
    "配置静态文件服务与请求转发规则。",
  ],
  "frontend/scripts/check-i18n.mjs": [
    "lab",
    "翻译完整性检测室",
    "检查多语言资源的键名与使用情况。",
  ],
  "backend/requirements.txt": [
    "library",
    "后端依赖资料馆",
    "列出后端基础 Python 依赖。",
  ],
  "backend/requirements-ai.txt": [
    "library",
    "AI 依赖资料馆",
    "列出本地语义模型相关的可选依赖。",
  ],
  "backend/requirements-ocr.txt": [
    "library",
    "OCR 依赖资料馆",
    "列出本地 OCR 识别所需的可选依赖。",
  ],
};
const subjects = {
  Files: "成长材料",
  CredentialForm: "凭证填写",
  CredentialReview: "凭证审核",
  GradeImport: "成绩导入",
  Grades: "个人成绩",
  Profile: "个人档案",
  Tutor: "AI 辅导",
  SmartSearch: "人选检索",
  KnowledgeBase: "教材管理",
  StudentDetail: "学生详情",
  StudentDirectory: "学生名录",
  TeacherDashboard: "教师工作台",
  AdminDashboard: "管理工作台",
  AdminUsers: "用户管理",
  AdminKnowledge: "管理端教材",
  AdminSettings: "系统设置",
  AdminObservability: "AI 运行观察",
  Login: "登录",
  student_files: "成长材料上传与管理",
  credentials: "教师凭证审核",
  grades: "成绩管理",
  auth: "登录认证",
  student: "学生档案",
  teacher: "教师教学",
  admin: "系统管理",
  knowledge: "教材管理",
  tutor: "学科辅导",
};
const componentSubjects = {
  AnalysisResult: "AI 分析结果",
  FilePreviewModal: "文件预览",
  FormField: "表单字段",
  StudentRow: "学生列表行",
  TrendChart: "成绩趋势图",
  StatCard: "统计卡片",
  PageTitle: "页面标题",
  Modal: "弹窗容器",
  EmptyState: "空状态",
  LanguageSwitcher: "语言切换",
  Avatar: "头像",
  Logo: "品牌标识",
};

export function describe(file) {
  const name = file.path.split("/").at(-1),
    stem = name.replace(/\.[^.]+$/, "");
  let item = exact[file.path];
  let evidence = item
    ? "人工整理 · 可查看源码核对"
    : "规则推断 · 根据路径与声明";
  if (!item) {
    if (file.path.includes("/tests/"))
      item = [
        "lab",
        `${stem.replace("test_", "")} 检测室`,
        `验证 ${stem.replace("test_", "").replaceAll("_", " ")} 相关行为；具体场景见内部测试函数。`,
      ];
    else if (file.path.endsWith(".css"))
      item = [
        "studio",
        `${stem} 设计馆`,
        `定义 ${stem} 对应的视觉、布局或响应式样式；实际规则见源码。`,
      ];
    else if (file.path.includes("/locales/"))
      item = [
        "library",
        `${stem} 语言资料馆`,
        name.endsWith(".json")
          ? `保存 ${stem} 语言的界面翻译词条。`
          : "初始化国际化、语言资源与语言切换。",
      ];
    else if (file.path.includes("/pages/") && !name.startsWith("index.")) {
      const subject = subjects[stem.replace(/Page$/, "")] || stem;
      item = [
        "hall",
        `${subject}大厅`,
        `承载${subject}页面的展示、用户操作及页面状态，连接对应组件和业务接口。`,
      ];
    } else if (file.path.includes("/routes/")) {
      const subject = subjects[stem] || stem;
      item = [
        "gate",
        `${subject}关卡`,
        `声明${subject} HTTP 接口，校验输入并连接业务服务和数据层。`,
      ];
    } else if (file.path.includes("/api/") && !name.startsWith("index."))
      item = [
        "station",
        `${stem.replace("API", "")} 通信站`,
        `封装 ${stem.replace("API", "")} 领域的业务请求，通过 API 客户端访问后端。`,
      ];
    else if (
      file.path.includes("/components/") &&
      (!name.startsWith("index.") || file.path.includes("/AppLayout/"))
    )
      item = [
        "workshop",
        `${componentSubjects[stem] || (file.path.includes("AppLayout") ? "应用布局" : stem)}工坊`,
        `提供${componentSubjects[stem] || (file.path.includes("AppLayout") ? "应用整体布局" : stem)}的可复用界面和交互。`,
      ];
    else if (name === "Dockerfile")
      item = [
        "tower",
        "容器装配塔",
        `定义 ${file.path.split("/")[0]} 容器的构建与启动过程。`,
      ];
    else if (name === "__init__.py" || name.startsWith("index."))
      item = [
        "library",
        "模块目录馆",
        file.content.trim()
          ? "组织该目录的公共导出或包初始化，供其他文件使用。"
          : "标记 Python 包边界；当前没有可执行定义。",
      ];
    else
      item = [
        "workshop",
        `${stem} 工坊`,
        `组织 ${stem} 的实现。此文件尚未人工归纳，可从内部声明和依赖确认职责。`,
      ];
  }
  const symbols = [];
  const pattern = file.path.endsWith(".py")
    ? /^\s*(?:async\s+)?(def|class)\s+(\w+)/gm
    : /(?:^|\n)\s*(?:export\s+(?:default\s+)?)?(?:(?:async\s+)?function\s+(\w+)|class\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>)|(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
  for (const match of file.content.matchAll(pattern)) {
    const python = file.path.endsWith(".py");
    symbols.push({
      name: python ? match[2] : match[1] || match[2] || match[3] || match[4],
      kind: python ? match[1] : match[2] ? "class" : "function",
      line: file.content.slice(0, match.index).split("\n").length,
    });
  }
  return {
    ...file,
    type: item[0],
    title: item[1],
    responsibility: item[2],
    evidence,
    symbols,
    parent: file.path.split("/").slice(0, -1).join("/"),
  };
}

export const interactions = [
  {
    from: "frontend/src/api/StudentAPI.js",
    to: "backend/routes/student_files.py",
    label: "POST /api/student/files",
    kind: "HTTP",
    evidence: "uploadFile → student_files",
  },
  {
    from: "frontend/src/api/TeacherAPI.js",
    to: "backend/routes/credentials.py",
    label: "GET /api/teacher/credentials",
    kind: "HTTP",
    evidence: "getCredentials → teacher_credentials",
  },
  {
    from: "backend/services/credential_queue.py",
    to: "backend/tasks.py",
    label: "Redis / Celery · credential-analysis",
    kind: "异步派发",
    evidence: "enqueue_credential_analysis → apply_async",
  },
  {
    from: "backend/tasks.py",
    to: "backend/database.py",
    label: "按 revision / job_id 写回结果",
    kind: "数据写入",
    evidence: "analyze_credential_task → get_db",
  },
];
export const journey = [
  [
    "frontend/src/pages/student/FilesPage.jsx",
    "成长材料大厅",
    "学生上传凭证，页面调用 StudentAPI。",
  ],
  [
    "frontend/src/api/StudentAPI.js",
    "学生通信站",
    "构造 FormData，经 baseApi 的 RTK Query 请求层访问后端。",
  ],
  [
    "backend/routes/student_files.py",
    "文件接口关卡",
    "接收文件、保存材料与数据库记录，安排分析。",
  ],
  [
    "backend/services/credential_queue.py",
    "任务派发塔",
    "生成任务标识，通过 Redis / Celery 派发后台任务。",
  ],
  [
    "backend/tasks.py",
    "后台调度塔",
    "Worker 领取任务，读取文件，调用凭证分析服务。",
  ],
  [
    "backend/services/credential_analysis.py",
    "凭证核验工厂",
    "调用文档提取并比较字段，返回分析结果给 Worker。",
  ],
  [
    "backend/database.py",
    "数据库仓库",
    "Worker 经数据库连接写回结果；版本校验防止旧结果覆盖新提交。",
  ],
  [
    "backend/routes/credentials.py",
    "凭证审核关卡",
    "提供查询分析结果与提交人工审核决定的接口。",
  ],
  [
    "frontend/src/pages/teacher/CredentialReviewPage.jsx",
    "教师审核大厅",
    "教师经 TeacherAPI 查看结果，并作出人工审核决定。",
  ],
].map(([file, title, description]) => ({ file, title, description }));

// A bottom-up shelf layout preserves real directory containment. Files occupy equal lots.
export function buildCity(sourceFiles) {
  const files = sourceFiles
    .filter((file) => /^(frontend|backend)\//.test(file.path))
    .map(describe);
  const roots = ["frontend", "backend"].map((path) => ({
    path,
    name: path,
    directory: true,
    children: [],
    depth: 0,
  }));
  const directories = new Map(roots.map((root) => [root.path, root]));
  for (const file of files) {
    const segments = file.path.split("/");
    let parent = directories.get(segments[0]);
    for (let index = 1; index < segments.length - 1; index++) {
      const path = segments.slice(0, index + 1).join("/");
      if (!directories.has(path)) {
        const dir = {
          path,
          name: segments[index],
          directory: true,
          children: [],
          depth: index,
        };
        directories.set(path, dir);
        parent.children.push(dir);
      }
      parent = directories.get(path);
    }
    parent.children.push({
      ...file,
      directory: false,
      name: segments.at(-1),
      width: 5,
      depthSize: 5,
    });
  }
  function pack(dir) {
    dir.children.sort(
      (a, b) =>
        Number(b.directory) - Number(a.directory) ||
        a.path.localeCompare(b.path),
    );
    dir.children.filter((child) => child.directory).forEach(pack);
    const area = dir.children.reduce(
      (sum, item) => sum + (item.width + 1) * (item.depthSize + 1),
      0,
    );
    const target = Math.max(
      ...dir.children.map((item) => item.width + 2),
      Math.sqrt(area) * 1.3,
    );
    let x = 1.5,
      z = 3,
      row = 0,
      width = 0;
    for (const child of dir.children) {
      if (x > 1.5 && x + child.width > target) {
        x = 1.5;
        z += row + 1.5;
        row = 0;
      }
      child.localX = x;
      child.localZ = z;
      x += child.width + 1;
      row = Math.max(row, child.depthSize);
      width = Math.max(width, x);
    }
    dir.width = width + 0.5;
    dir.depthSize = z + row + 1.5;
    dir.fileCount = dir.children.reduce(
      (n, child) => n + (child.directory ? child.fileCount : 1),
      0,
    );
  }
  roots.forEach(pack);
  const totalWidth = roots[0].width + roots[1].width + 12;
  const all = new Map();
  function place(item, x, z) {
    item.x = x;
    item.z = z;
    all.set(item.path, item);
    item.children?.forEach((child) =>
      place(child, x + child.localX, z + child.localZ),
    );
  }
  place(roots[0], -totalWidth / 2, -roots[0].depthSize / 2);
  place(
    roots[1],
    -totalWidth / 2 + roots[0].width + 12,
    -roots[1].depthSize / 2,
  );
  return {
    files,
    roots,
    all,
    directories,
    totalWidth,
    depth: Math.max(...roots.map((root) => root.depthSize)),
  };
}
