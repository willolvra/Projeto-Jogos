import { listarJogos, adicionarJogo, excluirJogo, buscarSugestoes, atualizarProgresso, zerarJogo } from "./api.js";
import {
    NOMES_STATUS, formatarData, formatarHoras, hoje, nomesDosGeneros, nomesDasPlataformas, descreverErro
} from "./util.js";
import { renderizarEstatisticas, renderizarRetrospectiva, anosDisponiveis } from "./estatisticas.js";
import { abrirDetalhes } from "./detalhes.js";

const lista = document.getElementById("lista-jogos");
const vazio = document.getElementById("vazio");
const semResultado = document.getElementById("sem-resultado");
const contador = document.getElementById("contador");
const form = document.getElementById("form-adicionar");
const campoNome = document.getElementById("campo-nome");
const botaoAdicionar = document.getElementById("botao-adicionar");
const campoBusca = document.getElementById("campo-busca");
const campoOrdem = document.getElementById("campo-ordem");
const mensagem = document.getElementById("mensagem");
const modalExclusao = document.getElementById("modal-exclusao");
const modalTexto = document.getElementById("modal-texto");
const modalProgresso = document.getElementById("modal-progresso");
const formProgresso = document.getElementById("form-progresso");
const progressoPoster = document.getElementById("progresso-poster");
const progressoSubtitulo = document.getElementById("progresso-subtitulo");
const progressoTitulo = document.getElementById("progresso-titulo");
const progressoErro = document.getElementById("progresso-erro");
const campoHoras = document.getElementById("campo-horas");
const botaoPular = document.getElementById("botao-pular");
const botaoSalvarProgresso = document.getElementById("botao-salvar-progresso");

const listaSugestoes = document.getElementById("lista-sugestoes");

const chipsStatus = document.querySelectorAll(".filtro-status .chip");
const grupoHoras = document.getElementById("grupo-horas");
const grupoDatas = document.getElementById("grupo-datas");
const grupoTermino = document.getElementById("grupo-termino");
const rotuloTermino = document.getElementById("rotulo-termino");
const campoInicio = document.getElementById("campo-inicio");
const campoTermino = document.getElementById("campo-termino");
const campoPlataforma = document.getElementById("campo-plataforma");
const grupoAvaliacao = document.getElementById("grupo-avaliacao");
const listaNotas = document.getElementById("lista-notas");
const campoComentario = document.getElementById("campo-comentario");
const dicaTempoMedio = document.getElementById("dica-tempo-medio");

const paginas = {
    biblioteca: document.getElementById("pagina-biblioteca"),
    estatisticas: document.getElementById("pagina-estatisticas"),
    retrospectiva: document.getElementById("pagina-retrospectiva")
};
const conteudoEstatisticas = document.getElementById("conteudo-estatisticas");
const conteudoRetrospectiva = document.getElementById("conteudo-retrospectiva");
const campoAno = document.getElementById("campo-ano");
const linksNavegacao = document.querySelectorAll(".navegacao a[data-pagina]");

// cópia local da lista, para filtrar e ordenar sem chamar a API de novo
let jogos = [];
// "" = todos; senão QUERO_JOGAR, JOGANDO, ZERADO, ABANDONADO ou SEM_STATUS
let statusFiltro = "";
let paginaAtual = "biblioteca";

// estado das sugestões
const ESPERA_DIGITACAO_MS = 300;
const MINIMO_CARACTERES = 3;
let sugestoes = [];
let indiceAtivo = -1;
let temporizadorBusca = null;
let buscaEmAndamento = null;
// slug da sugestão escolhida; volta a null assim que o usuário edita o campo
let slugEscolhido = null;

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
    mensagem.hidden = false;
}

function classeDaNota(nota) {
    if (nota == null) return "sem-nota";
    if (nota >= 75) return "alta";
    if (nota >= 50) return "media";
    return "baixa";
}

function criarTags(itens, classeExtra) {
    const ul = document.createElement("ul");
    ul.className = "tags";
    for (const item of itens) {
        const li = document.createElement("li");
        li.className = `tag ${classeExtra}`;
        li.textContent = item;
        ul.appendChild(li);
    }
    return ul;
}

function substituirJogo(atualizado) {
    jogos = jogos.map(j => j.id === atualizado.id ? atualizado : j);
}

// horas jogadas comparadas com o tempo médio da RAWG (quando ela sabe esse tempo)
function descreverHoras(jogo) {
    const horas = jogo.horasJogadas;
    const media = jogo.tempoMedio;
    // quem ainda vai jogar vê quanto tempo o jogo costuma levar
    if (jogo.status === "QUERO_JOGAR" || horas == null) {
        return media ? `⏱ ~${media}h para zerar (média)` : null;
    }
    if (jogo.status === "JOGANDO" && media) return `⏱ ${horas}h de ~${media}h`;
    return media ? `⏱ ${horas}h · média ${media}h` : `⏱ ${formatarHoras(horas)}`;
}

// barra de progresso estimado: só para quem está jogando e quando há tempo médio
function criarBarraEstimada(jogo) {
    if (jogo.status !== "JOGANDO" || !jogo.tempoMedio || jogo.horasJogadas == null) return null;
    const porcentagem = Math.min(100, Math.round((jogo.horasJogadas / jogo.tempoMedio) * 100));
    const barra = document.createElement("div");
    barra.className = "barra-estimada";
    barra.setAttribute("role", "progressbar");
    barra.setAttribute("aria-valuemin", "0");
    barra.setAttribute("aria-valuemax", "100");
    barra.setAttribute("aria-valuenow", String(porcentagem));
    barra.setAttribute("aria-label", "Progresso estimado pelo tempo médio");
    barra.title = `${porcentagem}% do tempo médio (estimativa)`;

    const preenchimento = document.createElement("span");
    preenchimento.style.width = `${porcentagem}%`;
    barra.appendChild(preenchimento);
    return barra;
}

function descreverDatas(jogo) {
    const inicio = jogo.dataInicio && formatarData(jogo.dataInicio);
    const termino = jogo.dataTermino && formatarData(jogo.dataTermino);
    if (jogo.status === "JOGANDO" && inicio) return `Desde ${inicio}`;
    if (jogo.status === "ZERADO" || jogo.status === "ABANDONADO") {
        const verbo = jogo.status === "ZERADO" ? "Zerado" : "Parou";
        if (inicio && termino) return `${inicio} → ${termino}`;
        if (termino) return `${verbo} em ${termino}`;
        if (inicio) return `Começou em ${inicio}`;
    }
    return null;
}

function criarSpan(classe, texto) {
    const span = document.createElement("span");
    span.className = classe;
    span.textContent = texto;
    return span;
}

// status e horas ficam nulos em jogos cadastrados antes dessa funcionalidade, ou quando o usuário pulou o popup
function criarProgresso(jogo) {
    const linha = document.createElement("div");
    linha.className = "card-progresso";

    linha.appendChild(criarSpan(`status ${jogo.status ?? "sem-status"}`, NOMES_STATUS[jogo.status] ?? "Sem status"));
    if (jogo.notaPessoal != null) linha.appendChild(criarSpan("minha-nota", `⭐ ${jogo.notaPessoal}/10`));
    if (jogo.plataformaJogada) linha.appendChild(criarSpan("horas", `🕹 ${jogo.plataformaJogada}`));

    const textoHoras = descreverHoras(jogo);
    if (textoHoras) linha.appendChild(criarSpan("horas linha-inteira", textoHoras));

    const barra = criarBarraEstimada(jogo);
    if (barra) linha.appendChild(barra);

    const textoDatas = descreverDatas(jogo);
    if (textoDatas) linha.appendChild(criarSpan("datas", `📅 ${textoDatas}`));
    return linha;
}

function abrirDetalhesDoJogo(jogo) {
    abrirDetalhes(jogo, {
        aoEditar: (j) => abrirProgresso(j, "editar"),
        // a API completou o tempo médio de um jogo antigo: atualiza o card sem recarregar a lista
        aoReceberTempoMedio: (j, tempoMedio) => {
            substituirJogo({ ...j, tempoMedio });
            renderizar();
        }
    });
}

// usa textContent em vez de innerHTML para evitar injeção de HTML vindo da API
function criarCard(jogo) {
    const card = document.createElement("article");
    card.className = "card";

    // a capa é um botão: clicar nela (ou no título) abre os detalhes
    const imagem = document.createElement("button");
    imagem.type = "button";
    imagem.className = "card-imagem";
    imagem.setAttribute("aria-label", `Ver detalhes de ${jogo.name}`);
    imagem.addEventListener("click", () => abrirDetalhesDoJogo(jogo));

    const poster = document.createElement("img");
    poster.className = "card-poster";
    if (jogo.poster) poster.src = jogo.poster;
    poster.alt = "";
    poster.loading = "lazy";

    const nota = document.createElement("span");
    nota.className = `card-nota ${classeDaNota(jogo.avaliacao)}`;
    nota.textContent = jogo.avaliacao ?? "N/A";
    nota.title = "Nota no Metacritic";

    imagem.append(poster, nota);

    const corpo = document.createElement("div");
    corpo.className = "card-corpo";

    const titulo = document.createElement("h3");
    titulo.className = "card-titulo";
    const linkTitulo = document.createElement("button");
    linkTitulo.type = "button";
    linkTitulo.className = "card-link";
    linkTitulo.textContent = jogo.name ?? "Sem nome";
    linkTitulo.addEventListener("click", () => abrirDetalhesDoJogo(jogo));
    titulo.appendChild(linkTitulo);

    const lancamento = document.createElement("p");
    lancamento.className = "card-info";
    lancamento.textContent = `Lançamento: ${formatarData(jogo.data)}`;

    const devs = (jogo.desenvolvedores ?? []).map(d => d.desenvolvedores);
    const desenvolvedora = document.createElement("p");
    desenvolvedora.className = "card-info";
    desenvolvedora.textContent = `Desenvolvedora: ${devs.length ? devs.join(", ") : "Desconhecida"}`;

    const botaoEditar = document.createElement("button");
    botaoEditar.type = "button";
    botaoEditar.className = "botao-editar";
    botaoEditar.textContent = "Editar progresso";
    botaoEditar.addEventListener("click", () => abrirProgresso(jogo, "editar"));

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "botao-excluir";
    botaoExcluir.textContent = "Excluir";
    botaoExcluir.addEventListener("click", () => confirmarExclusao(jogo, botaoExcluir));

    const acoes = document.createElement("div");
    acoes.className = "card-acoes";

    if (jogo.status === "JOGANDO") {
        const botaoZerar = document.createElement("button");
        botaoZerar.type = "button";
        botaoZerar.className = "botao-zerar";
        botaoZerar.textContent = "🏆 Marcar como zerado";
        botaoZerar.addEventListener("click", () => marcarComoZerado(jogo, botaoZerar));
        acoes.appendChild(botaoZerar);
    }
    acoes.append(botaoEditar, botaoExcluir);

    corpo.append(
        titulo,
        criarProgresso(jogo),
        lancamento,
        desenvolvedora,
        criarTags(nomesDosGeneros(jogo), "genero"),
        criarTags(nomesDasPlataformas(jogo), "plataforma"),
        acoes
    );
    card.append(imagem, corpo);
    return card;
}

function criarCardEsqueleto() {
    const card = document.createElement("div");
    card.className = "card card-esqueleto";
    card.setAttribute("aria-hidden", "true");

    const poster = document.createElement("div");
    poster.className = "card-poster esqueleto";

    const corpo = document.createElement("div");
    corpo.className = "card-corpo";
    for (const classe of ["titulo", "", "curta"]) {
        const linha = document.createElement("div");
        linha.className = `esqueleto linha ${classe}`;
        corpo.appendChild(linha);
    }

    card.append(poster, corpo);
    return card;
}

function mostrarEsqueletos(quantidade = 6) {
    lista.replaceChildren(...Array.from({ length: quantidade }, criarCardEsqueleto));
}

const ordenacoes = {
    // o id cresce a cada cadastro, então id maior = adicionado mais recentemente
    recentes: (a, b) => b.id - a.id,
    nome: (a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"),
    // jogos sem nota (ou sem horas) vão para o fim
    nota: (a, b) => (b.avaliacao ?? -1) - (a.avaliacao ?? -1),
    minhaNota: (a, b) => (b.notaPessoal ?? -1) - (a.notaPessoal ?? -1),
    horas: (a, b) => (b.horasJogadas ?? -1) - (a.horasJogadas ?? -1),
    // datas no formato AAAA-MM-DD podem ser comparadas como texto
    lancamento: (a, b) => (b.data ?? "").localeCompare(a.data ?? "")
};

function correspondeABusca(jogo, termo) {
    const textos = [jogo.name ?? "", ...nomesDosGeneros(jogo), ...nomesDasPlataformas(jogo)];
    return textos.some(texto => texto.toLowerCase().includes(termo));
}

// jogos sem status (cadastrados antes ou que pularam o popup) entram no filtro "Sem status"
function statusDoJogo(jogo) {
    return jogo.status ?? "SEM_STATUS";
}

function atualizarChips() {
    for (const chip of chipsStatus) {
        const status = chip.dataset.status;
        const quantidade = status
            ? jogos.filter(jogo => statusDoJogo(jogo) === status).length
            : jogos.length;
        chip.querySelector(".chip-contagem").textContent = quantidade;
        chip.setAttribute("aria-pressed", String(status === statusFiltro));
        // o chip "Sem status" só aparece quando há jogos nessa situação (ou quando é o filtro ativo)
        if (status === "SEM_STATUS") chip.hidden = quantidade === 0 && statusFiltro !== status;
    }
}

function renderizar() {
    const termo = campoBusca.value.trim().toLowerCase();
    const visiveis = jogos
        .filter(jogo => !statusFiltro || statusDoJogo(jogo) === statusFiltro)
        .filter(jogo => !termo || correspondeABusca(jogo, termo))
        .sort(ordenacoes[campoOrdem.value]);

    lista.replaceChildren(...visiveis.map(criarCard));
    vazio.hidden = jogos.length > 0;
    semResultado.hidden = jogos.length === 0 || visiveis.length > 0;
    contador.textContent = `${jogos.length} ${jogos.length === 1 ? "jogo" : "jogos"}`;
    atualizarChips();
    // estatísticas e retrospectiva também dependem da lista
    if (paginaAtual !== "biblioteca") renderizarPaginaAtual();
}

// páginas: o endereço (#estatisticas, #retrospectiva) decide qual aparece, então o botão voltar funciona

function preencherAnos() {
    const anos = anosDisponiveis(jogos);
    const selecionado = Number(campoAno.value) || anos[0];
    campoAno.replaceChildren(...anos.map(ano => new Option(ano, ano)));
    campoAno.value = anos.includes(selecionado) ? selecionado : anos[0];
}

function renderizarPaginaAtual() {
    if (paginaAtual === "estatisticas") {
        renderizarEstatisticas(conteudoEstatisticas, jogos);
    } else if (paginaAtual === "retrospectiva") {
        preencherAnos();
        renderizarRetrospectiva(conteudoRetrospectiva, jogos, Number(campoAno.value));
    }
}

function mostrarPagina() {
    const nome = location.hash.slice(1);
    paginaAtual = nome in paginas ? nome : "biblioteca";
    for (const [chave, pagina] of Object.entries(paginas)) {
        pagina.hidden = chave !== paginaAtual;
    }
    for (const link of linksNavegacao) {
        if (link.dataset.pagina === paginaAtual) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
    renderizarPaginaAtual();
    window.scrollTo(0, 0);
}

window.addEventListener("hashchange", mostrarPagina);
campoAno.addEventListener("change", renderizarPaginaAtual);

// substitui o confirm() do navegador: abre o modal e resolve com true/false conforme o botão clicado
function pedirConfirmacao(nomeDoJogo) {
    const nome = document.createElement("strong");
    nome.textContent = nomeDoJogo;
    modalTexto.replaceChildren(nome, " será removido da sua biblioteca. Essa ação não pode ser desfeita.");

    modalExclusao.returnValue = "";
    modalExclusao.showModal();

    return new Promise(resolve => {
        // Esc ou clique em Cancelar fecham o modal sem returnValue "confirmar"
        modalExclusao.addEventListener("close", () => {
            resolve(modalExclusao.returnValue === "confirmar");
        }, { once: true });
    });
}

// clicar no fundo escurecido (fora da caixa) também cancela
for (const modal of document.querySelectorAll(".modal")) {
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) modal.close();
    });
}

// popup de progresso: abre logo após adicionar um jogo, depois de marcar como zerado
// e pelo botão "Editar progresso"

let jogoEmEdicao = null;

const SUBTITULOS_PROGRESSO = {
    adicionado: "✓ Adicionado à biblioteca",
    zerado: "🏆 Zerado! Que tal dar uma nota?",
    editar: "Editar progresso"
};

// notas de 1 a 10, mais a opção de deixar sem nota
function criarOpcoesDeNota() {
    const opcoes = [["", "–"], ...Array.from({ length: 10 }, (_, i) => [String(i + 1), String(i + 1)])];
    listaNotas.replaceChildren(...opcoes.map(([valor, texto]) => {
        const label = document.createElement("label");
        label.className = "opcao-nota";
        if (!valor) label.title = "Sem nota";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "notaPessoal";
        input.value = valor;
        if (!valor) input.setAttribute("aria-label", "Sem nota");
        label.append(input, criarSpan("", texto));
        return label;
    }));
}

function preencherPlataformas(jogo) {
    const opcoes = [new Option("Não informar", ""), ...nomesDasPlataformas(jogo).map(nome => new Option(nome, nome))];
    campoPlataforma.replaceChildren(...opcoes);
    campoPlataforma.value = jogo.plataformaJogada ?? "";
}

// modo: "adicionado", "zerado" ou "editar"
function abrirProgresso(jogo, modo) {
    jogoEmEdicao = jogo;
    progressoErro.hidden = true;

    if (jogo.poster) {
        progressoPoster.src = jogo.poster;
        progressoPoster.hidden = false;
    } else {
        progressoPoster.hidden = true;
    }
    progressoSubtitulo.textContent = SUBTITULOS_PROGRESSO[modo];
    progressoTitulo.textContent = jogo.name;
    botaoPular.textContent = modo === "editar" ? "Cancelar" : "Agora não";

    // jogo novo começa em "Quero jogar" com 0 horas; na edição, mostra o que já está salvo
    formProgresso.elements.status.value = jogo.status ?? "QUERO_JOGAR";
    campoHoras.value = jogo.horasJogadas ?? 0;
    campoInicio.value = jogo.dataInicio ?? "";
    campoTermino.value = jogo.dataTermino ?? "";
    // nenhuma das datas pode estar no futuro
    campoInicio.max = hoje();
    campoTermino.max = hoje();
    preencherPlataformas(jogo);
    formProgresso.elements.notaPessoal.value = jogo.notaPessoal != null ? String(jogo.notaPessoal) : "";
    campoComentario.value = jogo.comentario ?? "";

    dicaTempoMedio.hidden = !jogo.tempoMedio;
    dicaTempoMedio.textContent = jogo.tempoMedio ? `Em média, esse jogo leva ~${jogo.tempoMedio}h segundo a RAWG.` : "";
    atualizarCamposDoStatus();

    modalProgresso.showModal();
}

// mostra só os campos que fazem sentido para o status escolhido:
// Quero jogar -> plataforma; Jogando -> + horas e início;
// Zerado e Abandonado -> + data de término, nota e comentário (só dá para avaliar depois de terminar).
// Campos escondidos ficam desativados, e o form não valida nem envia campo desativado
function atualizarCamposDoStatus() {
    const status = formProgresso.elements.status.value;
    const comHoras = status !== "QUERO_JOGAR";
    const comTermino = status === "ZERADO" || status === "ABANDONADO";

    grupoHoras.hidden = !comHoras;
    campoHoras.disabled = !comHoras;
    grupoDatas.hidden = !comHoras;
    campoInicio.disabled = !comHoras;
    grupoTermino.hidden = !comTermino;
    campoTermino.disabled = !comTermino;
    rotuloTermino.textContent = status === "ABANDONADO" ? "Parou em" : "Zerou em";
    grupoAvaliacao.hidden = !comTermino;
    for (const campo of grupoAvaliacao.querySelectorAll("input, textarea")) {
        campo.disabled = !comTermino;
    }

    // sugere hoje nas datas vazias, já que é o caso mais comum (começou/terminou agora)
    if (comHoras && !campoInicio.value && status === "JOGANDO") campoInicio.value = hoje();
    if (comTermino && !campoTermino.value) campoTermino.value = hoje();
    atualizarLimiteTermino();
}

// o término não pode ser antes do início
function atualizarLimiteTermino() {
    campoTermino.min = campoInicio.value;
}

formProgresso.addEventListener("change", (evento) => {
    if (evento.target.name === "status") atualizarCamposDoStatus();
    if (evento.target === campoInicio) atualizarLimiteTermino();
});

// botões − e +: um clique muda 1 hora; segurar repete cada vez mais rápido
let temporizadorPasso = null;

function darPasso(passo) {
    if (passo > 0) campoHoras.stepUp();
    else campoHoras.stepDown();
}

function pararRepeticao() {
    clearTimeout(temporizadorPasso);
    temporizadorPasso = null;
}

for (const botao of document.querySelectorAll(".botao-passo")) {
    const passo = Number(botao.dataset.passo);

    botao.addEventListener("pointerdown", (evento) => {
        if (evento.button !== 0) return;
        darPasso(passo);
        let intervalo = 400;
        const repetir = () => {
            darPasso(passo);
            intervalo = Math.max(40, intervalo * 0.8);
            temporizadorPasso = setTimeout(repetir, intervalo);
        };
        temporizadorPasso = setTimeout(repetir, intervalo);
    });
    for (const fim of ["pointerup", "pointerleave", "pointercancel"]) {
        botao.addEventListener(fim, pararRepeticao);
    }
    // detail === 0 = clique vindo do teclado (Enter/Espaço), que não passa pelo pointerdown
    botao.addEventListener("click", (evento) => {
        if (evento.detail === 0) darPasso(passo);
    });
}

botaoPular.addEventListener("click", () => modalProgresso.close());

formProgresso.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const jogo = jogoEmEdicao;
    const avaliacaoAtiva = !campoComentario.disabled;
    const nota = formProgresso.elements.notaPessoal.value;
    const progresso = {
        status: formProgresso.elements.status.value,
        horasJogadas: campoHoras.disabled ? null : Number(campoHoras.value),
        dataInicio: campoInicio.disabled ? null : campoInicio.value || null,
        dataTermino: campoTermino.disabled ? null : campoTermino.value || null,
        notaPessoal: avaliacaoAtiva && nota ? Number(nota) : null,
        comentario: avaliacaoAtiva ? campoComentario.value.trim() || null : null,
        plataformaJogada: campoPlataforma.value || null
    };

    botaoSalvarProgresso.disabled = true;
    botaoSalvarProgresso.textContent = "Salvando...";
    try {
        const atualizado = await atualizarProgresso(jogo.id, progresso);
        substituirJogo(atualizado);
        renderizar();
        modalProgresso.close();
    } catch (erro) {
        console.error(erro);
        // deixa o popup aberto para o usuário tentar de novo sem perder o que preencheu
        progressoErro.textContent = descreverErro(erro);
        progressoErro.hidden = false;
    } finally {
        botaoSalvarProgresso.disabled = false;
        botaoSalvarProgresso.textContent = "Salvar";
    }
});

async function marcarComoZerado(jogo, botao) {
    botao.disabled = true;
    botao.textContent = "Salvando...";
    try {
        const atualizado = await zerarJogo(jogo.id);
        substituirJogo(atualizado);
        renderizar();
        mostrarMensagem(`🏆 "${jogo.name}" zerado em ${formatarData(atualizado.dataTermino)}!`, "sucesso");
        // já está salvo como zerado; o popup só aproveita para pedir nota, comentário e horas finais
        abrirProgresso(atualizado, "zerado");
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(`Não foi possível marcar "${jogo.name}" como zerado. ${descreverErro(erro)}`, "erro");
        botao.disabled = false;
        botao.textContent = "🏆 Marcar como zerado";
    }
}

async function confirmarExclusao(jogo, botao) {
    if (!(await pedirConfirmacao(jogo.name))) return;

    botao.disabled = true;
    botao.textContent = "Excluindo...";
    try {
        await excluirJogo(jogo.id);
        jogos = jogos.filter(j => j.id !== jogo.id);
        renderizar();
        mostrarMensagem(`"${jogo.name}" excluído.`, "sucesso");
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(`Não foi possível excluir "${jogo.name}". ${descreverErro(erro)}`, "erro");
        botao.disabled = false;
        botao.textContent = "Excluir";
    }
}

async function carregarJogos() {
    lista.setAttribute("aria-busy", "true");
    try {
        jogos = await listarJogos();
        renderizar();
    } catch (erro) {
        console.error(erro);
        lista.replaceChildren();
        mostrarMensagem("Não foi possível conectar à API. Ela está rodando na porta 8081?", "erro");
    } finally {
        lista.setAttribute("aria-busy", "false");
    }
}

// sugestões no campo de adicionar

function jaEstaNaBiblioteca(nome) {
    return jogos.some(jogo => (jogo.name ?? "").toLowerCase() === nome.toLowerCase());
}

function fecharSugestoes() {
    listaSugestoes.hidden = true;
    listaSugestoes.replaceChildren();
    campoNome.setAttribute("aria-expanded", "false");
    campoNome.removeAttribute("aria-activedescendant");
    sugestoes = [];
    indiceAtivo = -1;
}

function cancelarBusca() {
    clearTimeout(temporizadorBusca);
    buscaEmAndamento?.abort();
    buscaEmAndamento = null;
}

function abrirListaCom(...itens) {
    listaSugestoes.replaceChildren(...itens);
    listaSugestoes.hidden = false;
    campoNome.setAttribute("aria-expanded", "true");
}

function mostrarAvisoSugestoes(texto) {
    sugestoes = [];
    indiceAtivo = -1;
    const li = document.createElement("li");
    li.className = "sugestao-aviso";
    li.textContent = texto;
    abrirListaCom(li);
}

function criarItemSugestao(sugestao, indice) {
    const li = document.createElement("li");
    li.id = `sugestao-${indice}`;
    li.className = "sugestao";
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");

    const miniatura = document.createElement("img");
    miniatura.className = "sugestao-miniatura";
    if (sugestao.poster) miniatura.src = sugestao.poster;
    miniatura.alt = "";

    const nome = document.createElement("span");
    nome.className = "sugestao-nome";
    nome.textContent = sugestao.nome;

    li.append(miniatura, nome);

    if (sugestao.lancamento) {
        const ano = document.createElement("span");
        ano.className = "sugestao-ano";
        ano.textContent = sugestao.lancamento.slice(0, 4);
        li.appendChild(ano);
    }

    if (jaEstaNaBiblioteca(sugestao.nome)) {
        const selo = document.createElement("span");
        selo.className = "sugestao-selo";
        selo.textContent = "Na biblioteca";
        li.appendChild(selo);
    }

    // mousedown em vez de click: dispara antes do blur do campo, que fecharia a lista
    li.addEventListener("mousedown", (evento) => {
        evento.preventDefault();
        escolherSugestao(indice);
    });
    li.addEventListener("mousemove", () => destacarSugestao(indice));
    return li;
}

function mostrarSugestoes(lista) {
    if (lista.length === 0) {
        mostrarAvisoSugestoes("Nenhum jogo encontrado com esse nome.");
        return;
    }
    sugestoes = lista;
    indiceAtivo = -1;
    abrirListaCom(...lista.map(criarItemSugestao));
}

function destacarSugestao(indice) {
    if (indice === indiceAtivo) return;
    const itens = listaSugestoes.querySelectorAll(".sugestao");
    itens[indiceAtivo]?.classList.remove("ativa");
    itens[indiceAtivo]?.setAttribute("aria-selected", "false");

    indiceAtivo = indice;
    const item = itens[indiceAtivo];
    item.classList.add("ativa");
    item.setAttribute("aria-selected", "true");
    item.scrollIntoView({ block: "nearest" });
    campoNome.setAttribute("aria-activedescendant", item.id);
}

// escolher uma sugestão já adiciona o jogo, usando o slug exato da RAWG
function escolherSugestao(indice) {
    const sugestao = sugestoes[indice];
    campoNome.value = sugestao.nome;
    slugEscolhido = sugestao.slug;
    fecharSugestoes();
    form.requestSubmit();
}

async function atualizarSugestoes(termo) {
    buscaEmAndamento = new AbortController();
    mostrarAvisoSugestoes("Buscando...");
    try {
        mostrarSugestoes(await buscarSugestoes(termo, buscaEmAndamento.signal));
    } catch (erro) {
        // AbortError = o usuário digitou de novo e essa busca ficou velha
        if (erro.name === "AbortError") return;
        console.error(erro);
        fecharSugestoes();
    }
}

campoNome.addEventListener("input", () => {
    slugEscolhido = null;
    cancelarBusca();
    const termo = campoNome.value.trim();
    if (termo.length < MINIMO_CARACTERES) {
        fecharSugestoes();
        return;
    }
    // espera o usuário parar de digitar para não fazer uma requisição por tecla
    temporizadorBusca = setTimeout(() => atualizarSugestoes(termo), ESPERA_DIGITACAO_MS);
});

campoNome.addEventListener("keydown", (evento) => {
    if (listaSugestoes.hidden) return;

    if (evento.key === "Escape") {
        evento.preventDefault();
        cancelarBusca();
        fecharSugestoes();
        return;
    }
    if (sugestoes.length === 0) return;

    if (evento.key === "ArrowDown") {
        evento.preventDefault();
        destacarSugestao((indiceAtivo + 1) % sugestoes.length);
    } else if (evento.key === "ArrowUp") {
        evento.preventDefault();
        destacarSugestao(indiceAtivo <= 0 ? sugestoes.length - 1 : indiceAtivo - 1);
    } else if (evento.key === "Enter" && indiceAtivo >= 0) {
        // sem sugestão destacada, o Enter segue o fluxo normal e envia o que foi digitado
        evento.preventDefault();
        escolherSugestao(indiceAtivo);
    }
});

campoNome.addEventListener("blur", () => {
    cancelarBusca();
    fecharSugestoes();
});

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nome = campoNome.value.trim();
    if (!nome) return;
    cancelarBusca();
    fecharSugestoes();

    botaoAdicionar.disabled = true;
    botaoAdicionar.textContent = "Adicionando...";
    try {
        const novoJogo = await adicionarJogo(nome, slugEscolhido);
        // usa o nome oficial da RAWG, que pode ser diferente do digitado
        mostrarMensagem(`"${novoJogo.name}" adicionado com sucesso!`, "sucesso");
        campoNome.value = "";
        slugEscolhido = null;
        jogos.push(novoJogo);
        renderizar();
        abrirProgresso(novoJogo, "adicionado");
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(`Não foi possível adicionar "${nome}". ${descreverErro(erro)}`, "erro");
    } finally {
        botaoAdicionar.disabled = false;
        botaoAdicionar.textContent = "Adicionar";
    }
});

for (const chip of chipsStatus) {
    chip.addEventListener("click", () => {
        statusFiltro = chip.dataset.status;
        renderizar();
    });
}

campoBusca.addEventListener("input", renderizar);
campoOrdem.addEventListener("change", renderizar);

criarOpcoesDeNota();
mostrarPagina();
mostrarEsqueletos();
carregarJogos();
