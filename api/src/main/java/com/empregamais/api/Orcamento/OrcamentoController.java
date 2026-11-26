package com.empregamais.api.Orcamento;

import java.util.List;
import java.util.Optional;

import org.springframework.transaction.annotation.Transactional;
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
import org.springframework.web.server.ResponseStatusException;

import com.empregamais.api.Solicitante.Solicitante;
import com.empregamais.api.Solicitante.SolicitanteService;

@RestController
@RequestMapping("/comercial/orcamentos")
public class OrcamentoController {

    private final OrcamentoService orcamentoService;
    private final SolicitanteService solicitanteService;

    public OrcamentoController(OrcamentoService orcamentoService, SolicitanteService solicitanteService) {
        this.orcamentoService = orcamentoService;
        this.solicitanteService = solicitanteService;
    }

    @GetMapping
    public ResponseEntity<List<OrcamentoResponseDTO>> buscarTodos() {
        List<OrcamentoResponseDTO> orcamentos = orcamentoService.buscarOrcamentos()
            .stream()
            .map(this::toDTO)
            .toList();

        return ResponseEntity.ok(orcamentos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrcamentoResponseDTO> getOrcamento(@PathVariable Long id) {
        Optional<Orcamento> orcamento = orcamentoService.buscarOrcamentoPorId(id);
        return orcamento.map(value -> ResponseEntity.ok(toDTO(value)))
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<OrcamentoResponseDTO> criarOrcamento(@RequestBody OrcamentoRequestDTO request) {
        Orcamento novoOrcamento = new Orcamento();
        novoOrcamento.setSolicitante(buscarSolicitante(request.solicitanteId()));
        novoOrcamento.setCidade(request.cidade());
        novoOrcamento.setTipoObra(request.tipoObra());
        novoOrcamento.setFaseAtual(request.faseAtual());
        novoOrcamento.setPavimentos(request.pavimentos());
        novoOrcamento.setSolucoesRequeridas(request.solucoesRequeridas());
        novoOrcamento.setPrazo(request.prazo());
        novoOrcamento.setObservacoes(request.observacoes());
        if (!isBlank(request.status())) novoOrcamento.setStatus(request.status());

        Orcamento salvo = orcamentoService.criarOrcamento(novoOrcamento);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvo));
    }

    @PostMapping("/solicitacao")
    @Transactional
    public ResponseEntity<OrcamentoResponseDTO> criarSolicitacaoPublica(
        @RequestBody SolicitacaoOrcamentoRequestDTO request
    ) {
        if (request == null || request.solicitante() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dados do solicitante são obrigatórios");
        }

        var dados = request.solicitante();
        if (isBlank(dados.nome()) || isBlank(dados.empresa()) || isBlank(dados.email())
            || isBlank(dados.telefone()) || isBlank(request.cidade())
            || isBlank(request.solucoesRequeridas())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preencha os campos obrigatórios");
        }

        Solicitante solicitante = new Solicitante();
        solicitante.setNome(dados.nome());
        solicitante.setCargo(dados.cargo());
        solicitante.setEmpresa(dados.empresa());
        solicitante.setEmail(dados.email());
        solicitante.setTelefone(dados.telefone());
        solicitante.setHorarioPreferido(dados.horarioPreferido());
        Solicitante salvo = solicitanteService.criarSolicitante(solicitante);

        Orcamento orcamento = new Orcamento();
        orcamento.setSolicitante(salvo);
        orcamento.setCidade(request.cidade());
        orcamento.setTipoObra(request.tipoObra());
        orcamento.setFaseAtual(request.faseAtual());
        orcamento.setPavimentos(request.pavimentos());
        orcamento.setSolucoesRequeridas(request.solucoesRequeridas());
        orcamento.setPrazo(request.prazo());
        orcamento.setObservacoes(request.observacoes());

        Orcamento salvoOrcamento = orcamentoService.criarOrcamento(orcamento);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(salvoOrcamento));
    }

    @PutMapping("/{id}")
    public ResponseEntity<OrcamentoResponseDTO> atualizarOrcamentoCompleto(
        @PathVariable Long id,
        @RequestBody OrcamentoRequestDTO request
    ) {
        Optional<Orcamento> orcamentoExistente = orcamentoService.buscarOrcamentoPorId(id);
        if (orcamentoExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Orcamento orcamentoAtualizado = orcamentoExistente.get();
        orcamentoAtualizado.setSolicitante(buscarSolicitante(request.solicitanteId()));
        orcamentoAtualizado.setCidade(request.cidade());
        orcamentoAtualizado.setTipoObra(request.tipoObra());
        orcamentoAtualizado.setFaseAtual(request.faseAtual());
        orcamentoAtualizado.setPavimentos(request.pavimentos());
        orcamentoAtualizado.setSolucoesRequeridas(request.solucoesRequeridas());
        orcamentoAtualizado.setPrazo(request.prazo());
        orcamentoAtualizado.setObservacoes(request.observacoes());
        if (!isBlank(request.status())) orcamentoAtualizado.setStatus(request.status());

        return ResponseEntity.ok(toDTO(orcamentoService.atualizarOrcamento(orcamentoAtualizado)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<OrcamentoResponseDTO> atualizarOrcamento(
        @PathVariable Long id,
        @RequestBody OrcamentoRequestDTO request
    ) {
        Optional<Orcamento> orcamentoExistente = orcamentoService.buscarOrcamentoPorId(id);
        if (orcamentoExistente.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Orcamento orcamentoAtualizado = orcamentoExistente.get();
        if (request.solicitanteId() != null) {
            orcamentoAtualizado.setSolicitante(buscarSolicitante(request.solicitanteId()));
        }
        if (request.cidade() != null) { orcamentoAtualizado.setCidade(request.cidade()); }
        if (request.tipoObra() != null) { orcamentoAtualizado.setTipoObra(request.tipoObra()); }
        if (request.faseAtual() != null) { orcamentoAtualizado.setFaseAtual(request.faseAtual()); }
        if (request.pavimentos() != null) { orcamentoAtualizado.setPavimentos(request.pavimentos()); }
        if (request.solucoesRequeridas() != null) {
            orcamentoAtualizado.setSolucoesRequeridas(request.solucoesRequeridas());
        }
        if (request.prazo() != null) { orcamentoAtualizado.setPrazo(request.prazo()); }
        if (request.observacoes() != null) { orcamentoAtualizado.setObservacoes(request.observacoes()); }
        if (request.status() != null) { orcamentoAtualizado.setStatus(request.status()); }

        return ResponseEntity.ok(toDTO(orcamentoService.atualizarOrcamento(orcamentoAtualizado)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarOrcamento(@PathVariable Long id) {
        boolean deletado = orcamentoService.deletarOrcamento(id);
        if (deletado) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}/com-solicitante")
    @Transactional
    public ResponseEntity<String> deletarOrcamentoESolicitante(@PathVariable Long id) {
        Optional<Orcamento> encontrado = orcamentoService.buscarOrcamentoPorId(id);
        if (encontrado.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Orcamento orcamento = encontrado.get();
        Long solicitanteId = orcamento.getSolicitante().getId();
        if (orcamentoService.possuiOutroOrcamentoDoSolicitante(solicitanteId, id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body("Este solicitante está associado a outros orçamentos; nenhum dado foi apagado.");
        }

        orcamentoService.deletarOrcamento(id);
        solicitanteService.deletarSolicitante(solicitanteId);
        return ResponseEntity.noContent().build();
    }

    private Solicitante buscarSolicitante(Long id) {
        if (id == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "solicitanteId é obrigatório");
        }
        return solicitanteService.buscarSolicitantePorId(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Solicitante não encontrado"));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private OrcamentoResponseDTO toDTO(Orcamento orcamento) {
        return new OrcamentoResponseDTO(
            orcamento.getId(),
            orcamento.getSolicitante().getId(),
            orcamento.getCidade(),
            orcamento.getTipoObra(),
            orcamento.getFaseAtual(),
            orcamento.getPavimentos(),
            orcamento.getSolucoesRequeridas(),
            orcamento.getPrazo(),
            orcamento.getObservacoes(),
            orcamento.getCreatedAt(),
            orcamento.getUpdatedAt(),
            orcamento.getStatus(),
            orcamento.getSolicitante().getNome(),
            orcamento.getSolicitante().getEmpresa(),
            orcamento.getSolicitante().getCargo(),
            orcamento.getSolicitante().getEmail(),
            orcamento.getSolicitante().getTelefone(),
            orcamento.getSolicitante().getHorarioPreferido()
        );
    }
}
