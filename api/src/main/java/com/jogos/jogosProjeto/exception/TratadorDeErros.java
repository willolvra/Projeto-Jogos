package com.jogos.jogosProjeto.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// centraliza a tradução das exceções em respostas HTTP no formato ProblemDetail ({"status", "detail", ...})
@RestControllerAdvice
public class TratadorDeErros {

    @ExceptionHandler(JogoNaoEncontradoException.class)
    public ProblemDetail naoEncontrado(JogoNaoEncontradoException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(JogoJaCadastradoException.class)
    public ProblemDetail jaCadastrado(JogoJaCadastradoException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(ProgressoInvalidoException.class)
    public ProblemDetail progressoInvalido(ProgressoInvalidoException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(RawgIndisponivelException.class)
    public ProblemDetail rawgIndisponivel(RawgIndisponivelException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, e.getMessage());
    }

    // erros do @Valid: devolve a mensagem da primeira anotação que falhou (ex.: "Informe o nome do jogo")
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail dadosInvalidos(MethodArgumentNotValidException e) {
        var erro = e.getBindingResult().getFieldError();
        var mensagem = erro != null ? erro.getDefaultMessage() : "Dados inválidos.";
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, mensagem);
    }

    // JSON malformado ou valor desconhecido num enum (ex.: status "ABANDONADO")
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail corpoInvalido(HttpMessageNotReadableException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Dados inválidos no corpo da requisição.");
    }
}
