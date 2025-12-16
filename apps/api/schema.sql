-- Citour D1 Database Schema
-- Single database with tenant_id for multi-tenancy

-- ==================== SYSTEM TABLES ====================

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (admins + students)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    account TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('sys_admin', 'admin', 'student')),
    class_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, account)
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==================== BUSINESS TABLES ====================

-- Word Books
CREATE TABLE IF NOT EXISTS word_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'offline' CHECK(status IN ('online', 'offline')),
    word_count INTEGER DEFAULT 0,
    daily_target INTEGER DEFAULT 20,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_word_books_tenant ON word_books(tenant_id);
CREATE INDEX IF NOT EXISTS idx_word_books_status ON word_books(status);

-- Words
CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    spelling TEXT NOT NULL,
    meaning TEXT NOT NULL,
    sentence TEXT,
    phonics_data TEXT,
    root_info TEXT,
    audio_url TEXT,
    difficulty INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_words_tenant ON words(tenant_id);
CREATE INDEX IF NOT EXISTS idx_words_book ON words(book_id);

-- ==================== STUDY PLAN TABLES ====================

-- Study Plans (学生单词本学习状态)
CREATE TABLE IF NOT EXISTS study_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started', 'learning', 'completed')),
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE,
    UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(user_id, status);

-- Learning Tasks (学习任务，合并练习会话)
CREATE TABLE IF NOT EXISTS learning_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    word_ids TEXT NOT NULL,
    total_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
    -- 练习统计（原 practice_sessions）
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    hint_count INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_user ON learning_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_book ON learning_tasks(book_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_status ON learning_tasks(user_id, status);

-- Wrong Words (error book)
CREATE TABLE IF NOT EXISTS wrong_words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    word_id INTEGER NOT NULL,
    book_id INTEGER,
    task_id INTEGER,
    wrong_spelling TEXT NOT NULL,
    correct_spelling TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed INTEGER DEFAULT 0,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (book_id) REFERENCES word_books(id),
    FOREIGN KEY (task_id) REFERENCES learning_tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_wrong_words_user ON wrong_words(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_words_book ON wrong_words(user_id, book_id);

-- ==================== SEED DATA ====================

-- Create default system admin tenant (tenant_id = 0 for system)
INSERT OR IGNORE INTO tenants (id, name, status) VALUES (0, 'System', 'active');

-- Create default system admin user
INSERT OR IGNORE INTO users (id, tenant_id, name, account, password, role) 
VALUES (1, 0, '系统管理员', 'admin', 'admin123', 'sys_admin');
