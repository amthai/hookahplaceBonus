// Простое хранение в памяти для каждого endpoint
let users = new Map();
let nextUserId = 1;

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
    
    // Проверяем, существует ли пользователь
    let user = null;
    for (let [id, userData] of users) {
      if (userData.telegram_id === telegram_id) {
        user = { id, ...userData };
        break;
      }
    }
    
    if (!user) {
      // Создаем нового пользователя
      const userId = nextUserId++;
      user = {
        id: userId,
        telegram_id,
        username: username || 'demo_user',
        first_name: first_name || 'Demo',
        last_name: last_name || 'User',
        created_at: new Date().toISOString()
      };
      users.set(userId, user);
    }
    
    console.log('User created/updated:', user);
    res.json({ 
      message: 'User created/updated successfully',
      user_id: user.id 
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
