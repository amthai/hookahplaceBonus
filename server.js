const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

const app = express();
const db = new sqlite3.Database(config.DATABASE_PATH);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

// API Routes

// Получить информацию о пользователе
app.get('/api/user/:userId', (req, res) => {
  const userId = req.params.userId;
  console.log('Getting user data for ID:', userId);
  
  db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        console.log('User not found with ID:', userId);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('User found:', user);
      
      // Получаем количество посещений
      db.get(
        'SELECT COUNT(*) as visit_count FROM visits WHERE user_id = ?',
        [user.id],
        (err, visitData) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Получаем количество неиспользованных бонусов
          db.get(
            'SELECT COUNT(*) as bonus_count FROM bonuses WHERE user_id = ? AND is_used = 0',
            [user.id],
            (err, bonusData) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              
              res.json({
                user: {
                  id: user.id,
                  telegram_id: user.telegram_id,
                  username: user.username,
                  first_name: user.first_name,
                  last_name: user.last_name
                },
                visits: visitData.visit_count,
                bonuses: bonusData.bonus_count,
                visits_to_bonus: 10 - (visitData.visit_count % 10)
              });
            }
          );
        }
      );
    }
  );
});

// Создать или обновить пользователя
app.post('/api/user', (req, res) => {
  console.log('Creating user with data:', req.body);
  const { telegram_id, username, first_name, last_name } = req.body;
  
  if (!telegram_id) {
    console.log('Missing telegram_id');
    return res.status(400).json({ error: 'telegram_id is required' });
  }
  
  console.log('Inserting user with telegram_id:', telegram_id);
  
  db.run(
    'INSERT OR REPLACE INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)',
    [telegram_id, username, first_name, last_name],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      console.log('User created/updated with ID:', this.lastID);
      console.log('User created/updated with changes:', this.changes);
      
      res.json({ 
        message: 'User created/updated successfully',
        user_id: this.lastID 
      });
    }
  );
});

// Отметить посещение
app.post('/api/visit', (req, res) => {
  const { user_id, qr_code } = req.body;
  
  // Проверяем, что QR код валидный (простая проверка)
  if (!qr_code || qr_code !== 'HOOKAH_PLACE_QR') {
    return res.status(400).json({ error: 'Invalid QR code' });
  }
  
  // Проверяем, что пользователь не отметился сегодня
  const today = new Date().toISOString().split('T')[0];
  db.get(
    'SELECT id FROM visits WHERE user_id = ? AND DATE(visit_date) = ?',
    [user_id, today],
    (err, existingVisit) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (existingVisit) {
        return res.status(400).json({ error: 'Already visited today' });
      }
      
      // Добавляем посещение
      db.run(
        'INSERT INTO visits (user_id, qr_code) VALUES (?, ?)',
        [user_id, qr_code],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
          // Проверяем, нужно ли дать бонус
          db.get(
            'SELECT COUNT(*) as visit_count FROM visits WHERE user_id = ?',
            [user_id],
            (err, visitData) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              
              const visitCount = visitData.visit_count;
              let bonusEarned = false;
              
              // Если количество посещений кратно 10, даем бонус
              if (visitCount % 10 === 0 && visitCount > 0) {
                db.run(
                  'INSERT INTO bonuses (user_id, bonus_type) VALUES (?, ?)',
                  [user_id, 'free_visit'],
                  (err) => {
                    if (!err) {
                      bonusEarned = true;
                    }
                  }
                );
              }
              
              res.json({
                message: 'Visit recorded successfully',
                visit_count: visitCount,
                bonus_earned: bonusEarned,
                visits_to_next_bonus: 10 - (visitCount % 10)
              });
            }
          );
        }
      );
    }
  );
});

// Получить историю посещений
app.get('/api/visits/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    'SELECT * FROM visits WHERE user_id = ? ORDER BY visit_date DESC',
    [userId],
    (err, visits) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(visits);
    }
  );
});

// Получить бонусы пользователя
app.get('/api/bonuses/:userId', (req, res) => {
  const userId = req.params.userId;
  
  db.all(
    'SELECT * FROM bonuses WHERE user_id = ? ORDER BY earned_date DESC',
    [userId],
    (err, bonuses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(bonuses);
    }
  );
});

// Использовать бонус
app.post('/api/bonus/use/:bonusId', (req, res) => {
  const bonusId = req.params.bonusId;
  
  db.run(
    'UPDATE bonuses SET is_used = 1, used_date = CURRENT_TIMESTAMP WHERE id = ? AND is_used = 0',
    [bonusId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Bonus not found or already used' });
      }
      
      res.json({ message: 'Bonus used successfully' });
    }
  );
});

// Генерировать QR код для заведения
app.get('/api/qr-code', (req, res) => {
  const qrData = 'HOOKAH_PLACE_QR';
  
  QRCode.toDataURL(qrData, { width: 200 }, (err, url) => {
    if (err) {
      return res.status(500).json({ error: 'QR code generation failed' });
    }
    
    res.json({ qr_code_url: url, qr_data: qrData });
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`QR Code data: HOOKAH_PLACE_QR`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
