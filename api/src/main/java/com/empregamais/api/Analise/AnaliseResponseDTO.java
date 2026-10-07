package com.empregamais.api.Analise;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.JsonNode;

public record AnaliseResponseDTO(
    Long id,
    Long candidatoId,
    String status,
    JsonNode resultado,
    String modelo,
    String erro,
    OffsetDateTime createdAt,
    OffsetDateTime finishedAt
) {}