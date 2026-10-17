// funções usadas por mais de uma página (biblioteca, estatísticas, retrospectiva e detalhes)

export const NOMES_STATUS = {
    QUERO_JOGAR: "🎯 Quero jogar",
    JOGANDO: "🎮 Jogando",
    ZERADO: "🏆 Zerado",
    ABANDONADO: "💤 Abandonado"
};

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const MESES_COMPLETOS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

export function formatarData(data) {
    if (!data) return "Data desconhecida";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}

export function formatarHoras(horas) {
    return `${horas} ${horas === 1 ? "hora" : "horas"}`;
}

// data local no formato AAAA-MM-DD (toISOString usaria o fuso UTC e poderia virar o dia)
export function hoje() {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function nomesDosGeneros(jogo) {
    return (jogo.generos ?? []).map(g => g.genero);
}

export function nomesDasPlataformas(jogo) {
    return (jogo.plataformas ?? []).map(p => p.platform.nome);
}

// TypeError = o fetch nem chegou na API (fora do ar ou bloqueio de CORS)
export function descreverErro(erro) {
    return erro instanceof TypeError
        ? "Não foi possível conectar à API. Ela está rodando na porta 8081?"
        : erro.message;
}

// atalho para criar elementos; usa textContent, nunca innerHTML, para não interpretar HTML vindo da API
export function elemento(tag, classe = "", texto = null) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
}

// conta quantas vezes cada valor aparece e devolve [{ rotulo, valor }] do mais comum para o menos
export function contarOcorrencias(valores) {
    const contagem = new Map();
    for (const valor of valores) {
        contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
    }
    return [...contagem]
        .map(([rotulo, valor]) => ({ rotulo, valor }))
        .sort((a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
