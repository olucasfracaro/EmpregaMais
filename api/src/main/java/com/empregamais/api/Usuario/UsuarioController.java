package com.empregamais.api.Usuario;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping("/usuarios")
    public ResponseEntity<List<UsuarioResponseDTO>> buscarTodos() {
        List<UsuarioResponseDTO> usuarios = usuarioService.buscarUsuarios()
            .stream()
            .map((Usuario usuario) -> this.toDTO(usuario))
            .toList();

        return ResponseEntity.ok(usuarios);
    }

    @GetMapping("/usuario/{id}")
    public ResponseEntity<UsuarioResponseDTO> getUsuario(@PathVariable Long id) {
        Optional<Usuario> usuario = usuarioService.buscarUsuarioPorId(id);
        return usuario.map(value -> ResponseEntity.ok(toDTO(value)))
                        .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/usuario")
    public ResponseEntity<UsuarioResponseDTO> criarUsuario(@RequestBody UsuarioRequestDTO request) {
        Usuario novoUsuario = new Usuario();
        novoUsuario.setNome(request.nome());
        novoUsuario.setEmail(request.email());
        novoUsuario.setSenha(request.senha());
        novoUsuario.setPapel(request.papel());
        novoUsuario.setAtivo(request.ativo());

        Usuario salvo = usuarioService.criarUsuario(novoUsuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvo));
    }

    @PutMapping("/usuario/{id}")
    public ResponseEntity<UsuarioResponseDTO> atualizarUsuarioCompleto(@PathVariable Long id,
                                                                @RequestBody UsuarioRequestDTO request) {
        Optional<Usuario> usuarioExistente = usuarioService.buscarUsuarioPorId(id);

        if (usuarioExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Usuario usuarioAtualizado = usuarioExistente.get();

        usuarioAtualizado.setNome(request.nome());
        usuarioAtualizado.setEmail(request.email());
        usuarioAtualizado.setSenha(request.senha());
        usuarioAtualizado.setPapel(request.papel());
        usuarioAtualizado.setAtivo(request.ativo());
        
        usuarioAtualizado.setUpdatedAt(OffsetDateTime.now());

        Usuario salvo = usuarioService.atualizarUsuario(usuarioAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @PatchMapping("/usuario/{id}")
    public ResponseEntity<UsuarioResponseDTO> atualizarUsuario(@PathVariable Long id,
                                                           @RequestBody UsuarioRequestDTO request) {
        Optional<Usuario> usuarioExistente = usuarioService.buscarUsuarioPorId(id);

        if (usuarioExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Usuario usuarioAtualizado = usuarioExistente.get();
        if (request.nome() != null)     { usuarioAtualizado.setNome(request.nome()); }
        if (request.email() != null)    { usuarioAtualizado.setEmail(request.email()); }
        if (request.senha() != null)    { usuarioAtualizado.setSenha(request.senha()); }
        if (request.papel() != null)    { usuarioAtualizado.setPapel(request.papel()); }
        if (request.ativo() != null)    { usuarioAtualizado.setAtivo(request.ativo()); }

        usuarioAtualizado.setUpdatedAt(OffsetDateTime.now());

        Usuario salvo = usuarioService.atualizarUsuario(usuarioAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @DeleteMapping("/usuario/{id}")
    public ResponseEntity<Void> deletarUsuario(@PathVariable Long id) {
        boolean deletado = usuarioService.deletarUsuario(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private UsuarioResponseDTO toDTO(Usuario usuario) {
        return new UsuarioResponseDTO(
            usuario.getId(),
            usuario.getNome(),
            usuario.getEmail(),
            usuario.getSenha(),
            usuario.getPapel(),
            usuario.getAtivo(),
            usuario.getCreatedAt(),
            usuario.getUpdatedAt()
        );
    }
}