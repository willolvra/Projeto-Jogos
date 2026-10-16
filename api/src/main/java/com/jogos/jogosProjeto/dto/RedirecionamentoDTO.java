package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

// a RAWG responde {"redirect": true, "slug": "..."} quando o nome buscado não é o slug exato do jogo
@JsonIgnoreProperties(ignoreUnknown = true)
public record RedirecionamentoDTO(Boolean redirect, String slug) {
}
