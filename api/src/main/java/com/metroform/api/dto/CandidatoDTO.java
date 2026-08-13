package com.metroform.api.dto;

public record CandidatoDTO(
    Integer id,
    String nome,
    String telefone,
    String email,
    String mensagem,
    String curriculoPath,
    String status,
    String createdAt,
    String updatedAt
) {}