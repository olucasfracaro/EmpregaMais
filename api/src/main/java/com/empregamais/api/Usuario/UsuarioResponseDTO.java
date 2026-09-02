package com.empregamais.api.Usuario;

import java.time.OffsetDateTime;

public record UsuarioResponseDTO(
    Long id,
    String nome,
    String email,
    String senha,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}