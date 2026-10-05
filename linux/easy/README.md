# 🐧 **Linux Administration:**

**Проект:** my_store (симулятор на Python для изучения Linux fundamentals)
**Сложность:** 🟡🟡 (3/5)

---

## Filesystem & Permissions Deep Dive

### 🎯 **Цель**

Научиться управлять правами доступа на уровне, необходимом для безопасного хостинга приложений. Понять разницу между стандартными правами Linux, ACL и special bits.

### **Создание структуры каталогов**

```bash
# Корпоративная структура
sudo mkdir -p /company/{dev,ops,hr}

# Группы и пользователи
sudo groupadd dev && sudo groupadd ops && sudo groupadd hr
sudo useradd -m -G dev dev_user
sudo useradd -m -G ops ops_user
sudo useradd -m -G hr hr_user

# Назначение владельцев
sudo chown -R dev_user:dev /company/dev
sudo chown -R ops_user:ops /company/ops
sudo chown -R hr_user:hr /company/hr

# Базовые права
sudo chmod -R 750 /company/{dev,ops,hr}
```



### 🔐 **ACL (Access Control Lists)**



### **Задача:** dev читает ops, но ops НЕ читает hr.

```bash
# Установить ACL
sudo setfacl -R -m u:dev_user:rx /company/ops
sudo setfacl -R -d -m u:dev_user:rx /company/ops

# Проверка
getfacl /company/ops

# Тест
sudo -u dev_user ls /company/ops      # ✅ работает
sudo -u ops_user ls /company/hr       # ❌ Permission denied
```



### 🔒 **Special Bits**



### **Sticky bit на /tmp/data**

Защищает файлы от удаления другими пользователями:

```bash
sudo mkdir /tmp/data
sudo chmod 1777 /tmp/data
# drwxrwxrwt — буква 't' означает sticky bit

# Тест
sudo -u dev_user touch /tmp/data/dev_file.txt
sudo -u ops_user rm /tmp/data/dev_file.txt  # ❌ Operation not permitted
```

**Setuid на скрипте**

```bash
sudo nano /usr/local/bin/check_mystore.sh
sudo chmod u+s /usr/local/bin/check_mystore.sh
# -rwsr-xr-x — буква 's' означает setuid
```

**Важно:** Setuid на shell-скриптах игнорируется в современных Linux. Для реальных задач используйте sudo.

### 🔍 **Поиск SUID файлов в системе**

```bash
sudo find / -perm -4000 -type f 2>/dev/null
```

**Типичные SUID файлы:** /usr/bin/passwd, /usr/bin/sudo, /usr/bin/su, /usr/bin/mount
⚠️ Если видите странные файлы в `/tmp` или домашней директории — это может быть бэкдор!

---



## Process Management & Systemd



### 🎯 Цель

Запустить приложение как полноценный сервис с автозапуском, авто-рестартом и лимитами ресурсов. Использован Python HTTP-сервер вместо Java для фокуса на Linux fundamentals.

### 📝 **Python HTTP-сервер**

Создан `/opt/my_store/server.py:`

- Слушает порт 9000
- Endpoints: /health, /status
- Graceful shutdown через сигналы
- Логирование в файл и stdout

```bash
sudo mkdir -p /opt/my_store
sudo mkdir -p /var/log/my_store
chmod +x /opt/my_store/server.py
```



### ⚙️ **Systemd Service**

Файл: `/etc/systemd/system/my_store.service`

```bash
[Unit]
Description=My Store Simulator (Python HTTP Server)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/my_store
ExecStart=/usr/bin/python3 /opt/my_store/server.py

Restart=on-failure
RestartSec=5
StartLimitInterval=60
StartLimitBurst=3

StandardOutput=journal
StandardError=journal
SyslogIdentifier=my_store

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
TimeoutStopSec=10

# Resource limits
CPUQuota=200%
MemoryMax=256M
MemoryHigh=200M
TasksMax=50
LimitNOFILE=1024

[Install]
WantedBy=multi-user.target
```

**Активация:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable my_store.service
sudo systemctl start my_store.service
sudo systemctl status my_store.service
```



### 🔄 **Auto-restart при падении**

```bash
# Убить процесс
sudo kill -9 $(pgrep -f server.py)

# Через 5 секунд сервис автоматически перезапустится
sleep 5
sudo systemctl status my_store.service  # active (running) ✅
```

**Проверка:**

```bash
sudo systemctl show my_store.service -p MemoryMax
sudo systemctl show my_store.service -p CPUQuota
systemd-cgtop  # мониторинг в реальном времени
```



### 🧪 **Тестирование**

```bash
# Health check
curl http://localhost:9000/health

# Status
curl http://localhost:9000/status

# Логи в реальном времени
sudo journalctl -u my_store.service -f

# Логи за последний час
sudo journalctl -u my_store.service --since "1 hour ago"
```



## ✅ **Итоги**



### **Что изучено:**

- ✅ Стандартные права Linux (rwx, chmod, chown)
- ✅ ACL для гибкого управления доступом
- ✅ Special bits (sticky, setuid, setgid)
- ✅ Запуск процессов в разных режимах
- ✅ Systemd unit files
- ✅ Auto-restart и graceful shutdown
- ✅ Resource limits (CPU, Memory)
- ✅ Логирование через journalctl



### **Метрики:**

- **Время выполнения:** ~2 часа
- **Сложность:** 🟡🟡 (3/5)
- **Практическая ценность:** 🟢 Высокая (фундамент для DevOps)

