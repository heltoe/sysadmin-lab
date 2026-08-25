#!/bin/sh
echo "Имя скрипта: $0"
echo "Старт скрипта"
echo "Обновляем конфигурацию диспетчера systemd"
sudo systemctl daemon-reload
echo "Добавляем сервис в автозагрузку и мгновенно его запускаем"
sudo systemctl enable --now $1
echo "Проверяем статус службы"
sudo systemctl status $1
echo "Скрипт завершен"