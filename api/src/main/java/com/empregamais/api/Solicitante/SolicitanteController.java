package com.empregamais.api.Solicitante;

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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/comercial/solicitantes")
public class SolicitanteController {

    private final SolicitanteService solicitanteService;

    public SolicitanteController(SolicitanteService solicitanteService) {
        this.solicitanteService = solicitanteService;
    }

    @GetMapping
    public ResponseEntity<List<SolicitanteResponseDTO>> buscarTodos() {
        List<SolicitanteResponseDTO> solicitantes = solicitanteService.buscarSolicitantes()
            .stream()
            .map((Solicitante solicitante) -> this.toDTO(solicitante))
            .toList();

        return ResponseEntity.ok(solicitantes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SolicitanteResponseDTO> getSolicitante(@PathVariable Long id) {
        Optional<Solicitante> solicitante = solicitanteService.buscarSolicitantePorId(id);
        return solicitante.map(value -> ResponseEntity.ok(toDTO(value)))
                        .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<SolicitanteResponseDTO> criarSolicitante(@RequestBody SolicitanteRequestDTO request) {
        Solicitante novoSolicitante = new Solicitante();
        novoSolicitante.setNome(request.nome());
        novoSolicitante.setCargo(request.cargo());
        novoSolicitante.setEmpresa(request.empresa());
        novoSolicitante.setEmail(request.email());
        novoSolicitante.setTelefone(request.telefone());
        novoSolicitante.setHorarioPreferido(request.horarioPreferido());

        Solicitante salvo = solicitanteService.criarSolicitante(novoSolicitante);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvo));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SolicitanteResponseDTO> atualizarSolicitanteCompleto(@PathVariable Long id,
                                                                @RequestBody SolicitanteRequestDTO request) {
        Optional<Solicitante> solicitanteExistente = solicitanteService.buscarSolicitantePorId(id);

        if (solicitanteExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Solicitante solicitanteAtualizado = solicitanteExistente.get();

        solicitanteAtualizado.setNome(request.nome());
        solicitanteAtualizado.setCargo(request.cargo());
        solicitanteAtualizado.setEmpresa(request.empresa());
        solicitanteAtualizado.setEmail(request.email());
        solicitanteAtualizado.setTelefone(request.telefone());
        solicitanteAtualizado.setHorarioPreferido(request.horarioPreferido());

        Solicitante salvo = solicitanteService.atualizarSolicitante(solicitanteAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<SolicitanteResponseDTO> atualizarSolicitante(@PathVariable Long id,
                                                           @RequestBody SolicitanteRequestDTO request) {
        Optional<Solicitante> solicitanteExistente = solicitanteService.buscarSolicitantePorId(id);

        if (solicitanteExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Solicitante solicitanteAtualizado = solicitanteExistente.get();
        if (request.nome() != null)     { solicitanteAtualizado.setNome(request.nome()); }
        if (request.cargo() != null)    { solicitanteAtualizado.setCargo(request.cargo()); }
        if (request.empresa() != null)  { solicitanteAtualizado.setEmpresa(request.empresa()); }
        if (request.email() != null)    { solicitanteAtualizado.setEmail(request.email()); }
        if (request.telefone() != null) { solicitanteAtualizado.setTelefone(request.telefone()); }
        if (request.horarioPreferido() != null) { solicitanteAtualizado.setHorarioPreferido(request.horarioPreferido()); }

        Solicitante salvo = solicitanteService.atualizarSolicitante(solicitanteAtualizado);
        return ResponseEntity.ok(toDTO(salvo));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarSolicitante(@PathVariable Long id) {
        boolean deletado = solicitanteService.deletarSolicitante(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    private SolicitanteResponseDTO toDTO(Solicitante solicitante) {
        return new SolicitanteResponseDTO(
            solicitante.getId(),
            solicitante.getNome(),
            solicitante.getCargo(),
            solicitante.getEmpresa(),
            solicitante.getEmail(),
            solicitante.getTelefone(),
            solicitante.getHorarioPreferido(),
            solicitante.getCreatedAt(),
            solicitante.getUpdatedAt()
        );
    }
}
