import { users, visits, bonuses } from '../data.js';

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
    
    const user = users.get(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Подсчитываем посещения
    let visitCount = 0;
    for (let [id, visit] of visits) {
      if (visit.user_id === parseInt(userId)) {
        visitCount++;
      }
    }
    
    // Подсчитываем бонусы
    let bonusCount = 0;
    for (let [id, bonus] of bonuses) {
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
