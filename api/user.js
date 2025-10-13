// Используем файловое хранилище данных
import { createUser } from '../../lib/data-store.js';

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
    
    try {
      const user = createUser({
        telegram_id: parseInt(telegram_id),
        username: username || 'user',
        first_name: first_name || 'User',
        last_name: last_name || ''
      });
      
      console.log('User created/found:', user);
      res.json({ 
        message: 'Пользователь создан/обновлен успешно',
        user_id: user.id 
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Ошибка базы данных: ' + error.message });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешен' });
  }
}