package com.jogos.jogosProjeto.service;

import com.jogos.jogosProjeto.dto.*;
import com.jogos.jogosProjeto.exception.JogoJaCadastradoException;
import com.jogos.jogosProjeto.exception.JogoNaoEncontradoException;
import com.jogos.jogosProjeto.model.Dev;
import com.jogos.jogosProjeto.model.Genero;
import com.jogos.jogosProjeto.model.Jogos;
import com.jogos.jogosProjeto.model.Plataforma;
import com.jogos.jogosProjeto.repository.DevRepository;
import com.jogos.jogosProjeto.repository.GeneroRepository;
import com.jogos.jogosProjeto.repository.JogosRepository;
import com.jogos.jogosProjeto.repository.PlataformaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
public class JogosService {

    private ConsumoApi consumoApi = new ConsumoApi();
    private ConverteDados converteDados = new ConverteDados();
    private final String ENDERECO = "https://api.rawg.io/api/games/";
    @Value("${rawg.api.key}")
    private String API_KEY;

    @Autowired
    private JogosRepository jogosRepository;
    @Autowired
    private DevRepository devRepository;
    @Autowired
    private GeneroRepository generoRepository;
    @Autowired
    private PlataformaRepository plataformaRepository;

    private List<JogosDTO> converteDados(List<Jogos> jogos) {
        return jogos.stream()
                .map(j -> new JogosDTO(
                        j.getId(),
                        j.getNome(),
                        j.getData(),
                        j.getAvaliacao(),
                        j.getPoster(),
                        j.getGeneros().stream().map(g -> new GeneroDTO(g.getNome())).toList(),
                        j.getDevs().stream().map(d -> new DevDTO(d.getNome())).toList(),
                        j.getPlataformas().stream().map(p -> new PlataformaDTO(new PlataformaInfoDTO(p.getNome()))).toList()))
                .collect(Collectors.toList());
    }

    private JogoNaoEncontradoException naoEncontradoNaRawg(String buscado) {
        return new JogoNaoEncontradoException("Jogo \"" + buscado + "\" não encontrado na RAWG. Tente o nome completo (ex.: the witcher 3 wild hunt).");
    }

    public void adicionarJogo(BuscaJogoDTO jogo) {
        var buscado = jogo.nome().trim();
        // codifica o slug para que caracteres como ?, # e & não quebrem a URL
        var slug = URLEncoder.encode(buscado.replaceAll("\\s+", "-"), StandardCharsets.UTF_8);
        var json = consumoApi.obterDados(ENDERECO + slug + "?key=" + API_KEY);
        if (json == null) {
            throw naoEncontradoNaRawg(buscado);
        }

        RedirecionamentoDTO redirecionamento = converteDados.obterDados(json, RedirecionamentoDTO.class);
        if (Boolean.TRUE.equals(redirecionamento.redirect())) {
            json = consumoApi.obterDados(ENDERECO + URLEncoder.encode(redirecionamento.slug(), StandardCharsets.UTF_8) + "?key=" + API_KEY);
            if (json == null) {
                throw naoEncontradoNaRawg(buscado);
            }
        }

        JogosDTO dados = converteDados.obterDados(json, JogosDTO.class);
        if (dados.name() == null) {
            throw naoEncontradoNaRawg(buscado);
        }
        // compara pelo nome oficial da RAWG, já que "the witcher 3" e "The Witcher 3: Wild Hunt" são o mesmo jogo
        if (jogosRepository.existsByNomeIgnoreCase(dados.name())) {
            throw new JogoJaCadastradoException(dados.name());
        }
        Jogos jogos = new Jogos(dados.name(), dados.data(), dados.avaliacao(), dados.poster());

        // gêneros
        if (dados.generos() != null) {
            for (GeneroDTO generoDTO : dados.generos()) {
                Optional<Genero> verificar = generoRepository.findByNome(generoDTO.genero());

                if (verificar.isPresent()) {
                    jogos.getGeneros().add(verificar.get());
                } else {
                    Genero genero = new Genero();
                    genero.setNome(generoDTO.genero());
                    generoRepository.save(genero);
                    jogos.getGeneros().add(genero);
                }
            }
        }

        // desenvolvedoras
        if (dados.desenvolvedores() != null) {
            for (DevDTO devDTO : dados.desenvolvedores()) {
                Optional<Dev> verificarDev = devRepository.findByNome(devDTO.desenvolvedores());

                if (verificarDev.isPresent()) {
                    jogos.getDevs().add(verificarDev.get());
                } else {
                    Dev dev = new Dev();
                    dev.setNome(devDTO.desenvolvedores());
                    devRepository.save(dev);
                    jogos.getDevs().add(dev);
                }
            }
        }

        // plataformas
        if (dados.plataformas() != null) {
            for (PlataformaDTO plataformaDTO : dados.plataformas()) {
                Optional<Plataforma> verificarPlat = plataformaRepository.findByNome(plataformaDTO.platform().nome());

                if (verificarPlat.isPresent()) {
                    jogos.getPlataformas().add(verificarPlat.get());
                } else {
                    Plataforma plataforma = new Plataforma();
                    plataforma.setNome(plataformaDTO.platform().nome());
                    plataformaRepository.save(plataforma);
                    jogos.getPlataformas().add(plataforma);
                }
            }
        }

        jogosRepository.save(jogos);
    }

    // gêneros, devs e plataformas continuam no banco, pois podem ser usados por outros jogos
    @Transactional
    public void excluirJogo(Long id) {
        if (!jogosRepository.existsById(id)) {
            throw new JogoNaoEncontradoException("Esse jogo já não existe mais (id " + id + ").");
        }
        jogosRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<JogosDTO> listarJogo() {
        return converteDados(jogosRepository.findAll());
    }
}
