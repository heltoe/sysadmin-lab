# Автоматизация VLAN через VTP + Реальная инфраструктура
**Дата:** 2026-10-01  
**Статус:** ✅ Выполнено  
**Приложение:** my_store (Spring Boot + PostgreSQL)  
**Сложность:** 🟡🟡 (3/5)

---

## 📐 **Финальная топология**

                [Server0: DHCP+DNS]
                       │ Gi0/0/1
                  [Router3]
                       │ Gi0/0/0 (Router-on-a-stick)
                       │
                  [Switch3] (Core, VTP Server)
                 /    │    \
          Fa0/22 /  Fa0/23 \  Fa0/24
               /      │      \
         [Switch0] [Switch1] [Switch2]
       VLAN 10    VLAN 20   VLAN 30
      (Mgmt)    (Users) +  (Servers) +
                 VLAN 40     VLAN 50
               (Printers)  (Guest WiFi)
                   │           │
              [Printer0]   [Access Point]
                           /           \
                     Laptop0      Smartphone0


---

## 🎯 **Цели**

1. Автоматизировать создание VLAN через VTP
2. Добавить VLAN 40 (Printers/IoT) и VLAN 50 (Guest WiFi)
3. Настроить DHCP для всех VLAN
4. Обеспечить безопасность через изоляцию
5. Реализовать NAT для гостевого доступа

---

##  **VTP Configuration**

### **Switch3 (VTP Server)**

```cisco
! Очищаем старые VLAN
no vlan 10
no vlan 20
no vlan 30

! Настраиваем VTP
configure terminal
vtp domain MYSTORE_NETWORK
vtp mode server
vtp password cisco123
vtp version 2
end

! Создаём VLAN (только на сервере!)
configure terminal
vlan 10
name Management
vlan 20
name Users
vlan 30
name Servers
vlan 40
name Printers_IoT
vlan 50
name Guest_WiFi
end

write memory
```

### **Switch0, Switch1, Switch2 (VTP Clients)**

```cisco
! Очищаем старые VLAN
no vlan 10
no vlan 20
no vlan 30

! Настраиваем VTP (ВАЖНО: через transparent для сброса revision!)
configure terminal
vtp mode transparent
vtp domain MYSTORE_NETWORK
vtp password cisco123
vtp version 2
vtp mode client
end

write memory
```

### **Проверка синхронизации:**

```cisco
Switch1# show vlan brief
```

VLAN 10, 20, 30, 40, 50 должны появиться автоматически!

---

## 🔌 **Конфигурация портов**

### **Switch0 (VLAN 10 - Management)**

```cisco
Switch0(config)# interface range fastEthernet 0/1 - 3
Switch0(config-if-range)# switchport mode access
Switch0(config-if-range)# switchport access vlan 10
Switch0(config-if-range)# exit

! Trunk к Switch3
Switch0(config)# interface fastEthernet 0/24
Switch0(config-if)# switchport mode trunk
Switch0(config-if)# switchport trunk allowed vlan all
Switch0(config-if)# end
```

### **Switch1 (VLAN 20 + VLAN 40)**

```cisco
! Пользователи
Switch1(config)# interface range fastEthernet 0/1 - 3
Switch1(config-if-range)# switchport mode access
Switch1(config-if-range)# switchport access vlan 20
Switch1(config-if-range)# exit

! Принтер (статический IP!)
Switch1(config)# interface fastEthernet 0/4
Switch1(config-if)# description NETWORK_PRINTER_HP
Switch1(config-if)# switchport mode access
Switch1(config-if)# switchport access vlan 40
Switch1(config-if)# switchport port-security maximum 1
Switch1(config-if)# switchport port-security violation shutdown
Switch1(config-if)# exit

! Trunk к Switch3
Switch1(config)# interface fastEthernet 0/24
Switch1(config-if)# switchport mode trunk
Switch1(config-if)# switchport trunk allowed vlan all
Switch1(config-if)# end
```

### **Switch2 (VLAN 30 + VLAN 50)**

```cisco
! Серверы
Switch2(config)# interface range fastEthernet 0/1 - 3
Switch2(config-if-range)# switchport mode access
Switch2(config-if-range)# switchport access vlan 30
Switch2(config-if-range)# exit

! Guest WiFi Access Point
Switch2(config)# interface fastEthernet 0/2
Switch2(config-if)# description GUEST_WIFI_ACCESS_POINT
Switch2(config-if)# switchport mode access
Switch2(config-if)# switchport access vlan 50
Switch2(config-if)# exit

! Trunk к Switch3
Switch2(config)# interface fastEthernet 0/24
Switch2(config-if)# switchport mode trunk
Switch2(config-if)# switchport trunk allowed vlan all
Switch2(config-if)# end
```

---

### **Router-on-a-stick (Router3)**
### **Интерфейсы для всех VLAN**

```cisco
Router3> enable
Router3# configure terminal

! Интерфейс к Server0 (DHCP+DNS)
Router3(config)# interface gigabitEthernet 0/0/1
Router3(config-if)# description TO_DHCP_DNS_SERVER
Router3(config-if)# ip address 192.168.100.1 255.255.255.0
Router3(config-if)# no shutdown
Router3(config-if)# exit

! Физический интерфейс к Switch3 (без IP)
Router3(config)# interface gigabitEthernet 0/0/0
Router3(config-if)# no ip address
Router3(config-if)# no shutdown
Router3(config-if)# exit

! Подынтерфейс VLAN 10
Router3(config)# interface gigabitEthernet 0/0/0.10
Router3(config-subif)# encapsulation dot1Q 10
Router3(config-subif)# ip address 192.168.10.1 255.255.255.0
Router3(config-subif)# ip helper-address 192.168.100.10
Router3(config-subif)# exit

! Подынтерфейс VLAN 20
Router3(config)# interface gigabitEthernet 0/0/0.20
Router3(config-subif)# encapsulation dot1Q 20
Router3(config-subif)# ip address 192.168.20.1 255.255.255.0
Router3(config-subif)# ip helper-address 192.168.100.10
Router3(config-subif)# exit

! Подынтерфейс VLAN 30
Router3(config)# interface gigabitEthernet 0/0/0.30
Router3(config-subif)# encapsulation dot1Q 30
Router3(config-subif)# ip address 192.168.30.1 255.255.255.0
Router3(config-subif)# ip helper-address 192.168.100.10
Router3(config-subif)# exit

! Подынтерфейс VLAN 40 (Printers)
Router3(config)# interface gigabitEthernet 0/0/0.40
Router3(config-subif)# encapsulation dot1Q 40
Router3(config-subif)# ip address 192.168.40.1 255.255.255.0
Router3(config-subif)# ip helper-address 192.168.100.10
Router3(config-subif)# exit

! Подынтерфейс VLAN 50 (Guest WiFi)
Router3(config)# interface gigabitEthernet 0/0/0.50
Router3(config-subif)# encapsulation dot1Q 50
Router3(config-subif)# ip address 192.168.50.1 255.255.255.0
Router3(config-subif)# ip helper-address 192.168.100.10
Router3(config-subif)# exit

Router3(config)# end
Router3# write memory
```

---

## 🔌 **DHCP Configuration (Server0)**

### **Пул для VLAN 40 (Printers)**

* Pool Name: **VLAN40**
* Default Gateway: **192.168.40.1**
* DNS Server: **192.168.100.10**
* Start IP Address: **192.168.40.10**
* Subnet Mask: **255.255.255.0**
* Maximum Number of Users: **20**

### **Пул для VLAN 50 (Guest WiFi)**

* Pool Name: **VLAN50**
* Default Gateway: **192.168.50.1**
* DNS Server: **8.8.8.8** (публичный DNS для гостей!)
* Start IP Address: **192.168.50.10**
* Subnet Mask: **255.255.255.0**
* Maximum Number of Users: **50**

---

## 🖨️ **Статический IP для принтера**

### **Почему статический?**

Принтеры должны быть доступны по постоянному адресу. DHCP-аренда (обычно 24 часа) может истечь, и IP изменится — всем пользователям придётся перенастраивать печать.

### **На Printer0:**

* IP Address: 192.168.40.10
* Subnet Mask: 255.255.255.0
* Default Gateway: 192.168.40.1
* DNS Server: 192.168.100.10
**Альтернатива (в продакшене):** DHCP Reservation по MAC-адресу.

---

## 📡 **Настройка Access Point**

### Access Point0 (AP-PT-N)

1. **Config → Port 1:** Status = **On**
2. **Config → Wireless:**
* SSID: MyStore_Guest
* Authentication: WPA-PSK
* Pass Phrase: Guest2026
* SSID Broadcast: Enabled

### **Подключение беспроводных устройств**
#### **На Laptop0 и Smartphone0:**

1. Desktop → PC Wireless
2. Refresh → выбрать MyStore_Guest → Connect
3. Ввести пароль: Guest2026
4. Desktop → IP Configuration → DHCP → Renew

## **Ожидаемый результат:**
* Laptop0: 192.168.50.x
* Smartphone0: 192.168.50.x

---

## 🌍 **NAT Configuration**

### **Интернет-интерфейс**

```cisco
Router3(config)# interface gigabitEthernet 0/0/2
Router3(config-if)# description TO_INTERNET
Router3(config-if)# ip address 203.0.113.2 255.255.255.0
Router3(config-if)# ip nat outside
Router3(config-if)# no shutdown
Router3(config-if)# exit
```

### **Static NAT (Port Forwarding для my_store)**

```cisco
Router3(config)# ip nat inside source static tcp 192.168.100.10 80 203.0.113.2 80
```

### **PAT для всех VLAN**

```cisco
Router3(config)# access-list 1 permit 192.168.10.0 0.0.0.255
Router3(config)# access-list 1 permit 192.168.20.0 0.0.0.255
Router3(config)# access-list 1 permit 192.168.30.0 0.0.0.255
Router3(config)# access-list 1 permit 192.168.40.0 0.0.0.255
Router3(config)# access-list 1 permit 192.168.50.0 0.0.0.255

Router3(config)# ip nat inside source list 1 interface gigabitEthernet 0/0/2 overload
```

### **Маршрутизация**

```cisco
Router3(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1
```

---

## ⚠️ **Troubleshooting**

### **Проблема 1: DHCP не выдаёт IP**

#### **Симптомы:** 169.254.x.x (APIPA) на устройствах

#### **Диагностика:**

```cisco
! Проверка подынтерфейсов
Router3# show ip interface brief | include 0/0/0

! Проверка helper-address
Router3# show running-config | include helper

! Debug DHCP
Router3# debug ip dhcp server packets
Router3# debug ip dhcp server events
```

#### **Решение:**

1. Убедиться, что подынтерфейс создан и up
2. Проверить ip helper-address
3. Проверить DHCP пул на Server0

---

### **Проблема 2: Native VLAN mismatch**

#### **Симптомы:** Трафик не проходит через trunk

#### **Диагностика:**

```cisco
Switch2# show interfaces trunk
```

#### **Решение:**

```cisco
Switch2(config)# interface fastEthernet 0/24
Switch2(config-if)# switchport trunk native vlan 1
```

---

### **Проблема 3: Trunk не пропускает VLAN**

#### **Симптомы:** Трафик не проходит через trunk

#### **Решение (для лабы):**

```cisco
Switch(config-if)# switchport trunk allowed vlan all
```

#### **Решение (для лабы):**

```cisco
Switch(config-if)# switchport trunk allowed vlan 10,20,30,40,50
```

⚠️ **Важно:** ```allowed vlan all``` удобно для обучения, но в продакшене это риск безопасности!

---

## 📚 **Итоги**

### **Что сделано:**
* ✅ VTP Server/Client настроен
* ✅ 6 VLAN синхронизированы автоматически
* ✅ Router-on-a-stick с 5 подынтерфейсами
* ✅ DHCP Relay для всех VLAN
* ✅ NAT (Static + PAT)
* ✅ Принтер со статическим IP
* ✅ Guest WiFi с изоляцией
* ✅ Port Security для принтера

### **Проблемы и решения:**

1. **Native VLAN mismatch** → Проверять через show interfaces trunk
2. **Trunk не пропускает VLAN** → Использовать allowed vlan all (для лабы) или явный список (для прода)
3. **DHCP не работает для Wi-Fi** → Проверить настройки AP (SSID, WPA, Port 1 On)

### **Метрики:**

* **Время настройки:** ~3 часа
* **Сложность:** 🟡🟡🟡 (3/5)
* **отовность к масштабированию:** 🟢 Отличная (VTP)
* **Уровень безопасности:** Средний (требует ACL)