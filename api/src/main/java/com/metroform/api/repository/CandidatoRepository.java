package com.metroform.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.metroform.api.model.Candidato;

@Repository
public interface CandidatoRepository extends JpaRepository<Candidato, Integer> {
    
}
