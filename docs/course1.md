# Курс занятий №1

Ознакомление с "виртуалками", установкой OC Linux, работа в консоли, создание пользователей/групп, изменение прав, подключение через ssh

- Установка Virtual Box
- Установка Linux
- Изменение hostname
```
sudo hostnamectl set-hostname app01.lab.local
```
- Обновление системы
```
sudo apt update
sudo apt upgrade -y
```
- Установка пакетов
```
sudo apt install -y git curl wget vim
```
- Создание пользователей
```
sudo useradd -m admin
```
- Создание групп
```
sudo groupadd admins
```
- Назначение прав sudo группе (запись: %admins ALL=(ALL) ALL)
```
sudo vimsudo
```
- Обмен ssh ключей
- Изменение настроек ssh sshd_config
```
PermitRootLogin prohibit-password
PasswordAuthentication yes
PubkeyAuthentication yes
```
- Обязательный перезапуск службы после изменения настроек
```
sudo systemctl restart ssh
```

# Экзамен курс №1
## Как зайти на сервер:
- В консоли сервера залогиниться под пользователем admin || x-outhink
- Так же если произошел обмен ssh ключей можнно через удаленный терминал войти
```
ssh admin@SERVER_IP
```
или
```
ssh x-outhink@SERVER_IP
```
## Какие пользователи созданы:
Созданы пользователи:
- admin
- developer
- deploy

```
sudo useradd -m admin
id admin
```

Созданы группы:
- admins
- developers

```
sudo usermod -aG admins admin
getent group admins
```

## Как проверить права: 
```
sudo -l -U admin
```