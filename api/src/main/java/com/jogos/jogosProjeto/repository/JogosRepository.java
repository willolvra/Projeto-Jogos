package com.jogos.jogosProjeto.repository;

import com.jogos.jogosProjeto.model.Jogos;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JogosRepository extends JpaRepository<Jogos, Long> {
}
