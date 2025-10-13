const fs = require('fs');
const path = require('path');

class SimpleDB {
  constructor() {
    this.dataPath = process.env.VERCEL ? '/tmp/data.json' : './data.json';
    this.data = this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const content = fs.readFileSync(this.dataPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
    
    return {
      users: [],
      visits: [],
      bonuses: []
    };
  }

  saveData() {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Users
  createUser(userData) {
    const user = {
      id: Date.now(), // Простой ID
      ...userData,
      created_at: new Date().toISOString()
    };
    
    // Проверим, есть ли уже пользователь с таким telegram_id
    const existingUser = this.data.users.find(u => u.telegram_id === userData.telegram_id);
    if (existingUser) {
      return existingUser;
    }
    
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  getUserById(id) {
    return this.data.users.find(user => user.id === id);
  }

  // Visits
  createVisit(visitData) {
    const visit = {
      id: Date.now(),
      ...visitData,
      visit_date: new Date().toISOString()
    };
    
    this.data.visits.push(visit);
    this.saveData();
    return visit;
  }

  getVisitsByUserId(userId) {
    return this.data.visits.filter(visit => visit.user_id === userId);
  }

  getVisitCount(userId) {
    return this.data.visits.filter(visit => visit.user_id === userId).length;
  }

  // Bonuses
  createBonus(bonusData) {
    const bonus = {
      id: Date.now(),
      ...bonusData,
      earned_date: new Date().toISOString(),
      is_used: false
    };
    
    this.data.bonuses.push(bonus);
    this.saveData();
    return bonus;
  }

  getBonusesByUserId(userId) {
    return this.data.bonuses.filter(bonus => bonus.user_id === userId);
  }

  getBonusCount(userId) {
    return this.data.bonuses.filter(bonus => bonus.user_id === userId && !bonus.is_used).length;
  }

  useBonus(bonusId) {
    const bonus = this.data.bonuses.find(b => b.id === bonusId);
    if (bonus && !bonus.is_used) {
      bonus.is_used = true;
      bonus.used_date = new Date().toISOString();
      this.saveData();
      return true;
    }
    return false;
  }
}

module.exports = SimpleDB;
