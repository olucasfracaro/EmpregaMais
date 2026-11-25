package com.empregamais.api.Solicitante;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.OffsetDateTime;

@Entity
@Table(name = "solicitante")
public class Solicitante {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome", nullable = false)
    private String nome;
    @Column(name = "cargo", nullable = true)
    private String cargo;
    @Column(name = "empresa", nullable = false)
    private String empresa;
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    @Column(name = "telefone", nullable = false)
    private String telefone;
    @Column(name = "horario_preferido", nullable = true)
    private String horarioPreferido;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = true)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; } 

    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }

    public String getEmpresa() { return empresa; }
    public void setEmpresa(String empresa) { this.empresa = empresa; } 
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }

    public String getHorarioPreferido() { return horarioPreferido; }
    public void setHorarioPreferido(String horarioPreferido) { this.horarioPreferido = horarioPreferido; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Solicitante() {}

    public Solicitante(Long id, String nome, String cargo, String empresa, String email, String telefone, String horarioPreferido, OffsetDateTime createdAt) {
        this.id = id;
        this.nome = nome;
        this.cargo = cargo;
        this.empresa = empresa;
        this.email = email;
        this.telefone = telefone;
        this.horarioPreferido = horarioPreferido;
        this.createdAt = createdAt;
    }
}
