FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY api/pom.xml api/pom.xml
COPY api/src/main api/src/main
COPY frontend frontend
RUN mvn -B -f api/pom.xml package -Dmaven.test.skip=true

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /workspace/api/target/api-0.0.1-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 CMD curl --fail --silent http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
