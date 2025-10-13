// Используем файловое хранилище данных
import { getUserById, getVisitCount, getBonusCount } from '../../../lib/data-store.js';

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
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    try {
      const user = getUserById(parseInt(userId));
      
      if (!user) {
        console.log('User not found with ID:', userId);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('User found:', user);
      
      const visitCount = getVisitCount(parseInt(userId));
      const bonusCount = getBonusCount(parseInt(userId));
      
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
    } catch (error) {
      console.error('Error getting user data:', error);
      res.status(500).json({ error: 'Ошибка базы данных' });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешен' });
  }
}
