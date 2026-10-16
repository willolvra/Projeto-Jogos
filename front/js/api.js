const URL_BASE = "http://localhost:8081";

export async function listarJogos() {
    const resposta = await fetch(`${URL_BASE}/jogos`);
    if (!resposta.ok) {
        throw new Error(`Erro ao listar jogos (${resposta.status})`);
    }
    return resposta.json();
}

export async function adicionarJogo(nome) {
    const resposta = await fetch(`${URL_BASE}/jogos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome })
    });
    if (resposta.status === 404) {
        throw new Error("Jogo não encontrado na RAWG. Tente o nome completo (ex.: the witcher 3 wild hunt).");
    }
    if (!resposta.ok) {
        throw new Error(`Erro ao adicionar jogo (${resposta.status}).`);
    }
    return resposta.text();
}

export async function excluirJogo(id) {
    const resposta = await fetch(`${URL_BASE}/jogos/${id}`, { method: "DELETE" });
    if (resposta.status === 404) {
        throw new Error("Esse jogo já não existe mais.");
    }
    if (!resposta.ok) {
        throw new Error(`Erro ao excluir jogo (${resposta.status}).`);
    }
}
