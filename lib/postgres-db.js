const { Pool } = require('pg');

class PostgresDB {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.POSTGRES_URL || 'postgresql://postgres.vvuodxabzeudqskteiiz:Hayastandjan89@aws-1-us-east-2.pooler.supabase.com:6543/postgres',
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

        await client.query(`
          CREATE TABLE IF NOT EXISTS staff (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            avatar_url TEXT,
            is_on_shift BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Обновляем существующую таблицу, если поле было VARCHAR(500)
        await client.query(`
          ALTER TABLE staff 
          ALTER COLUMN avatar_url TYPE TEXT
        `).catch(() => {
          // Игнорируем ошибку, если колонка уже TEXT или таблицы нет
        });
        
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

  // Staff methods
  async createStaff(staffData) {
    const client = await this.pool.connect();
    try {
      const avatarUrl = staffData.avatar_url || null;
      console.log(`Creating staff: ${staffData.name}, avatar_url length: ${avatarUrl ? avatarUrl.length : 0}`);
      const result = await client.query(
        'INSERT INTO staff (name, avatar_url, is_on_shift) VALUES ($1, $2, $3) RETURNING *',
        [staffData.name, avatarUrl, staffData.is_on_shift || false]
      );
      console.log(`Staff created: ${result.rows[0].name}, saved avatar_url length: ${result.rows[0].avatar_url ? result.rows[0].avatar_url.length : 0}`);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getAllStaff() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM staff ORDER BY name ASC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getStaffById(id) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM staff WHERE id = $1', [id]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getStaffOnShift() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM staff WHERE is_on_shift = TRUE ORDER BY name ASC'
      );
      // Очищаем старые URL форматы в БД (обновляем записи с путями к файлам)
      for (const row of result.rows) {
        if (row.avatar_url && !row.avatar_url.startsWith('data:') && (row.avatar_url.startsWith('/uploads/') || row.avatar_url.startsWith('/api/staff/avatar/'))) {
          // Обновляем запись, очищая старый URL
          await client.query(
            'UPDATE staff SET avatar_url = NULL WHERE id = $1',
            [row.id]
          );
          row.avatar_url = null;
        }
      }
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateStaffShiftStatus(staffId, isOnShift) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE staff SET is_on_shift = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [isOnShift, staffId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateStaff(staffId, staffData) {
    const client = await this.pool.connect();
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (staffData.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(staffData.name);
      }
      if (staffData.avatar_url !== undefined) {
        updates.push(`avatar_url = $${paramCount++}`);
        values.push(staffData.avatar_url);
      }
      if (staffData.is_on_shift !== undefined) {
        updates.push(`is_on_shift = $${paramCount++}`);
        values.push(staffData.is_on_shift);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(staffId);
      
      const result = await client.query(
        `UPDATE staff SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteStaff(staffId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM staff WHERE id = $1 RETURNING *',
        [staffId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Admin methods
  async getAllUsersWithStats() {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          u.id,
          u.telegram_id,
          u.username,
          u.first_name,
          u.last_name,
          u.created_at,
          COUNT(DISTINCT v.id) as visit_count,
          COUNT(DISTINCT CASE WHEN b.is_used = FALSE THEN b.id END) as bonus_count
        FROM users u
        LEFT JOIN visits v ON u.id = v.user_id
        LEFT JOIN bonuses b ON u.id = b.user_id
        GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.last_name, u.created_at
        ORDER BY u.id DESC
      `);
      
      return result.rows.map(row => ({
        id: row.id,
        telegram_id: row.telegram_id,
        username: row.username || '',
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.username || 'Без имени',
        created_at: row.created_at,
        visit_count: parseInt(row.visit_count) || 0,
        bonus_count: parseInt(row.bonus_count) || 0,
        visits_to_bonus: 10 - (parseInt(row.visit_count) % 10)
      }));
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
