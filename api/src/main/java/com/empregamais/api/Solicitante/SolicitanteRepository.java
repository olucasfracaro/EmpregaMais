package com.empregamais.api.Solicitante;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SolicitanteRepository extends JpaRepository<Solicitante, Long> {
	boolean existsByEmail(String email);
}
