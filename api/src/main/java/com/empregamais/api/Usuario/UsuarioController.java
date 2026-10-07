package com.empregamais.api.Usuario;

import java.time.OffsetDateTime;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/usuario/login")
    public ResponseEntity<?> login(@RequestBody UsuarioLoginRequestDTO request) {

        Optional<Usuario> usuario = usuarioService.buscarPorEmail(request.email());

        if (!usuario.isPresent() || !usuarioService.verificarLogin(request.email(), request.senha())) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok().build();
    }
}