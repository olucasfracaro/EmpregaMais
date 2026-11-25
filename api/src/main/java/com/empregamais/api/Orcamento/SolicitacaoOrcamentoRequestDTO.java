package com.empregamais.api.Orcamento;

import com.empregamais.api.Solicitante.SolicitanteRequestDTO;

public record SolicitacaoOrcamentoRequestDTO(
    SolicitanteRequestDTO solicitante,
    String cidade,
    String tipoObra,
    String faseAtual,
    Integer pavimentos,
    String solucoesRequeridas,
    String prazo,
    String observacoes
) {}
