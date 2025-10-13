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
    
    db.all(
      'SELECT * FROM visits WHERE user_id = ? ORDER BY visit_date DESC',
      [userId],
      (err, visits) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(visits);
      }
    );
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
