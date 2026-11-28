package com.empregamais.api.Analise;

import jakarta.validation.constraints.Size;

public record AnaliseCurriculoRequestDTO(
    @Size(max = 1000, message = "Informe até 1000 caracteres de competências desejáveis.")
    String criteriosRevisao
) {}
