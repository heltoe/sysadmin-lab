# **1. Зачем Ansible системному инженеру**

## **Проблема, которую решает Ansible**

### **Раньше (сисадмин):**

* SSH на каждый сервер вручную
* Обновление пакетов, настройка firewall, установка Docker — руками
* Повторение одних и тех же действий на 10, 50, 100 серверах
* Человеческий фактор: забыл команду, опечатался, сломал prod


### **Теперь (системный инженер):**

* Один YAML-файл (playbook) описывает желаемое состояние
* Одна команда ansible-playbook применяет это состояние ко всем серверам
* Идемпотентность — можно запускать много раз, результат одинаковый
* Код в Git → история изменений, ревью, откат

### Место в стеке

```bash
Сисадмин (Linux, сети, Cisco)
    ↓
Docker (контейнеризация)         ← Этап 1-2 ✅
    ↓
Docker Compose (оркестрация)     ← Этап 2 ✅
    ↓
Ansible (автоматизация)          ← МЫ ЗДЕСЬ ✅
    ↓
Kubernetes (кластеры)            ← Этап 4
```

---

# **2. Установка и структура проекта**

## **Установка в WSL (Ubuntu)**

```bash
sudo apt update
sudo apt install ansible -y
ansible --version
```

## **Структура проекта**

```bash
ansible/
├── ansible.cfg              # Конфигурация Ansible
├── inventory.ini            # Список серверов (инвентарь)
├── playbooks/
│   ├── test-connection.yml  # Проверка связи
│   ├── setup-server.yml     # Настройка сервера
│   └── deploy-app.yml       # Деплой приложения
└── files/
    ├── docker-compose.yml   # Файлы для копирования на сервер
    ├── .env                 # Переменные окружения
    └── task-api.tar         # (опционально) экспорт Docker-образа
```

## **Важное правило**

**Всегда запускай ```ansible-playbook``` из корня проекта**, где лежит ansible.cfg. Ansible ищет конфиг в текущей директории.

---

# **3. Inventory и ansible.cfg**

## **inventory.ini**

```bash
[webservers]
localhost ansible_connection=local
# Реальные серверы:
# 192.168.1.100 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/id_rsa

[dbservers]
# localhost ansible_connection=local

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

## **Ключевые моменты:**

* ```[webservers]``` — группа хостов (название произвольное)
* ```ansible_connection=local``` — для тестирования без SSH (выполняет команды локально)
* ```ansible_ssh_private_key_file``` — путь к SSH-ключу для реальных серверов

## **ansible.cfg**

[Посмотреть файл](ansible.cfg)

**Важно:** Ansible **игнорирует** ```ansible.cfg``` в директориях с правами ```777``` (world-writable). В WSL папки ```/mnt/c/...``` имеют такие права. 

**Решения:**
1. Перенести проект в домашнюю папку WSL: ~/ansible
2. Или явно указывать -i inventory.ini при запуске

---

# **4. Первый playbook: test-connection**

## **playbooks/test-connection.yml**

```yaml
---
- name: Test connection to servers
  hosts: all
  gather_facts: no
  
  tasks:
    - name: Ping all servers
      ansible.builtin.ping:
      
    - name: Get hostname
      command: hostname
      register: hostname_result
      
    - name: Display hostname
      ansible.builtin.debug:
        msg: "Server hostname is {{ hostname_result.stdout }}"
```

## **Запуск**

```bash
ansible-playbook -i inventory.ini playbooks/test-connection.yml
```

## **Ожидаемый вывод**

```bash
PLAY [Test connection to servers] ****

TASK [Ping all servers] ****
ok: [localhost]

TASK [Get hostname] ****
changed: [localhost]

TASK [Display hostname] ****
ok: [localhost] => {
    "msg": "Server hostname is HOME-PC"
}

PLAY RECAP ****
localhost: ok=3  changed=1  unreachable=0  failed=0
```

## **Разбор синтаксиса**

```yaml
---                          # Начало YAML-документа
- name: Название плейбука    # Описание (рекомендуется)
  hosts: all                 # На каких хостах запускать
  gather_facts: no           # Собирать ли инфо о системе
  
  tasks:                     # Список задач
    - name: Название задачи  # Описание задачи
      command: hostname      # Модуль + аргумент
      register: var_name     # Сохранить результат в переменную
```

---

# **5. Ad-hoc команды**

Быстрые действия без playbook:

```bash
# Проверить связь со всеми серверами
ansible all -m ping

# Выполнить команду
ansible all -m command -a "uptime"

# Проверить свободное место на диске
ansible all -m command -a "df -h"

# Перезапустить сервис (требует sudo)
ansible webservers -m service -a "name=nginx state=restarted" --become

# Собрать факты о системе
ansible all -m setup
```

Синтаксис:

```bash
ansible <группа> -m <модуль> -a "<аргументы>" [--become]
```

---

# **6. Playbook setup-server.yml**

Подготовка сервера: установка Docker, настройка firewall, Python-библиотек.

[Посмотреть файл](playbooks/setup-server.yml)

## Запуск

```bash
ansible-playbook -i inventory.ini playbooks/setup-server.yml --ask-become-pass
```

Флаг ```--ask-become-pass``` запрашивает пароль для ```sudo```.

---

# **7. Playbook deploy-app.yml**

## **Деплой Node.js приложения через Docker Compose.**

## **files/docker-compose.yml (для production)**

[Посмотреть файл](files/docker-compose.yml)

## **playbooks/deploy-app.yml**

[Посмотреть файл](playbooks/deploy-app.yml)

## **Запуск**

```bash
ansible-playbook -i inventory.ini playbooks/deploy-app.yml --ask-become-pass
```

## **Проверка**

```bash
curl http://localhost:3000/api/tasks
```

---

# **Итоги**

## **Что получилось в итоге**

```bash
[PLAY RECAP]
localhost: ok=9  changed=2  unreachable=0  failed=0
```

**9 задач выполнены, 0 ошибок.** Приложение развёрнуто и доступно по ```http://localhost:3000/api/tasks```.

## **Production-подход, который мы выстроили**

1. **Локально:** собираем Docker-образ (multi-stage build, 174MB)
2. **Docker Hub:** пушим образ heltoe/task-api:1.0
3. **Ansible:** копирует docker-compose.yml + .env на сервер
4. **Сервер:** docker compose up -d скачивает образ и запускает
5. **Результат:** API работает, база данных сохранена в volume