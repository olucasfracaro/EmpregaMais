run-local:
	@cd api && ./mvnw compile spring-boot:run -Dspring-boot.run.jvmArguments="-Djava.net.preferIPv4Stack=true" -Dspring-boot.run.arguments="--local"

run-vercel:
	@cd api && ./mvnw compile spring-boot:run
