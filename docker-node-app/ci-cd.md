# **Workflow файл: полный разбор**

## **Финальный рабочий .github/workflows/docker.yml**

[Посмотреть файл](../.github/workflows/docker.yml)

## **Разбор по секциям**

```yaml
on:
  push:
    branches: [ main, master ]
```

Пайплайн запускается при:
* Пуше в main или master
* Создании pull request в эти ветки

## **Job (```build-and-push:```)**

```yaml
jobs:
  build-and-push:
    runs-on: ubuntu-latest
```

Один job, выполняется на свежем Ubuntu от GitHub.

## **Контекст сборки**

```yaml
context: ./docker-node-app
file: ./docker-node-app/Dockerfile
```

Поскольку проект лежит в подпапке, явно указываем путь.

## **Теги образа**

```yaml
tags: heltoe/task-api:latest,heltoe/task-api:${{ github.sha }}
```

* ```latest``` — всегда актуальная версия
* ```${{ github.sha }}``` — хеш коммита (уникальный тег для каждого пуша)

## **Кэширование**

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

GitHub кэширует Docker-слои между запусками → сборка ускоряется в 2-3 раза.

## **5. Секреты GitHub**

Пароли и токены **никогда** не хранят в коде. GitHub Secrets — защищённое хранилище.

### **Как добавить**

1. Репозиторий → **Settings → Secrets and variables → Actions**
2. **New repository secret**
3. Добавить два секрета:
* ```DOCKER_USERNAME``` → ```heltoe```
* ```OCKER_PASSWORD``` → твой пароль от Docker Hub

## **Использование в workflow**

```yaml
username: ${{ secrets.DOCKER_USERNAME }}
password: ${{ secrets.DOCKER_PASSWORD }}
```

## **Почему это важно**

* Секреты не логируются (даже если job падает)
* Их нельзя прочитать через код
* При компрометации — можно отозвать в один клик