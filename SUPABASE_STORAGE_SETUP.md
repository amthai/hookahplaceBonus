# Настройка Supabase Storage для загрузки аватарок сотрудников

## Проблема
На serverless платформах (Vercel, Render) файловая система временная - загруженные файлы не сохраняются между деплоями.

## Решение
Используем Supabase Storage для хранения аватарок сотрудников.

## Шаги настройки

### 1. Создание bucket в Supabase Storage

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери свой проект
3. Перейди в **Storage** (в левом меню)
4. Нажми **New bucket**
5. Название: `staff-avatars`
6. **Важно**: Поставь галочку **Public bucket** (чтобы изображения были доступны публично)
7. Нажми **Create bucket**

### 2. Настройка политик доступа (опционально)

Если нужно ограничить доступ:
1. В Storage → Policies
2. Создай политику для `staff-avatars`:
   - Policy name: `Public read access`
   - Allowed operation: `SELECT`
   - Target roles: `anon`, `authenticated`
   - Policy definition: `true` (разрешить всем)

### 3. Получение ключей Supabase

1. В Supabase Dashboard → Settings → API
2. Скопируй:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **service_role key** (секретный ключ, НЕ anon key!)

### 4. Добавление переменных окружения

#### На Vercel:
1. Открой проект в Vercel Dashboard
2. Settings → Environment Variables
3. Добавь переменные:
   - `SUPABASE_URL` = твой Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = твой service_role key

#### На Render:
1. Открой проект в Render Dashboard
2. Environment → Environment Variables
3. Добавь те же переменные

### 5. Деплой

После настройки переменных окружения:
```bash
git add .
git commit -m "Add Supabase Storage support"
git push
```

## Проверка работы

1. После деплоя зайди в админку
2. Создай сотрудника и загрузи аватарку
3. Проверь, что аватарка отображается на главном экране
4. В Supabase Dashboard → Storage → `staff-avatars` должны появиться загруженные файлы

## Локальная разработка

Если переменные окружения не настроены, система автоматически использует локальное хранилище (`public/uploads/staff`).

## Важно

- **НЕ используй anon key** - он не имеет прав на запись в Storage
- Используй **service_role key** - он имеет полные права
- Bucket должен быть **публичным** для доступа к изображениям

