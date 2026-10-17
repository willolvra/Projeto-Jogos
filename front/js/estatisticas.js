import {
    NOMES_STATUS, MESES, MESES_COMPLETOS, formatarData, formatarHoras,
    nomesDosGeneros, nomesDasPlataformas, elemento, contarOcorrencias
} from "./util.js";

// tudo aqui é calculado no navegador, a partir da lista que a página já carregou: não precisa de endpoint novo

const somarHoras = (jogos) => jogos.reduce((total, jogo) => total + (jogo.horasJogadas ?? 0), 0);

function media(valores) {
    return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
}

function anoDe(data) {
    return data ? Number(data.slice(0, 4)) : null;
}

// peças visuais

function blocoTitulo(titulo, subtitulo = null) {
    const cabecalho = elemento("div", "bloco-cabecalho");
    cabecalho.appendChild(elemento("h2", "bloco-titulo", titulo));
    if (subtitulo) cabecalho.appendChild(elemento("p", "bloco-subtitulo", subtitulo));
    return cabecalho;
}

function bloco(titulo, subtitulo, conteudo, classeExtra = "") {
    const secao = elemento("section", `bloco ${classeExtra}`);
    secao.append(blocoTitulo(titulo, subtitulo), conteudo);
    return secao;
}

function cartaoNumero(rotulo, valor, detalhe = null) {
    const cartao = elemento("div", "cartao-numero");
    cartao.append(elemento("p", "cartao-rotulo", rotulo), elemento("p", "cartao-valor", valor));
    if (detalhe) cartao.appendChild(elemento("p", "cartao-detalhe", detalhe));
    return cartao;
}

function avisoVazio(texto) {
    return elemento("p", "aviso", texto);
}

// barras horizontais de uma série só: rótulo, barra proporcional ao maior valor e o número escrito ao lado,
// assim a leitura nunca depende só do tamanho da barra
function barrasHorizontais(itens, formatarValor = String) {
    if (itens.length === 0) return avisoVazio("Sem dados ainda.");
    const maior = Math.max(...itens.map(item => item.valor));
    const lista = elemento("ul", "barras");
    for (const item of itens) {
        const linha = elemento("li", "barra-linha");
        linha.title = `${item.rotulo}: ${formatarValor(item.valor)}`;

        const trilho = elemento("div", "barra-trilho");
        const preenchimento = elemento("div", "barra-preenchimento");
        preenchimento.style.width = `${maior ? (item.valor / maior) * 100 : 0}%`;
        trilho.appendChild(preenchimento);

        linha.append(elemento("span", "barra-rotulo", item.rotulo), trilho, elemento("span", "barra-valor", formatarValor(item.valor)));
        lista.appendChild(linha);
    }
    return lista;
}

// colunas por mês; o número só aparece em cima das colunas com valor, para não poluir
function colunasPorMes(meses) {
    const maior = Math.max(1, ...meses.map(m => m.valor));
    const grafico = elemento("div", "colunas");
    grafico.setAttribute("role", "img");
    grafico.setAttribute("aria-label", meses.map(m => `${m.rotulo}: ${m.valor}`).join(", "));

    for (const mes of meses) {
        const coluna = elemento("div", "coluna");
        coluna.title = `${mes.rotuloCompleto}: ${mes.valor} ${mes.valor === 1 ? "jogo zerado" : "jogos zerados"}`;

        const area = elemento("div", "coluna-area");
        const barra = elemento("div", "coluna-barra");
        barra.style.height = `${(mes.valor / maior) * 100}%`;
        if (mes.valor > 0) area.appendChild(elemento("span", "coluna-valor", mes.valor));
        area.appendChild(barra);

        coluna.append(area, elemento("span", "coluna-rotulo", mes.rotulo));
        grafico.appendChild(coluna);
    }
    return grafico;
}

// os 12 meses que terminam no mês atual, com a quantidade de jogos zerados em cada um
function zeradosNosUltimos12Meses(jogos) {
    const agora = new Date();
    const meses = [];
    for (let i = 11; i >= 0; i--) {
        const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
        meses.push({
            chave,
            rotulo: MESES[data.getMonth()],
            rotuloCompleto: `${MESES_COMPLETOS[data.getMonth()]} de ${data.getFullYear()}`,
            valor: 0
        });
    }
    for (const jogo of jogos) {
        if (jogo.status !== "ZERADO" || !jogo.dataTermino) continue;
        const mes = meses.find(m => m.chave === jogo.dataTermino.slice(0, 7));
        if (mes) mes.valor++;
    }
    return meses;
}

function listaMaisJogados(jogos) {
    const top = jogos
        .filter(jogo => (jogo.horasJogadas ?? 0) > 0)
        .sort((a, b) => b.horasJogadas - a.horasJogadas)
        .slice(0, 5);
    if (top.length === 0) return avisoVazio("Informe as horas jogadas nos seus jogos para ver o ranking.");

    const maior = top[0].horasJogadas;
    const lista = elemento("ol", "ranking");
    top.forEach((jogo, posicao) => {
        const item = elemento("li", "ranking-item");
        const capa = elemento("img", "ranking-capa");
        if (jogo.poster) capa.src = jogo.poster;
        capa.alt = "";
        capa.loading = "lazy";

        const info = elemento("div", "ranking-info");
        const trilho = elemento("div", "barra-trilho");
        const preenchimento = elemento("div", "barra-preenchimento");
        preenchimento.style.width = `${(jogo.horasJogadas / maior) * 100}%`;
        trilho.appendChild(preenchimento);
        info.append(elemento("span", "ranking-nome", jogo.name), trilho);

        item.append(
            elemento("span", "ranking-posicao", `${posicao + 1}º`),
            capa,
            info,
            elemento("span", "barra-valor", `${jogo.horasJogadas}h`)
        );
        lista.appendChild(item);
    });
    return lista;
}

export function renderizarEstatisticas(container, jogos) {
    if (jogos.length === 0) {
        container.replaceChildren(avisoVazio("Adicione alguns jogos na biblioteca para ver suas estatísticas."));
        return;
    }

    const anoAtual = new Date().getFullYear();
    const zerados = jogos.filter(jogo => jogo.status === "ZERADO");
    const zeradosNoAno = zerados.filter(jogo => anoDe(jogo.dataTermino) === anoAtual);
    const notas = jogos.map(jogo => jogo.notaPessoal).filter(nota => nota != null);
    const notaMedia = media(notas);
    const totalHoras = somarHoras(jogos);

    const numeros = elemento("div", "cartoes-numero");
    numeros.append(
        cartaoNumero("Jogos na biblioteca", jogos.length),
        cartaoNumero("Horas jogadas", totalHoras.toLocaleString("pt-BR"),
            zerados.length ? `média de ${Math.round(somarHoras(zerados) / zerados.length)}h por jogo zerado` : null),
        cartaoNumero("Jogos zerados", zerados.length, `${zeradosNoAno.length} em ${anoAtual}`),
        cartaoNumero("Sua nota média", notaMedia != null ? notaMedia.toFixed(1).replace(".", ",") : "—",
            notas.length ? `em ${notas.length} ${notas.length === 1 ? "jogo avaliado" : "jogos avaliados"}` : "avalie seus jogos no popup de progresso")
    );

    const porStatus = Object.entries(NOMES_STATUS)
        .map(([status, rotulo]) => ({ rotulo, valor: jogos.filter(jogo => jogo.status === status).length }));
    const semStatus = jogos.filter(jogo => !jogo.status).length;
    if (semStatus) porStatus.push({ rotulo: "Sem status", valor: semStatus });

    const generos = contarOcorrencias(jogos.flatMap(nomesDosGeneros)).slice(0, 6);

    // com plataformas informadas, mostra onde você joga; senão, as plataformas em que seus jogos saíram
    const jogadas = jogos.map(jogo => jogo.plataformaJogada).filter(Boolean);
    const plataformas = jogadas.length
        ? { titulo: "Onde você joga", itens: contarOcorrencias(jogadas).slice(0, 6) }
        : { titulo: "Plataformas na biblioteca", itens: contarOcorrencias(jogos.flatMap(nomesDasPlataformas)).slice(0, 6) };

    const formatarJogos = (n) => `${n} ${n === 1 ? "jogo" : "jogos"}`;

    const grade = elemento("div", "grade-blocos");
    grade.append(
        bloco("Por status", null, barrasHorizontais(porStatus, formatarJogos)),
        bloco("Zerados por mês", "Últimos 12 meses, pela data em que você zerou", colunasPorMes(zeradosNosUltimos12Meses(jogos))),
        bloco("Gêneros favoritos", "Os que mais aparecem na sua biblioteca", barrasHorizontais(generos, formatarJogos)),
        bloco(plataformas.titulo, null, barrasHorizontais(plataformas.itens, formatarJogos)),
        bloco("Mais jogados", "Por horas jogadas", listaMaisJogados(jogos), "bloco-largo")
    );

    container.replaceChildren(numeros, grade);
}

// retrospectiva

// anos com alguma atividade registrada (início ou término), sempre incluindo o ano atual
export function anosDisponiveis(jogos) {
    const anos = new Set([new Date().getFullYear()]);
    for (const jogo of jogos) {
        for (const data of [jogo.dataInicio, jogo.dataTermino]) {
            if (data) anos.add(anoDe(data));
        }
    }
    return [...anos].sort((a, b) => b - a);
}

function cartaoRetro(classe, rotulo, destaque, detalhe = null, imagem = null) {
    const cartao = elemento("article", `retro-cartao ${classe}`);
    if (imagem) {
        const fundo = elemento("img", "retro-imagem");
        fundo.src = imagem;
        fundo.alt = "";
        cartao.appendChild(fundo);
    }
    cartao.append(elemento("p", "retro-rotulo", rotulo), elemento("p", "retro-destaque", destaque));
    if (detalhe) cartao.appendChild(elemento("p", "retro-detalhe", detalhe));
    return cartao;
}

export function renderizarRetrospectiva(container, jogos, ano) {
    const zerados = jogos
        .filter(jogo => jogo.status === "ZERADO" && anoDe(jogo.dataTermino) === ano)
        .sort((a, b) => a.dataTermino.localeCompare(b.dataTermino));
    // "jogou no ano" = começou ou terminou (zerou/abandonou) naquele ano
    const jogados = jogos.filter(jogo => anoDe(jogo.dataInicio) === ano || anoDe(jogo.dataTermino) === ano);
    const abandonados = jogos.filter(jogo => jogo.status === "ABANDONADO" && anoDe(jogo.dataTermino) === ano);

    if (jogados.length === 0) {
        container.replaceChildren(avisoVazio(
            `Nada registrado em ${ano} ainda. Preencha as datas de início e término no popup de progresso dos seus jogos.`
        ));
        return;
    }

    const cartoes = elemento("div", "retro-grade");

    cartoes.appendChild(cartaoRetro("retro-principal", `Seu ${ano} nos games`, zerados.length,
        zerados.length === 1 ? "jogo zerado" : "jogos zerados"));

    const horas = somarHoras(jogados);
    cartoes.appendChild(cartaoRetro("retro-horas", "Horas nos jogos do ano", horas.toLocaleString("pt-BR"),
        `em ${jogados.length} ${jogados.length === 1 ? "jogo" : "jogos"} que você jogou`));

    // mês com mais jogos zerados; sem zerados, o mês em que mais começou jogos
    const datasDoMes = zerados.length
        ? zerados.map(jogo => jogo.dataTermino)
        : jogados.map(jogo => jogo.dataInicio).filter(data => anoDe(data) === ano);
    const meses = contarOcorrencias(datasDoMes.map(data => MESES_COMPLETOS[Number(data.slice(5, 7)) - 1]));
    if (meses.length) {
        const [mes] = meses;
        cartoes.appendChild(cartaoRetro("retro-mes", "Mês mais ativo", mes.rotulo,
            `${mes.valor} ${mes.valor === 1 ? "jogo" : "jogos"} ${zerados.length ? (mes.valor === 1 ? "zerado" : "zerados") : (mes.valor === 1 ? "começado" : "começados")}`));
    }

    const [genero] = contarOcorrencias(jogados.flatMap(nomesDosGeneros));
    if (genero) {
        cartoes.appendChild(cartaoRetro("retro-genero", "Gênero do ano", genero.rotulo,
            `presente em ${genero.valor} dos seus jogos`));
    }

    const maisJogado = [...jogados].sort((a, b) => (b.horasJogadas ?? 0) - (a.horasJogadas ?? 0))[0];
    if (maisJogado && maisJogado.horasJogadas) {
        cartoes.appendChild(cartaoRetro("retro-jogo", "O que mais te prendeu", maisJogado.name,
            formatarHoras(maisJogado.horasJogadas), maisJogado.poster));
    }

    const melhorAvaliado = jogados
        .filter(jogo => jogo.notaPessoal != null)
        .sort((a, b) => b.notaPessoal - a.notaPessoal)[0];
    if (melhorAvaliado) {
        cartoes.appendChild(cartaoRetro("retro-nota", "Sua maior nota", `${melhorAvaliado.notaPessoal}/10`,
            melhorAvaliado.comentario ? `${melhorAvaliado.name}: “${melhorAvaliado.comentario}”` : melhorAvaliado.name));
    }

    const [plataforma] = contarOcorrencias(jogados.map(jogo => jogo.plataformaJogada).filter(Boolean));
    if (plataforma) {
        cartoes.appendChild(cartaoRetro("retro-plataforma", "Onde você mais jogou", plataforma.rotulo,
            `${plataforma.valor} ${plataforma.valor === 1 ? "jogo" : "jogos"}`));
    }

    if (abandonados.length) {
        cartoes.appendChild(cartaoRetro("retro-abandonados", "E desistiu de", abandonados.length,
            abandonados.map(jogo => jogo.name).join(", ")));
    }

    const conteudo = [cartoes];

    if (zerados.length) {
        const galeria = elemento("ol", "retro-galeria");
        for (const jogo of zerados) {
            const item = elemento("li", "retro-galeria-item");
            const capa = elemento("img");
            if (jogo.poster) capa.src = jogo.poster;
            capa.alt = "";
            capa.loading = "lazy";
            item.append(capa, elemento("span", "retro-galeria-nome", jogo.name),
                elemento("span", "retro-galeria-data", formatarData(jogo.dataTermino)));
            galeria.appendChild(item);
        }
        conteudo.push(bloco(`Zerados em ${ano}`, "Em ordem, do primeiro ao último", galeria, "bloco-largo"));
    }

    container.replaceChildren(...conteudo);
}
