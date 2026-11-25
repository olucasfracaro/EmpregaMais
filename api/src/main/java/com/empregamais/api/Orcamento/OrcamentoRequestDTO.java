package com.empregamais.api.Orcamento;

public record OrcamentoRequestDTO(
    Long solicitanteId,
    String cidade,
    String tipoObra,
    String faseAtual,
    Integer pavimentos,
    String solucoesRequeridas,
    String prazo,
    String observacoes
) {}
