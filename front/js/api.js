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

export async function adicionarJogo(nome) {
    const resposta = await fetch(`${URL_BASE}/jogos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome })
    });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao adicionar jogo");
    }
    return resposta.text();
}

export async function excluirJogo(id) {
    const resposta = await fetch(`${URL_BASE}/jogos/${id}`, { method: "DELETE" });
    if (!resposta.ok) {
        await lancarErro(resposta, "Erro ao excluir jogo");
    }
}
