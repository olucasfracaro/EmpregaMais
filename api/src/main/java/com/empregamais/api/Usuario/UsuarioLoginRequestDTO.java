package com.empregamais.api.Usuario;

public record UsuarioLoginRequestDTO(
    String email,
    String senha
) {}