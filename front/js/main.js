import { listarJogos, adicionarJogo, excluirJogo } from "./api.js";

const lista = document.getElementById("lista-jogos");
const carregando = document.getElementById("carregando");
const vazio = document.getElementById("vazio");
const form = document.getElementById("form-adicionar");
const campoNome = document.getElementById("campo-nome");
const botaoAdicionar = document.getElementById("botao-adicionar");
const mensagem = document.getElementById("mensagem");

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
    mensagem.hidden = false;
}

function formatarData(data) {
    if (!data) return "Data desconhecida";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
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

// usa textContent em vez de innerHTML para evitar injeção de HTML vindo da API
function criarCard(jogo) {
    const card = document.createElement("article");
    card.className = "card";

    const poster = document.createElement("img");
    poster.className = "card-poster";
    poster.src = jogo.poster ?? "";
    poster.alt = `Poster de ${jogo.name}`;
    poster.loading = "lazy";

    const corpo = document.createElement("div");
    corpo.className = "card-corpo";

    const topo = document.createElement("div");
    topo.className = "card-topo";

    const titulo = document.createElement("h2");
    titulo.className = "card-titulo";
    titulo.textContent = jogo.name ?? "Sem nome";

    const nota = document.createElement("span");
    nota.className = `card-nota ${classeDaNota(jogo.avaliacao)}`;
    nota.textContent = jogo.avaliacao ?? "N/A";
    nota.title = "Nota no Metacritic";

    topo.append(titulo, nota);

    const lancamento = document.createElement("p");
    lancamento.className = "card-info";
    lancamento.textContent = `Lançamento: ${formatarData(jogo.data)}`;

    const devs = (jogo.desenvolvedores ?? []).map(d => d.desenvolvedores);
    const desenvolvedora = document.createElement("p");
    desenvolvedora.className = "card-info";
    desenvolvedora.textContent = `Desenvolvedora: ${devs.length ? devs.join(", ") : "Desconhecida"}`;

    const generos = (jogo.generos ?? []).map(g => g.genero);
    const plataformas = (jogo.plataformas ?? []).map(p => p.platform.nome);

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "botao-excluir";
    botaoExcluir.textContent = "Excluir";
    botaoExcluir.addEventListener("click", () => confirmarExclusao(jogo, card, botaoExcluir));

    corpo.append(
        topo,
        lancamento,
        desenvolvedora,
        criarTags(generos, "genero"),
        criarTags(plataformas, "plataforma"),
        botaoExcluir
    );
    card.append(poster, corpo);
    return card;
}

async function confirmarExclusao(jogo, card, botao) {
    if (!confirm(`Tem certeza que deseja excluir "${jogo.name}"?`)) return;

    botao.disabled = true;
    botao.textContent = "Excluindo...";
    try {
        await excluirJogo(jogo.id);
        card.remove();
        vazio.hidden = lista.children.length > 0;
        mostrarMensagem(`"${jogo.name}" excluído.`, "sucesso");
    } catch (erro) {
        console.error(erro);
        const detalhe = erro instanceof TypeError
            ? "Não foi possível conectar à API. Ela está rodando na porta 8081?"
            : erro.message;
        mostrarMensagem(`Não foi possível excluir "${jogo.name}". ${detalhe}`, "erro");
        botao.disabled = false;
        botao.textContent = "Excluir";
    }
}

async function carregarJogos() {
    carregando.hidden = false;
    try {
        const jogos = await listarJogos();
        lista.replaceChildren(...jogos.map(criarCard));
        vazio.hidden = jogos.length > 0;
    } catch (erro) {
        console.error(erro);
        mostrarMensagem("Não foi possível conectar à API. Ela está rodando na porta 8081?", "erro");
    } finally {
        carregando.hidden = true;
    }
}

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nome = campoNome.value.trim();
    if (!nome) return;

    botaoAdicionar.disabled = true;
    botaoAdicionar.textContent = "Adicionando...";
    try {
        await adicionarJogo(nome);
        mostrarMensagem(`"${nome}" adicionado com sucesso!`, "sucesso");
        campoNome.value = "";
        await carregarJogos();
    } catch (erro) {
        console.error(erro);
        // TypeError = o fetch nem chegou na API (fora do ar ou bloqueio de CORS)
        const detalhe = erro instanceof TypeError
            ? "Não foi possível conectar à API. Ela está rodando na porta 8081?"
            : erro.message;
        mostrarMensagem(`Não foi possível adicionar "${nome}". ${detalhe}`, "erro");
    } finally {
        botaoAdicionar.disabled = false;
        botaoAdicionar.textContent = "Adicionar";
    }
});

carregarJogos();
