package com.metroform.api.dto;

public record CandidatoDTO(
    Integer id,
    String nome,
    String email,
    String telefone
) {}