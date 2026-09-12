PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student', 'teacher')),
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  student_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gender TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  class_name TEXT DEFAULT '',
  birthday TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS interests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE,
  tags TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  embedding TEXT,
  embedding_model TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS grades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  semester INTEGER NOT NULL DEFAULT 1 CHECK(semester IN (1, 2)),
  chinese REAL NOT NULL CHECK(chinese BETWEEN 0 AND 100),
  math REAL NOT NULL CHECK(math BETWEEN 0 AND 100),
  english REAL NOT NULL CHECK(english BETWEEN 0 AND 100),
  politics REAL NOT NULL CHECK(politics BETWEEN 0 AND 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, year, semester),
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  credential_type TEXT NOT NULL DEFAULT 'other',
  issuer TEXT NOT NULL DEFAULT '',
  awarded_at TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  review_comment TEXT NOT NULL DEFAULT '',
  reviewed_by INTEGER,
  reviewed_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  metrics TEXT NOT NULL,
  generated_by TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credential_ai_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id INTEGER NOT NULL UNIQUE,
  analysis_revision INTEGER NOT NULL DEFAULT 1,
  job_id TEXT NOT NULL DEFAULT '',
  analysis_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  overall_status TEXT NOT NULL DEFAULT '',
  overall_confidence REAL NOT NULL DEFAULT 0,
  extraction_method TEXT NOT NULL DEFAULT '',
  extraction_confidence REAL NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL DEFAULT '',
  extracted_fields TEXT NOT NULL DEFAULT '{}',
  comparisons TEXT NOT NULL DEFAULT '[]',
  generated_by TEXT NOT NULL DEFAULT '',
  error_message TEXT NOT NULL DEFAULT '',
  analyzed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(file_id) REFERENCES student_files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL CHECK(subject IN ('chinese', 'math', 'english', 'politics')),
  grade_level TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending', 'processing', 'ready', 'failed')),
  job_id TEXT NOT NULL DEFAULT '',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  heading TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  embedding TEXT,
  embedding_model TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, position),
  FOREIGN KEY(document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tutor_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL CHECK(subject IN ('chinese', 'math', 'english', 'politics')),
  title TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tutor_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES tutor_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rag_traces (
  id TEXT PRIMARY KEY,
  conversation_id INTEGER,
  message_id INTEGER,
  student_id INTEGER,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  retrieved_count INTEGER NOT NULL DEFAULT 0,
  selected_count INTEGER NOT NULL DEFAULT 0,
  generated_by TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT NOT NULL DEFAULT '',
  langfuse_trace_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES tutor_conversations(id) ON DELETE SET NULL,
  FOREIGN KEY(message_id) REFERENCES tutor_messages(id) ON DELETE SET NULL,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rag_trace_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  chunk_id INTEGER,
  rank INTEGER NOT NULL,
  semantic_score REAL NOT NULL DEFAULT 0,
  keyword_score REAL NOT NULL DEFAULT 0,
  final_score REAL NOT NULL DEFAULT 0,
  selected INTEGER NOT NULL DEFAULT 0,
  document_title TEXT NOT NULL DEFAULT '',
  heading TEXT NOT NULL DEFAULT '',
  content_snapshot TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(trace_id) REFERENCES rag_traces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_grades_student_year ON grades(student_id, year, semester);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(grade, class_name);
CREATE INDEX IF NOT EXISTS idx_credential_ai_reviews_status
  ON credential_ai_reviews(analysis_status, updated_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_filter
  ON knowledge_documents(subject, grade_level, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document
  ON knowledge_chunks(document_id, position);
CREATE INDEX IF NOT EXISTS idx_tutor_conversations_student
  ON tutor_conversations(student_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_messages_conversation
  ON tutor_messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_rag_traces_created
  ON rag_traces(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_trace_chunks_trace
  ON rag_trace_chunks(trace_id, rank);
