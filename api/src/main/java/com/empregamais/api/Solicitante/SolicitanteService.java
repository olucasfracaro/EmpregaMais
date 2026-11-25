package com.empregamais.api.Solicitante;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SolicitanteService {

    @Autowired
    private SolicitanteRepository repository;
    
    public Solicitante criarSolicitante(Solicitante solicitante) {
        if (repository.existsByEmail(solicitante.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        return repository.save(solicitante);
    }

    public Solicitante atualizarSolicitante(Solicitante solicitante) {
        return repository.save(solicitante);
    }

    public boolean deletarSolicitante(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    public Optional<Solicitante> buscarSolicitantePorId(Long id) {
        return repository.findById(id);
    }

    public List<Solicitante> buscarSolicitantes() {
        return repository.findAll();
    }
}
