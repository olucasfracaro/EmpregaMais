package com.metroform.api.Candidato;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CandidatoRequestDTO(
    String nome,
    String telefone,
    String email,
    String mensagem,
    @JsonProperty("curriculo_path")
    String curriculoPath
) {}