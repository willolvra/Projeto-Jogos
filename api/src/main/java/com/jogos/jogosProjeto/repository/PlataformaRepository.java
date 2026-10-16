package com.jogos.jogosProjeto.repository;

import com.jogos.jogosProjeto.dto.PlataformaInfoDTO;
import com.jogos.jogosProjeto.model.Plataforma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlataformaRepository extends JpaRepository<Plataforma, Long> {
    Optional<Plataforma> findByNome(String plat);
}
