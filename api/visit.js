// Используем глобальные переменные для сохранения данных между запросами
let globalUsers = global.users || new Map();
let globalVisits = global.visits || new Map();
let globalBonuses = global.bonuses || new Map();

// Инициализируем глобальные переменные
if (!global.users) {
  global.users = globalUsers;
  global.visits = globalVisits;
  global.bonuses = globalBonuses;
}

let nextVisitId = global.nextVisitId || 1;
let nextBonusId = global.nextBonusId || 1;

if (!global.nextVisitId) {
  global.nextVisitId = nextVisitId;
  global.nextBonusId = nextBonusId;
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
    const { user_id, qr_code } = req.body;
    
    console.log('Marking visit:', { user_id, qr_code });
    
    // Проверяем, что QR код валидный
    if (!qr_code || qr_code !== 'HOOKAH_PLACE_QR') {
      return res.status(400).json({ error: 'Invalid QR code' });
    }
    
    // Проверяем, что пользователь не отметился сегодня
    const today = new Date().toISOString().split('T')[0];
    let alreadyVisited = false;
    
    for (let [id, visit] of global.visits) {
      if (visit.user_id === parseInt(user_id) && visit.visit_date.startsWith(today)) {
        alreadyVisited = true;
        break;
      }
    }
    
    if (alreadyVisited) {
      return res.status(400).json({ error: 'Вы уже отметили посещение сегодня! Приходите завтра для новой отметки 😊' });
    }
    
    // Добавляем посещение
    const visitId = global.nextVisitId++;
    const visit = {
      id: visitId,
      user_id: parseInt(user_id),
      visit_date: new Date().toISOString(),
      qr_code: qr_code
    };
    global.visits.set(visitId, visit);
    
    // Подсчитываем общее количество посещений
    let visitCount = 0;
    for (let [id, v] of global.visits) {
      if (v.user_id === parseInt(user_id)) {
        visitCount++;
      }
    }
    
    // Проверяем, нужно ли дать бонус
    let bonusEarned = false;
    if (visitCount % 10 === 0 && visitCount > 0) {
      const bonusId = global.nextBonusId++;
      const bonus = {
        id: bonusId,
        user_id: parseInt(user_id),
        bonus_type: 'free_visit',
        earned_date: new Date().toISOString(),
        is_used: false
      };
      global.bonuses.set(bonusId, bonus);
      bonusEarned = true;
    }
    
    res.json({
      message: 'Visit recorded successfully',
      visit_count: visitCount,
      bonus_earned: bonusEarned,
      visits_to_next_bonus: 10 - (visitCount % 10)
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
