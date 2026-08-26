package com.empregamais.api.Usuario;

import java.util.List;
import java.util.Optional;

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

    public boolean deletarUsuario(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    public Optional<Usuario> buscarUsuarioPorId(Long id) {
        return repository.findById(id);
    }

    public List<Usuario> buscarUsuarios() {
        return repository.findAll();
    }
}