package com.empregamais.api.Analise;

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
public class AnaliseController {

    private final AnaliseService analiseService;

    public AnaliseController(AnaliseService analiseService) {
        this.analiseService = analiseService;
    }

    @GetMapping("/analises")
    public ResponseEntity<List<AnaliseResponseDTO>> buscarTodos() {
        List<AnaliseResponseDTO> analises = analiseService.buscarAnalises()
            .stream()
            .map((Analise analise) -> this.toDTO(analise))
            .toList();

        return ResponseEntity.ok(analises);
    }

    @GetMapping("/analise/{id}")
    public ResponseEntity<AnaliseResponseDTO> getAnalise(@PathVariable Long id) {
        Optional<Analise> analise = analiseService.buscarAnalisePorId(id);
        return analise.map(value -> ResponseEntity.ok(toDTO(value)))
                        .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/analise")
    public ResponseEntity<AnaliseResponseDTO> criarAnalise(@RequestBody AnaliseRequestDTO request) {
        Analise novoAnalise = new Analise();
        novoAnalise.setCandidatoId(request.candidatoId());
        novoAnalise.setStatus(request.status());
        novoAnalise.setResultado(request.resultado());
        novoAnalise.setModelo(request.modelo());
        novoAnalise.setErro(request.erro());
        novoAnalise.setCreatedAt(OffsetDateTime.now());

        Analise salvo = analiseService.criarAnalise(novoAnalise);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvo));
    }

    /* CASO EU PRECISE USAR
    @PutMapping("/analise/{id}")
    public ResponseEntity<AnaliseResponseDTO> atualizarAnaliseCompleto(@PathVariable Long id,
                                                                @RequestBody AnaliseRequestDTO request) {
        Optional<Analise> analiseExistente = analiseService.buscarAnalisePorId(id);

        Analise salvo = analiseService.criarAnalise(novoAnalise);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvo));
    }

    /*
    @PutMapping("/analise/{id}")
    public ResponseEntity<AnaliseResponseDTO> atualizarAnaliseCompleto(@PathVariable Long id,
                                                                @RequestBody AnaliseRequestDTO request) {
        Optional<Analise> analiseExistente = analiseService.buscarAnalisePorId(id);

        if (analiseExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Analise analiseAtualizado = analiseExistente.get();

        analiseAtualizado.setCandidatoId(request.candidatoId());
        analiseAtualizado.setStatus(request.status());
        analiseAtualizado.setResultado(request.resultado());
        analiseAtualizado.setModelo(request.modelo());
        analiseAtualizado.setErro(request.erro());
        analiseAtualizado.setCreatedAt(OffsetDateTime.now());
        
        analiseAtualizado.setFinishedAt(OffsetDateTime.now());

        Analise salvo = analiseService.atualizarAnalise(analiseAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @PatchMapping("/analise/{id}")
    public ResponseEntity<AnaliseResponseDTO> atualizarAnalise(@PathVariable Long id,
                                                           @RequestBody AnaliseRequestDTO request) {
        Optional<Analise> analiseExistente = analiseService.buscarAnalisePorId(id);

        if (analiseExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Analise analiseAtualizado = analiseExistente.get();
        if (request.candidatoId() != null)     { analiseAtualizado.setCandidatoId(request.candidatoId()); }
        if (request.status() != null)    { analiseAtualizado.setStatus(request.status()); }
        if (request.resultado() != null) { analiseAtualizado.setResultado(request.resultado()); }
        if (request.modelo() != null) { analiseAtualizado.setModelo(request.modelo()); }
        if (request.erro() != null) { analiseAtualizado.setErro(request.erro()); }
        if (request.createdAt() != null) { analiseAtualizado.setCreatedAt(request.createdAt()); }
        if (request.finishedAt() != null) { analiseAtualizado.setFinishedAt(request.finishedAt()); }

        analiseAtualizado.setUpdatedAt(OffsetDateTime.now());

        Analise salvo = analiseService.atualizarAnalise(analiseAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }
    */

    @DeleteMapping("/analise/{id}")
    public ResponseEntity<Void> deletarAnalise(@PathVariable Long id) {
        boolean deletado = analiseService.deletarAnalise(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private AnaliseResponseDTO toDTO(Analise analise) {
        return new AnaliseResponseDTO(
            analise.getId(),
            analise.getCandidatoId(),
            analise.getStatus(),
            analise.getResultado(),
            analise.getModelo(),
            analise.getErro(),
            analise.getCreatedAt(),
            analise.getFinishedAt()
        );
    }
}