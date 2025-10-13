const { Pool } = require('pg');

class PostgresDB {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_URL || 'postgresql://postgres.bcgdybdpddjizrhvsafd:Hayastandjan89@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
      ssl: { rejectUnauthorized: false } // Supabase требует SSL
    });
    
    // Инициализируем таблицы асинхронно
    this.initTables().catch(error => {
      console.error('Failed to initialize tables:', error);
    });
  }

  async initTables() {
    try {
      const client = await this.pool.connect();
      try {
        // Создаем таблицы если их нет
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id BIGINT UNIQUE NOT NULL,
            username VARCHAR(255),
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS visits (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            qr_code VARCHAR(255),
            visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS bonuses (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            bonus_type VARCHAR(255),
            earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_used BOOLEAN DEFAULT FALSE,
            used_date TIMESTAMP
          )
        `);
        
        console.log('Tables initialized successfully');
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }

  // Users
  async createUser(userData) {
    const client = await this.pool.connect();
    try {
      // Проверяем, есть ли уже пользователь с таким telegram_id
      const existingUser = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1',
        [userData.telegram_id]
      );

      if (existingUser.rows.length > 0) {
        return existingUser.rows[0];
      }

      const result = await client.query(
        'INSERT INTO users (telegram_id, username, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING *',
        [userData.telegram_id, userData.username, userData.first_name, userData.last_name]
      );

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserById(id) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getUserByTelegramId(telegramId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // Visits
  async createVisit(visitData) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO visits (user_id, qr_code) VALUES ($1, $2) RETURNING *',
        [visitData.user_id, visitData.qr_code]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getVisitsByUserId(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM visits WHERE user_id = $1 ORDER BY visit_date DESC',
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getVisitCount(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) FROM visits WHERE user_id = $1',
        [userId]
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async hasVisitedToday(userId) {
    const client = await this.pool.connect();
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await client.query(
        'SELECT * FROM visits WHERE user_id = $1 AND DATE(visit_date) = $2',
        [userId, today]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  // Bonuses
  async createBonus(bonusData) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO bonuses (user_id, bonus_type) VALUES ($1, $2) RETURNING *',
        [bonusData.user_id, bonusData.bonus_type]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getBonusesByUserId(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM bonuses WHERE user_id = $1 ORDER BY earned_date DESC',
        [userId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getBonusCount(userId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) FROM bonuses WHERE user_id = $1 AND is_used = FALSE',
        [userId]
      );
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  async useBonus(bonusId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE bonuses SET is_used = TRUE, used_date = CURRENT_TIMESTAMP WHERE id = $1 AND is_used = FALSE RETURNING *',
        [bonusId]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  // Debug
  async getAllData() {
    const client = await this.pool.connect();
    try {
      const users = await client.query('SELECT * FROM users');
      const visits = await client.query('SELECT * FROM visits');
      const bonuses = await client.query('SELECT * FROM bonuses');

      return {
        users: users.rows,
        visits: visits.rows,
        bonuses: bonuses.rows,
        totalUsers: users.rows.length,
        totalVisits: visits.rows.length,
        totalBonuses: bonuses.rows.length
      };
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresDB;
