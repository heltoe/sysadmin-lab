# Ручная настройка VLAN на коммутаторах
**Дата:** 2026-09-30  
**Статус:** ✅ Выполнено  
**Приложение:** my_store (Spring Boot + PostgreSQL)

---

##  **Топология сети**

                [Server0: DHCP+DNS]
                       │
                       │ Gi0/0/1
                  [Router3]
                       │ Gi0/0/0 (Router-on-a-stick)
                       │
                  [Switch3] (Core)
                 /    │    \
          Fa0/22 /  Fa0/23 \  Fa0/24
               /      │      \
         [Switch0] [Switch1] [Switch2]
       VLAN 10    VLAN 20   VLAN 30
      (Mgmt)      (Users)   (Servers)


---

## 🎯 **Цели**

1. Разделить сеть на 3 логических сегмента (VLAN)
2. Обеспечить меж-VLAN маршрутизацию
3. Настроить централизованный DHCP
4. Реализовать NAT для выхода в интернет

---

## 🔧 **Конфигурация VLAN (ручная)**

### **Switch0 (VLAN 10 - Management)**

```cisco
! Создаём VLAN
vlan 10
name Management
vlan 20
name Users
vlan 30
name Servers

! Назначаем порты PC в VLAN 10
interface range fastEthernet 0/1 - 3
switchport mode access
switchport access vlan 10

! Настраиваем trunk к Switch3
interface fastEthernet 0/24
switchport mode trunk
switchport trunk allowed vlan 10,20,30
```

### **Switch2 (VLAN 20 - Users)**

```cisco
vlan 10
name Management
vlan 20
name Users
vlan 30
name Servers

interface range fastEthernet 0/1 - 3
switchport mode access
switchport access vlan 20

interface fastEthernet 0/24
switchport mode trunk
switchport trunk allowed vlan 10,20,30
```

### **Switch3 (VLAN 30 - Servers)**

```cisco
vlan 10
name Management
vlan 20
name Users
vlan 30
name Servers

interface range fastEthernet 0/1 - 3
switchport mode access
switchport access vlan 20

interface fastEthernet 0/24
switchport mode trunk
switchport trunk allowed vlan 10,20,30
```

### **🌐 Router-on-a-stick (Router3)**

**Интерфейсы**

```cisco
! Интерфейс к Server0 (DHCP+DNS)
interface gigabitEthernet 0/0/1
description TO_DHCP_DNS_SERVER
ip address 192.168.100.1 255.255.255.0
no shutdown

! Физический интерфейс к Switch3 (без IP)
interface gigabitEthernet 0/0/0
no ip address
no shutdown

! Подынтерфейс VLAN 10
interface gigabitEthernet 0/0/0.10
encapsulation dot1Q 10
ip address 192.168.10.1 255.255.255.0
ip helper-address 192.168.100.10

! Подынтерфейс VLAN 20
interface gigabitEthernet 0/0/0.20
encapsulation dot1Q 20
ip address 192.168.20.1 255.255.255.0
ip helper-address 192.168.100.10

! Подынтерфейс VLAN 30
interface gigabitEthernet 0/0/0.30
encapsulation dot1Q 30
ip address 192.168.30.1 255.255.255.0
ip helper-address 192.168.100.10
```

## 🔌 **DHCP Relay**

### **Проблема**
DHCP-запросы — broadcast (255.255.255.255). Роутер по умолчанию не пропускает broadcast между VLAN.

### **Решение**
**ip helper-address** пересылает DHCP-запросы на сервер 192.168.100.10.

```cisco
interface gigabitEthernet 0/0/0.10
ip helper-address 192.168.100.10

interface gigabitEthernet 0/0/0.20
ip helper-address 192.168.100.10

interface gigabitEthernet 0/0/0.30
ip helper-address 192.168.100.10
```

## 🌍 **NAT (Network Address Translation)**

### **Интернет-интерфейс**

```cisco
interface gigabitEthernet 0/0/2
description TO_INTERNET
ip address 203.0.113.2 255.255.255.0
ip nat outside
no shutdown
```

### **Static NAT (Port Forwarding)**

```cisco
! Внешний порт 80 → внутренний 192.168.100.10:80
ip nat inside source static tcp 192.168.100.10 80 203.0.113.2 80
```

### **Применение для my_store:**
* Внешний пользователь: http://203.0.113.2
* NAT перенаправляет на: 192.168.100.10:8080 (Spring Boot)

### **PAT (Port Address Translation)**

```cisco
! ACL для всех внутренних сетей
access-list 1 permit 192.168.10.0 0.0.0.255
access-list 1 permit 192.168.20.0 0.0.0.255
access-list 1 permit 192.168.30.0 0.0.0.255
access-list 1 permit 192.168.100.0 0.0.0.255

! PAT через интерфейс Gi0/0/2
ip nat inside source list 1 interface gigabitEthernet 0/0/2 overload
```

**Результат:** Все PC выходят в интернет через один IP (203.0.113.2).

## 📊 **Схема IP-адресации**

VLAN
Подсеть
Gateway
DHCP диапазон
Назначение
10
192.168.10.0/24
192.168.10.1
192.168.10.10-50
Management (DevOps)
20
192.168.20.0/24
192.168.20.1
192.168.20.10-50
Users (Frontend)
30
192.168.30.0/24
192.168.30.1
192.168.30.10-50
Servers (Backend)
100
192.168.100.0/24
192.168.100.1
-
Infrastructure


## ✅**Команды проверки**

### **VLAN и Trunk**

```cisco
show vlan brief
show interfaces trunk
```

### **DHCP**

```cisco
show running-config | include helper
show ip dhcp binding
```

### **NAT**

```cisco
show ip nat translations
show ip nat statistics
```

### **Маршрутизация**

```cisco
show ip route
ping 192.168.20.10  # из PC0
```

## **Связь с my_store**
### **VLAN 20 (Users)**
* Frontend/Nginx (порт 80/443)
* Доступ из интернета через NAT

### **VLAN 30 (Servers)**
* Spring Boot my_store (порт 8080)
* PostgreSQL (порт 5432)
* Изолированы от прямого доступа из интернета

### **VLAN 10 (Management)**
* SSH доступ к серверам
* Monitoring (Prometheus/Grafana)

## ⚠️**Проблемы ручного подхода**
1. **Масштабируемость:** Добавил коммутатор — прописал VLAN 4 раза
2. **Ошибки:** Опечатка в VLAN ID на одном коммутаторе = неработающая сеть
3. **Время:** 4 коммутатора × 3 VLAN = 12 команд
4. **Консистентность:** Сложно поддерживать одинаковую конфигурацию
5. **Решение:** VTP (см. vtp_network.md)

## 📚 **Итоги**
* ✅ VLAN созданы на всех коммутаторах
* ✅ Trunk настроен между коммутаторами
* ✅ Router-on-a-stick работает
* ✅ DHCP relay пересылает запросы
* ✅ NAT позволяет выходить в интернет
* ✅ Port forwarding опубликовал сервер

**Время выполнения:** ~2 часа
**Сложность:** 🟡 Средняя
**Готовность к масштабированию:** Низкая (требуется VTP/Ansible)