# Этап сборки: Maven + JDK
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Этап рантайма: минимальный образ
FROM eclipse-temurin:21-jdk-alpine AS runtime
WORKDIR /app
# Копируем собранный JAR из build-этапа
COPY --from=build /app/target/springboot-postgres-app-0.0.1-SNAPSHOT.jar /app/app.jar
# Запускаем приложение
ENTRYPOINT ["java","-jar","/app/app.jar"]
