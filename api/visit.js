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

  if (req.method === 'POST') {
    const { user_id, qr_code } = req.body;
    
    console.log('Marking visit:', { user_id, qr_code });
    
    // Проверяем, что QR код валидный
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
          console.error('Database error:', err);
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
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            // Проверяем, нужно ли дать бонус
            db.get(
              'SELECT COUNT(*) as visit_count FROM visits WHERE user_id = ?',
              [user_id],
              (err, visitData) => {
                if (err) {
                  console.error('Database error:', err);
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
