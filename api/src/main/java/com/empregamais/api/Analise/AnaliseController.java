package com.empregamais.api.Analise;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/acompanhar/analises")
public class AnaliseController {

    private final AnaliseService analiseService;

    public AnaliseController(AnaliseService analiseService) {
        this.analiseService = analiseService;
    }

    @GetMapping
    public ResponseEntity<List<AnaliseResponseDTO>> buscarTodos() {
        List<AnaliseResponseDTO> analises = analiseService.buscarAnalises()
            .stream()
            .map((Analise analise) -> this.toDTO(analise))
            .toList();

        return ResponseEntity.ok(analises);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnaliseResponseDTO> getAnalise(@PathVariable Long id) {
        Optional<Analise> analise = analiseService.buscarAnalisePorId(id);
        return analise.map(value -> ResponseEntity.ok(toDTO(value)))
                        .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
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

    @DeleteMapping("/{id}")
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