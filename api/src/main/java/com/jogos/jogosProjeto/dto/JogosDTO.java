package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record JogosDTO(Long id,
                       @JsonAlias("name") String name,
                       @JsonAlias("released") String data,
                       @JsonAlias("metacritic") Integer avaliacao,
                       @JsonAlias("background_image") String poster,
                       @JsonAlias("genres") List<GeneroDTO> generos,
                       @JsonAlias("developers") List<DevDTO> desenvolvedores,
                       @JsonAlias("platforms") List<PlataformaDTO> plataformas){
}
