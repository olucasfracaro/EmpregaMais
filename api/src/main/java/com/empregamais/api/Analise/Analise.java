package com.empregamais.api.Analise;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.OffsetDateTime;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "analises_curriculo")
public class Analise {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "candidato_id", nullable = false)
    private Long candidatoId;
    @Column(name = "status", nullable = true)
    private String status;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "resultado", nullable = false, columnDefinition = "jsonb")
    private JsonNode resultado;
    @Column(name = "modelo", nullable = false)
    private String modelo;
    @Column(name = "erro", nullable = true)
    private String erro;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "finished_at", nullable = true)
    private OffsetDateTime finishedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getCandidatoId() { return candidatoId; }
    public void setCandidatoId(Long candidatoId) { this.candidatoId = candidatoId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public JsonNode getResultado() { return resultado; }
    public void setResultado(JsonNode resultado) { this.resultado = resultado; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public String getErro() { return erro; }
    public void setErro(String erro) { this.erro = erro; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getFinishedAt() { return finishedAt; }
    public void setFinishedAt(OffsetDateTime finishedAt) { this.finishedAt = finishedAt; }

    public Analise() {}

    public Analise(Long id, Long candidatoId, String status, JsonNode resultado, String modelo, String erro, OffsetDateTime createdAt, OffsetDateTime finishedAt) {
        this.id = id;
        this.candidatoId = candidatoId;
        this.status = status;
        this.resultado = resultado;
        this.modelo = modelo;
        this.erro = erro;
        this.createdAt = createdAt;
        this.finishedAt = finishedAt;
    }
}
