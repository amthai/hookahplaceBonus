// Единый источник данных для всех serverless functions
import fs from 'fs';
import path from 'path';

const DATA_FILE = '/tmp/hookahplace-data.json';

// Инициализация данных
function initData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      users: {},
      visits: {},
      bonuses: {},
      nextUserId: 1,
      nextVisitId: 1,
      nextBonusId: 1
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data;
  } catch (error) {
    console.error('Error reading data file:', error);
    return initData();
  }
}

// Сохранение данных
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Получение всех пользователей
export function getUsers() {
  const data = initData();
  return Object.values(data.users);
}

// Получение пользователя по ID
export function getUserById(id) {
  const data = initData();
  return data.users[id] || null;
}

// Получение пользователя по telegram_id
export function getUserByTelegramId(telegramId) {
  const data = initData();
  for (const user of Object.values(data.users)) {
    if (user.telegram_id === telegramId) {
      return user;
    }
  }
  return null;
}

// Создание пользователя
export function createUser(userData) {
  const data = initData();
  
  // Проверяем, существует ли пользователь
  const existingUser = getUserByTelegramId(userData.telegram_id);
  if (existingUser) {
    return existingUser;
  }
  
  const userId = data.nextUserId++;
  const user = {
    id: userId,
    ...userData,
    created_at: new Date().toISOString()
  };
  
  data.users[userId] = user;
  saveData(data);
  
  return user;
}

// Получение посещений пользователя
export function getVisitsByUserId(userId) {
  const data = initData();
  return Object.values(data.visits)
    .filter(visit => visit.user_id === userId)
    .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
}

// Подсчет посещений пользователя
export function getVisitCount(userId) {
  const data = initData();
  return Object.values(data.visits)
    .filter(visit => visit.user_id === userId).length;
}

// Создание посещения
export function createVisit(visitData) {
  const data = initData();
  
  const visitId = data.nextVisitId++;
  const visit = {
    id: visitId,
    ...visitData,
    visit_date: new Date().toISOString()
  };
  
  data.visits[visitId] = visit;
  saveData(data);
  
  return visit;
}

// Проверка, был ли пользователь сегодня
export function hasVisitedToday(userId) {
  const data = initData();
  const today = new Date().toISOString().split('T')[0];
  
  return Object.values(data.visits).some(visit => 
    visit.user_id === userId && visit.visit_date.startsWith(today)
  );
}

// Получение бонусов пользователя
export function getBonusesByUserId(userId) {
  const data = initData();
  return Object.values(data.bonuses)
    .filter(bonus => bonus.user_id === userId)
    .sort((a, b) => new Date(b.earned_date) - new Date(a.earned_date));
}

// Подсчет неиспользованных бонусов
export function getBonusCount(userId) {
  const data = initData();
  return Object.values(data.bonuses)
    .filter(bonus => bonus.user_id === userId && !bonus.is_used).length;
}

// Создание бонуса
export function createBonus(bonusData) {
  const data = initData();
  
  const bonusId = data.nextBonusId++;
  const bonus = {
    id: bonusId,
    ...bonusData,
    earned_date: new Date().toISOString(),
    is_used: false
  };
  
  data.bonuses[bonusId] = bonus;
  saveData(data);
  
  return bonus;
}

// Получение всех данных для debug
export function getAllData() {
  const data = initData();
  return {
    users: Object.values(data.users),
    visits: Object.values(data.visits),
    bonuses: Object.values(data.bonuses),
    totalUsers: Object.keys(data.users).length,
    totalVisits: Object.keys(data.visits).length,
    totalBonuses: Object.keys(data.bonuses).length
  };
}
