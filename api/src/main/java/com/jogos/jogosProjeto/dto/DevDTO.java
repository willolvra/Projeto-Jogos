package com.jogos.jogosProjeto.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record DevDTO(@JsonAlias("name") String desenvolvedores){
}
