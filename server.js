const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const SimpleDB = require('./simple-db');

const app = express();
console.log('Using SimpleDB instead of SQLite');
console.log('Environment:', process.env.NODE_ENV);
console.log('Vercel:', process.env.VERCEL);
const db = new SimpleDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Инициализация базы данных
console.log('SimpleDB initialized');

// API Routes

// Получить информацию о пользователе
app.get('/api/user/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  console.log('=== USER DATA REQUEST ===');
  console.log('Getting user data for ID:', userId);
  
  try {
    const user = db.getUserById(userId);
    
    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User found:', user);
    
    const visitCount = db.getVisitCount(userId);
    const bonusCount = db.getBonusCount(userId);
    
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
    res.status(500).json({ error: 'Database error' });
  }
});

// Создать или обновить пользователя
app.post('/api/user', (req, res) => {
  console.log('=== USER CREATION REQUEST ===');
  console.log('Creating user with data:', req.body);
  const { telegram_id, username, first_name, last_name } = req.body;
  
  if (!telegram_id) {
    console.log('Missing telegram_id');
    return res.status(400).json({ error: 'telegram_id is required' });
  }
  
  try {
    const user = db.createUser({
      telegram_id: parseInt(telegram_id),
      username: username || 'user',
      first_name: first_name || 'User',
      last_name: last_name || ''
    });
    
    console.log('User created/found:', user);
    
    res.json({ 
      message: 'User created/updated successfully',
      user_id: user.id 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Отметить посещение
app.post('/api/visit', (req, res) => {
  const { user_id, qr_code } = req.body;
  
  // Проверяем, что QR код валидный (простая проверка)
  if (!qr_code || qr_code !== 'HOOKAH_PLACE_QR') {
    return res.status(400).json({ error: 'Invalid QR code' });
  }
  
  try {
    // Проверяем, что пользователь не отметился сегодня
    const today = new Date().toISOString().split('T')[0];
    const visits = db.getVisitsByUserId(user_id);
    const todayVisit = visits.find(visit => 
      visit.visit_date.startsWith(today)
    );
    
    if (todayVisit) {
      return res.status(400).json({ error: 'Already visited today' });
    }
    
    // Добавляем посещение
    const visit = db.createVisit({
      user_id: user_id,
      qr_code: qr_code
    });
    
    const visitCount = db.getVisitCount(user_id);
    let bonusEarned = false;
    
    // Если количество посещений кратно 10, даем бонус
    if (visitCount % 10 === 0 && visitCount > 0) {
      db.createBonus({
        user_id: user_id,
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
});

// Получить историю посещений
app.get('/api/visits/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  
  try {
    const visits = db.getVisitsByUserId(userId);
    res.json(visits);
  } catch (error) {
    console.error('Error getting visits:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Получить бонусы пользователя
app.get('/api/bonuses/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  
  try {
    const bonuses = db.getBonusesByUserId(userId);
    res.json(bonuses);
  } catch (error) {
    console.error('Error getting bonuses:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Использовать бонус
app.post('/api/bonus/use/:bonusId', (req, res) => {
  const bonusId = parseInt(req.params.bonusId);
  
  try {
    const success = db.useBonus(bonusId);
    
    if (!success) {
      return res.status(400).json({ error: 'Bonus not found or already used' });
    }
    
    res.json({ message: 'Bonus used successfully' });
  } catch (error) {
    console.error('Error using bonus:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Генерировать QR код для заведения
app.get('/api/qr-code', (req, res) => {
  const qrData = 'HOOKAH_PLACE_QR';
  
  QRCode.toDataURL(qrData, { width: 200 }, (err, url) => {
    if (err) {
      return res.status(500).json({ error: 'QR code generation failed' });
    }
    
    res.json({ qr_code_url: url, qr_data: qrData });
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Debug endpoint для проверки состояния
app.get('/api/debug', (req, res) => {
  console.log('=== DEBUG REQUEST ===');
  console.log('Environment:', {
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV
  });
  
  try {
    const users = db.data.users;
    const visits = db.data.visits;
    const bonuses = db.data.bonuses;
    
    console.log('Users in database:', users);
    res.json({
      environment: {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
        databaseType: 'SimpleDB'
      },
      users: users,
      visits: visits,
      bonuses: bonuses,
      totalUsers: users.length,
      totalVisits: visits.length,
      totalBonuses: bonuses.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug error', details: error.message });
  }
});

const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`QR Code data: HOOKAH_PLACE_QR`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
