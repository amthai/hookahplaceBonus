// Debug endpoint для проверки состояния
let users = new Map();
let visits = new Map();
let bonuses = new Map();

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
    
    const usersArray = Array.from(users.values());
    const visitsArray = Array.from(visits.values());
    const bonusesArray = Array.from(bonuses.values());
    
    console.log('Users in memory:', usersArray);
    
    res.json({
      environment: {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
        databaseType: 'In-Memory (per function)'
      },
      users: usersArray,
      visits: visitsArray,
      bonuses: bonusesArray,
      totalUsers: usersArray.length,
      totalVisits: visitsArray.length,
      totalBonuses: bonusesArray.length,
      note: 'Each serverless function has its own memory space'
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
