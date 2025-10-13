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
    
    console.log('Getting user data for ID:', userId);
    console.log('Total users in global:', global.users.size);
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = global.users.get(parseInt(userId));
    
    if (!user) {
      console.log('User not found with ID:', userId);
      console.log('Available users:', Array.from(global.users.keys()));
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User found:', user);
    
    // Подсчитываем посещения
    let visitCount = 0;
    for (let [id, visit] of global.visits) {
      if (visit.user_id === parseInt(userId)) {
        visitCount++;
      }
    }
    
    // Подсчитываем бонусы
    let bonusCount = 0;
    for (let [id, bonus] of global.bonuses) {
      if (bonus.user_id === parseInt(userId) && !bonus.is_used) {
        bonusCount++;
      }
    }
    
    res.json({
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name
      },
      visits: visitCount,
      bonuses: bonusCount,
      visits_to_bonus: 10 - (visitCount % 10)
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
