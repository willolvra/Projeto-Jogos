package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

// a busca da RAWG responde {"count": ..., "results": [...]}; só os resultados interessam
@JsonIgnoreProperties(ignoreUnknown = true)
public record ResultadoBuscaDTO(List<SugestaoDTO> results) {
}
