package com.metroform.api.Candidato;

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
public class CandidatoController {

    private final CandidatoService candidatoService;

    public CandidatoController(CandidatoService candidatoService) {
        this.candidatoService = candidatoService;
    }

    @GetMapping("/candidatos")
    public ResponseEntity<List<CandidatoDTO>> buscarTodos() {
        List<CandidatoDTO> candidatos = candidatoService.buscarCandidatos()
            .stream()
            .map(this::toDTO)
            .toList();

        return ResponseEntity.ok(candidatos);
    }

    @GetMapping("/candidato/{id}")
    public ResponseEntity<CandidatoDTO> getCandidato(@PathVariable Integer id) {
        Optional<Candidato> candidato = candidatoService.buscarCandidatoPorId(id);
        return candidato.map(value -> ResponseEntity.ok(toDTO(value)))
                        .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/candidato")
    public ResponseEntity<CandidatoDTO> criarCandidato(@RequestBody CandidatoRequestDTO request) {
        Candidato novoCandidato = new Candidato();
        novoCandidato.setNome(request.nome());
        novoCandidato.setEmail(request.email());
        novoCandidato.setTelefone(request.telefone());
        novoCandidato.setMensagem(request.mensagem());
        novoCandidato.setCurriculoPath(request.curriculoPath());
        novoCandidato.setStatus("PENDENTE");

        Candidato salvo = candidatoService.criarCandidato(novoCandidato);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvo));
    }

    @PutMapping("/candidato/{id}")
    public ResponseEntity<CandidatoDTO> atualizarCandidatoCompleto(@PathVariable Integer id,
                                                                @RequestBody CandidatoRequestDTO request) {
        Optional<Candidato> candidatoExistente = candidatoService.buscarCandidatoPorId(id);

        if (candidatoExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Candidato candidatoAtualizado = candidatoExistente.get();

        candidatoAtualizado.setNome(request.nome());
        candidatoAtualizado.setEmail(request.email());
        candidatoAtualizado.setTelefone(request.telefone());
        candidatoAtualizado.setMensagem(request.mensagem());
        candidatoAtualizado.setCurriculoPath(request.curriculoPath());
        
        candidatoAtualizado.setUpdatedAt(OffsetDateTime.now());

        Candidato salvo = candidatoService.atualizarCandidato(candidatoAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @PatchMapping("/candidato/{id}")
    public ResponseEntity<CandidatoDTO> atualizarCandidato(@PathVariable Integer id,
                                                           @RequestBody CandidatoRequestDTO request) {
        Optional<Candidato> candidatoExistente = candidatoService.buscarCandidatoPorId(id);

        if (candidatoExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Candidato candidatoAtualizado = candidatoExistente.get();
        if (request.nome() != null)     { candidatoAtualizado.setNome(request.nome()); }
        if (request.email() != null)    { candidatoAtualizado.setEmail(request.email()); }
        if (request.telefone() != null) { candidatoAtualizado.setTelefone(request.telefone()); }
        if (request.mensagem() != null) { candidatoAtualizado.setMensagem(request.mensagem()); }
        if (request.curriculoPath() != null) { candidatoAtualizado.setCurriculoPath(request.curriculoPath()); }

        candidatoAtualizado.setUpdatedAt(OffsetDateTime.now());

        Candidato salvo = candidatoService.atualizarCandidato(candidatoAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @DeleteMapping("/candidato/{id}")
    public ResponseEntity<Void> deletarCandidato(@PathVariable Integer id) {
        boolean deletado = candidatoService.deletarCandidato(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private CandidatoDTO toDTO(Candidato candidato) {
        return new CandidatoDTO(
            Math.toIntExact(candidato.getId()),
            candidato.getNome(),
            candidato.getTelefone(),
            candidato.getEmail(),
            candidato.getMensagem(),
            candidato.getCurriculoPath(),
            candidato.getStatus(),
            candidato.getCreatedAt(),
            candidato.getUpdatedAt()
        );
    }
}