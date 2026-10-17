package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// um item da busca da RAWG, só com o necessário para exibir a sugestão e depois cadastrar pelo slug
@JsonIgnoreProperties(ignoreUnknown = true)
public record SugestaoDTO(String slug,
                          @JsonAlias("name") String nome,
                          @JsonAlias("released") String lancamento,
                          @JsonAlias("background_image") String poster) {
}
