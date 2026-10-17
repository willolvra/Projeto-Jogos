package com.jogos.jogosProjeto.service;

import com.jogos.jogosProjeto.dto.*;
import com.jogos.jogosProjeto.exception.JogoJaCadastradoException;
import com.jogos.jogosProjeto.exception.JogoNaoEncontradoException;
import com.jogos.jogosProjeto.exception.ProgressoInvalidoException;
import com.jogos.jogosProjeto.exception.RawgIndisponivelException;
import com.jogos.jogosProjeto.model.Dev;
import com.jogos.jogosProjeto.model.Genero;
import com.jogos.jogosProjeto.model.Jogos;
import com.jogos.jogosProjeto.model.Plataforma;
import com.jogos.jogosProjeto.model.StatusJogo;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
public class JogosService {

    private ConsumoApi consumoApi = new ConsumoApi();
    private ConverteDados converteDados = new ConverteDados();
    private final String ENDERECO = "https://api.rawg.io/api/games/";
    private final String ENDERECO_BUSCA = "https://api.rawg.io/api/games";
    private final int MAXIMO_SUGESTOES = 6;
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

    private JogosDTO converteDados(Jogos j) {
        return new JogosDTO(
                j.getId(),
                j.getNome(),
                j.getData(),
                j.getAvaliacao(),
                j.getPoster(),
                j.getGeneros().stream().map(g -> new GeneroDTO(g.getNome())).toList(),
                j.getDevs().stream().map(d -> new DevDTO(d.getNome())).toList(),
                j.getPlataformas().stream().map(p -> new PlataformaDTO(new PlataformaInfoDTO(p.getNome()))).toList(),
                j.getStatus(),
                j.getHorasJogadas(),
                j.getDataInicio(),
                j.getDataTermino(),
                j.getSlug(),
                j.getTempoMedio(),
                j.getNotaPessoal(),
                j.getComentario(),
                j.getPlataformaJogada());
    }

    private List<JogosDTO> converteDados(List<Jogos> jogos) {
        return jogos.stream()
                .map(this::converteDados)
                .collect(Collectors.toList());
    }

    private JogoNaoEncontradoException naoEncontradoNaRawg(String buscado) {
        return new JogoNaoEncontradoException("Jogo \"" + buscado + "\" não encontrado na RAWG. Tente o nome completo (ex.: the witcher 3 wild hunt).");
    }

    public List<SugestaoDTO> sugerirJogos(String termo) {
        var buscado = termo == null ? "" : termo.trim();
        if (buscado.length() < 2) {
            return List.of();
        }
        var endereco = ENDERECO_BUSCA + "?search=" + URLEncoder.encode(buscado, StandardCharsets.UTF_8)
                + "&page_size=" + MAXIMO_SUGESTOES + "&key=" + API_KEY;
        var json = consumoApi.obterDados(endereco);
        if (json == null) {
            return List.of();
        }
        var resultado = converteDados.obterDados(json, ResultadoBuscaDTO.class);
        if (resultado.results() == null) {
            return List.of();
        }
        return resultado.results().stream()
                .map(s -> new SugestaoDTO(s.slug(), s.nome(), s.lancamento(), miniatura(s.poster())))
                .toList();
    }

    // a RAWG serve versões redimensionadas da mesma imagem; a original pesa vários MB e a sugestão só precisa de uma miniatura
    private String miniatura(String poster) {
        if (poster == null) {
            return null;
        }
        return poster.replace("/media/games/", "/media/resize/80/-/games/");
    }

    // busca o JSON completo de um jogo na RAWG, seguindo o redirecionamento quando o slug não é o exato
    private String buscarJsonNaRawg(String slugTentativa, String buscado) {
        // codifica o slug para que caracteres como ?, # e & não quebrem a URL
        var slug = URLEncoder.encode(slugTentativa, StandardCharsets.UTF_8);
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
        return json;
    }

    // a RAWG usa 0 quando não sabe o tempo médio
    private Integer tempoMedioValido(Integer tempoMedio) {
        return tempoMedio != null && tempoMedio > 0 ? tempoMedio : null;
    }

    public JogosDTO adicionarJogo(BuscaJogoDTO jogo) {
        var buscado = jogo.nome().trim();
        // com uma sugestão escolhida, o slug já é o exato da RAWG; senão, monta um a partir do nome digitado
        var slugInformado = jogo.slug() != null && !jogo.slug().isBlank()
                ? jogo.slug().trim()
                : buscado.replaceAll("\\s+", "-");
        var json = buscarJsonNaRawg(slugInformado, buscado);

        JogosDTO dados = converteDados.obterDados(json, JogosDTO.class);
        if (dados.name() == null) {
            throw naoEncontradoNaRawg(buscado);
        }
        // compara pelo nome oficial da RAWG, já que "the witcher 3" e "The Witcher 3: Wild Hunt" são o mesmo jogo
        if (jogosRepository.existsByNomeIgnoreCase(dados.name())) {
            throw new JogoJaCadastradoException(dados.name());
        }
        Jogos jogos = new Jogos(dados.name(), dados.data(), dados.avaliacao(), dados.poster());
        jogos.setSlug(dados.slug());
        jogos.setTempoMedio(tempoMedioValido(dados.tempoMedio()));

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
        return converteDados(jogos);
    }

    private Jogos buscarJogo(Long id) {
        return jogosRepository.findById(id)
                .orElseThrow(() -> new JogoNaoEncontradoException("Esse jogo já não existe mais (id " + id + ")."));
    }

    private String textoOuNulo(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }

    @Transactional
    public JogosDTO atualizarProgresso(Long id, ProgressoDTO progresso) {
        Jogos jogo = buscarJogo(id);
        var status = progresso.status();
        var temTermino = status == StatusJogo.ZERADO || status == StatusJogo.ABANDONADO;
        if (temTermino && progresso.dataInicio() != null && progresso.dataTermino() != null
                && progresso.dataTermino().isBefore(progresso.dataInicio())) {
            throw new ProgressoInvalidoException("A data de término não pode ser antes da data de início.");
        }

        var plataforma = textoOuNulo(progresso.plataformaJogada());
        if (plataforma != null && jogo.getPlataformas().stream().noneMatch(p -> p.getNome().equals(plataforma))) {
            throw new ProgressoInvalidoException("\"" + plataforma + "\" não é uma plataforma desse jogo.");
        }
        // a plataforma vale para qualquer status (dá para anotar onde se quer jogar)
        jogo.setPlataformaJogada(plataforma);

        jogo.setStatus(status);
        // cada status só guarda o que faz sentido para ele:
        // QUERO_JOGAR -> nada; JOGANDO -> horas e início;
        // ZERADO e ABANDONADO -> tudo isso mais término (zerou / parou em), nota e comentário,
        // já que só dá para avaliar o jogo depois de terminar
        if (status == StatusJogo.QUERO_JOGAR) {
            jogo.setHorasJogadas(null);
            jogo.setDataInicio(null);
        } else {
            // sem horas informadas conta como 0
            jogo.setHorasJogadas(progresso.horasJogadas() != null ? progresso.horasJogadas() : 0);
            jogo.setDataInicio(progresso.dataInicio());
        }
        jogo.setDataTermino(temTermino ? progresso.dataTermino() : null);
        jogo.setNotaPessoal(temTermino ? progresso.notaPessoal() : null);
        jogo.setComentario(temTermino ? textoOuNulo(progresso.comentario()) : null);
        return converteDados(jogo);
    }

    // atalho do botão "Marcar como zerado": mantém horas e início, e usa hoje como término
    @Transactional
    public JogosDTO zerarJogo(Long id) {
        Jogos jogo = buscarJogo(id);
        if (jogo.getStatus() != StatusJogo.JOGANDO) {
            throw new ProgressoInvalidoException("Só jogos com status \"Jogando\" podem ser marcados como zerados por aqui.");
        }
        jogo.setStatus(StatusJogo.ZERADO);
        jogo.setDataTermino(LocalDate.now());
        return converteDados(jogo);
    }

    // jogos cadastrados antes de o slug ser salvo: procura pelo nome oficial na busca da RAWG
    private String descobrirSlug(Jogos jogo) {
        var endereco = ENDERECO_BUSCA + "?search=" + URLEncoder.encode(jogo.getNome(), StandardCharsets.UTF_8)
                + "&page_size=5&key=" + API_KEY;
        var json = consumoApi.obterDados(endereco);
        var resultado = json == null ? null : converteDados.obterDados(json, ResultadoBuscaDTO.class);
        if (resultado == null || resultado.results() == null || resultado.results().isEmpty()) {
            throw naoEncontradoNaRawg(jogo.getNome());
        }
        // prefere o resultado com o nome idêntico; senão, fica com o mais relevante
        return resultado.results().stream()
                .filter(r -> jogo.getNome().equalsIgnoreCase(r.nome()))
                .findFirst()
                .orElse(resultado.results().get(0))
                .slug();
    }

    // screenshots e trailer são extras: se a RAWG falhar nessas chamadas, a tela de detalhes abre sem eles
    private <T> T buscarExtra(String endereco, Class<T> classe) {
        try {
            var json = consumoApi.obterDados(endereco);
            return json == null ? null : converteDados.obterDados(json, classe);
        } catch (RawgIndisponivelException e) {
            return null;
        }
    }

    @Transactional
    public DetalhesDTO detalharJogo(Long id) {
        Jogos jogo = buscarJogo(id);
        var slugTentativa = jogo.getSlug() != null ? jogo.getSlug() : descobrirSlug(jogo);
        var json = buscarJsonNaRawg(slugTentativa, jogo.getNome());
        var dados = converteDados.obterDados(json, JogosDTO.class);
        var detalhes = converteDados.obterDados(json, MidiasRawgDTO.Detalhes.class);

        // aproveita a consulta para completar jogos antigos, que não tinham slug nem tempo médio salvos
        if (jogo.getSlug() == null) {
            jogo.setSlug(dados.slug());
        }
        if (jogo.getTempoMedio() == null) {
            jogo.setTempoMedio(tempoMedioValido(dados.tempoMedio()));
        }

        var slug = URLEncoder.encode(jogo.getSlug(), StandardCharsets.UTF_8);
        var screenshots = buscarExtra(ENDERECO + slug + "/screenshots?key=" + API_KEY, MidiasRawgDTO.Screenshots.class);
        var videos = buscarExtra(ENDERECO + slug + "/movies?key=" + API_KEY, MidiasRawgDTO.Videos.class);

        List<DetalhesDTO.ScreenshotDTO> listaScreenshots = screenshots == null || screenshots.results() == null
                ? List.of()
                : screenshots.results().stream()
                        .filter(i -> i.image() != null)
                        // miniatura redimensionada pela própria RAWG; a original abre ao clicar
                        .map(i -> new DetalhesDTO.ScreenshotDTO(
                                i.image().replace("/media/screenshots/", "/media/resize/640/-/screenshots/"),
                                i.image()))
                        .toList();

        String trailer = null;
        String trailerCapa = null;
        if (videos != null && videos.results() != null && !videos.results().isEmpty()) {
            var video = videos.results().get(0);
            trailerCapa = video.preview();
            if (video.data() != null) {
                trailer = video.data().max() != null ? video.data().max() : video.data().baixa();
            }
        }

        return new DetalhesDTO(textoOuNulo(detalhes.descricao()), listaScreenshots, trailer, trailerCapa,
                jogo.getTempoMedio(), textoOuNulo(detalhes.website()));
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
