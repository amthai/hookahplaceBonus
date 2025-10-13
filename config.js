module.exports = {
  PORT: process.env.PORT || 3000,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8484396546:AAGu4qusRZnvKPoF8leX5C8trbWh_xeELME',
  TELEGRAM_WEBAPP_URL: process.env.TELEGRAM_WEBAPP_URL || 'https://your-domain.com',
  // На Vercel используем временную базу данных в /tmp, локально - файловую
  DATABASE_PATH: process.env.VERCEL ? '/tmp/database.sqlite' : (process.env.DATABASE_PATH || './database.sqlite')
};
