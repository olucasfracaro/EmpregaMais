package com.empregamais.api.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:https://empregamais-ten.vercel.app,https://*.vercel.app,https://*.app.github.dev,http://localhost:[*]}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    HttpMethod.OPTIONS, "/**"
                ).permitAll()
                .requestMatchers(
                    "/",
                    "/ico.png",
                    "/index.html",
                    "/login.html",
                    "/principal.html",
                    "/script.js",
                    "/loginUsuario.js",
                    "/auth.js",
                    "/gerenciaCandidatos.js",
                    "/style.css",
                    "/style_principal.css",
                    "/config.js",
                    "/config.local.js",
                    "/login",
                    "/principal"
                ).permitAll()
                .requestMatchers(HttpMethod.POST, "/candidato").permitAll()
                .requestMatchers("/candidatos", "/candidatos/**", "/candidato/**", "/analise", "/analise/**",
                    "/analises", "/analises/**").hasRole("ADMIN")
                .requestMatchers(
                    "/swagger-ui.html",
                    "/swagger-ui/**"
                ).authenticated()
                .requestMatchers("/v3/api-docs/**").permitAll()
                .anyRequest().authenticated()
            )
            .formLogin(form -> form.disable())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
            .httpBasic(Customizer.withDefaults());

        return http.build();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            var appMetadata = jwt.getClaimAsMap("app_metadata");
            Object role = appMetadata == null ? null : appMetadata.get("role");
            if ("admin".equals(role)) {
                return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
            }
            return List.of();
        });
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
            .map(origin -> origin.trim())
            .filter(origin -> !origin.isEmpty())
            .toList());
        configuration.setAllowCredentials(false);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Content-Length", "Content-Type"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}