package com.jogos.jogosProjeto.model;

import com.jogos.jogosProjeto.dto.JogosDTO;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "jogos")
public class Jogos {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true)
    private String nome;
    private String data;
    private Integer avaliacao;
    private String poster;
    // ficam nulos até o usuário informar o progresso (e em jogos cadastrados antes dessa funcionalidade)
    @Enumerated(EnumType.STRING)
    private StatusJogo status;
    private Integer horasJogadas;
    private LocalDate dataInicio;
    private LocalDate dataTermino;
    // identificador do jogo na RAWG, usado para buscar descrição, screenshots e trailer
    private String slug;
    private Integer tempoMedio;
    private Integer notaPessoal;
    @Column(length = 500)
    private String comentario;
    private String plataformaJogada;

    @ManyToMany
    @JoinTable(
            name = "jogo_devs",
            joinColumns = @JoinColumn(name = "jogo_id"),
            inverseJoinColumns = @JoinColumn(name = "devs_id")
    )
    private List<Dev> devs = new ArrayList<>();
    @ManyToMany
    @JoinTable(
            name = "jogo_genero",
            joinColumns = @JoinColumn(name = "jogo_id"),
            inverseJoinColumns = @JoinColumn(name = "genero_id")
    )
    private List<Genero> generos = new ArrayList<>();
    @ManyToMany
    @JoinTable(
            name = "jogo_plataformas",
            joinColumns = @JoinColumn(name = "jogo_id"),
            inverseJoinColumns = @JoinColumn(name = "plataformas_id")
    )
    private List<Plataforma> plataformas = new ArrayList<>();

    public Jogos() {
    }

    public Jogos(String nome, String data, Integer avaliacao, String poster) {
        this.nome = nome;
        this.data = data;
        this.avaliacao = avaliacao;
        this.poster = poster;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public Integer getAvaliacao() {
        return avaliacao;
    }

    public void setAvaliacao(Integer avaliacao) {
        this.avaliacao = avaliacao;
    }

    public String getPoster() {
        return poster;
    }

    public void setPoster(String poster) {
        this.poster = poster;
    }

    public StatusJogo getStatus() {
        return status;
    }

    public void setStatus(StatusJogo status) {
        this.status = status;
    }

    public Integer getHorasJogadas() {
        return horasJogadas;
    }

    public void setHorasJogadas(Integer horasJogadas) {
        this.horasJogadas = horasJogadas;
    }

    public LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    public LocalDate getDataTermino() {
        return dataTermino;
    }

    public void setDataTermino(LocalDate dataTermino) {
        this.dataTermino = dataTermino;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public Integer getTempoMedio() {
        return tempoMedio;
    }

    public void setTempoMedio(Integer tempoMedio) {
        this.tempoMedio = tempoMedio;
    }

    public Integer getNotaPessoal() {
        return notaPessoal;
    }

    public void setNotaPessoal(Integer notaPessoal) {
        this.notaPessoal = notaPessoal;
    }

    public String getComentario() {
        return comentario;
    }

    public void setComentario(String comentario) {
        this.comentario = comentario;
    }

    public String getPlataformaJogada() {
        return plataformaJogada;
    }

    public void setPlataformaJogada(String plataformaJogada) {
        this.plataformaJogada = plataformaJogada;
    }

    public List<Dev> getDevs() {
        return devs;
    }

    public void setDevs(List<Dev> devs) {
        this.devs = devs;
    }

    public List<Genero> getGeneros() {
        return generos;
    }

    public void setGeneros(List<Genero> generos) {
        this.generos = generos;
    }

    public List<Plataforma> getPlataformas() {
        return plataformas;
    }

    public void setPlataformas(List<Plataforma> plataformas) {
        this.plataformas = plataformas;
    }
}
