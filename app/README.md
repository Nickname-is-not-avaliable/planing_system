Шаги для запуска приложения целиком в Docker (с авто‑сборкой внутри контейнера):

1. **Убедитесь в наличии Docker и Docker Compose**  
   Проверьте в терминале:
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Перейдите в корень проекта**  
   Должны присутствовать файлы `Dockerfile`, `docker-compose.yml`, `pom.xml` и папка `src/`.

3. **Запуск с пересборкой образов**  
   Выполните команду из корня проекта:
   ```bash
   docker-compose up --build -d
   ```  
    - `--build` — форсирует пересборку образа `app` по нашему мультистадийному Dockerfile.
    - `-d` — запускает контейнеры в фоне.

4. **Проверка статусa контейнеров**
   ```bash
   docker-compose ps
   ```  
   Вы должны увидеть два сервиса:
    - `springboot-postgres-app_db_1` (Postgres),
    - `springboot-postgres-app_app_1` (ваше приложение).

5. **Просмотр логов приложения**  
   Чтобы убедиться, что сборка и запуск прошли без ошибок, понаблюдайте логи:
   ```bash
   docker-compose logs -f app
   ```  
   Ожидается запись о старте Spring Boot и инициализации схемы.

6. **Доступ к API и Swagger UI**
    - API доступно по умолчанию на `http://localhost:8080/api/...`
    - Swagger UI: `http://localhost:8080/swagger-ui.html`

7. **Остановка и очистка**  
   Если нужно завершить работу и удалить контейнеры/сеть (данные в volume останутся):
   ```bash
   docker-compose down
   ```  
   Чтобы дополнительно удалять том с БД:
   ```bash
   docker-compose down -v
   ```  

---

После этих шагов приложение будет собрано внутри Docker и запущено вместе с PostgreSQL без необходимости локальной
установки Java или Maven.
