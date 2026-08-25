# Курс занятий №2
## Цель: Научиться запускать приложение как сервис, смотреть логи, управлять автозапуском и работать с дисками.
### Простой systemd-сервис
Готовим приложение (есть python приложение - сервер)

Создаем unit:
```
sudo vim /etc/systemd/system/app.service
```

Содержимое Unit
```
[Unit]
Description=Simple lab app
After=network.target

[Service]
User=deploy
Group=developers
WorkingDirectory=/opt/app/src
ExecStart=/usr/bin/python3 /opt/app/src/app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Далее запускаем демона, который подниает приложку
```
sudo systemctl daemon-reload
sudo systemctl enable --now app
sudo systemctl status app
```
Я б это сделал в вите sh скрипта такой имеется уже [Посмотреть скрипт](../scripts/start-servie-unit.sh)
Для начала сделем файл исполняемым в терминале
```
chmod +x start-servie-unit.sh
```
Далее запустим скрипт с аргументом - имя сервиса (в нашем случае - app)
```
start-servie-unit.sh app
```

### Journalctl и Logrotate
Просмотр логов зарегестрированного Unit сервиса (приложения)
Флаг -f означает просмотр в режиме реальнго времени
```
journalctl -u app -f
```
Создание logrotate-конфига
```
sudo vim /etc/logrotate.d/app
```
Тело конфига
```
/opt/app/logs/*.log {
    daily
    rotate 7
    missingok
    notifempty
    compress
    copytruncate
}
```
Проверка наличия логов
```
sudo logrotate -d /etc/logrotate.d/app
sudo journalctl -u app --no-pager | tail
```

### Процессы, сигналы, ресурсы
Вывод всех процессов + кстомный фильтр
```
ps aux | grep app.py
```

Убиваем мягко процесс
```
sudo kill ID_PROCESS
```

Убиваем жестко процесс
```
sudo kill -9 ID_PROCESS
```

### Диск, mount, fstab

- lsblk (List Block Devices) — выводит список всех блочных устройств (жесткие диски, SSD, флешки) и их разделов в виде удобного дерева.
- blkid (Block Device Attributes) — показывает низкоуровневые атрибуты накопителей: типы файловых систем и их UUID (уникальные ID).
- mkfs.ext4 (Make Filesystem) — утилита для форматирования выбранного раздела в современную и стабильную файловую систему ext4.
- mount — команда для подключения (монтирования) раздела диска к определенной папке (точке монтирования) в файловой системе.
- /etc/fstab (File Systems Table) — конфигурационный файл, где прописываются правила автоматического монтирования дисков при старте компьютера.
- UUID (Universally Unique Identifier) — уникальный 128-битный номер раздела. В отличие от имен вроде /dev/sdb1 (которые могут измениться при перестановке кабелей), UUID всегда остается неизменным.

### systemd timer для бэкапа
