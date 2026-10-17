package com.jogos.jogosProjeto.dto;

import java.util.List;

public record DetalhesDTO(String descricao,
                          List<ScreenshotDTO> screenshots,
                          String trailer,
                          String trailerCapa,
                          Integer tempoMedio,
                          String site) {

    public record ScreenshotDTO(String miniatura, String original) {
    }
}
