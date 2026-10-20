package com.jogos.jogosProjeto.service;

import com.jogos.jogosProjeto.dto.BuscaJogoDTO;
import com.jogos.jogosProjeto.dto.JogosDTO;
import com.jogos.jogosProjeto.dto.ProgressoDTO;
import com.jogos.jogosProjeto.dto.SugestaoDTO;
import com.jogos.jogosProjeto.exception.JogoJaCadastradoException;
import com.jogos.jogosProjeto.exception.JogoNaoEncontradoException;
import com.jogos.jogosProjeto.exception.ProgressoInvalidoException;
import com.jogos.jogosProjeto.model.Dev;
import com.jogos.jogosProjeto.model.Genero;
import com.jogos.jogosProjeto.model.Jogos;
import com.jogos.jogosProjeto.model.Plataforma;
import com.jogos.jogosProjeto.model.StatusJogo;
import com.jogos.jogosProjeto.repository.DevRepository;
import com.jogos.jogosProjeto.repository.GeneroRepository;
import com.jogos.jogosProjeto.repository.JogosRepository;
import com.jogos.jogosProjeto.repository.PlataformaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// teste unitário: nada de Spring, banco ou internet; repositórios e RAWG são simulados pelo Mockito
@ExtendWith(MockitoExtension.class)
class JogosServiceTest {

    @Mock
    private JogosRepository jogosRepository;
    @Mock
    private DevRepository devRepository;
    @Mock
    private GeneroRepository generoRepository;
    @Mock
    private PlataformaRepository plataformaRepository;
    // simula as respostas da RAWG
    @Mock
    private ConsumoApi consumoApi;
    // o conversor é o de verdade: transformar JSON em DTO também faz parte do que queremos testar
    @Spy
    private ConverteDados converteDados = new ConverteDados();

    @InjectMocks
    private JogosService service;

    private Jogos jogo;

    @BeforeEach
    void setUp() {
        jogo = new Jogos("Hollow Knight", "2017-02-24", 87, "poster.jpg");
        jogo.setId(1L);
        jogo.getPlataformas().add(new Plataforma("PC"));
        jogo.getPlataformas().add(new Plataforma("Nintendo Switch"));
    }

    private ProgressoDTO progresso(StatusJogo status, Integer horas, LocalDate inicio, LocalDate termino,
                                   Integer nota, String comentario, String plataforma) {
        return new ProgressoDTO(status, horas, inicio, termino, nota, comentario, plataforma);
    }

    @Nested
    class AtualizarProgresso {

        @BeforeEach
        void setUp() {
            when(jogosRepository.findById(1L)).thenReturn(Optional.of(jogo));
        }

        @Test
        void naoAceitaTerminoAntesDoInicio() {
            var dto = progresso(StatusJogo.ZERADO, 30, LocalDate.of(2024, 5, 10), LocalDate.of(2024, 5, 1),
                    9, null, null);

            assertThatThrownBy(() -> service.atualizarProgresso(1L, dto))
                    .isInstanceOf(ProgressoInvalidoException.class)
                    .hasMessageContaining("término");
            assertThat(jogo.getStatus()).isNull();
        }

        @Test
        void naoAceitaPlataformaQueOJogoNaoTem() {
            var dto = progresso(StatusJogo.JOGANDO, 5, null, null, null, null, "PlayStation 5");

            assertThatThrownBy(() -> service.atualizarProgresso(1L, dto))
                    .isInstanceOf(ProgressoInvalidoException.class)
                    .hasMessageContaining("PlayStation 5");
        }

        @Test
        void queroJogarDescartaHorasDatasNotaEComentario() {
            var dto = progresso(StatusJogo.QUERO_JOGAR, 10, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 2, 1),
                    8, "bom", "PC");

            var resultado = service.atualizarProgresso(1L, dto);

            assertThat(resultado.status()).isEqualTo(StatusJogo.QUERO_JOGAR);
            assertThat(resultado.plataformaJogada()).isEqualTo("PC");
            assertThat(resultado.horasJogadas()).isNull();
            assertThat(resultado.dataInicio()).isNull();
            assertThat(resultado.dataTermino()).isNull();
            assertThat(resultado.notaPessoal()).isNull();
            assertThat(resultado.comentario()).isNull();
        }

        @Test
        void jogandoSemHorasContaZeroENaoGuardaTerminoNemNota() {
            var inicio = LocalDate.of(2024, 3, 1);
            var dto = progresso(StatusJogo.JOGANDO, null, inicio, LocalDate.of(2024, 4, 1), 7, "ok", null);

            var resultado = service.atualizarProgresso(1L, dto);

            assertThat(resultado.horasJogadas()).isZero();
            assertThat(resultado.dataInicio()).isEqualTo(inicio);
            assertThat(resultado.dataTermino()).isNull();
            assertThat(resultado.notaPessoal()).isNull();
            assertThat(resultado.comentario()).isNull();
        }

        @Test
        void zeradoGuardaTudoEApagaComentarioEmBranco() {
            var inicio = LocalDate.of(2024, 3, 1);
            var termino = LocalDate.of(2024, 4, 1);
            var dto = progresso(StatusJogo.ZERADO, 40, inicio, termino, 10, "   ", " Nintendo Switch ");

            var resultado = service.atualizarProgresso(1L, dto);

            assertThat(resultado.status()).isEqualTo(StatusJogo.ZERADO);
            assertThat(resultado.horasJogadas()).isEqualTo(40);
            assertThat(resultado.dataTermino()).isEqualTo(termino);
            assertThat(resultado.notaPessoal()).isEqualTo(10);
            assertThat(resultado.comentario()).isNull();
            assertThat(resultado.plataformaJogada()).isEqualTo("Nintendo Switch");
        }
    }

    @Test
    void atualizarProgressoDeJogoInexistenteLancaExcecao() {
        when(jogosRepository.findById(99L)).thenReturn(Optional.empty());
        var dto = progresso(StatusJogo.JOGANDO, 1, null, null, null, null, null);

        assertThatThrownBy(() -> service.atualizarProgresso(99L, dto))
                .isInstanceOf(JogoNaoEncontradoException.class);
    }

    @Nested
    class ZerarJogo {

        @BeforeEach
        void setUp() {
            when(jogosRepository.findById(1L)).thenReturn(Optional.of(jogo));
        }

        @Test
        void soZeraJogoQueEstaSendoJogado() {
            jogo.setStatus(StatusJogo.QUERO_JOGAR);

            assertThatThrownBy(() -> service.zerarJogo(1L))
                    .isInstanceOf(ProgressoInvalidoException.class);
            assertThat(jogo.getStatus()).isEqualTo(StatusJogo.QUERO_JOGAR);
        }

        @Test
        void zeraUsandoHojeComoTerminoEMantemHoras() {
            jogo.setStatus(StatusJogo.JOGANDO);
            jogo.setHorasJogadas(25);

            var resultado = service.zerarJogo(1L);

            assertThat(resultado.status()).isEqualTo(StatusJogo.ZERADO);
            assertThat(resultado.dataTermino()).isEqualTo(LocalDate.now());
            assertThat(resultado.horasJogadas()).isEqualTo(25);
        }
    }

    @Nested
    class ExcluirJogo {

        @Test
        void excluiJogoExistente() {
            when(jogosRepository.existsById(1L)).thenReturn(true);

            service.excluirJogo(1L);

            verify(jogosRepository).deleteById(1L);
        }

        @Test
        void naoTentaExcluirJogoInexistente() {
            when(jogosRepository.existsById(99L)).thenReturn(false);

            assertThatThrownBy(() -> service.excluirJogo(99L))
                    .isInstanceOf(JogoNaoEncontradoException.class);
            verify(jogosRepository, never()).deleteById(any());
        }
    }

    @Nested
    class AdicionarJogo {

        private static final String JSON_HOLLOW_KNIGHT = """
                {
                  "name": "Hollow Knight",
                  "slug": "hollow-knight",
                  "released": "2017-02-24",
                  "metacritic": 87,
                  "background_image": "poster.jpg",
                  "playtime": 0,
                  "genres": [{"name": "Action"}],
                  "developers": [{"name": "Team Cherry"}],
                  "platforms": [{"platform": {"name": "PC"}}]
                }
                """;

        @Test
        void montaSlugPeloNomeDigitadoQuandoNaoVemSugestao() {
            when(consumoApi.obterDados(anyString())).thenReturn(JSON_HOLLOW_KNIGHT);

            service.adicionarJogo(new BuscaJogoDTO("  hollow   knight ", null));

            verify(consumoApi).obterDados(contains("/games/hollow-knight?"));
        }

        @Test
        void salvaJogoReaproveitandoGeneroExistenteECriandoOsNovos() {
            var acao = new Genero("Action");
            when(consumoApi.obterDados(anyString())).thenReturn(JSON_HOLLOW_KNIGHT);
            when(generoRepository.findByNome("Action")).thenReturn(Optional.of(acao));
            when(devRepository.findByNome("Team Cherry")).thenReturn(Optional.empty());
            when(plataformaRepository.findByNome("PC")).thenReturn(Optional.empty());

            JogosDTO resultado = service.adicionarJogo(new BuscaJogoDTO("Hollow Knight", "hollow-knight"));

            var captor = ArgumentCaptor.forClass(Jogos.class);
            verify(jogosRepository).save(captor.capture());
            var salvo = captor.getValue();
            assertThat(salvo.getNome()).isEqualTo("Hollow Knight");
            assertThat(salvo.getSlug()).isEqualTo("hollow-knight");
            // a RAWG manda 0 quando não sabe o tempo médio
            assertThat(salvo.getTempoMedio()).isNull();
            assertThat(salvo.getGeneros()).containsExactly(acao);
            assertThat(salvo.getDevs()).extracting(Dev::getNome).containsExactly("Team Cherry");

            verify(generoRepository, never()).save(any());
            verify(devRepository).save(any(Dev.class));
            verify(plataformaRepository).save(any(Plataforma.class));
            assertThat(resultado.name()).isEqualTo("Hollow Knight");
        }

        @Test
        void naoCadastraJogoRepetido() {
            when(consumoApi.obterDados(anyString())).thenReturn(JSON_HOLLOW_KNIGHT);
            when(jogosRepository.existsByNomeIgnoreCase("Hollow Knight")).thenReturn(true);

            assertThatThrownBy(() -> service.adicionarJogo(new BuscaJogoDTO("hollow knight", null)))
                    .isInstanceOf(JogoJaCadastradoException.class);
            verify(jogosRepository, never()).save(any());
        }

        @Test
        void jogoQueNaoExisteNaRawgLancaExcecao() {
            when(consumoApi.obterDados(anyString())).thenReturn(null);

            assertThatThrownBy(() -> service.adicionarJogo(new BuscaJogoDTO("jogo inventado", null)))
                    .isInstanceOf(JogoNaoEncontradoException.class);
            verify(jogosRepository, never()).save(any());
        }
    }

    @Nested
    class SugerirJogos {

        @Test
        void termoCurtoNaoConsultaARawg() {
            assertThat(service.sugerirJogos(" a ")).isEmpty();
            assertThat(service.sugerirJogos(null)).isEmpty();
            verifyNoInteractions(consumoApi);
        }

        @Test
        void devolveSugestoesComPosterEmMiniatura() {
            when(consumoApi.obterDados(contains("search=hollow"))).thenReturn("""
                    {"count": 1, "results": [{
                      "slug": "hollow-knight",
                      "name": "Hollow Knight",
                      "released": "2017-02-24",
                      "background_image": "https://media.rawg.io/media/games/abc/poster.jpg"
                    }]}
                    """);

            List<SugestaoDTO> sugestoes = service.sugerirJogos("hollow");

            assertThat(sugestoes).hasSize(1);
            assertThat(sugestoes.get(0).slug()).isEqualTo("hollow-knight");
            assertThat(sugestoes.get(0).poster())
                    .isEqualTo("https://media.rawg.io/media/resize/80/-/games/abc/poster.jpg");
        }
    }
}
