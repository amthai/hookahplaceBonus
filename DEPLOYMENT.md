# Инструкция по развертыванию HookahPlace Bonus

## Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Генерация QR кода для заведения
```bash
npm run generate-qr
```

### 3. Запуск в режиме разработки
```bash
npm run dev
```

### 4. Запуск в продакшн
```bash
npm start
```

## Настройка Telegram Bot

### 1. Создание бота
1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/newbot`
3. Введите название бота: `HookahPlace Bonus`
4. Введите username бота: `hookahplace_bonus_bot`
5. Скопируйте полученный токен

### 2. Настройка Web App
1. Отправьте команду `/newapp` боту @BotFather
2. Выберите вашего бота
3. Введите название приложения: `HookahPlace Bonus`
4. Введите описание: `Программа лояльности для HookahPlace`
5. Введите URL: `https://your-domain.com`
6. Загрузите иконку приложения (512x512px)

### 3. Настройка переменных окружения
Создайте файл `.env`:
```env
PORT=3000
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBAPP_URL=https://your-domain.com
DATABASE_PATH=./database.sqlite
```

## Развертывание на Heroku

### 1. Подготовка
```bash
# Установите Heroku CLI
# Создайте аккаунт на heroku.com

# Логин в Heroku
heroku login

# Создайте приложение
heroku create hookahplace-bonus
```

### 2. Настройка переменных окружения
```bash
heroku config:set TELEGRAM_BOT_TOKEN=your_bot_token_here
heroku config:set TELEGRAM_WEBAPP_URL=https://hookahplace-bonus.herokuapp.com
```

### 3. Развертывание
```bash
git add .
git commit -m "Initial commit"
git push heroku main
```

### 4. Обновление Web App URL в Telegram
1. Откройте @BotFather
2. Отправьте `/myapps`
3. Выберите ваше приложение
4. Выберите "Edit App"
5. Обновите URL на: `https://hookahplace-bonus.herokuapp.com`

## Развертывание на VPS

### 1. Подготовка сервера
```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите PM2
sudo npm install -g pm2

# Установите nginx
sudo apt install nginx -y
```

### 2. Настройка приложения
```bash
# Клонируйте репозиторий
git clone https://github.com/your-username/hookahplace-bonus.git
cd hookahplace-bonus

# Установите зависимости
npm install

# Создайте .env файл
nano .env
```

### 3. Настройка nginx
```bash
sudo nano /etc/nginx/sites-available/hookahplace-bonus
```

Содержимое файла:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Включите сайт
sudo ln -s /etc/nginx/sites-available/hookahplace-bonus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Запуск с PM2
```bash
# Создайте ecosystem файл
nano ecosystem.config.js
```

Содержимое:
```javascript
module.exports = {
  apps: [{
    name: 'hookahplace-bonus',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

```bash
# Запустите приложение
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Настройка SSL (HTTPS)

### С Let's Encrypt
```bash
# Установите certbot
sudo apt install certbot python3-certbot-nginx -y

# Получите сертификат
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление
sudo crontab -e
# Добавьте строку:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## Мониторинг и логи

### PM2 команды
```bash
# Статус приложения
pm2 status

# Логи
pm2 logs hookahplace-bonus

# Перезапуск
pm2 restart hookahplace-bonus

# Мониторинг
pm2 monit
```

### Nginx логи
```bash
# Логи доступа
sudo tail -f /var/log/nginx/access.log

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

## Резервное копирование

### База данных
```bash
# Создайте скрипт бэкапа
nano backup.sh
```

Содержимое:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp database.sqlite "backups/database_$DATE.sqlite"
find backups/ -name "database_*.sqlite" -mtime +7 -delete
```

```bash
# Сделайте скрипт исполняемым
chmod +x backup.sh

# Добавьте в crontab
crontab -e
# Добавьте строку для ежедневного бэкапа в 2:00:
# 0 2 * * * /path/to/backup.sh
```

## Обновление приложения

### Heroku
```bash
git add .
git commit -m "Update app"
git push heroku main
```

### VPS
```bash
cd /path/to/hookahplace-bonus
git pull origin main
npm install
pm2 restart hookahplace-bonus
```

## Проверка работоспособности

1. Откройте браузер и перейдите на `https://your-domain.com`
2. Проверьте API: `https://your-domain.com/api/qr-code`
3. Протестируйте в Telegram Mini App
4. Проверьте логи на ошибки

## Устранение неполадок

### Приложение не запускается
```bash
# Проверьте логи
pm2 logs hookahplace-bonus

# Проверьте порт
netstat -tlnp | grep :3000

# Проверьте переменные окружения
pm2 show hookahplace-bonus
```

### Nginx ошибки
```bash
# Проверьте конфигурацию
sudo nginx -t

# Перезапустите nginx
sudo systemctl restart nginx

# Проверьте логи
sudo tail -f /var/log/nginx/error.log
```

### Telegram Bot не работает
1. Проверьте токен бота
2. Убедитесь, что Web App URL правильный
3. Проверьте, что приложение доступно по HTTPS
4. Проверьте логи сервера на ошибки
