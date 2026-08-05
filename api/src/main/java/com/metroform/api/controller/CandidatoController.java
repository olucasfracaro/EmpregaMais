package com.metroform.api.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.metroform.api.model.Candidato;
import com.metroform.api.service.CandidatoService;

@RestController
public class CandidatoController {
    
    private final CandidatoService candidatoService;

    public CandidatoController(CandidatoService candidatoService) {
        this.candidatoService = candidatoService;
    }

    @GetMapping("/candidato/{id}")
    public Candidato getCandidato(@PathVariable Integer id) {
        Optional<Candidato> candidato = candidatoService.buscarCandidatoPorId(id);
        return candidato.orElse(null);
    }

    @GetMapping("/candidatos")
    public ResponseEntity<?> buscarTodos() {
        List<Candidato> candidatos = candidatoService.buscarCandidatos();
        return ResponseEntity.ok(candidatos);
    }

    @PostMapping("/candidato")
    public ResponseEntity<Candidato> criarCandidato(@RequestBody Candidato candidato) {
        Candidato novoCandidato = new Candidato();
        novoCandidato.setNome(candidato.getNome());
        novoCandidato.setEmail(candidato.getEmail());
        novoCandidato.setTelefone(candidato.getTelefone());

        Candidato salvo = candidatoService.criarCandidato(novoCandidato);
        return new ResponseEntity<>(salvo, HttpStatus.CREATED);
    }

    @DeleteMapping("/candidato/{id}")
    public ResponseEntity<Void> deletarCandidato(@PathVariable Integer id) {
        boolean deletado = candidatoService.deletarCandidato(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
