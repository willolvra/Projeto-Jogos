package com.jogos.jogosProjeto.exception;

// base para os erros de negócio da aplicação; o TratadorDeErros traduz cada subclasse em uma resposta HTTP
public abstract class JogosException extends RuntimeException {

    protected JogosException(String mensagem) {
        super(mensagem);
    }
}
