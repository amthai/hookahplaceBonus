const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Используем Supabase PostgreSQL
const PostgresDB = require('./lib/postgres-db');
let db;

try {
  db = new PostgresDB();
  console.log('Using Supabase PostgreSQL database');
} catch (error) {
  console.error('Failed to connect to Supabase:', error.message);
  process.exit(1);
}

console.log('Environment:', process.env.NODE_ENV);
console.log('Vercel:', process.env.VERCEL);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Настройка загрузки файлов
// На Vercel используем /tmp, локально - public/uploads/staff
const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel 
  ? path.join('/tmp', 'uploads', 'staff')
  : path.join(__dirname, 'public', 'uploads', 'staff');

// Создаем папку для загрузок с обработкой ошибок
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  console.error('Error creating uploads directory:', error);
  // На Vercel это может быть нормально, если папка уже существует
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'staff-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения (jpeg, jpg, png, gif, webp) разрешены'));
    }
  }
});

// Middleware для правильной раздачи шрифтов
app.use('/fonts', express.static('public/fonts', {
  setHeaders: (res, path) => {
    if (path.endsWith('.ttf')) {
      res.setHeader('Content-Type', 'font/ttf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Инициализация базы данных
console.log('Supabase PostgreSQL initialized');

// Admin authentication
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const activeSessions = new Set(); // Простое хранилище сессий в памяти

// Middleware для проверки админ-доступа
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Необходима авторизация' });
  }
  
  next();
};

// API Routes

// Получить информацию о пользователе
app.get('/api/user/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  console.log('=== USER DATA REQUEST ===');
  console.log('Getting user data for ID:', userId);
  
  try {
    const user = await db.getUserById(userId);
    
    if (!user) {
      console.log('User not found with ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('User found:', user);
    
    const visitCount = await db.getVisitCount(userId);
    const bonusCount = await db.getBonusCount(userId);
    
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
});

// Создать или обновить пользователя
app.post('/api/user', async (req, res) => {
  console.log('=== USER CREATION REQUEST ===');
  console.log('Creating user with data:', req.body);
  const { telegram_id, username, first_name, last_name } = req.body;
  
  if (!telegram_id) {
    console.log('Missing telegram_id');
    return res.status(400).json({ error: 'telegram_id is required' });
  }
  
  try {
    const user = await db.createUser({
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
});

// Отметить посещение
app.post('/api/visit', async (req, res) => {
  const { user_id, qr_code } = req.body;
  
  // Проверяем, что QR код валидный (простая проверка)
  if (!qr_code || qr_code !== 'HOOKAH_PLACE_QR') {
    return res.status(400).json({ error: 'Неверный QR код' });
  }
  
  try {
    // Проверяем, что пользователь не отметился сегодня
    const hasVisitedToday = await db.hasVisitedToday(user_id);
    
    if (hasVisitedToday) {
      return res.status(400).json({ error: 'Вы уже отметили посещение сегодня! Приходите завтра для новой отметки 😊' });
    }
    
    // Добавляем посещение
    const visit = await db.createVisit({
      user_id: user_id,
      qr_code: qr_code
    });
    
    const visitCount = await db.getVisitCount(user_id);
    let bonusEarned = false;
    
    // Если количество посещений кратно 10, даем бонус
    if (visitCount % 10 === 0 && visitCount > 0) {
      await db.createBonus({
        user_id: user_id,
        bonus_type: 'free_visit'
      });
      bonusEarned = true;
    }
    
    res.json({
      message: 'Посещение успешно отмечено',
      visit_count: visitCount,
      bonus_earned: bonusEarned,
      visits_to_next_bonus: 10 - (visitCount % 10)
    });
  } catch (error) {
    console.error('Error recording visit:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Получить историю посещений
app.get('/api/visits/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  try {
    const visits = await db.getVisitsByUserId(userId);
    res.json(visits);
  } catch (error) {
    console.error('Error getting visits:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Получить бонусы пользователя
app.get('/api/bonuses/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  try {
    const bonuses = await db.getBonusesByUserId(userId);
    res.json(bonuses);
  } catch (error) {
    console.error('Error getting bonuses:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Использовать бонус
app.post('/api/bonus/use/:bonusId', async (req, res) => {
  const bonusId = parseInt(req.params.bonusId);
  
  try {
    const success = await db.useBonus(bonusId);
    
    if (!success) {
      return res.status(400).json({ error: 'Bonus not found or already used' });
    }
    
    res.json({ message: 'Bonus used successfully' });
  } catch (error) {
    console.error('Error using bonus:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
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

// Admin API Routes
// Вход в админку
app.post('/api/admin/login', (req, res) => {
  const { login, password } = req.body;
  
  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    const token = uuidv4();
    activeSessions.add(token);
    
    // Токен действителен 24 часа (в продакшене лучше использовать JWT с истечением)
    setTimeout(() => {
      activeSessions.delete(token);
    }, 24 * 60 * 60 * 1000);
    
    res.json({ token, message: 'Успешный вход' });
  } else {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});

// Получить всех пользователей со статистикой
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsersWithStats();
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Получить историю посещений пользователя
app.get('/api/admin/users/:userId/visits', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  try {
    const visits = await db.getVisitsByUserId(userId);
    res.json(visits);
  } catch (error) {
    console.error('Error getting visits:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Staff API Routes
// Получить аватарку сотрудника (для Vercel /tmp)
app.get('/api/staff/avatar/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл не найден' });
  }
  
  const ext = path.extname(filename).toLowerCase();
  const contentType = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  }[ext] || 'image/jpeg';
  
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.sendFile(filePath);
});

// Получить сотрудников на смене (публичный эндпоинт)
app.get('/api/staff/on-shift', async (req, res) => {
  try {
    const staff = await db.getStaffOnShift();
    res.json(staff);
  } catch (error) {
    console.error('Error getting staff on shift:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Получить всех сотрудников (админ)
app.get('/api/admin/staff', requireAdmin, async (req, res) => {
  try {
    const staff = await db.getAllStaff();
    res.json(staff);
  } catch (error) {
    console.error('Error getting staff:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Создать сотрудника (админ)
app.post('/api/admin/staff', requireAdmin, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Размер файла не должен превышать 5MB' });
        }
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { name, is_on_shift } = req.body;
  
  if (!name) {
    // Если файл был загружен, но имя не указано, удаляем файл
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ error: 'Имя сотрудника обязательно' });
  }
  
  try {
    let avatar_url = null;
    
    // Если файл загружен, формируем URL
    if (req.file) {
      // На Vercel файлы в /tmp не доступны через статику, используем base64 или внешнее хранилище
      // Для простоты используем временное решение - сохраняем в /tmp и возвращаем путь
      // В продакшене лучше использовать Supabase Storage или другой CDN
      if (isVercel) {
        // На Vercel читаем файл и конвертируем в base64 или используем временный URL
        // Пока используем путь, но это не будет работать для статики
        // TODO: Интегрировать Supabase Storage для постоянного хранения
        avatar_url = `/api/staff/avatar/${req.file.filename}`;
      } else {
        avatar_url = `/uploads/staff/${req.file.filename}`;
      }
    }
    
    const staff = await db.createStaff({
      name,
      avatar_url: avatar_url,
      is_on_shift: is_on_shift === 'true' || is_on_shift === true
    });
    res.json(staff);
  } catch (error) {
    // Если произошла ошибка и файл был загружен, удаляем его
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Обновить сотрудника (админ)
app.put('/api/admin/staff/:staffId', requireAdmin, (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Размер файла не должен превышать 5MB' });
        }
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const staffId = parseInt(req.params.staffId);
  const { name, is_on_shift } = req.body;
  
  try {
    // Получаем текущего сотрудника для удаления старого файла
    const currentStaff = await db.getStaffById(staffId);
    
    let avatar_url = undefined;
    
    // Если файл загружен, формируем новый URL
    if (req.file) {
      if (isVercel) {
        avatar_url = `/api/staff/avatar/${req.file.filename}`;
      } else {
        avatar_url = `/uploads/staff/${req.file.filename}`;
      }
      
      // Удаляем старый файл, если он был
      if (currentStaff && currentStaff.avatar_url) {
        let oldFilePath;
        if (currentStaff.avatar_url.startsWith('/api/staff/avatar/')) {
          const oldFilename = currentStaff.avatar_url.split('/').pop();
          oldFilePath = path.join(uploadsDir, oldFilename);
        } else if (currentStaff.avatar_url.startsWith('/uploads/staff/')) {
          oldFilePath = path.join(__dirname, 'public', currentStaff.avatar_url);
        }
        
        if (oldFilePath && fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }
    
    const staff = await db.updateStaff(staffId, {
      name,
      avatar_url,
      is_on_shift: is_on_shift !== undefined ? (is_on_shift === 'true' || is_on_shift === true) : undefined
    });
    
    if (!staff) {
      // Если сотрудник не найден, но файл был загружен, удаляем его
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }
    
    res.json(staff);
  } catch (error) {
    // Если произошла ошибка и файл был загружен, удаляем его
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Обновить статус смены сотрудника (админ)
app.patch('/api/admin/staff/:staffId/shift', requireAdmin, async (req, res) => {
  const staffId = parseInt(req.params.staffId);
  const { is_on_shift } = req.body;
  
  if (typeof is_on_shift !== 'boolean') {
    return res.status(400).json({ error: 'is_on_shift должен быть boolean' });
  }
  
  try {
    const staff = await db.updateStaffShiftStatus(staffId, is_on_shift);
    
    if (!staff) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }
    
    res.json(staff);
  } catch (error) {
    console.error('Error updating staff shift status:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Удалить сотрудника (админ)
app.delete('/api/admin/staff/:staffId', requireAdmin, async (req, res) => {
  const staffId = parseInt(req.params.staffId);
  
  try {
    // Получаем сотрудника перед удалением, чтобы удалить файл
    const staffToDelete = await db.getStaffById(staffId);
    
    if (!staffToDelete) {
      return res.status(404).json({ error: 'Сотрудник не найден' });
    }
    
    const staff = await db.deleteStaff(staffId);
    
    // Удаляем файл аватарки, если он был
    if (staff.avatar_url) {
      let filePath;
      if (staff.avatar_url.startsWith('/api/staff/avatar/')) {
        const filename = staff.avatar_url.split('/').pop();
        filePath = path.join(uploadsDir, filename);
      } else if (staff.avatar_url.startsWith('/uploads/staff/')) {
        filePath = path.join(__dirname, 'public', staff.avatar_url);
      }
      
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.json({ message: 'Сотрудник удален', staff });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Админка
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});

// Debug endpoint для проверки состояния
app.get('/api/debug', async (req, res) => {
  console.log('=== DEBUG REQUEST ===');
  console.log('Environment:', {
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set'
  });
  
  try {
    const allData = await db.getAllData();
    
    console.log('Database data:', allData);
    res.json({
      environment: {
        VERCEL: process.env.VERCEL,
        NODE_ENV: process.env.NODE_ENV,
        databaseType: 'Supabase PostgreSQL',
        postgresConnected: true
      },
      ...allData
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Ошибка отладки', details: error.message });
  }
});

// Для локальной разработки
if (process.env.NODE_ENV !== 'production') {
  const PORT = config.PORT;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`QR Code data: HOOKAH_PLACE_QR`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Для Vercel
module.exports = app;
