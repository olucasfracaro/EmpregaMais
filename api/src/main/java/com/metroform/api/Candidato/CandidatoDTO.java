package com.metroform.api.Candidato;

import java.time.OffsetDateTime;

public record CandidatoDTO(
    Integer id,
    String nome,
    String telefone,
    String email,
    String mensagem,
    String curriculoPath,
    String status,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}