-- Создание таблиц для Supabase PostgreSQL
-- Выполните этот SQL в Supabase Dashboard -> SQL Editor

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица посещений
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  qr_code VARCHAR(255),
  visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица бонусов
CREATE TABLE IF NOT EXISTS bonuses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  bonus_type VARCHAR(255),
  earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_used BOOLEAN DEFAULT FALSE,
  used_date TIMESTAMP
);

-- Таблица сотрудников
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  is_on_shift BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_bonuses_user_id ON bonuses(user_id);
CREATE INDEX IF NOT EXISTS idx_bonuses_used ON bonuses(is_used);
CREATE INDEX IF NOT EXISTS idx_staff_on_shift ON staff(is_on_shift);
