package com.empregamais.api.Orcamento;

import com.empregamais.api.Solicitante.Solicitante;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.OffsetDateTime;

@Entity
@Table(name = "orcamento")
public class Orcamento {

    @Schema(accessMode = Schema.AccessMode.READ_ONLY)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "solicitante_id", referencedColumnName = "id", nullable = false)
    private Solicitante solicitante;

    @Column(name = "cidade", nullable = false)
    private String cidade;
    @Column(name = "tipo_obra", nullable = true)
    private String tipoObra;
    @Column(name = "fase_atual", nullable = true)
    private String faseAtual;
    @Column(name = "pavimentos", nullable = true)
    private Integer pavimentos;
    @Column(name = "solucoes_requeridas", nullable = false)
    private String solucoesRequeridas;
    @Column(name = "prazo", nullable = true)
    private String prazo;
    @Column(name = "observacoes", nullable = true)
    private String observacoes;
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = true)
    private OffsetDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Solicitante getSolicitante() { return solicitante; }
    public void setSolicitante(Solicitante solicitante) { this.solicitante = solicitante; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getTipoObra() { return tipoObra; }
    public void setTipoObra(String tipoObra) { this.tipoObra = tipoObra; }
    
    public String getFaseAtual() { return faseAtual; }
    public void setFaseAtual(String faseAtual) { this.faseAtual = faseAtual; }

    public Integer getPavimentos() { return pavimentos; }
    public void setPavimentos(Integer pavimentos) { this.pavimentos = pavimentos; }
    
    public String getSolucoesRequeridas() { return solucoesRequeridas; }
    public void setSolucoesRequeridas(String solucoesRequeridas) { this.solucoesRequeridas = solucoesRequeridas; }

    public String getPrazo() { return prazo; }
    public void setPrazo(String prazo) { this.prazo = prazo; }

    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Orcamento() {}

    public Orcamento(Long id, Solicitante solicitante, String cidade, String tipoObra, String faseAtual, Integer pavimentos, String solucoesRequeridas, String prazo, String observacoes, OffsetDateTime createdAt) {
        this.id = id;
        this.solicitante = solicitante;
        this.cidade = cidade;
        this.tipoObra = tipoObra;
        this.faseAtual = faseAtual;
        this.pavimentos = pavimentos;
        this.solucoesRequeridas = solucoesRequeridas;
        this.prazo = prazo;
        this.observacoes = observacoes;
        this.createdAt = createdAt;
    }
}
