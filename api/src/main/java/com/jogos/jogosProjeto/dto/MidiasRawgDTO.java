package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

// formatos das respostas da RAWG usados na tela de detalhes; só servem para ler o JSON
public final class MidiasRawgDTO {

    private MidiasRawgDTO() {
    }

    // GET /games/{slug}: além do que o JogosDTO já lê
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Detalhes(@JsonAlias("description_raw") String descricao, String website) {
    }

    // GET /games/{slug}/screenshots -> {"results": [{"image": "..."}]}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Screenshots(List<Imagem> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Imagem(String image) {
    }

    // GET /games/{slug}/movies -> {"results": [{"preview": "...", "data": {"480": "...", "max": "..."}}]}
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Videos(List<Video> results) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Video(String preview, Arquivos data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Arquivos(@JsonAlias("480") String baixa, String max) {
    }
}
