package com.metroform.api.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.metroform.api.model.Candidato;
import com.metroform.api.repository.CandidatoRepository;

@Service
public class CandidatoService {

    @Autowired
    private CandidatoRepository repository;
    
    public Candidato criarCandidato(Candidato candidato) {
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
