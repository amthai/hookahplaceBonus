// Простое хранение в памяти с глобальным состоянием
// В реальном приложении нужно использовать внешнюю базу данных

// Глобальные переменные (будут сбрасываться при каждом cold start)
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

  if (req.method === 'POST') {
    const { telegram_id, username, first_name, last_name } = req.body;
    
    console.log('Creating user with data:', req.body);
    console.log('Current users count:', global.users.size);
    
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }
    
    // Проверяем, существует ли пользователь
    let user = null;
    for (let [id, userData] of global.users) {
      if (userData.telegram_id === telegram_id) {
        user = { id, ...userData };
        break;
      }
    }
    
    if (!user) {
      // Создаем нового пользователя
      const userId = Date.now(); // Простой ID
      user = {
        id: userId,
        telegram_id,
        username: username || 'demo_user',
        first_name: first_name || 'Demo',
        last_name: last_name || 'User',
        created_at: new Date().toISOString()
      };
      global.users.set(userId, user);
      console.log('User created with ID:', userId);
      console.log('Total users now:', global.users.size);
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