// Debug endpoint для проверки состояния
// Используем глобальные переменные
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
    console.log('=== DEBUG REQUEST ===');
    console.log('Environment:', {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV
    });
    
    const usersArray = Array.from(global.users.values());
    const visitsArray = Array.from(global.visits.values());
    const bonusesArray = Array.from(global.bonuses.values());
    
    console.log('Users in global memory:', usersArray);
    console.log('Total users:', global.users.size);
    
    res.json({
      environment: {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
        databaseType: 'Global Memory (shared between functions)'
      },
      users: usersArray,
      visits: visitsArray,
      bonuses: bonusesArray,
      totalUsers: usersArray.length,
      totalVisits: visitsArray.length,
      totalBonuses: bonusesArray.length,
      note: 'Using global variables to share data between serverless functions'
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
