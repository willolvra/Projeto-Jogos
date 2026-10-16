package com.jogos.jogosProjeto.repository;

import com.jogos.jogosProjeto.model.Genero;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GeneroRepository extends JpaRepository<Genero, Long> {
    Optional<Genero> findByNome(String genero);
}
