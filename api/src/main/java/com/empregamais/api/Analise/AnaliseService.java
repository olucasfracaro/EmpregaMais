package com.empregamais.api.Analise;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AnaliseService {

    @Autowired
    private AnaliseRepository repository;
    
    public Analise criarAnalise(Analise analise) {
        return repository.save(analise);
    }

    public Analise atualizarAnalise(Analise analise) {
        return repository.save(analise);
    }

    public boolean deletarAnalise(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    public Optional<Analise> buscarAnalisePorId(Long id) {
        return repository.findById(id);
    }

    public List<Analise> buscarAnalises() {
        return repository.findAll();
    }
}
