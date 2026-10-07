package com.empregamais.api.Analise;

import java.time.OffsetDateTime;
import java.util.Map;

public record AnaliseResponseDTO(
    Long id,
    Long candidatoId,
    String status,
    Map<String, Object> resultado,
    String modelo,
    String erro,
    OffsetDateTime createdAt,
    OffsetDateTime finishedAt
) {}