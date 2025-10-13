const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем путь к базе данных
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Инициализация базы данных
db.serialize(() => {
  // Таблица пользователей
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Таблица посещений
  db.run(`CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    qr_code TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Таблица бонусов
  db.run(`CREATE TABLE IF NOT EXISTS bonuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    bonus_type TEXT DEFAULT 'free_visit',
    earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_date DATETIME,
    is_used BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

export default function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const { telegram_id, username, first_name, last_name } = req.body;
    
    console.log('Creating user with data:', req.body);
    
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }
    
    db.run(
      'INSERT OR REPLACE INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)',
      [telegram_id, username, first_name, last_name],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        console.log('User created/updated with ID:', this.lastID);
        res.json({ 
          message: 'User created/updated successfully',
          user_id: this.lastID 
        });
      }
    );
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
