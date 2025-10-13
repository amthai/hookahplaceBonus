const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем путь к базе данных
const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(dbPath);

export default function handler(req, res) {
  // Включаем CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    db.get(
      'SELECT * FROM users WHERE id = ?',
      [userId],
      (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        // Получаем количество посещений
        db.get(
          'SELECT COUNT(*) as visit_count FROM visits WHERE user_id = ?',
          [user.id],
          (err, visitData) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            // Получаем количество неиспользованных бонусов
            db.get(
              'SELECT COUNT(*) as bonus_count FROM bonuses WHERE user_id = ? AND is_used = 0',
              [user.id],
              (err, bonusData) => {
                if (err) {
                  console.error('Database error:', err);
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
