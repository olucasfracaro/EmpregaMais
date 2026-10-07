package com.empregamais.api.Analise;

import com.fasterxml.jackson.databind.JsonNode;

public record AnaliseRequestDTO(
    Long candidatoId,
    String status,
    JsonNode resultado,
    String modelo,
    String erro
) {}