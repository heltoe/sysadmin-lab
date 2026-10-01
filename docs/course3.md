# Курс занятий №3
## Цель: Сети, IP, DNS, порты, tcpdump
### IP-адресация и маршруты

- Посмотреть текущую сеть:
```
ip addr
ip route
```

```
sudo vim /etc/netplan/01-netcfg.yaml
```
[Конфиг маррутизации](../scripts/01-netcfg.yaml)

- Применяем изменения
```
sudo netplan apply
```

- Проверка результата
```
ip addr
ping 192.168.50.10
```

### Порты и сокеты
- Проверяем, что слушает сервер:
```
ss -lntp
```

### DNS-теория и dig
```
cat /etc/hosts
cat /etc/resolv.conf
```
- Проверка внешних DNS:
```
dig example.com
dig example.com A
dig example.com NS
dig example.com MX
```

### Локальный DNS-сервер dnsmasq
