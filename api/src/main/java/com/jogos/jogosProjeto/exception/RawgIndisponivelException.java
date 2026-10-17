package com.jogos.jogosProjeto.exception;

public class RawgIndisponivelException extends JogosException {

    // não recebe o endereço da requisição, pois ele carrega a chave da API
    public RawgIndisponivelException(int status) {
        super("A RAWG não respondeu como esperado (status " + status + "). Confira a chave da API ou tente de novo mais tarde.");
    }
}
