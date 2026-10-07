# 📘 **Конспект: Docker & Docker Compose для системного инженера**

## **1. Зачем это системному инженеру**

### **Проблема, которую решает Docker**
* **"На моей машине работает"** — классическая боль. Docker гарантирует одинаковое поведение везде.
* **Конфликты зависимостей** — на одном сервере нужны разные версии Node.js/Python/PostgreSQL. Контейнеры изолируют всё.
* **Деплой** — вместо настройки сервера руками, мы разворачиваем готовый образ.


### Место в стеке системного инженера

```
Сисадмин (Linux, сети, Cisco)
    ↓
Docker (контейнеризация) ← МЫ ЗДЕСЬ
    ↓
Docker Compose (оркестрация на хосте)
    ↓
Ansible (автоматизация серверов и сетей)
    ↓
Kubernetes (оркестрация кластеров)
```

---

## **2. Docker: базовые концепции**

### Слои (Layers)

Каждая команда в Dockerfile создает **слой**. Слои кэшируются.

```bash
FROM node:20-alpine      ← Слой 1 (базовый образ)
WORKDIR /app             ← Слой 2
COPY package.json ./     ← Слой 3
RUN npm install          ← Слой 4 (тяжелый, кэшируется)
COPY . .                 ← Слой 5 (меняется часто)
CMD ["node", "app.js"]   ← Слой 6
```

**Правило:** Часто меняющиеся слои — в конец. Стабильные — в начало.

---

## **3. Dockerfile: от простого к production**

### **Минимальный Dockerfile**

[Посмотреть файл](Dockerfile.dev)

### **Production Dockerfile (оптимизированный)**

[Посмотреть файл](Dockerfile.production)

### **.dockerignore (обязательно!)**

[Посмотреть файл](.dockerignore)


**Зачем:** Без этого Docker копирует всю папку в контекст сборки, включая ```node_modules``` (тысячи файлов). Это замедляет сборку и раздувает образ.

### **Ключевые практики**
1. Alpine вместо Ubuntu — 50MB vs 900MB базового образа
2. ```--only=production``` — не ставим dev-зависимости (nodemon, typescript)
3. ```npm cache clean``` — экономит 50-100MB
4. Порядок COPY — сначала package.json, потом код (для кэша)
5. EXPOSE — документация, не открывает порт сам по себе

---

### **Результат**

* **Было:** 1.18GB (со всеми dev-зависимостями, TypeScript, React)
* **Стало:** 174MB (только Node + Express + собранный JS)
* **Экономия:** в 6.8 раз

---

## **4. Docker Compose: оркестрация**

### **Проблема:**

Реальное приложение = API + БД + Кэш + Nginx. Запускать каждый контейнер вручную с кучей флагов — ад.

### **Решение:** ```docker-compose.yml```

[Посмотреть файл](docker-compose.yml)

---

## **5. Сети, тома, healthchecks**

### **Сети (Networks)**

* Docker Compose создает виртуальную сеть ```app-network```
* Контейнеры видят друг друга **по имени сервиса** (DNS)
* Node.js стучится в БД по хосту ```db```, а не ```localhost```
* Это работает как внутренний DNS кластера

### Тома (Volumes)

```bash
volumes:
  - postgres_data:/var/lib/postgresql/data
```

* Без volume: данные исчезают при перезапуске контейнера
* С volume: данные сохраняются между запусками
* Volume живет отдельно от контейнера, его нужно удалять явно (```docker-compose down -v```)

### Healthchecks

```bash
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
  timeout: 5s
  retries: 5
```

* Docker проверяет готовность сервиса каждые 5 секунд
* depends_on: condition: service_healthy — API не запустится, пока БД не готова
* Критично для предотвращения race condition при старте

---

## **6. Шпаргалка команд**

### **Docker (образы и контейнеры)**

```bash
# Сборка образа
docker build -t task-api:1.0 .

# Запуск контейнера
docker run -d -p 3000:3000 --name my-api task-api:1.0

# Список образов
docker images

# Список запущенных контейнеров
docker ps

# Все контейнеры (включая остановленные)
docker ps -a

# Логи контейнера
docker logs -f my-api

# Остановить/удалить
docker stop my-api && docker rm my-api

# Войти в контейнер
docker exec -it my-api sh

# Отправить в реестр
docker tag task-api:1.0 heltoe/task-api:1.0
docker push heltoe/task-api:1.0
```

### **Docker Compose**

```bash
# Запуск (сборка + старт)
docker-compose up -d

# Логи
docker-compose logs -f api

# Остановка (сохраняя volumes)
docker-compose down

# Остановка с удалением volumes
docker-compose down -v

# Пересборка образа
docker-compose build --no-cache

# Статус сервисов
docker-compose ps
```

---

## **7. Типичные ошибки и решения**

### **Ошибка: ```vite: not found``` при сборке**

**Причина:** Yarn не добавляет node_modules/.bin в PATH в Docker.
**Решение:** Использовать npx vite build вместо yarn build.

### **Ошибка: ```lookup registry-1.docker.io: no such host```**

**Причина:** Docker Desktop не может достучаться до Docker Hub (сеть/DNS/VPN).
**Решение:**
1. Перезапустить Docker Desktop
2. Использовать локальный образ (например, postgres:14-alpine вместо 16-alpine)
3. Настроить DNS в Docker Desktop (8.8.8.8)
4. Настроить registry-mirrors в Docker Engine settings

### **Ошибка: Образ весит 1GB+**

**Причины:**
1. Dev-зависимости попали в образ
2. Нет .dockerignore
3. Не используется multi-stage build
**Решение:** Применить практики из раздела 3 и 4.

---

## **Итог: что мы освоили**

1. **Dockerfile** — упаковка приложения в образ
2. **Слои и кэш** — оптимизация скорости сборки
3. **ulti-stage build** — минимизация размера образа
4. **Docker Compose** — оркестрация многокомпонентных приложений
5. **Сети** — общение контейнеров по DNS
6. **Volumes** — постоянное хранение данных
7. **Healthchecks** — умный запуск с проверкой зависимостей