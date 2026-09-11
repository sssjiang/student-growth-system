# 知行 · 学生成长管理系统

一个可独立运行的 React + Flask 学生管理系统。学生维护个人信息、兴趣特长和成长材料；教师用自然语言寻找适合某项活动的学生，并基于历年四科成绩生成可解释的趋势预测与个性化报告。

## 已实现功能

- 学生和教师 JWT 登录鉴权，接口按角色隔离
- 学生注册、个人资料、兴趣标签维护及荣誉凭证管理
- 凭证图片/PDF 预览、下载、删除确认、审核状态及驳回后重新提交
- 教师凭证审核台，支持通过、驳回和审核意见
- 教师工作台、学生档案列表与自然语言活动人选匹配
- 语文、数学、英语、政治成绩单条写入及 CSV 批量导入
- 纯 Python 线性回归趋势计算，所有预测数字先由程序得出
- 本地 `sentence-transformers` 中文语义检索；模型不可用时自动使用离线关键词相似度
- LangGraph 编排成绩计算与 OpenAI 兼容模型报告；没有 API Key 时生成完整的本地规则报告
- 教师可将包含成绩趋势、兴趣特长和个性化建议的成长报告下载为 PDF
- 响应式界面、成绩折线图和演示数据
- 英语、粤语和简体中文界面，语言选择会保存在浏览器中

## 目录

```text
student-growth-system/
├── backend/
│   ├── app.py                    # Flask API 与 JWT 权限
│   ├── database.py               # SQLite 连接和初始化
│   ├── schema.sql                # 用户、学生、兴趣、成绩、文件、报告表
│   ├── seed.py                   # 演示数据
│   └── services/
│       ├── semantic_search.py    # 本地语义检索
│       └── grade_report.py       # 回归计算与 LangGraph 报告工作流
├── frontend/                     # React + Vite
│   └── src/
│       ├── api/                  # 按 Auth/Student/Teacher 领域封装
│       ├── components/           # 单一职责公共组件与应用布局
│       ├── contexts/             # 登录状态与全局提示
│       ├── pages/
│       │   ├── teacher/          # 工作台、检索、档案、导入、报告详情
│       │   └── student/          # 个人资料、成绩、成长材料
│       └── routes.jsx            # 路由和角色权限配置
└── docker-compose.yml
```

## 本地启动

需要 Python 3.10+ 和 Node.js 18+。

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed.py
python app.py
```

基础依赖已包含 LangGraph 与 OpenAI 兼容模型客户端。需要完整 embedding 能力时安装：

```bash
pip install -r requirements-ai.txt
```

PDF 和 DOCX 的文字提取依赖包含在基础依赖中。需要识别图片或扫描版 PDF 时，安装本地
PaddleOCR（首次使用会下载 OCR 模型）：

```bash
pip install -r requirements-ocr.txt
```

新开终端启动前端：

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。演示账号：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 教师 | `teacher` | `teacher123` |
| 学生 | `student1` | `student123` |

也可以运行 `docker compose up --build`，再访问 `http://localhost:5173`。首次使用 Docker 后需初始化演示数据：

```bash
docker compose exec backend python seed.py
```

## 成绩 CSV 格式

```csv
student_no,year,semester,chinese,math,english,politics
2026001,2026,1,88,90,86,84
```

`semester` 只能是 1 或 2，成绩必须在 0–100 之间。相同学生、学年和学期的数据会被更新。

## AI 工作方式

检索服务默认尝试加载 `paraphrase-multilingual-MiniLM-L12-v2`。可通过 `EMBEDDING_MODEL` 指向本地模型目录，并设置 `EMBEDDING_LOCAL_ONLY=true` 避免后端启动时检查远程更新。学生修改兴趣时会计算并持久化向量；教师检索时只计算查询向量，再与已有学生向量比较。旧数据缺少向量或更换模型时会批量补算一次并回写数据库。约 1000 名学生时直接在内存计算余弦相似度即可；更大规模可换成 pgvector。

报告服务通过 LangGraph 依次执行趋势计算、本地兜底报告准备、OpenAI 兼容模型生成和输出校验。每一科及综合平均分仍由 Python 线性回归计算，只有计算结果会交给模型转成自然语言。配置方法：

```bash
export AI_REPORT_ENABLED=true
export OPENAI_API_KEY=your-key
export OPENAI_BASE_URL=https://api.openai.com/v1
export OPENAI_MODEL=your-model
```

项目也兼容已有的 `LongCat_API_KEY`、`OpenAI_endpoint` 和 `LongCat_MODEL` 变量。模型请求或 JSON 校验失败时，工作流自动返回本地规则报告，不影响教师查看分析结果。

预测只反映已有成绩的线性变化，用于教学观察，不应作为评价或分流学生的唯一依据。

## 荣誉凭证流程

学生上传凭证时填写荣誉名称、类型、颁发机构、日期和说明。新凭证进入 `pending` 状态；教师在“凭证审核”页面预览后选择通过或驳回。被驳回的凭证会向学生展示审核意见，学生可以修改资料、选择是否替换原文件并重新提交。

教师首次打开凭证预览时，系统通过 LangGraph 执行“本地文字提取/OCR → OpenAI 兼容模型
结构化字段提取 → 程序一致性比对”，并在文件右侧展示学生姓名、奖项名称、颁发机构、日期和
荣誉类型的逐项结果。结果缓存在 `credential_ai_reviews` 表中；重复预览直接读取缓存，学生重新
提交后自动使旧分析失效。未配置模型时使用本地文字包含规则，无法提取文字时明确交由老师人工
核对。AI 结果只辅助核对填写内容与文件是否一致，不自动决定审核结果。

开发环境使用 `backend/uploads` 本地存储，文件操作集中在 `LocalFileStorage` 适配器中。生产环境可以实现同样接口的 OSS 存储适配器，业务路由和审核流程无需随之改写。

## 验证

```bash
cd backend
python -m unittest discover -s tests -v

cd ../frontend
npm run lint
npm run i18n:check
npm run format:check
npm run build
```

## 生产化建议

- 将 SQLite 替换为 PostgreSQL，并为 embedding 增加 pgvector 索引。
- 使用 HTTPS，将 `SECRET_KEY`、模型 API Key 放入密钥管理服务。
- 上传文件改用私有对象存储和短时签名 URL，并增加病毒扫描。
- 补充教师账号创建审批、班级范围授权、操作审计和学生数据保留策略。
