package com.jogos.jogosProjeto.dto;

import jakarta.validation.constraints.NotBlank;

// slug é opcional: vem preenchido quando o usuário escolhe uma sugestão, e aí o cadastro não depende do nome digitado
public record BuscaJogoDTO(@NotBlank(message = "Informe o nome do jogo") String nome, String slug){
}
