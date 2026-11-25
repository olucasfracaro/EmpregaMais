package com.empregamais.api.Solicitante;

public record SolicitanteRequestDTO(
    String nome,
    String cargo,
    String empresa,
    String email,
    String telefone,
    String horarioPreferido
) {}
