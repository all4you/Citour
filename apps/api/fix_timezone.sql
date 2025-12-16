-- Timezone Fix Migration Script
-- Fix historical timestamps from UTC to UTC+8 (add 8 hours)
-- Run this script with: npx wrangler d1 execute citour-db --local --file=./fix_timezone.sql

-- Fix tenants table
UPDATE tenants 
SET created_at = datetime(created_at, '+8 hours'),
    updated_at = datetime(updated_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Fix users table
UPDATE users 
SET created_at = datetime(created_at, '+8 hours'),
    updated_at = datetime(updated_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Fix word_books table
UPDATE word_books 
SET created_at = datetime(created_at, '+8 hours'),
    updated_at = datetime(updated_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Fix words table
UPDATE words 
SET created_at = datetime(created_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Fix study_plans table
UPDATE study_plans 
SET started_at = datetime(started_at, '+8 hours'),
    completed_at = datetime(completed_at, '+8 hours')
WHERE started_at IS NOT NULL;

-- Fix daily_tasks table
UPDATE daily_tasks 
SET created_at = datetime(created_at, '+8 hours'),
    completed_at = datetime(completed_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Fix word_mastery table
UPDATE word_mastery 
SET last_practiced_at = datetime(last_practiced_at, '+8 hours'),
    next_review_at = datetime(next_review_at, '+8 hours'),
    created_at = datetime(created_at, '+8 hours'),
    updated_at = datetime(updated_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Fix practice_sessions table
UPDATE practice_sessions 
SET started_at = datetime(started_at, '+8 hours'),
    ended_at = datetime(ended_at, '+8 hours')
WHERE started_at IS NOT NULL;

-- Fix wrong_words table
UPDATE wrong_words 
SET created_at = datetime(created_at, '+8 hours')
WHERE created_at IS NOT NULL;

-- Verify the fix (check current timestamps)
SELECT 'tenants' as table_name, COUNT(*) as count, MAX(created_at) as latest_created FROM tenants
UNION ALL
SELECT 'users', COUNT(*), MAX(created_at) FROM users
UNION ALL
SELECT 'word_books', COUNT(*), MAX(created_at) FROM word_books
UNION ALL
SELECT 'practice_sessions', COUNT(*), MAX(started_at) FROM practice_sessions;
