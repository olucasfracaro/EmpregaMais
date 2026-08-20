package com.empregamais.api.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .addServersItem(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Servidor local")
                )
                .addServersItem(
                        new Server()
                                .url("https://psychic-space-cod-4jj796xvj5fj544-8080.app.github.dev/")
                                .description("Servidor do Codespace")
                );
    }
}