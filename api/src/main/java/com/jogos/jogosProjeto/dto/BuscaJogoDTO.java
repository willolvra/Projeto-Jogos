package com.jogos.jogosProjeto.dto;

import jakarta.validation.constraints.NotBlank;

public record BuscaJogoDTO(@NotBlank(message = "Informe o nome do jogo") String nome){
}
