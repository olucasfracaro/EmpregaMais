package com.empregamais.api.Orcamento;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class OrcamentoService {

    @Autowired
    private OrcamentoRepository repository;
    
    public Orcamento criarOrcamento(Orcamento orcamento) {
        return repository.save(orcamento);
    }

    public Orcamento atualizarOrcamento(Orcamento orcamento) {
        return repository.save(orcamento);
    }

    public boolean deletarOrcamento(Long id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return true;
        }
        return false;
    }

    public Optional<Orcamento> buscarOrcamentoPorId(Long id) {
        return repository.findById(id);
    }

    public List<Orcamento> buscarOrcamentos() {
        return repository.findAll();
    }
}
