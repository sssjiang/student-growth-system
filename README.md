# 知行 · 学生成长管理系统

一个可独立运行的 React + Flask 学生管理系统。学生维护个人信息、兴趣特长和成长材料；教师用自然语言寻找适合某项活动的学生，并基于历年四科成绩生成可解释的趋势预测与个性化报告。

## 已实现功能

- 学生和教师 JWT 登录鉴权，接口按角色隔离
- 学生注册、个人资料、兴趣标签/描述维护及材料上传
- 教师工作台、学生档案列表与自然语言活动人选匹配
- 语文、数学、英语、政治成绩单条写入及 CSV 批量导入
- 纯 Python 线性回归趋势计算，所有预测数字先由程序得出
- 本地 `sentence-transformers` 中文语义检索；模型不可用时自动使用离线关键词相似度
- 可选 Claude API 报告润色；没有 API Key 时生成完整的本地规则报告
- 响应式中文界面、成绩折线图和演示数据

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
│       └── grade_report.py       # 回归计算与报告生成
├── frontend/                     # React + Vite
│   └── src/
│       ├── components/           # 应用布局等公共组件
│       └── pages/
│           ├── teacher/          # 工作台、检索、档案、导入、报告详情
│           └── student/          # 个人资料、成绩、成长材料
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

基础依赖使用轻量关键词检索和本地报告。需要完整 embedding 与 Claude 能力时安装：

```bash
pip install -r requirements-ai.txt
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

检索服务默认尝试加载 `paraphrase-multilingual-MiniLM-L12-v2`。可通过 `EMBEDDING_MODEL` 指向本地模型目录，避免运行环境联网。约 1000 名学生时直接在内存计算余弦相似度即可；生产环境可在兴趣更新时持久化向量，并按需换成 pgvector。

报告服务先对每一科和综合平均分执行线性回归，计算均分、变化量、趋势斜率和下一期预测。只有这些计算结果会交给 Claude 转成自然语言，并在提示中明确禁止改写数字。配置方法：

```bash
export ANTHROPIC_API_KEY=your-key
export CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

预测只反映已有成绩的线性变化，用于教学观察，不应作为评价或分流学生的唯一依据。

## 验证

```bash
cd backend
python -m unittest discover -s tests -v

cd ../frontend
npm run build
```

## 生产化建议

- 将 SQLite 替换为 PostgreSQL，并为 embedding 增加 pgvector 索引。
- 使用 HTTPS，将 `SECRET_KEY`、Claude Key 放入密钥管理服务。
- 上传文件改用私有对象存储和短时签名 URL，并增加病毒扫描。
- 补充教师账号创建审批、班级范围授权、操作审计和学生数据保留策略。
