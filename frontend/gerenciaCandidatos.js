const pdfjsLib = globalThis.pdfjsLib;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const mockData = [
    { id: 1, nome: 'João Silva', telefone: '(11) 99999-9999', email: 'joao.silva@email.com', mensagem: 'Olá, estou interessado na vaga.', status: 'CONTRATADO' },
    { id: 2, nome: 'Maria Oliveira', telefone: '(21) 88888-8888', email: 'maria.oliveira@email.com', mensagem: 'Gostaria de mais informações sobre a oportunidade.', status: 'PENDENTE' },
    { id: 3, nome: 'Pedro Santos', telefone: '(31) 77777-7777', email: 'pedro.santos@email.com', mensagem: 'Estou disponível para uma entrevista.', status: 'NÃO' }
];
let candidatos = [];
const alteracoesPendentes = new Map();
const curriculoBaseUrl = 'https://kampbrxrosxtspcmgewr.supabase.co/storage/v1/object/public/curriculos/';
const candidatosCacheKey = 'candidatosCache';
const candidatosCacheTtl = 5 * 60 * 1000;

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const confirmChangesButton = document.getElementById('confirmChanges');
const refreshCandidatesButton = document.getElementById('refreshCandidates');
const sortByIdHeader = document.getElementById('sortById');
const sortByNameHeader = document.getElementById('sortByName');
const sortByIdIcon = document.getElementById('sortByIdIcon');
const sortByNameIcon = document.getElementById('sortByNameIcon');
const curriculumModal = document.getElementById('curriculumModal');
const curriculumModalTitle = document.getElementById('curriculumModalTitle');
const curriculumPreview = document.getElementById('curriculumPreview');
const closeCurriculumModalButton = document.getElementById('closeCurriculumModal');
const refreshInterval = 10 * 60 * 1000;
let campoOrdenacao = 'id';
let direcaoOrdenacao = 'asc';
let visualizacaoAtual = 0;

const usuario = localStorage.getItem("usuarioLogado");
if (!usuario) {
    window.location.href = "/login";
}

async function receberDadosComFallback() {
    const urls = [
        "/candidatos",
        "https://psychic-space-cod-4jj796xvj5fj544-8080.app.github.dev/candidatos",
        "http://localhost:8080/candidatos"
    ];

    let lastError;

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                lastError = new Error(`Erro no servidor: ${response.status}`);
                continue;
            }

            const dados = await response.json();
            if (!Array.isArray(dados)) {
                throw new Error("A resposta da API não contém uma lista de candidatos");
            }

            return dados;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error("Falha ao receber dados");
}

function receberCandidatosDoCache() {
    try {
        const cache = JSON.parse(localStorage.getItem(candidatosCacheKey));
        if (!cache || !Array.isArray(cache.dados)) return null;

        const cacheExpirado = Date.now() - cache.timestamp >= candidatosCacheTtl;
        return cacheExpirado ? null : cache.dados;
    } catch (error) {
        localStorage.removeItem(candidatosCacheKey);
        return null;
    }
}

function salvarCandidatosNoCache(dados) {
    try {
        localStorage.setItem(candidatosCacheKey, JSON.stringify({
            timestamp: Date.now(),
            dados
        }));
    } catch (error) {
        console.warn('Não foi possível salvar os candidatos em cache:', error);
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'CONTRATADO': return 'status-contratado';
        case 'PENDENTE': return 'status-pendente';
        case 'NÃO': return 'status-nao';
        default: return '';
    }
}

function updateStatusStyle(selectElement, id) {
    const newStatus = selectElement.value;
    
    selectElement.classList.remove('status-contratado', 'status-pendente', 'status-nao');
    
    selectElement.classList.add(getStatusClass(newStatus));

    const item = candidatos.find(d => d.id === id);
    if (item) {
        const alteracaoAtual = alteracoesPendentes.get(id);
        const statusOriginal = alteracaoAtual?.statusOriginal ?? item.status;
        item.status = newStatus;

        if (newStatus === statusOriginal) {
            alteracoesPendentes.delete(id);
        } else {
            alteracoesPendentes.set(id, { status: newStatus, statusOriginal });
        }
    }
}

async function atualizarStatusComFallback(id, status) {
    const urls = [
        `/candidato/${id}`,
        `https://psychic-space-cod-4jj796xvj5fj544-8080.app.github.dev/candidato/${id}`,
        `http://localhost:8080/candidato/${id}`
    ];

    let lastError;

    for (const url of urls) {
        try {
            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                lastError = new Error(`Erro ao atualizar candidato ${id}: ${response.status}`);
                continue;
            }

            return response.json();
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error(`Falha ao atualizar candidato ${id}`);
}

async function confirmarAlteracoes() {
    if (alteracoesPendentes.size === 0) {
        window.alert('Nenhuma alteração pendente para salvar.');
        return;
    }

    confirmChangesButton.disabled = true;
    confirmChangesButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

    try {
        for (const [id, alteracao] of alteracoesPendentes) {
            const candidatoAtualizado = await atualizarStatusComFallback(id, alteracao.status);
            const item = candidatos.find(candidato => candidato.id === id);
            if (item && candidatoAtualizado.status) {
                item.status = candidatoAtualizado.status;
            }
            alteracoesPendentes.delete(id);
            salvarCandidatosNoCache(candidatos);
        }

        window.alert('Alterações salvas com sucesso.');
    } catch (error) {
        console.error('Não foi possível salvar as alterações:', error);
        window.alert('Não foi possível salvar todas as alterações. Tente novamente.');
    } finally {
        confirmChangesButton.disabled = false;
        confirmChangesButton.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar alterações';
    }
}

async function atualizarCandidatos() {
    refreshCandidatesButton.disabled = true;
    refreshCandidatesButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';

    try {
        const dadosAtualizados = await receberDadosComFallback();

        for (const candidato of dadosAtualizados) {
            const alteracao = alteracoesPendentes.get(candidato.id);
            if (alteracao) {
                candidato.status = alteracao.status;
            }
        }

        candidatos = dadosAtualizados;
        if (alteracoesPendentes.size === 0) {
            salvarCandidatosNoCache(candidatos);
        }
        renderTable(candidatos);
    } catch (error) {
        console.error('Não foi possível atualizar os candidatos:', error);
        if (candidatos.length === 0) {
            candidatos = receberCandidatosDoCache() || mockData;
            renderTable(candidatos);
        }
        window.alert('Não foi possível atualizar os candidatos.');
    } finally {
        refreshCandidatesButton.disabled = false;
        refreshCandidatesButton.innerHTML = '<i class="fa-solid fa-rotate"></i> Atualizar';
    }
}

function showMessage(message) {
    window.alert(message);
}

function obterCurriculoUrl(curriculoPath) {
    console.debug('[Currículo] Caminho bruto recebido:', JSON.stringify(curriculoPath));
    let caminho = String(curriculoPath)
        .replace(/[\r\n]/g, '')
        .trim()
        .replace(/^\/+/, '');
    console.debug('[Currículo] Caminho normalizado:', JSON.stringify(caminho));
    if (/^https?:\/\//i.test(caminho)) {
        console.debug('[Currículo] URL absoluta usada:', caminho);
        return caminho;
    }

    caminho = caminho.replace(/^public\/curriculos\//i, '').replace(/^curriculos\//i, '');
    const caminhoCodificado = caminho.split('/').map(encodeURIComponent).join('/');
    const url = `${curriculoBaseUrl}${caminhoCodificado}`;
    console.debug('[Currículo] URL pública gerada:', url);
    return url;
}

function fecharCurriculo() {
    visualizacaoAtual += 1;
    curriculumModal.hidden = true;
    curriculumPreview.replaceChildren();
    document.body.classList.remove('modal-open');
}

async function visualizarCurriculum(curriculoPath, nome, id) {
    console.groupCollapsed(`[Currículo] Início da visualização - candidato ${id}`);
    console.debug('[Currículo] Nome:', nome);
    console.debug('[Currículo] ID:', id);
    console.debug('[Currículo] Valor recebido:', JSON.stringify(curriculoPath));

    if (!curriculoPath) {
        console.error('[Currículo] Caminho vazio ou inexistente.');
        console.groupEnd();
        window.alert('Este candidato não possui currículo disponível.');
        return;
    }

    const curriculoUrl = obterCurriculoUrl(curriculoPath);
    let etapa = 'preparando a requisição';
    const visualizacaoId = ++visualizacaoAtual;
    curriculumModal.hidden = true;
    curriculumPreview.replaceChildren();
    curriculumModalTitle.textContent = `Currículo de ${nome || `candidato ${id}`}`;
    curriculumPreview.innerHTML = '<p class="curriculum-viewer-status">Carregando currículo...</p>';
    curriculumModal.hidden = false;
    document.body.classList.add('modal-open');

    try {
        console.info('[Currículo] Fazendo fetch:', curriculoUrl);
        const response = await fetch(curriculoUrl, { cache: 'no-store' });
        console.info('[Currículo] Resposta HTTP:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
            urlFinal: response.url
        });
        if (!response.ok) {
            throw new Error(`Erro ao carregar o currículo: ${response.status}`);
        }

        etapa = 'lendo o arquivo recebido';
        const arquivo = await response.arrayBuffer();
        console.info('[Currículo] Arquivo recebido:', {
            bytes: arquivo.byteLength,
            assinaturaPdf: new TextDecoder().decode(arquivo.slice(0, 5))
        });

        etapa = 'interpretando o PDF';
        const pdf = await pdfjsLib.getDocument({
            data: arquivo,
            disableWorker: true
        }).promise;
        console.info('[Currículo] PDF interpretado:', {
            paginas: pdf.numPages,
            visualizacaoId
        });
        if (visualizacaoId !== visualizacaoAtual) return;

        curriculumPreview.replaceChildren();
        for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina += 1) {
            etapa = `carregando a página ${numeroPagina}`;
            const pagina = await pdf.getPage(numeroPagina);
            if (visualizacaoId !== visualizacaoAtual) return;

            const viewport = pagina.getViewport({ scale: 1.35 });
            console.debug('[Currículo] Renderizando página:', {
                pagina: numeroPagina,
                largura: viewport.width,
                altura: viewport.height
            });
            const pageContainer = document.createElement('div');
            pageContainer.className = 'curriculum-page-container';
            pageContainer.style.width = `${viewport.width}px`;
            pageContainer.style.height = `${viewport.height}px`;

            const canvas = document.createElement('canvas');
            canvas.className = 'curriculum-page';
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            pageContainer.appendChild(canvas);

            const textLayer = document.createElement('div');
            textLayer.className = 'curriculum-text-layer';
            pageContainer.appendChild(textLayer);
            curriculumPreview.appendChild(pageContainer);

            await pagina.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;

            const textContent = await pagina.getTextContent();
            await pdfjsLib.renderTextLayer({
                textContent,
                container: textLayer,
                viewport,
                textDivs: []
            }).promise;
        }
        console.info('[Currículo] Visualização concluída com sucesso.');
    } catch (error) {
        if (visualizacaoId !== visualizacaoAtual) return;
        console.error('[Currículo] Falha detalhada:', {
            etapa,
            url: curriculoUrl,
            nomeErro: error?.name,
            mensagem: error?.message,
            stack: error?.stack,
            erro: error
        });
        curriculumPreview.innerHTML = `<p class="curriculum-viewer-status">Não foi possível carregar este currículo.<br><small>Etapa: ${etapa}<br>${error?.message || 'Erro desconhecido'}</small></p>`;
    } finally {
        console.groupEnd();
    }
}

function ordenarCandidatos(data) {
    const candidatosOrdenados = [...data];

    candidatosOrdenados.sort((primeiro, segundo) => {
        if (campoOrdenacao === 'name') {
            const resultado = String(primeiro.nome || '').localeCompare(
                String(segundo.nome || ''),
                'pt-BR',
                { sensitivity: 'base' }
            );
            return direcaoOrdenacao === 'desc' ? -resultado : resultado;
        }

        const resultado = Number(primeiro.id) - Number(segundo.id);
        return direcaoOrdenacao === 'desc' ? -resultado : resultado;
    });

    return candidatosOrdenados;
}

function alternarOrdenacao(campo) {
    if (campo === campoOrdenacao) {
        direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
        campoOrdenacao = campo;
        direcaoOrdenacao = 'asc';
    }

    atualizarIndicadoresOrdenacao();
    renderTable(candidatosFiltrados());
}

function atualizarIndicadoresOrdenacao() {
    const classeSetaAtual = direcaoOrdenacao === 'asc' ? 'fa-arrow-down' : 'fa-arrow-up';

    sortByIdIcon.className = `sort-indicator fa-solid ${campoOrdenacao === 'id' ? classeSetaAtual : 'fa-sort'}`;
    sortByNameIcon.className = `sort-indicator fa-solid ${campoOrdenacao === 'name' ? classeSetaAtual : 'fa-sort'}`;
}

function candidatosFiltrados() {
    const term = searchInput.value.toLowerCase().trim();
    return candidatos.filter(item => {
        const matchesName = item.nome.toLowerCase().includes(term);
        const matchesId = item.id.toString().includes(term);
        return matchesName || matchesId;
    });
}

function renderTable(data) {
    tableBody.innerHTML = '';

    if (data.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    ordenarCandidatos(data).forEach(item => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td style="font-weight: 600; color: #334155;">#${item.id}</td>
            <td style="font-weight: 500;">${item.nome}</td>
            <td style="color: #64748b;">${item.telefone}</td>
            <td style="color: #64748b;">${item.email}</td>
            <td class="text-center">
                <button class="btn-action btn-msg" title="Visualizar Mensagem">
                    <i class="fa-regular fa-envelope"></i>
                </button>
            </td>
            <td class="text-center">
                <button class="btn-action btn-cur" title="Visualizar Currículo">
                    <i class="fa-regular fa-file-pdf"></i>
                </button>
            </td>
            <td>
                <select
                    class="status-select ${getStatusClass(item.status)}"
                >
                    <option value="CONTRATADO" ${item.status === 'CONTRATADO' ? 'selected' : ''}>CONTRATADO</option>
                    <option value="PENDENTE" ${item.status === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                    <option value="NÃO" ${item.status === 'NÃO' ? 'selected' : ''}>NÃO</option>
                </select>
            </td>
        `;

        tableBody.appendChild(tr);
        const messageButton = tr.querySelector('.btn-msg');
        messageButton.addEventListener('click', () => showMessage(item.mensagem));

        const curriculumButton = tr.querySelector('.btn-cur');
        curriculumButton.addEventListener('click', () => visualizarCurriculum(
            item.curriculoPath ?? item.curriculo_path,
            item.nome,
            item.id
        ));

        const statusSelect = tr.querySelector('.status-select');
        statusSelect.addEventListener('change', () => updateStatusStyle(statusSelect, item.id));
    });
}

searchInput.addEventListener('input', (e) => {
    renderTable(candidatosFiltrados());
});

sortByIdHeader.addEventListener('click', () => alternarOrdenacao('id'));
sortByNameHeader.addEventListener('click', () => alternarOrdenacao('name'));
atualizarIndicadoresOrdenacao();

confirmChangesButton.addEventListener('click', confirmarAlteracoes);
refreshCandidatesButton.addEventListener('click', atualizarCandidatos);
closeCurriculumModalButton.addEventListener('click', fecharCurriculo);
curriculumModal.addEventListener('click', event => {
    if (event.target === curriculumModal) {
        fecharCurriculo();
    }
});
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !curriculumModal.hidden) {
        fecharCurriculo();
    }
});

window.onload = async () => {
    await atualizarCandidatos();
    window.setInterval(atualizarCandidatos, refreshInterval);
};