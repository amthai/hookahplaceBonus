// Debug endpoint для проверки состояния
import { getAllData } from '../../lib/data-store.js';

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
    
    try {
      const data = getAllData();
      
      console.log('Data from file storage:', data);
      
      res.json({
        environment: {
          VERCEL: process.env.VERCEL,
          NODE_ENV: process.env.NODE_ENV,
          databaseType: 'File Storage (/tmp/hookahplace-data.json)'
        },
        users: data.users,
        visits: data.visits,
        bonuses: data.bonuses,
        totalUsers: data.totalUsers,
        totalVisits: data.totalVisits,
        totalBonuses: data.totalBonuses,
        note: 'Using file storage to persist data between serverless functions'
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ error: 'Ошибка отладки', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Метод не разрешен' });
  }
}
