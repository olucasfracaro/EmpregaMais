package com.empregamais.api.Usuario;

public record UsuarioRequestDTO(
    String nome,
    String email,
    String senha
) {}