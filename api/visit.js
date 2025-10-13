// Используем файловое хранилище данных
import { hasVisitedToday, createVisit, getVisitCount, createBonus } from '../../lib/data-store.js';

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
    if (hasVisitedToday(parseInt(user_id))) {
      return res.status(400).json({ error: 'Вы уже отметили посещение сегодня! Приходите завтра для новой отметки 😊' });
    }
    
    try {
      // Добавляем посещение
      const visit = createVisit({
        user_id: parseInt(user_id),
        qr_code: qr_code
      });
      
      // Подсчитываем общее количество посещений
      const visitCount = getVisitCount(parseInt(user_id));
      
      // Проверяем, нужно ли дать бонус
      let bonusEarned = false;
      if (visitCount % 10 === 0 && visitCount > 0) {
        createBonus({
          user_id: parseInt(user_id),
          bonus_type: 'free_visit'
        });
        bonusEarned = true;
      }
    
      res.json({
        message: 'Visit recorded successfully',
        visit_count: visitCount,
        bonus_earned: bonusEarned,
        visits_to_next_bonus: 10 - (visitCount % 10)
      });
    } catch (error) {
      console.error('Error recording visit:', error);
      res.status(500).json({ error: 'Database error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
