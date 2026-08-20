package com.empregamais.api.Candidato;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CandidatoService {

    @Autowired
    private CandidatoRepository repository;
    
    public Candidato criarCandidato(Candidato candidato) {
        if (repository.existsByEmail(candidato.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-mail já cadastrado");
        }
        return repository.save(candidato);
    }

    public Candidato atualizarCandidato(Candidato candidato) {
        return repository.save(candidato);
    }

    public boolean deletarCandidato(Integer id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    public Optional<Candidato> buscarCandidatoPorId(Integer id) {
        return repository.findById(id);
    }

    public List<Candidato> buscarCandidatos() {
        return repository.findAll();
    }
}
