import { obterDetalhes } from "./api.js";
import { NOMES_STATUS, formatarData, formatarHoras, descreverErro, elemento } from "./util.js";

const modal = document.getElementById("modal-detalhes");
const capa = document.getElementById("detalhes-capa");
const titulo = document.getElementById("detalhes-titulo");
const subtitulo = document.getElementById("detalhes-subtitulo");
const corpo = document.getElementById("detalhes-corpo");

document.getElementById("botao-fechar-detalhes").addEventListener("click", () => modal.close());

// evita que a resposta de um jogo aberto antes apareça no popup de outro
let aberturaAtual = 0;

function linhaInfo(rotulo, valor) {
    const item = elemento("div", "info-item");
    item.append(elemento("dt", "", rotulo), elemento("dd", "", valor));
    return item;
}

function secao(tituloSecao, ...conteudo) {
    const s = elemento("section", "detalhes-secao");
    s.append(elemento("h3", "", tituloSecao), ...conteudo);
    return s;
}

function criarInfo(jogo, tempoMedio) {
    const lista = elemento("dl", "detalhes-info");
    lista.append(
        linhaInfo("Metacritic", jogo.avaliacao ?? "N/A"),
        linhaInfo("Lançamento", formatarData(jogo.data)),
        linhaInfo("Tempo médio", tempoMedio ? `~${tempoMedio}h` : "Desconhecido")
    );
    const devs = (jogo.desenvolvedores ?? []).map(d => d.desenvolvedores);
    if (devs.length) lista.appendChild(linhaInfo("Desenvolvedora", devs.join(", ")));
    return lista;
}

function criarMeuProgresso(jogo, aoEditar) {
    const caixa = elemento("div", "meu-progresso");
    const linhas = elemento("dl", "detalhes-info");
    linhas.appendChild(linhaInfo("Status", NOMES_STATUS[jogo.status] ?? "Sem status"));
    if (jogo.horasJogadas != null && jogo.status !== "QUERO_JOGAR") {
        linhas.appendChild(linhaInfo("Horas", formatarHoras(jogo.horasJogadas)));
    }
    if (jogo.dataInicio) linhas.appendChild(linhaInfo("Começou", formatarData(jogo.dataInicio)));
    if (jogo.dataTermino) {
        linhas.appendChild(linhaInfo(jogo.status === "ABANDONADO" ? "Parou" : "Zerou", formatarData(jogo.dataTermino)));
    }
    if (jogo.plataformaJogada) linhas.appendChild(linhaInfo("Plataforma", jogo.plataformaJogada));
    if (jogo.notaPessoal != null) linhas.appendChild(linhaInfo("Sua nota", `⭐ ${jogo.notaPessoal}/10`));
    caixa.appendChild(linhas);

    if (jogo.comentario) caixa.appendChild(elemento("blockquote", "comentario", jogo.comentario));

    const botao = elemento("button", "botao-editar", "Editar progresso");
    botao.type = "button";
    botao.addEventListener("click", () => {
        modal.close();
        aoEditar(jogo);
    });
    caixa.appendChild(botao);
    return caixa;
}

function criarDescricao(texto) {
    const paragrafo = elemento("p", "descricao recolhida", texto);
    const botao = elemento("button", "botao-texto", "Ler mais");
    botao.type = "button";
    botao.addEventListener("click", () => {
        const recolhida = paragrafo.classList.toggle("recolhida");
        botao.textContent = recolhida ? "Ler mais" : "Ler menos";
    });
    const nota = elemento("p", "dica", "Descrição fornecida pela RAWG, geralmente em inglês.");
    return [paragrafo, botao, nota];
}

function criarTrailer(detalhes) {
    const video = document.createElement("video");
    video.className = "trailer";
    video.controls = true;
    video.preload = "none";
    video.src = detalhes.trailer;
    if (detalhes.trailerCapa) video.poster = detalhes.trailerCapa;
    return video;
}

function criarScreenshots(screenshots) {
    const lista = elemento("ul", "screenshots");
    screenshots.forEach((imagem, indice) => {
        const item = elemento("li");
        const botao = elemento("button", "botao-screenshot");
        botao.type = "button";
        botao.setAttribute("aria-label", `Ampliar screenshot ${indice + 1} de ${screenshots.length}`);
        botao.addEventListener("click", () => abrirGaleria(screenshots, indice));
        const img = elemento("img");
        img.src = imagem.miniatura;
        img.alt = "";
        img.loading = "lazy";
        botao.appendChild(img);
        item.appendChild(botao);
        lista.appendChild(item);
    });
    return lista;
}

// carrossel de screenshots

const galeria = document.getElementById("modal-galeria");
const galeriaImagem = document.getElementById("galeria-imagem");
const galeriaContador = document.getElementById("galeria-contador");
const galeriaOriginal = document.getElementById("galeria-original");
const galeriaMiniaturas = document.getElementById("galeria-miniaturas");
const galeriaPalco = document.getElementById("galeria-palco");

let imagensGaleria = [];
let indiceGaleria = 0;

function mostrarImagem(indice) {
    // passa do fim volta ao começo, e vice-versa
    indiceGaleria = (indice + imagensGaleria.length) % imagensGaleria.length;
    const imagem = imagensGaleria[indiceGaleria];

    // mostra a miniatura (já carregada) na hora e troca pela original, mais pesada, quando ela chegar
    galeriaImagem.src = imagem.miniatura;
    galeriaImagem.alt = `Screenshot ${indiceGaleria + 1} de ${imagensGaleria.length}`;
    const original = new Image();
    original.onload = () => {
        if (imagensGaleria[indiceGaleria] === imagem) galeriaImagem.src = imagem.original;
    };
    original.src = imagem.original;

    galeriaContador.textContent = `${indiceGaleria + 1} / ${imagensGaleria.length}`;
    galeriaOriginal.href = imagem.original;

    galeriaMiniaturas.querySelectorAll("button").forEach((botao, i) => {
        const ativa = i === indiceGaleria;
        botao.classList.toggle("ativa", ativa);
        if (ativa) {
            botao.setAttribute("aria-current", "true");
            botao.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
        } else {
            botao.removeAttribute("aria-current");
        }
    });

    // já baixa a próxima original, para a troca ser instantânea
    new Image().src = imagensGaleria[(indiceGaleria + 1) % imagensGaleria.length].original;
}

function abrirGaleria(screenshots, indice) {
    imagensGaleria = screenshots;
    galeriaMiniaturas.replaceChildren(...screenshots.map((imagem, i) => {
        const item = elemento("li");
        const botao = elemento("button");
        botao.type = "button";
        botao.setAttribute("aria-label", `Ir para a screenshot ${i + 1}`);
        botao.addEventListener("click", () => mostrarImagem(i));
        const img = elemento("img");
        img.src = imagem.miniatura;
        img.alt = "";
        botao.appendChild(img);
        item.appendChild(botao);
        return item;
    }));
    // com uma imagem só, setas e miniaturas não servem para nada
    const variasImagens = screenshots.length > 1;
    galeria.classList.toggle("unica", !variasImagens);

    galeria.showModal();
    mostrarImagem(indice);
}

document.getElementById("galeria-anterior").addEventListener("click", () => mostrarImagem(indiceGaleria - 1));
document.getElementById("galeria-proxima").addEventListener("click", () => mostrarImagem(indiceGaleria + 1));
document.getElementById("botao-fechar-galeria").addEventListener("click", () => galeria.close());

// setas do teclado; o Esc o próprio <dialog> já trata, fechando só o carrossel
galeria.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowLeft") mostrarImagem(indiceGaleria - 1);
    if (evento.key === "ArrowRight") mostrarImagem(indiceGaleria + 1);
});

// deslizar o dedo para os lados troca de imagem
let inicioToque = null;
galeriaPalco.addEventListener("pointerdown", (evento) => {
    if (evento.pointerType !== "mouse") inicioToque = evento.clientX;
});
galeriaPalco.addEventListener("pointerup", (evento) => {
    if (inicioToque == null) return;
    const distancia = evento.clientX - inicioToque;
    inicioToque = null;
    if (Math.abs(distancia) > 50) mostrarImagem(indiceGaleria + (distancia < 0 ? 1 : -1));
});
galeriaPalco.addEventListener("pointercancel", () => { inicioToque = null; });

// clicar no espaço escuro em volta da imagem também fecha
galeriaPalco.addEventListener("click", (evento) => {
    if (evento.target === galeriaPalco) galeria.close();
});

// aoEditar: abre o popup de progresso; aoReceberTempoMedio: avisa a página quando a API completa o tempo médio
export async function abrirDetalhes(jogo, { aoEditar, aoReceberTempoMedio }) {
    const abertura = ++aberturaAtual;

    capa.style.backgroundImage = jogo.poster ? `url(${JSON.stringify(jogo.poster)})` : "";
    titulo.textContent = jogo.name;
    subtitulo.textContent = NOMES_STATUS[jogo.status] ?? "Sem status";
    corpo.replaceChildren(
        criarInfo(jogo, jogo.tempoMedio),
        secao("Seu progresso", criarMeuProgresso(jogo, aoEditar)),
        elemento("p", "aviso-carregando", "Carregando descrição, trailer e screenshots...")
    );
    modal.showModal();
    corpo.scrollTop = 0;

    try {
        const detalhes = await obterDetalhes(jogo.id);
        if (abertura !== aberturaAtual) return;

        if (detalhes.tempoMedio && detalhes.tempoMedio !== jogo.tempoMedio) {
            aoReceberTempoMedio(jogo, detalhes.tempoMedio);
        }

        const conteudo = [
            criarInfo(jogo, detalhes.tempoMedio),
            secao("Seu progresso", criarMeuProgresso(jogo, aoEditar))
        ];
        if (detalhes.descricao) conteudo.push(secao("Sobre o jogo", ...criarDescricao(detalhes.descricao)));
        if (detalhes.trailer) conteudo.push(secao("Trailer", criarTrailer(detalhes)));
        if (detalhes.screenshots.length) conteudo.push(secao("Screenshots", criarScreenshots(detalhes.screenshots)));
        if (detalhes.site) {
            const link = elemento("a", "link-site", "Site oficial ↗");
            link.href = detalhes.site;
            link.target = "_blank";
            link.rel = "noopener";
            conteudo.push(link);
        }
        corpo.replaceChildren(...conteudo);
    } catch (erro) {
        if (abertura !== aberturaAtual) return;
        console.error(erro);
        corpo.querySelector(".aviso-carregando")?.replaceWith(
            elemento("p", "mensagem erro", `Não foi possível carregar os detalhes. ${descreverErro(erro)}`)
        );
    }
}

// fechar o popup pausa o trailer, senão o som continuaria tocando
modal.addEventListener("close", () => {
    modal.querySelector("video")?.pause();
});
