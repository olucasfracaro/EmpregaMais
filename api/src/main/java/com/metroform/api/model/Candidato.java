package com.metroform.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "candidatos")
public class Candidato {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome", nullable = false)
    private String nome;
    @Column(name = "telefone", nullable = false)
    private String telefone;
    @Column(name = "email", nullable = false, unique = true)
    private String email;
    @Column(name = "mensagem", nullable = true)
    private String mensagem;
    @Column(name = "curriculo_path", nullable = false)
    private String curriculoPath;
    @Column(name = "status", nullable = false)
    private String status;
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

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    
    public String getCurriculoPath() { return curriculoPath; }
    public void setCurriculoPath(String curriculoPath) { this.curriculoPath = curriculoPath; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Candidato() {}

    public Candidato(Long id, String nome, String telefone, String email, String mensagem, String curriculoPath, String status, OffsetDateTime createdAt) {
        this.id = id;
        this.nome = nome;
        this.telefone = telefone;
        this.email = email;
        this.mensagem = mensagem;
        this.curriculoPath = curriculoPath;
        this.status = status;
        this.createdAt = createdAt;
    }
}
