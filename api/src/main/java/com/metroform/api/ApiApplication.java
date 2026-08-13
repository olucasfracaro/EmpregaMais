package com.metroform.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(ApiApplication.class, args);
		System.out.println("Metroform API está sendo executada na porta 8080");
		System.out.println("Acesse a documentação da API em: http://localhost:8080/swagger-ui.html");
	}

}
