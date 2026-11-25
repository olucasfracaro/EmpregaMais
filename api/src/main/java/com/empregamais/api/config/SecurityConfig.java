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

    private final String[] ROLES = {"admin", "gestor", "monitor", "comercial", "rh"};

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
                    "/cadastro.html",
                    "/principal.html",
                    "/nav.js",
                    "/masks.js",
                    "/script.js",
                    "/loginUsuario.js",
                    "/auth.js",
                    "/gerenciaCandidatos.js",
                    "/envioOrcamento.js",
                    "/style.css",
                    "/style_principal.css",
                    "/config.js",
                    "/config.local.js",
                    "/login",
                    "/principal",
                    "/cadastro",
                    "/cadastroCandidato.js"
                ).permitAll()
                .requestMatchers(HttpMethod.POST, "/gerenciar/candidatos").permitAll()
                .requestMatchers(HttpMethod.POST, "/comercial/orcamentos/solicitacao").permitAll()
                .requestMatchers("/gerenciar/candidatos", "/gerenciar/candidatos/**")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_GESTOR", "ROLE_RH")
                .requestMatchers("/acompanhar/analises", "/acompanhar/analises/**")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_MONITOR")
                .requestMatchers("/acompanhar", "/acompanhar/**")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_MONITOR")
                .requestMatchers(
                    "/comercial/solicitantes",
                    "/comercial/solicitantes/**",
                    "/comercial/orcamentos",
                    "/comercial/orcamentos/**"
                ).hasAnyAuthority("ROLE_ADMIN", "ROLE_COMERCIAL")
                .requestMatchers("/comercial", "/comercial/**", "/comerciais/**")
                    .hasAnyAuthority("ROLE_ADMIN", "ROLE_COMERCIAL")
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
            var userMetadata = jwt.getClaimAsMap("user_metadata");
            Object role = appMetadata == null ? null : appMetadata.get("role");
            if (role == null && userMetadata != null) {
                role = userMetadata.get("role");
            }
            if (!Arrays.asList(ROLES).contains(role)) {
                return List.of();
            }

            if (role.equals("admin")) {
                return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
            } else if (role.equals("gestor")) {
                return List.of(new SimpleGrantedAuthority("ROLE_GESTOR"));
            } else if (role.equals("monitor")) {
                return List.of(new SimpleGrantedAuthority("ROLE_MONITOR"));
            } else if (role.equals("comercial")) {
                return List.of(new SimpleGrantedAuthority("ROLE_COMERCIAL"));
            } else if (role.equals("rh")) {
                return List.of(new SimpleGrantedAuthority("ROLE_RH"));
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
