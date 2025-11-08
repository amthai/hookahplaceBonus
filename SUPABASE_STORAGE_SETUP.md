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

### 4. Получение service_role key

1. В Supabase Dashboard → Settings → API
2. В разделе **Project API keys** найди **service_role key**
3. Нажми кнопку **Reveal** (показать) рядом с ключом
4. Скопируй ключ (он начинается с `eyJ...`)

**Важно:** 
- НЕ используй `anon` key - он не имеет прав на запись
- Используй именно `service_role` key - он имеет полные права

### 5. Добавление переменных окружения

#### На Vercel:

1. Открой [Vercel Dashboard](https://vercel.com/dashboard)
2. Выбери свой проект
3. Перейди в **Settings** (вкладка вверху)
4. В левом меню выбери **Environment Variables**
5. Нажми **Add New** или **Add**
6. Добавь первую переменную:
   - **Key**: `SUPABASE_URL`
   - **Value**: твой Project URL (например: `https://vvuodxabzeudqskteiiz.supabase.co`)
   - **Environment**: отметь все (Production, Preview, Development)
   - Нажми **Save**
7. Добавь вторую переменную:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: твой service_role key (скопированный из Supabase)
   - **Environment**: отметь все (Production, Preview, Development)
   - Нажми **Save**
8. Передеплой приложение:
   - Перейди в **Deployments**
   - Найди последний деплой
   - Нажми на три точки (⋮) справа
   - Выбери **Redeploy**

#### На Render:

1. Открой [Render Dashboard](https://dashboard.render.com)
2. Выбери свой **Web Service** (твой проект)
3. В левом меню выбери **Environment**
4. Прокрути до раздела **Environment Variables**
5. Нажми **Add Environment Variable**
6. Добавь первую переменную:
   - **Key**: `SUPABASE_URL`
   - **Value**: твой Project URL
   - Нажми **Save Changes**
7. Добавь вторую переменную:
   - **Key**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: твой service_role key
   - Нажми **Save Changes**
8. Render автоматически перезапустит сервис после сохранения

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

