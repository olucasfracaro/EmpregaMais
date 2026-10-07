package com.empregamais.api.Analise;

import java.util.Map;

public record AnaliseRequestDTO(
    Long candidatoId,
    String status,
    Map<String, Object> resultado,
    String modelo,
    String erro
) {}