package com.jogos.jogosProjeto.repository;

import com.jogos.jogosProjeto.model.Dev;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DevRepository extends JpaRepository<Dev, Long> {
    Optional<Dev> findByNome(String desenvolvedores);
}
