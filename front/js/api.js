const URL_BASE = "http://localhost:8081";

// a API responde erros no formato ProblemDetail: { "status": 404, "detail": "mensagem" }
async function lancarErro(resposta, mensagemPadrao) {
    let detalhe = null;
    try {
        detalhe = (await resposta.json()).detail;
    } catch {
        // corpo vazio ou que não é JSON: fica com a mensagem padrão
    }
    throw new Error(detalhe ?? `${mensagemPadrao} (${resposta.status}).`);
}

export async function listarJogos() {
    const resposta = await fetch(`${URL_BASE}/jogos`);
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao listar jogos");
    }
    return resposta.json();
}

// o signal permite cancelar a busca quando o usuário continua digitando
export async function buscarSugestoes(termo, signal) {
    const resposta = await fetch(`${URL_BASE}/jogos/sugestoes?termo=${encodeURIComponent(termo)}`, { signal });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao buscar sugestões");
    }
    return resposta.json();
}

// slug só vem quando o jogo foi escolhido numa sugestão
export async function adicionarJogo(nome, slug = null) {
    const resposta = await fetch(`${URL_BASE}/jogos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, slug })
    });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao adicionar jogo");
    }
    // a API devolve o jogo criado (com id), usado para abrir o popup de progresso
    return resposta.json();
}

// progresso = { status, horasJogadas, dataInicio, dataTermino }; datas no formato AAAA-MM-DD ou null
export async function atualizarProgresso(id, progresso) {
    const resposta = await fetch(`${URL_BASE}/jogos/${id}/progresso`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progresso)
    });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao salvar progresso");
    }
    return resposta.json();
}

// descrição, screenshots e trailer vêm da RAWG na hora, por isso essa chamada é mais lenta que as outras
export async function obterDetalhes(id) {
    const resposta = await fetch(`${URL_BASE}/jogos/${id}/detalhes`);
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao carregar detalhes");
    }
    return resposta.json();
}

// marca um jogo "Jogando" como zerado; a API usa a data de hoje como término
export async function zerarJogo(id) {
    const resposta = await fetch(`${URL_BASE}/jogos/${id}/zerar`, { method: "PATCH" });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao marcar como zerado");
    }
    return resposta.json();
}

export async function excluirJogo(id) {
    const resposta = await fetch(`${URL_BASE}/jogos/${id}`, { method: "DELETE" });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao excluir jogo");
    }
}
