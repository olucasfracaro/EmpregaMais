package com.empregamais.api.Usuario;

import java.time.OffsetDateTime;

public record UsuarioResponseDTO(
    Long id,
    String nome,
    String email,
    String senha,
    String papel,
    boolean ativo,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}