# Трекинг заказов — Telegram Mini App

Телеграм мини-приложение для отслеживания заказов с фотографиями на этапах.

## Стек

- **Frontend**: React 18 + Vite + React Router 6
- **Backend**: Node.js + Express
- **База данных**: MongoDB (Mongoose)
- **Авторизация**: Telegram WebApp initData (с валидацией HMAC-SHA256)

## Возможности

- Создание трекера заказа с названием, ценой и необязательной ценой доставки
- Этапы с названием, описанием, датой и индикатором завершения
- Фотографии к каждому этапу (только создатель может добавлять)
- Раскрытие этапа — стрелка вверх/вниз, внутри описание и фото
- Подключение к чужому трекеру по коду
- Статистика в профиле
- Минималистичный адаптивный дизайн

## Быстрый старт

### 0. Требования

- Node.js >= 18
- MongoDB (локальный или облачный, напр. MongoDB Atlas)
- Telegram-бот (получить токен у [@BotFather](https://t.me/BotFather))

### 1. Настройка бота

В [@BotFather](https://t.me/BotFather):
1. Создайте бота, скопируйте токен
2. Выполните `/newapp`
3. Укажите URL мини-приложения (например, `https://yourdomain.com/`
   или локально `http://localhost:5173` для разработки)
4. Скопируйте **токен бота**

### 2. Настройка сервера

```bash
cd server
cp .env.example .env
```

Откройте `.env` и заполните:
```
MONGODB_URI=mongodb://127.0.0.1:27017/tracking_bot
BOT_TOKEN=ваш_токен_бота_от_BotFather
DEV_AUTH=false
PORT=4000
```

### 3. Запуск

```bash
# Из корня репозитория
npm install
npm run install:all   # установит зависимости server + client
npm run dev           # запустит server (4000) и client (5173) параллельно
```

Приложение откроется на `http://localhost:5173`.

> **Примечание по авторизации.** В `.env` параметр `DEV_AUTH=true`
> позволяет запускаться без Telegram, используя заголовок `x-dev-user-id`.
> Для работы через Telegram Mini App установите `DEV_AUTH=false`
> и укажите реальный `BOT_TOKEN`.

### 4. Подключение Telegram Mini App к боту

В параметрах запуска используйте URL вашего приложения.
При работе через Telegram Web App платформа автоматически передаёт
`initData` в заголовке `x-telegram-init-data`.

## Структура проекта

```
tracking-bot/
├── server/
│   ├── src/
│   │   ├── index.js          # точка входа, Express-сервер
│   │   ├── middleware/
│   │   │   └── auth.js       # валидация Telegram initData
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Tracker.js
│   │   ├── routes/
│   │   │   ├── profile.js    # GET /api/profile
│   │   │   └── trackers.js  # CRUD трекеров, фото, подключение
│   │   └── lib/
│   │       └── upload.js    # multer, хранение в uploads/
│   └── uploads/             # фотографии этапов
└── client/
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── TrackersPage.jsx
        │   ├── ProfilePage.jsx
        │   ├── CreateTrackerPage.jsx
        │   └── TrackerPage.jsx
        ├── components/
        │   ├── BottomNav.jsx
        │   ├── TrackerCard.jsx
        │   ├── StageItem.jsx
        │   └── Icons.jsx
        └── lib/
            ├── api.js        # fetch-обёртка
            ├── telegram.js   # WebApp SDK-обёртка
            └── format.js     # форматирование денег и дат
```

## API (кратко)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/profile` | Профиль + статистика |
| GET | `/api/trackers` | Мои трекеры и подписки |
| GET | `/api/trackers/:id` | Один трекер |
| POST | `/api/trackers` | Создать трекер |
| PUT | `/api/trackers/:id` | Редактировать трекер |
| DELETE | `/api/trackers/:id` | Удалить трекер |
| POST | `/api/trackers/connect` | Подключиться по коду |
| POST | `/api/trackers/:id/disconnect` | Отключиться |
| PATCH | `/api/trackers/:id/stages/:sid/complete` | Переключить этап |
| POST | `/api/trackers/:id/stages/:sid/photos` | Загрузить фото |
| DELETE | `/api/trackers/:id/stages/:sid/photos/:pid` | Удалить фото |

## Сборка для продакшена

```bash
npm run build            # соберёт клиент в client/dist/
npm run start            # запустит сервер в продакшн-режиме
```

Для продакшена укажите `PUBLIC_URL` (базовый URL для формирования ссылок на фото)
и настройте Nginx/Traefik для проксирования `/api` → `localhost:4000` и статики
из `client/dist/`.
