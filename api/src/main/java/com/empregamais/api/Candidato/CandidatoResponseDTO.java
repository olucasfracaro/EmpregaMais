package com.empregamais.api.Candidato;

import java.time.OffsetDateTime;

public record CandidatoResponseDTO(
    Long id,
    String nome,
    String telefone,
    String email,
    String mensagem,
    String curriculoPath,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}