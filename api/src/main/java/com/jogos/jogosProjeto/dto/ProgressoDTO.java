package com.jogos.jogosProjeto.dto;

import com.jogos.jogosProjeto.model.StatusJogo;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

// tudo além do status é opcional; o service descarta o que não faz sentido para o status (ex.: horas em QUERO_JOGAR)
public record ProgressoDTO(@NotNull(message = "Informe o status do jogo") StatusJogo status,
                           @Min(value = 0, message = "As horas jogadas não podem ser negativas")
                           @Max(value = 100000, message = "Esse número de horas parece alto demais")
                           Integer horasJogadas,
                           @PastOrPresent(message = "A data de início não pode estar no futuro")
                           LocalDate dataInicio,
                           @PastOrPresent(message = "A data de término não pode estar no futuro")
                           LocalDate dataTermino,
                           @Min(value = 1, message = "A nota vai de 1 a 10")
                           @Max(value = 10, message = "A nota vai de 1 a 10")
                           Integer notaPessoal,
                           @Size(max = 500, message = "O comentário pode ter no máximo 500 caracteres")
                           String comentario,
                           @Size(max = 100, message = "Nome de plataforma longo demais")
                           String plataformaJogada) {
}
