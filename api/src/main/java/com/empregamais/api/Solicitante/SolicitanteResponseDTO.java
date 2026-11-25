package com.empregamais.api.Solicitante;

import java.time.OffsetDateTime;

public record SolicitanteResponseDTO(
    Long id,
    String nome,
    String cargo,
    String empresa,
    String email,
    String telefone,
    String horarioPreferido,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}
