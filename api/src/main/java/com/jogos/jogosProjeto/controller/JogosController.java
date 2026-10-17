package com.jogos.jogosProjeto.controller;

import com.jogos.jogosProjeto.dto.BuscaJogoDTO;
import com.jogos.jogosProjeto.dto.DetalhesDTO;
import com.jogos.jogosProjeto.dto.JogosDTO;
import com.jogos.jogosProjeto.dto.ProgressoDTO;
import com.jogos.jogosProjeto.dto.SugestaoDTO;
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

    @GetMapping("/sugestoes")
    public List<SugestaoDTO> sugerirJogos(@RequestParam(defaultValue = "") String termo){
        return servico.sugerirJogos(termo);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<JogosDTO> adicionarJogo(@RequestBody @Valid BuscaJogoDTO busca){
        // devolve o jogo criado para o front já abrir o popup de progresso com o id dele
        return ResponseEntity.ok(servico.adicionarJogo(busca));
    }

    @PutMapping("/{id}/progresso")
    public JogosDTO atualizarProgresso(@PathVariable Long id, @RequestBody @Valid ProgressoDTO progresso){
        return servico.atualizarProgresso(id, progresso);
    }

    @GetMapping("/{id}/detalhes")
    public DetalhesDTO detalharJogo(@PathVariable Long id){
        return servico.detalharJogo(id);
    }

    @PatchMapping("/{id}/zerar")
    public JogosDTO zerarJogo(@PathVariable Long id){
        return servico.zerarJogo(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluirJogo(@PathVariable Long id){
        servico.excluirJogo(id);
        return ResponseEntity.noContent().build();
    }
}
