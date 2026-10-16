package com.jogos.jogosProjeto.service;

public interface IConverteDados {
    <T> T  obterDados(String json, Class<T> classe);
}

