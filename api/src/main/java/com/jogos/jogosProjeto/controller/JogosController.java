package com.jogos.jogosProjeto.controller;

import com.jogos.jogosProjeto.dto.BuscaJogoDTO;
import com.jogos.jogosProjeto.dto.JogosDTO;
import com.jogos.jogosProjeto.service.JogosService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/jogos")
public class JogosController {
    @Autowired
    private JogosService servico;

    @GetMapping
    public List<JogosDTO> listarJogos(){
        return servico.listarJogo();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<String> adicionarJogo(@RequestBody @Valid BuscaJogoDTO busca){
        servico.adicionarJogo(busca);
        return ResponseEntity.ok("Deu certo!");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluirJogo(@PathVariable Long id){
        servico.excluirJogo(id);
        return ResponseEntity.noContent().build();
    }
}
