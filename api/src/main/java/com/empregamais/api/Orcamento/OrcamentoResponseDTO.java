package com.empregamais.api.Orcamento;

import java.time.OffsetDateTime;

public record OrcamentoResponseDTO(
    Long id,
    Long solicitanteId,
    String cidade,
    String tipoObra,
    String faseAtual,
    Integer pavimentos,
    String solucoesRequeridas,
    String prazo,
    String observacoes,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
