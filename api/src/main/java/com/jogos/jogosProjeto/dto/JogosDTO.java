package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.jogos.jogosProjeto.model.StatusJogo;

import java.time.LocalDate;
import java.util.List;

// status, horasJogadas, datas, nota, comentário e plataforma jogada não existem na RAWG:
// só vêm preenchidos quando o DTO é montado a partir do banco
@JsonIgnoreProperties(ignoreUnknown = true)
public record JogosDTO(Long id,
                       @JsonAlias("name") String name,
                       @JsonAlias("released") String data,
                       @JsonAlias("metacritic") Integer avaliacao,
                       @JsonAlias("background_image") String poster,
                       @JsonAlias("genres") List<GeneroDTO> generos,
                       @JsonAlias("developers") List<DevDTO> desenvolvedores,
                       @JsonAlias("platforms") List<PlataformaDTO> plataformas,
                       StatusJogo status,
                       Integer horasJogadas,
                       LocalDate dataInicio,
                       LocalDate dataTermino,
                       String slug,
                       // tempo médio de jogo segundo a RAWG, em horas
                       @JsonAlias("playtime") Integer tempoMedio,
                       Integer notaPessoal,
                       String comentario,
                       String plataformaJogada){
}
