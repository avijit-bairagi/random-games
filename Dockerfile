FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

COPY target/random-games-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]