// Используем глобальные переменные для сохранения данных между запросами
let globalUsers = global.users || new Map();
let globalVisits = global.visits || new Map();
let globalBonuses = global.bonuses || new Map();

// Инициализируем глобальные переменные
if (!global.users) {
  global.users = globalUsers;
  global.visits = globalVisits;
  global.bonuses = globalBonuses;
}

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
    
    try {
      const visits = Array.from(global.visits.values())
        .filter(visit => visit.user_id === parseInt(userId))
        .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
      
      res.json(visits);
    } catch (error) {
      console.error('Error getting visits:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
