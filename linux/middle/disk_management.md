# 🐧 **Linux Administration:**
**Проект:** my_store (симулятор на Python)
**Сложность:** 🟡🟡🟡 (3.5/5)
**Ключевой инсайт:** LVM — это бухгалтерия, а не магия (дебет должен сходиться с кредитом)

---

## Disk Management & LVM

## Цель и мотивация

**Проблема без LVM:**

* Раздел создан на 20GB → закончилось место → нужно останавливать сервис, переразбивать диск, копировать данные
*  Для БД (PostgreSQL) это означает простой приложения

**Решение LVM (Logical Volume Manager):**

* ✅ Гибкое управление дисками
* ✅ Расширение на лету без остановки сервисов
* ✅ Snapshot для бэкапов и тестов
* ✅ Миграция между физическими дисками без простоя

**Аналогия:**

* Обычный раздел = бетонная стена (нельзя изменить)
* LVM = конструктор LEGO (можно добавлять/убирать блоки)

---

## 📐 **Архитектура LVM**

```bash
[Физические диски]
  /dev/sdb (10GB)
  /dev/sdc (10GB)
  /dev/sdd (10GB)
       ↓
[Physical Volumes (PV)]
  pv1, pv2, pv3
       ↓
[Volume Group (VG)]
  vg_data (30GB пул)
       ↓
[Logical Volumes (LV)]
  lv_postgres (20GB → 25GB) → /var/lib/postgresql
  lv_backups (10GB → 5GB)   → /backup
```

---

## 🔧 **Шаг 1: Добавление виртуальных дисков**

### **1.1. В VirtualBox**

1. Выключить VM: sudo shutdown -h now
2. **Settings → Storage → Controller: SATA →** добавить 3 диска
3. Тип: **VDI, Dynamically allocated, 10 GB** каждый
4. Запустить VM

### 1.2. Проверка в системе

```bash
lsblk
```

**Ожидаемый вывод:**

```bash
sda   8:0    0  20G  0 disk  (системный)
sdb   8:16   0  10G  0 disk  (новый)
sdc   8:32   0  10G  0 disk  (новый)
sdd   8:48   0  10G  0 disk  (новый)
```

---

## 🔧 **Шаг 2: Создание PV, VG, LV**

### **2.1. Установка LVM**

```bash
sudo apt install lvm2 -y
```

### **2.2. Physical Volumes (PV)**

```bash
sudo pvcreate /dev/sdb /dev/sdc /dev/sdd
sudo pvs
```

### **2.3. Volume Group (VG)**

```bash
sudo vgcreate vg_data /dev/sdb /dev/sdc /dev/sdd
sudo vgs
```

**Результат:** ```vg_data``` с общим размером ~30GB

### **2.4. Logical Volumes (LV)**

```bash
# LV для PostgreSQL
sudo lvcreate -n lv_postgres -L 20G vg_data

# LV для бэкапов (остаток)
sudo lvcreate -n lv_backups -l 100%FREE vg_data

sudo lvs
```

### **2.5. Форматирование и монтирование**

```bash
sudo mkfs.ext4 /dev/vg_data/lv_postgres
sudo mkfs.ext4 /dev/vg_data/lv_backups

sudo mkdir -p /var/lib/postgresql /backup
sudo mount /dev/vg_data/lv_postgres /var/lib/postgresql
sudo mount /dev/vg_data/lv_backups /backup
```

### **2.6. Авто-монтирование в fstab**

```bash
# Получить UUID
sudo blkid

# Добавить в /etc/fstab
UUID=xxxx  /var/lib/postgresql  ext4  defaults  0  2
UUID=yyyy  /backup              ext4  defaults  0  2

# Проверка
sudo mount -a
df -h | grep vg_data
```

---

## 🔧 **Шаг 3: Online расширение LV**

### **3.1. Симуляция нехватки места**

```bash
sudo dd if=/dev/zero of=/var/lib/postgresql/testfile bs=1M count=18000
df -h /var/lib/postgresql  # ~96% занято
```

### **3.2. Проблема: VFree = 0**

```bash
sudo vgs
# VFree = 0 — весь VG распределён!
```

### **3.3. Решение: перераспределение места**

⚠️ **Ключевой момент:** LVM — это бухгалтерия. Чтобы где-то прибыло, должно где-то убыть.
**План:** уменьшить ```lv_backups``` с 10GB до 5GB, освободив 5GB для ```lv_postgres```.

```bash
# 1. Отмонтировать (ОБЯЗАТЕЛЬНО для уменьшения!)
sudo umount /backup

# 2. Проверить файловую систему
sudo e2fsck -f /dev/vg_data/lv_backups

# 3. Уменьшить LV + файловую систему одной командой
sudo lvreduce -L 5G -r /dev/vg_data/lv_backups

# 4. Проверить свободное место
sudo vgs  # VFree = 5GB ✅

# 5. Расширить lv_postgres ОНЛАЙН
sudo lvextend -L +5G -r /dev/vg_data/lv_postgres

# 6. Смонтировать обратно
sudo mount /dev/vg_data/lv_backups /backup
```

**Результат:**

```bash
lv_postgres: 20GB → 25GB (72% занято) ✅
lv_backups:  10GB → 5GB  (1% занято)
VG Free:     0GB  → 0GB  (баланс сошёлся!)
```

### **3.4. Альтернатива: добавить новый диск**

Если не хочется уменьшать другой LV:

```bash
sudo pvcreate /dev/sde
sudo vgextend vg_data /dev/sde
sudo lvextend -L +5G -r /dev/vg_data/lv_postgres
```

---

## 🔧 **Шаг 4: Snapshot и Rollback**

### **4.1. Создание snapshot**

```bash
sudo lvcreate -L 1G -s -n lv_postgres_snap /dev/vg_data/lv_postgres
sudo lvs
```

### **4.2. Монтирование snapshot**

```bash
sudo mkdir -p /mnt/snapshot
sudo mount -o ro /dev/vg_data/lv_postgres_snap /mnt/snapshot
ls -la /mnt/snapshot
```

**Применение:** бэкап БД без остановки сервиса.

### **4.3. Rollback**

⚠️ **Внимание:** уничтожает все изменения после создания snapshot!

```bash
sudo umount /mnt/snapshot
sudo lvconvert --merge /dev/vg_data/lv_postgres_snap
sudo reboot
```

---

## 🔧 **Шаг 5: Quota для пользователей**

### **5.1. Включение quota в fstab**

```bash
sudo nano /etc/fstab
# Изменить строку:
UUID=yyyy  /backup  ext4  defaults,usrquota,grpquota  0  2

sudo mount -o remount /backup
```

### **5.2. Инициализация quota**

```bash
sudo quotacheck -cug /backup
sudo quotaon /backup
```

### **5.3. Установка лимитов**

```bash
# Soft: 500MB, Hard: 600MB
sudo setquota -u admin 500M 600M 0 0 /backup
sudo quota -u admin
```

### **5.4. Тестирование**

```bash
# Превышение soft limit
dd if=/dev/zero of=/backup/testfile bs=1M count=550
quota -u admin  # покажет звёздочку (*)

# Превышение hard limit
dd if=/dev/zero of=/backup/testfile2 bs=1M count=700
# Disk quota exceeded ✅
```

---

## ⚠️ **Troubleshooting**

## **Проблема 1:** "Insufficient free space"

### **Симптомы:** ```lvextend``` возвращает ошибку

### **Причина:** VFree = 0

### **Решение:**

```bash
# Вариант A: добавить диск
sudo pvcreate /dev/sde
sudo vgextend vg_data /dev/sde

# Вариант B: уменьшить другой LV
sudo umount /backup
sudo lvreduce -L 5G -r /dev/vg_data/lv_backups
```

## **Проблема 2: "Cannot reduce open logical volume""

### **Симптомы:** ```lvreduce``` отказывается работать

### **Причина:** LV смонтирован

### **Решение:**

```bash
sudo umount /backup
sudo lvreduce -L 5G -r /dev/vg_data/lv_backups
sudo mount /dev/vg_data/lv_backups /backup
```

## **Проблема 4: Quota не работает""

### **Симптомы:** ```setquota``` не применяется

### **Решение:**

```bash
mount | grep quota  # проверить опции монтирования
sudo mount -o remount /backup
sudo quotacheck -cug /backup
sudo quotaon /backup
```

---

## ✅ **Итоги**

### **Что изучено:**

* ✅ Архитектура LVM (PV → VG → LV)
* ✅ Создание и управление дисками
* ✅ Online расширение без простоя
* ✅ Перераспределение места между LV (дебет = кредит)
* ✅ Snapshot для бэкапов
* ✅ Rollback к предыдущему состоянию
* ✅ Quota для ограничения пользователей.

### **Метрики:**
**Время выполнения:** ~2 часа (с перераспределением)
**Сложность:** 🟡🟡🟡 (3.5/5)
**Практическая ценность:** 🟢 Очень высокая (критично для БД)

---

**Результат:** Гибкая система управления дисками, готовая к production-нагрузке. БД может расти без простоя, бэкапы через snapshot, пользователи ограничены quota. Дебет сходится с кредитом! 🚀