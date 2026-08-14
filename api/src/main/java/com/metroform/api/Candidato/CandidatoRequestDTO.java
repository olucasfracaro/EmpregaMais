package com.metroform.api.Candidato;

public record CandidatoRequestDTO(
    String nome,
    String telefone,
    String email,
    String mensagem,
    String curriculoPath
) {}