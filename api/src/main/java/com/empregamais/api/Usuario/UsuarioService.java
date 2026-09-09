package com.empregamais.api.Usuario;

import java.util.List;
import java.util.Optional;
import java.security.MessageDigest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository repository;

    public Usuario criarUsuario(Usuario usuario) {
        if (repository.existsByEmail(usuario.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        return repository.save(usuario);
    }

    public Usuario atualizarUsuario(Usuario usuario) {
        return repository.save(usuario);
    }

    public Optional<Usuario> buscarUsuarioPorId(Long id) {
        return repository.findById(id);
    }

    public Optional<Usuario> buscarPorEmail(String email) {
        return repository.findByEmail(email);
    }

    public List<Usuario> buscarUsuarios() {
        return repository.findAll();
    }

    public boolean verificarLogin(String email, String senha) {
        String senhaHash = null;
        Optional<Usuario> usuario = this.buscarPorEmail(email);
        if (usuario.isPresent()) {
            try {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] hashedSenha = md.digest(senha.getBytes());
                StringBuilder sb = new StringBuilder();
                for (byte b : hashedSenha) {
                    sb.append(String.format("%02x", b));
                }
                senhaHash = sb.toString();
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erro ao processar a senha");
            }
            return usuario.get().getSenha().equals(senhaHash);
        }
        return false;
    }
}