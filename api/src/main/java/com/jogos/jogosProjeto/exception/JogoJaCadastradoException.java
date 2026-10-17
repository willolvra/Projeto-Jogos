package com.jogos.jogosProjeto.exception;

public class JogoJaCadastradoException extends JogosException {

    public JogoJaCadastradoException(String nome) {
        super("\"" + nome + "\" já está na sua biblioteca.");
    }
}
