import { API_BASE_URL, SUPABASE_URL } from './config.js';
import { authenticatedFetch, requireValidSession, supabase, ROLES } from './auth.js?v=202611181938';
import { getDataMode, reportDataSource, registerDiagnostics, checkApiStatus } from './apiStatus.js?v=20261126-ui4';

const pdfjsLib = globalThis.pdfjsLib;
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}


const mockData = [
    {
        id: 1,
        nome: 'João Silva',
        cargo: 'Desenvolvedor Frontend',
        telefone: '11999999999',
        email: 'joao.silva@email.com',
        mensagem: 'Olá, estou muito interessado na oportunidade.',
        status: 'CONCLUÍDO',
        curriculoPath: 'curriculo_joao_silva.pdf',
        pdfSize: '1.5 MB',
        dataEnvio: '10/10/2026'
    },
    {
        id: 2,
        nome: 'Maria Oliveira',
        cargo: 'Engenheira de Software',
        telefone: '21888888888',
        email: 'maria.oliveira@email.com',
        mensagem: 'Gostaria de mais informações sobre o processo seletivo.',
        status: 'PENDENTE',
        curriculoPath: 'curriculo_maria_oliveira.pdf',
        pdfSize: '2.1 MB',
        dataEnvio: '11/10/2026'
    },
    {
        id: 3,
        nome: 'Pedro Santos',
        cargo: 'Analista de Dados',
        telefone: '31777777777',
        email: 'pedro.santos@email.com',
        mensagem: 'Estou disponível para uma entrevista imediata.',
        status: 'RECUSADO',
        curriculoPath: 'curriculo_pedro_santos.pdf',
        pdfSize: '1.2 MB',
        dataEnvio: '12/10/2026'
    }
];



export const ROLE_NAMES = {
    [ROLES.ADMIN]: "Administrador",
    [ROLES.GESTOR]: "Gestor",
    [ROLES.MONITOR]: "Monitor",
    [ROLES.COMERCIAL]: "Comercial",
    [ROLES.RH]: "Recursos Humanos"
};

const ROLE_AVATARS = {
    [ROLES.ADMIN]: "ADM",
    [ROLES.GESTOR]: "GES",
    [ROLES.MONITOR]: "MON",
    [ROLES.COMERCIAL]: "COM",
    [ROLES.RH]: "RH"
};

let candidatos = [];

const alteracoesPendentes = new Map();
const exclusoesPendentes = new Map();
const curriculoBaseUrl = 'https://kampbrxrosxtspcmgewr.supabase.co/storage/v1/object/public/curriculos/';
let fonteCandidatos = 'api';
let gerenciarHabilitado = false;
const usandoDadosFicticios = () => fonteCandidatos === 'mock' || fonteCandidatos === 'fallback';

const mockAnalises = [
    { id: 101, status: 'Em andamento', resultado: 'Perfil compatível com a vaga. Aguardando entrevista técnica.' },
    { id: 102, status: 'Concluída', resultado: 'Candidato aprovado na triagem inicial.' },
    { id: 103, status: 'Pendente' }
];

const candidatosCacheKey = 'candidatosCache-v2';
const candidatosCacheTtl = 5 * 60 * 1000;

let campoOrdenacao = 'nome';
let direcaoOrdenacao = 'asc';
let visualizacaoAtual = 0;
let activeCandidateId = null;


const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const candidateFilter = document.getElementById('candidateFilter');
const emptyState = document.getElementById('emptyState');
const confirmChangesButton = document.getElementById('confirmChanges') || document.getElementById('saveChangesBtn');
const refreshCandidatesButton = document.getElementById('refreshCandidates') || document.getElementById('refreshBtn');

const sortUnifiedSelect = document.getElementById('sortUnifiedSelect');

const curriculumModal = document.getElementById('curriculumModal');
const curriculumModalTitle = document.getElementById('curriculumModalTitle');
const curriculumPreview = document.getElementById('curriculumPreview');
const closeCurriculumModalButton = document.getElementById('closeCurriculumModal');

const candidateDetail = document.getElementById('candidateDetail');
const candidateDetailContent = document.getElementById('candidateDetailContent');
const toastContainer = document.getElementById('toastContainer');

const statTotalVal = document.getElementById('statTotalVal');
const statConcluidoVal = document.getElementById('statConcluidoVal');
const statPendenteVal = document.getElementById('statPendenteVal');
const statRecusadoVal = document.getElementById('statRecusadoVal');
const darkModeToggle = document.getElementById('darkModeToggle');

const nomeUsuario = document.getElementById('nome_usuario');
const avatarUsuario = document.getElementById('avatar_usuario');
const moduleTabs = [...document.querySelectorAll('[data-module]')];
const gerenciarView = document.getElementById('gerenciarView');
const acompanharView = document.getElementById('acompanharView');
const comercialView = document.getElementById('comercialView');
const analysisGrid = document.getElementById('analysisGrid');
if (candidateDetail) {
    candidateDetail.addEventListener('click', event => {
        if (event.target.closest('[data-close-candidate]')) {
            closeModal();
            return;
        }
        const pdfButton = event.target.closest('[data-pdf-action]');
        if (pdfButton) {
            window.simulatePdfAction(pdfButton.dataset.pdfAction);
            return;
        }
        if (event.target.closest('[data-candidate-delete]') && activeCandidateId) {
            window.apagarCandidato(activeCandidateId);
        }
    });
}
const adminDashboardMemoryKey = 'empregamais-admin-dashboard-v1';
let adminDashboardMemory = { module: 'gerenciar', scrollByModule: {} };
let activeModule = 'gerenciar';
let rememberAdminDashboard = false;
let dashboardMemoryReady = false;
let dashboardScrollTimer;

function readAdminDashboardMemory() {
    try {
        const saved = JSON.parse(localStorage.getItem(adminDashboardMemoryKey) || '{}');
        if (saved && typeof saved === 'object') {
            adminDashboardMemory = {
                module: typeof saved.module === 'string' ? saved.module : 'gerenciar',
                scrollByModule: saved.scrollByModule && typeof saved.scrollByModule === 'object'
                    ? saved.scrollByModule
                    : {}
            };
        }
    } catch (error) {
        console.warn('Não foi possível restaurar a última aba do administrador:', error);
    }
}

function saveAdminDashboardMemory() {
    if (!rememberAdminDashboard) return;
    adminDashboardMemory.module = activeModule;
    adminDashboardMemory.scrollByModule[activeModule] = window.scrollY;
    persistAdminDashboardMemory();
}

function persistAdminDashboardMemory() {
    if (!rememberAdminDashboard) return;
    try {
        localStorage.setItem(adminDashboardMemoryKey, JSON.stringify(adminDashboardMemory));
    } catch (error) {
        console.warn('Não foi possível salvar a última aba do administrador:', error);
    }
}

function restoreAdminModuleScroll() {
    if (!rememberAdminDashboard) return;
    const savedY = Number(adminDashboardMemory.scrollByModule[activeModule]) || 0;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, savedY)));
}

window.addEventListener('scroll', () => {
    if (!rememberAdminDashboard || !dashboardMemoryReady) return;
    clearTimeout(dashboardScrollTimer);
    dashboardScrollTimer = setTimeout(saveAdminDashboardMemory, 140);
}, { passive: true });
window.addEventListener('pagehide', saveAdminDashboardMemory);
window.addEventListener('empregamais:commercial-loaded', () => {
    if (activeModule === 'comercial') restoreAdminModuleScroll();
});

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "/#login";
    });
}

function formatPhone(phoneDigits) {
    if (!phoneDigits) return '(00) 00000-0000';
    const cleaned = ('' + phoneDigits).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
    const matchShort = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (matchShort) return `(${matchShort[1]}) ${matchShort[2]}-${matchShort[3]}`;
    return phoneDigits;
}

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[caractere]));
}

function sanitizeEmail(email) {
    return email ? String(email).trim().toLowerCase() : 'email@exemplo.com';
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function normalizarStatus(status) {
    if (!status) return 'PENDENTE';
    const st = String(status).toUpperCase();
    if (st === 'CONTRATADO' || st === 'CONCLUÍDO') return 'CONCLUÍDO';
    if (st === 'PENDENTE') return 'PENDENTE';
    if (st === 'RECUSADO') return 'RECUSADO';
    if (st.length <= 3) {
        if (st.startsWith('C')) return 'CONCLUÍDO';
        if (st.startsWith('P')) return 'PENDENTE';
        if (st.startsWith('N') || st.startsWith('R')) return 'RECUSADO';
    }
    return st;
}

function classeStatus(status) {
    return `status-${status
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()}`;
}

function formatarDataEnvio(data) {
    if (!data) return 'Data indisponível';

    const dataTexto = String(data);
    const dataIso = dataTexto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dataIso) return `${dataIso[3]}/${dataIso[2]}/${dataIso[1]}`;

    return dataTexto;
}

function normalizarDados(dados) {
    return dados.map(item => ({
        id: item.id,
        nome: item.nome || item.name || 'Candidato sem Nome',
        cargo: item.cargo || item.role || 'Candidato',
        telefone: item.telefone || item.phone || '',
        email: item.email || '',
        mensagem: item.mensagem || item.message || 'Sem mensagem.',
        status: normalizarStatus(item.status),
        curriculoPath: item.curriculo_path || item.curriculoPath || item.curriculo || item.pdfName || '',
        pdfSize: item.pdfSize || '',
        dataEnvio: formatarDataEnvio(item.createdAt || item.created_at || item.dataEnvio)
    }));
}


async function receberDadosComFallback() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/gerenciar/candidatos`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Erro no servidor: ${response.status}`);
        }

        const dados = await response.json();
        if (!Array.isArray(dados)) {
            throw new Error("A resposta da API não contém uma lista de candidatos");
        }
        return dados;
    } catch (error) {
        throw error instanceof Error ? error : new Error("Falha ao receber dados");
    }
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

function contarPendencias() {
    let total = exclusoesPendentes.size;
    for (const id of alteracoesPendentes.keys()) {
        if (!exclusoesPendentes.has(Number(id))) total++;
    }
    return total;
}

function temAlteracoesPendentes() {
    return contarPendencias() > 0;
}

function atualizarBotaoConfirmacao() {
    if (!confirmChangesButton) return;

    const totalPendencias = contarPendencias();
    confirmChangesButton.disabled = totalPendencias === 0;
    confirmChangesButton.innerHTML = `<i class="fa-solid fa-floppy-disk"></i><span>Salvar alterações</span>${totalPendencias ? `<span class="quote-pending-count">${totalPendencias}</span>` : ''}`;
}

function confirmarSaidaSemSalvar() {
    return !temAlteracoesPendentes()
        || window.confirm('Existem alterações não salvas. Deseja sair sem salvar?');
}

function descartarAlteracoesPendentes() {
    alteracoesPendentes.clear();
    exclusoesPendentes.clear();
    atualizarBotaoConfirmacao();
}

async function atualizarStatusComFallback(id, status) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/gerenciar/candidatos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error(`Erro ao atualizar candidato ${id}: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        throw error instanceof Error ? error : new Error(`Falha ao atualizar candidato ${id}`);
    }
}

async function confirmarAlteracoes() {
    if (!temAlteracoesPendentes()) {
        showToast('Nenhuma alteração pendente para salvar.', 'fa-circle-info');
        return;
    }

    if (usandoDadosFicticios()) {
        candidatos = candidatos.filter(c => !exclusoesPendentes.has(Number(c.id)));
        alteracoesPendentes.clear();
        exclusoesPendentes.clear();
        renderTable();
        updateStats();
        atualizarBotaoConfirmacao();
        showToast('Dados fictícios: alterações aplicadas apenas localmente.', 'fa-flask');
        return;
    }

    if (confirmChangesButton) {
        confirmChangesButton.disabled = true;
        confirmChangesButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Salvando…</span>';
    }

    try {
        for (const [id, alteracao] of [...alteracoesPendentes]) {
            if (exclusoesPendentes.has(Number(id))) {
                alteracoesPendentes.delete(id);
                continue;
            }
            await atualizarStatusComFallback(id, alteracao.status);
            alteracoesPendentes.delete(id);
        }

        for (const [id, candidate] of exclusoesPendentes) {
            const curriculoPath = obterCaminhoStorage(candidate.curriculoPath);
            if (curriculoPath) {
                const { error: storageError } = await supabase.storage
                    .from('curriculos')
                    .remove([curriculoPath]);

                if (storageError) throw storageError;
            }

        const response = await authenticatedFetch(`${API_BASE_URL}/gerenciar/candidatos/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Erro ao excluir candidato ${id}: ${response.status}`);
            }
            exclusoesPendentes.delete(id);
            candidatos = candidatos.filter(c => String(c.id) !== String(id));
        }

        salvarCandidatosNoCache(candidatos);
        showToast('Alterações salvas com sucesso!', 'fa-circle-check');
    } catch (error) {
        console.error('Não foi possível salvar as alterações:', error);
        showToast('Não foi possível salvar todas as alterações. Tente novamente.', 'fa-triangle-exclamation');
    } finally {
        renderTable();
        updateStats();
        atualizarBotaoConfirmacao();
    }
}


async function carregarDadosIniciais() {
    let dados;

    if (getDataMode() === 'mock') {
        dados = mockData.map(candidato => ({ ...candidato }));
        fonteCandidatos = 'mock';
    } else {
        dados = receberCandidatosDoCache();
        if (dados) {
            fonteCandidatos = 'cache';
        } else {
            try {
                dados = await receberDadosComFallback();
                fonteCandidatos = 'api';
            } catch (error) {
                console.warn("Servidor API indisponível. Carregando dados fictícios...");
                dados = mockData.map(candidato => ({ ...candidato }));
                fonteCandidatos = 'fallback';
            }
        }
    }

    reportDataSource('candidatos', fonteCandidatos);
    candidatos = normalizarDados(dados);
    if (!usandoDadosFicticios()) salvarCandidatosNoCache(candidatos);
    atualizarBotaoConfirmacao();
    renderTable();
    updateStats();
}

const CAMPOS_ORDENACAO = { name: 'nome', status: 'status' };
const ROTULOS_ORDENACAO = {
    nome: 'nome do candidato',
    status: 'status',
    id: 'número do candidato'
};

function campoDoCabecalho(th) {
    return CAMPOS_ORDENACAO[th.dataset.sort] || 'id';
}

function ordenarCandidatos(data) {
    const lista = [...data];

    lista.sort((a, b) => {
        const valA = a[campoOrdenacao];
        const valB = b[campoOrdenacao];
        let resultado;

        if (typeof valA === 'string' || typeof valB === 'string') {
            resultado = String(valA ?? '').localeCompare(String(valB ?? ''), 'pt-BR', { sensitivity: 'base' });
        } else {
            resultado = valA < valB ? -1 : valA > valB ? 1 : 0;
        }

        return direcaoOrdenacao === 'asc' ? resultado : -resultado;
    });

    return lista;
}

function alternarOrdenacao(campo) {
    if (campo === campoOrdenacao) {
        direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
    } else {
        campoOrdenacao = campo;
        direcaoOrdenacao = 'asc';
    }
    atualizarIndicadoresOrdenacao();
    renderTable();
}

function atualizarIndicadoresOrdenacao() {
    document.querySelectorAll('#gerenciarView .candidate-table th[data-sort]').forEach(th => {
        const campo = campoDoCabecalho(th);
        const ativo = campo === campoOrdenacao;
        th.setAttribute('aria-sort', ativo
            ? (direcaoOrdenacao === 'asc' ? 'ascending' : 'descending')
            : 'none');
        const direcao = ativo ? direcaoOrdenacao : 'asc';
        const ordem = `${direcao === 'asc' ? 'A → Z' : 'Z → A'} (${direcao === 'asc' ? 'crescente' : 'decrescente'})`;
        th.title = ativo
            ? `Ordenado por ${ROTULOS_ORDENACAO[campo]}: ${ordem}. Clique para inverter.`
            : `Ordenar por ${ROTULOS_ORDENACAO[campo]}: ${ordem}.`;
    });
}

function updateStats() {
    const ativos = candidatos.filter(c => !exclusoesPendentes.has(Number(c.id)));
    const total = ativos.length;
    const concluido = ativos.filter(c => c.status === 'CONCLUÍDO').length;
    const pendente = ativos.filter(c => c.status === 'PENDENTE').length;
    const recusado = ativos.filter(c => c.status === 'RECUSADO').length;

    if (statTotalVal) statTotalVal.textContent = total;
    if (statConcluidoVal) statConcluidoVal.textContent = concluido;
    if (statPendenteVal) statPendenteVal.textContent = pendente;
    if (statRecusadoVal) statRecusadoVal.textContent = recusado;
}

function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    atualizarIndicadoresOrdenacao();

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusFilter = candidateFilter ? candidateFilter.value : 'todos';

    let filtrados = candidatos.filter(item => {
        const idMatch = item.id.toString().includes(searchTerm);
        const nameMatch = item.nome.toLowerCase().includes(searchTerm);
        const roleMatch = (item.cargo || '').toLowerCase().includes(searchTerm);
        const matchesSearch = idMatch || nameMatch || roleMatch;
        const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    filtrados = ordenarCandidatos(filtrados);

    if (filtrados.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
    }

    filtrados.forEach(item => {
        const tr = document.createElement('tr');
        if (exclusoesPendentes.has(Number(item.id))) tr.classList.add('is-pending-delete');
        tr.innerHTML = `
            <td>
                <button class="quote-person" type="button" onclick="window.openCandidateModal('${item.id}')">
                    <span class="quote-avatar">${escaparHtml(getInitials(item.nome))}</span>
                    <span class="quote-person-copy"><strong>${escaparHtml(item.nome)}</strong><span>#${item.id}</span></span>
                </button>
            </td>
            <td style="color: var(--text-secondary); font-weight: 500;">${formatPhone(item.telefone)}</td>
            <td style="color: var(--text-secondary);">${sanitizeEmail(item.email)}</td>
            <td>${window.renderStatusDropdown(item.id, item.status, 'table', 'candidate')}</td>
            <td>
                <button class="quote-open-button" type="button" title="Ver ficha" aria-label="Ver ficha de ${item.nome}" onclick="window.openCandidateModal('${item.id}')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    atualizarIndicadoresOrdenacao();
}

window.handleTableStatusChange = function(selectElem, id) {
    if (exclusoesPendentes.has(Number(id))) return;
    const newStatus = selectElem.value;
    const item = candidatos.find(c => c.id === id);

    if (item) {
        item.status = newStatus;
        alteracoesPendentes.set(id, { status: newStatus });

        if (String(activeCandidateId) === String(id)) window.openCandidateModal(item.id);

        updateStats();
        atualizarBotaoConfirmacao();
        renderTable();
        showToast(`Status do candidato #${id} alterado para [${newStatus}]`);
    }
};

window.openCandidateModal = function(id) {
    const candidate = candidatos.find(c => String(c.id) === String(id));
    if (!candidate || !candidateDetail || !candidateDetailContent) return;

    activeCandidateId = candidate.id;

    const marcadoParaExclusao = exclusoesPendentes.has(Number(candidate.id));
    const info = (titulo, valor, icone, idElemento = '') => `<div class="quote-detail-item"><span class="quote-detail-icon"><i class="fa-solid ${icone}"></i></span><div><small>${titulo}</small><strong${idElemento ? ` id="${idElemento}"` : ''}>${escaparHtml(valor || 'Não informado')}</strong></div></div>`;

    const telefone = candidate.telefone ? formatPhone(candidate.telefone) : '';
    const telefoneDigitos = String(candidate.telefone || '').replace(/\D/g, '');
    const email = candidate.email ? sanitizeEmail(candidate.email) : '';
    const arquivo = candidate.curriculoPath ? candidate.curriculoPath.split('/').pop() : '';
    const iconeArquivo = curriculoEhImagem(candidate.curriculoPath) ? 'fa-file-image' : 'fa-file-pdf';

    candidateDetailContent.innerHTML = `
        <section class="quote-detail-status${marcadoParaExclusao ? ' is-locked' : ''}"><span>Status atual</span>${window.renderStatusDropdown(candidate.id, candidate.status, 'detail', 'candidate')}</section>
        <section class="quote-detail-section"><h3><i class="fa-regular fa-address-card"></i> Candidato</h3><div class="quote-detail-person"><span class="quote-avatar">${escaparHtml(getInitials(candidate.nome))}</span><div><strong>${escaparHtml(candidate.nome || 'Candidato sem nome')}</strong><span>${escaparHtml(candidate.cargo || '')}</span></div></div>${info('E-mail', email, 'fa-envelope')}${email ? `<a class="quote-contact-link" href="mailto:${escaparHtml(email)}"><i class="fa-regular fa-paper-plane"></i> Enviar e-mail</a>` : ''}${info('Telefone', telefone, 'fa-phone')}${telefoneDigitos ? `<a class="quote-contact-link" href="https://wa.me/55${telefoneDigitos}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Conversar no WhatsApp</a>` : ''}</section>
        <section class="quote-detail-section"><h3><i class="fa-solid fa-file-lines"></i> Currículo</h3>${info('Arquivo', arquivo || 'Currículo não disponível', iconeArquivo)}${arquivo ? `<div><button class="quote-contact-link" type="button" data-pdf-action="Visualizar"><i class="fa-regular fa-eye"></i> Visualizar currículo</button></div><div><button class="quote-contact-link" type="button" data-pdf-action="Download"><i class="fa-solid fa-download"></i> Baixar currículo</button></div>` : ''}${info('Tamanho', candidate.pdfSize || (arquivo ? (usandoDadosFicticios() ? 'Indisponível (dados fictícios)' : 'Calculando…') : ''), 'fa-weight-hanging', 'candidatePdfSize')}${info('Enviado em', candidate.dataEnvio, 'fa-calendar')}</section>
        <section class="quote-detail-section"><h3><i class="fa-solid fa-comments"></i> Mensagem</h3><div class="quote-detail-notes"><small>Mensagem do candidato</small><p>${escaparHtml(candidate.mensagem || 'Nenhuma mensagem enviada.')}</p></div></section>
        <section class="quote-delete-section"><div><strong>Excluir candidato</strong><p>Marca o candidato e o currículo anexo para exclusão. Nada é apagado até você salvar as alterações.</p></div><button type="button" data-candidate-delete>${marcadoParaExclusao ? '<i class="fa-solid fa-rotate-left"></i> Desfazer exclusão' : '<i class="fa-regular fa-trash-can"></i> Apagar candidato'}</button></section>
        <footer class="quote-detail-footer">Candidatura #${escaparHtml(candidate.id)} · Enviada em ${escaparHtml(candidate.dataEnvio || 'data indisponível')}</footer>`;

    candidateDetail.hidden = false;
    candidateDetail.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quote-detail-open');
    candidateDetail.querySelector('.quote-close')?.focus();

    if (arquivo && !candidate.pdfSize) atualizarTamanhoCurriculo(candidate);
};

function closeModal() {
    activeCandidateId = null;
    if (!candidateDetail || candidateDetail.hidden) return;
    candidateDetail.hidden = true;
    candidateDetail.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quote-detail-open');
}

window.apagarCandidato = async function(id) {
    const candidate = candidatos.find(c => String(c.id) === String(id));
    if (!candidate) return;

    const chave = Number(id);

    if (exclusoesPendentes.has(chave)) {
        exclusoesPendentes.delete(chave);
        renderTable();
        updateStats();
        atualizarBotaoConfirmacao();
        showToast(`Exclusão do candidato #${id} desfeita.`, 'fa-rotate-left');
        if (String(activeCandidateId) === String(id)) window.openCandidateModal(id);
        return;
    }

    if (!confirm(`Marcar o candidato #${id} para exclusão? Ele só será apagado quando você salvar as alterações.`)) return;

    exclusoesPendentes.set(chave, candidate);
    renderTable();
    updateStats();
    atualizarBotaoConfirmacao();
    showToast(`Candidato #${id} marcado para exclusão. Salve as alterações para confirmar.`, 'fa-trash');

    if (String(activeCandidateId) === String(id)) {
        closeModal();
    }
};


function obterCaminhoStorage(caminhoOriginal) {
    if (!caminhoOriginal) return null;

    let caminho = String(caminhoOriginal)
        .trim()
        .replace(/^\/+/, '');

    if (/^https?:\/\//i.test(caminho)) {
        const url = new URL(caminho);
        const marcador = '/storage/v1/object/public/curriculos/';
        const indice = url.pathname.indexOf(marcador);
        if (indice === -1) return null;
        caminho = url.pathname.slice(indice + marcador.length);
    }

    return decodeURIComponent(caminho)
        .replace(/^public\/curriculos\//i, '')
        .replace(/^curriculos\//i, '');
}

function obterCurriculoUrl(caminhoOriginal) {
    const caminho = obterCaminhoStorage(caminhoOriginal);
    if (!caminho) return null;

    const caminhoCodificado = caminho
        .split('/')
        .map(encodeURIComponent)
        .join('/');

    const baseUrl = SUPABASE_URL.replace(/\/+$/, '');

    return `${baseUrl}/storage/v1/object/public/curriculos/${caminhoCodificado}`;
}

function formatarTamanhoArquivo(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;

    const unidades = ['KB', 'MB', 'GB'];
    let tamanho = bytes;
    let unidade = -1;

    do {
        tamanho /= 1024;
        unidade += 1;
    } while (tamanho >= 1024 && unidade < unidades.length - 1);

    return `${tamanho.toFixed(tamanho >= 10 ? 1 : 2)} ${unidades[unidade]}`;
}

function curriculoEhImagem(caminho) {
    return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)$/i.test(caminho || '');
}

async function atualizarTamanhoCurriculo(candidate) {
    if (usandoDadosFicticios()) return;
    const fileUrl = obterCurriculoUrl(candidate.curriculoPath);
    if (!fileUrl) return;

    try {
        const response = await fetch(fileUrl, { method: 'HEAD' });
        if (!response.ok) throw new Error(`Erro ao consultar currículo: ${response.status}`);

        let tamanho = formatarTamanhoArquivo(Number(response.headers.get('content-length')));
        if (!tamanho) {
            const fileResponse = await fetch(fileUrl);
            if (!fileResponse.ok) {
                throw new Error(`Erro ao consultar currículo: ${fileResponse.status}`);
            }
            const blob = await fileResponse.blob();
            tamanho = formatarTamanhoArquivo(blob.size);
        }
        if (!tamanho) return;

        candidate.pdfSize = tamanho;
        if (String(activeCandidateId) === String(candidate.id)) {
            const campoTamanho = document.getElementById('candidatePdfSize');
            if (campoTamanho) campoTamanho.textContent = tamanho;
        }
    } catch (error) {
        console.warn('Não foi possível consultar o tamanho do currículo:', error);
    }
}

window.simulatePdfAction = function(action) {
    if (!activeCandidateId) return;

    if (usandoDadosFicticios()) {
        showToast('Currículos não estão disponíveis nos dados fictícios.', 'fa-flask');
        return;
    }

    const candidate = candidatos.find(
        c => c.id === activeCandidateId
    );

    if (!candidate) return;

    const fileUrl = obterCurriculoUrl(candidate.curriculoPath);

    if (!fileUrl) {
        showToast(
            'Erro ao carregar o arquivo PDF.',
            'fa-triangle-exclamation'
        );
        return;
    }

    if (action === 'Visualizar') {
        if (curriculumModal && curriculumPreview) {
            if (curriculumModalTitle) {
                curriculumModalTitle.textContent =
                    `Currículo - ${candidate.nome}`;
            }

            curriculumPreview.replaceChildren();

            if (curriculoEhImagem(candidate.curriculoPath)) {
                const image = document.createElement('img');
                image.src = fileUrl;
                image.alt = `Currículo de ${candidate.nome}`;
                image.style.cssText =
                    'display:block;max-width:100%;max-height:80vh;margin:auto;border-radius:8px;object-fit:contain;';
                curriculumPreview.appendChild(image);
            } else {
                const iframe = document.createElement('iframe');
                iframe.src = fileUrl;
                iframe.title = `Currículo de ${candidate.nome}`;
                iframe.style.cssText =
                    'width:100%;height:80vh;border:none;border-radius:8px;';
                curriculumPreview.appendChild(iframe);
            }

            curriculumModal.hidden = false;
            document.body.classList.add('modal-open');
        } else {
            window.open(fileUrl, '_blank', 'noopener');
        }

        showToast('Abrindo currículo...', 'fa-file-pdf');

    } else if (action === 'Download') {
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro ao baixar currículo: ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                const nomeArquivo = candidate.curriculoPath
                    .split('/')
                    .pop()
                    ?.replace(/_+$/, '') || 'curriculo';
                link.download = nomeArquivo;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(blobUrl);
                showToast('Currículo baixado com sucesso.', 'fa-download');
            })
            .catch(error => {
                console.error(error);
                showToast('Não foi possível baixar o currículo.', 'fa-triangle-exclamation');
            });
    }
};


function fecharCurriculo() {
    visualizacaoAtual += 1;

    if (curriculumPreview) {
        curriculumPreview.replaceChildren();
    }

    if (curriculumModal) {
        curriculumModal.hidden = true;
    }

    document.body.classList.remove('modal-open');
}


function showToast(message, icon = 'fa-circle-check') {
    if (message !== 'Alterações salvas com sucesso!') return;
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


function setupDarkMode() {
    if (!darkModeToggle) return;
    const isDark = localStorage.getItem('theme_dark') === 'true';
    document.body.classList.toggle('dark-mode', isDark);

    const atualizarControleTema = dark => {
        darkModeToggle.innerHTML = dark
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
        darkModeToggle.setAttribute('aria-pressed', String(dark));
        darkModeToggle.title = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
        darkModeToggle.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
    };
    atualizarControleTema(isDark);

    darkModeToggle.addEventListener('click', () => {
        const dark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme_dark', dark);
        atualizarControleTema(dark);
    });
}

async function verificarStatusApi(endpoint = `${API_BASE_URL}/gerenciar/candidatos`) {
    await checkApiStatus(endpoint);
}

window.addEventListener('empregamais:check-api-status', event => {
    verificarStatusApi(event.detail?.endpoint || `${API_BASE_URL}/gerenciar/candidatos`);
});

async function atualizarStatusETabela() {
    if (temAlteracoesPendentes()) {
        showToast('Confirme ou descarte as alterações antes de atualizar.', 'fa-triangle-exclamation');
        return;
    }

    await verificarStatusApi();
    if (getDataMode() === 'mock') return;
    localStorage.removeItem(candidatosCacheKey);
    await carregarDadosIniciais();
}

registerDiagnostics('candidatos', {
    label: 'Candidatos',
    pending: () => contarPendencias(),
    rows: () => [
        ['Registros carregados', candidatos.length],
        ['Alterações pendentes', contarPendencias()],
        ['Cache local', descreverCacheCandidatos()]
    ]
});

function descreverCacheCandidatos() {
    try {
        const cache = JSON.parse(localStorage.getItem(candidatosCacheKey));
        if (!cache || !Array.isArray(cache.dados)) return 'Vazio';
        const idade = Date.now() - cache.timestamp;
        return idade >= candidatosCacheTtl
            ? 'Expirado'
            : `Válido (${Math.round(idade / 1000)} s de ${candidatosCacheTtl / 1000} s)`;
    } catch {
        return 'Indisponível';
    }
}

window.addEventListener('empregamais:data-mode-change', async () => {
    if (!gerenciarHabilitado) return;
    alteracoesPendentes.clear();
    exclusoesPendentes.clear();
    localStorage.removeItem(candidatosCacheKey);
    closeModal();
    await carregarDadosIniciais();
    if (document.getElementById('acompanharView')?.hidden === false) carregarAnalises();
});

const MODULE_PERMISSIONS = {
    gerenciar: [ROLES.ADMIN, ROLES.GESTOR, ROLES.RH],
    acompanhar: [ROLES.ADMIN, ROLES.MONITOR],
    comercial: [ROLES.ADMIN, ROLES.COMERCIAL]
};

function podeAcessarModulo(role, module) {
    return MODULE_PERMISSIONS[module]?.includes(role) ?? false;
}

function mostrarModulo(module) {
    if (!module) return;

    if (dashboardMemoryReady && module !== activeModule) {
        clearTimeout(dashboardScrollTimer);
        saveAdminDashboardMemory();
    }

    const views = {
        gerenciar: gerenciarView,
        acompanhar: acompanharView,
        comercial: comercialView
    };

    Object.entries(views).forEach(([name, view]) => {
        if (view) view.hidden = name !== module;
    });
    activeModule = module;
    if (dashboardMemoryReady) {
        adminDashboardMemory.module = module;
        persistAdminDashboardMemory();
    }

    moduleTabs.forEach(tab => {
        const active = tab.dataset.module === module;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-current', active ? 'page' : 'false');
    });

    if (dashboardMemoryReady) restoreAdminModuleScroll();
}

async function carregarAnalises() {
    if (!analysisGrid) return;

    try {
        let analises;
        if (getDataMode() === 'mock') {
            analises = mockAnalises;
        } else {
            const response = await authenticatedFetch(`${API_BASE_URL}/acompanhar/analises`);
            if (!response.ok) throw new Error(`Erro ao buscar análises: ${response.status}`);
            analises = await response.json();
        }

        analisesCurriculo = Array.isArray(analises) ? analises : [];
        atualizarResumoAnalises();
        renderizarAnalises();
    } catch (error) {
        console.error('Não foi possível carregar as análises:', error);
        analysisGrid.innerHTML = '<p class="analysis-notice">Não foi possível carregar as análises. Tente novamente.</p>';
        document.getElementById('analysisCount')?.replaceChildren(document.createTextNode('Falha ao carregar as análises'));
        document.getElementById('analysisEmpty')?.setAttribute('hidden', '');
    }
}

let analisesCurriculo = [];
const normalizarStatusAnalise = analise => {
    const status = String(analise.status ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    if (/erro|falh|failed|error/.test(status)) return 'falha';
    if (/conclu|finaliz|complete|success|aprovad/.test(status)) return 'concluida';
    return 'andamento';
};
const escaparTextoAnalise = valor => String(valor ?? '').replace(/[&<>"']/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caractere]));
const formatarDataAnalise = valor => {
    if (!valor) return '—';
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(data);
};
function atualizarResumoAnalises() {
    const totais = { andamento: 0, concluida: 0, falha: 0 };
    analisesCurriculo.forEach(analise => totais[normalizarStatusAnalise(analise)]++);
    document.getElementById('analysisTotal')?.replaceChildren(document.createTextNode(String(analisesCurriculo.length)));
    document.getElementById('analysisRunning')?.replaceChildren(document.createTextNode(String(totais.andamento)));
    document.getElementById('analysisCompleted')?.replaceChildren(document.createTextNode(String(totais.concluida)));
    document.getElementById('analysisFailed')?.replaceChildren(document.createTextNode(String(totais.falha)));
}
function renderizarAnalises() {
    if (!analysisGrid) return;
    const termo = (document.getElementById('analysisSearch')?.value ?? '').trim().toLocaleLowerCase('pt-BR');
    const filtro = document.getElementById('analysisFilter')?.value ?? 'todos';
    const filtradas = analisesCurriculo.filter(analise => {
        const statusTipo = normalizarStatusAnalise(analise);
        const texto = [analise.id, analise.candidatoId, analise.status, analise.modelo].join(' ').toLocaleLowerCase('pt-BR');
        return (filtro === 'todos' || statusTipo === filtro) && texto.includes(termo);
    });
    const count = document.getElementById('analysisCount');
    if (count) count.textContent = `${filtradas.length} ${filtradas.length === 1 ? 'análise encontrada' : 'análises encontradas'}`;
    const empty = document.getElementById('analysisEmpty');
    const emptyTitle = document.getElementById('analysisEmptyTitle');
    const emptyText = document.getElementById('analysisEmptyText');
    if (!filtradas.length) {
        analysisGrid.innerHTML = '';
        if (empty) empty.hidden = false;
        if (emptyTitle) emptyTitle.textContent = analisesCurriculo.length ? 'Nenhuma análise encontrada' : 'Nenhuma análise por aqui';
        if (emptyText) emptyText.textContent = analisesCurriculo.length ? 'Altere a busca ou o filtro para ver outros resultados.' : 'As análises de currículo aparecerão nesta lista.';
        return;
    }
    if (empty) empty.hidden = true;
    analysisGrid.innerHTML = filtradas.map(analise => {
        const tipo = normalizarStatusAnalise(analise);
        const classeStatus = { andamento: 'running', concluida: 'completed', falha: 'failed' }[tipo];
        const status = escaparTextoAnalise(analise.status || 'Não informado');
        let resultado = analise.resultado;
        if (resultado && typeof resultado === 'object') resultado = Object.entries(resultado).map(([chave, valor]) => `${chave}: ${typeof valor === 'string' ? valor : JSON.stringify(valor)}`).join(' · ');
        const descricao = resultado || analise.erro || 'O resultado será exibido quando a análise estiver disponível.';
        return `<article class="analysis-card" data-analysis-id="${escaparTextoAnalise(analise.id)}" data-candidate-id="${escaparTextoAnalise(analise.candidatoId)}">
            <header><div class="analysis-card-title"><strong>Análise #${escaparTextoAnalise(analise.id ?? '—')}</strong><span>Candidato #${escaparTextoAnalise(analise.candidatoId ?? '—')}</span></div><span class="analysis-status is-${classeStatus}">${status}</span></header>
            <div class="analysis-card-meta"><div><span>Modelo</span><strong title="${escaparTextoAnalise(analise.modelo || '—')}">${escaparTextoAnalise(analise.modelo || '—')}</strong></div><div><span>Iniciada em</span><strong>${formatarDataAnalise(analise.createdAt)}</strong></div><div><span>Finalizada em</span><strong>${formatarDataAnalise(analise.finishedAt)}</strong></div><div><span>Identificação</span><strong>#${escaparTextoAnalise(analise.candidatoId ?? '—')}</strong></div></div>
            <p class="analysis-result"><strong>${analise.erro ? 'Detalhe do erro' : 'Resultado'}</strong>${escaparTextoAnalise(descricao)}</p>
        </article>`;
    }).join('');
}

document.getElementById('refreshAnalyses')?.addEventListener('click', carregarAnalises);
document.getElementById('analysisSearch')?.addEventListener('input', renderizarAnalises);
document.getElementById('analysisFilter')?.addEventListener('change', renderizarAnalises);

document.addEventListener('DOMContentLoaded', async () => {
    let session;

    try {
        session = await requireValidSession();
    } catch (error) {
        console.error(error);
        return;
    }

    setupDarkMode();

    const role = session.user?.app_metadata?.role
        ?? session.user?.user_metadata?.role;

    rememberAdminDashboard = role === ROLES.ADMIN;
    if (rememberAdminDashboard) readAdminDashboardMemory();

    if (nomeUsuario) nomeUsuario.textContent = ROLE_NAMES[role] ?? "Usuário";
    if (avatarUsuario) avatarUsuario.textContent = ROLE_AVATARS[role] ?? "USU";

    moduleTabs.forEach(tab => {
        const module = tab.dataset.module;
        const permitido = podeAcessarModulo(role, module);
        tab.disabled = !permitido;
        tab.classList.toggle('is-locked', !permitido);
        tab.title = permitido ? '' : 'Sem permissão para acessar esta área';
        tab.setAttribute('aria-disabled', String(!permitido));
        tab.addEventListener('click', () => {
            if (!permitido) return;
            mostrarModulo(module);
            if (module === 'acompanhar') carregarAnalises();
        });
    });

    let moduloInicial = 'gerenciar';
    if (!podeAcessarModulo(role, moduloInicial)) {
        moduloInicial = ['acompanhar', 'comercial'].find(module =>
            podeAcessarModulo(role, module)
        ) ?? 'gerenciar';
    }
    if (rememberAdminDashboard && podeAcessarModulo(role, adminDashboardMemory.module)) {
        moduloInicial = adminDashboardMemory.module;
    }
    mostrarModulo(moduloInicial);
    dashboardMemoryReady = rememberAdminDashboard;
    restoreAdminModuleScroll();

    if (podeAcessarModulo(role, 'gerenciar')) {
        gerenciarHabilitado = true;
        verificarStatusApi();
        setInterval(atualizarStatusETabela, 60 * 3000);
        await carregarDadosIniciais();
    }

    if (moduloInicial === 'acompanhar') await carregarAnalises();
    restoreAdminModuleScroll();

    if (searchInput) searchInput.addEventListener('input', renderTable);
    if (candidateFilter) candidateFilter.addEventListener('change', renderTable);
    const candidateTableHead = document.querySelector('#gerenciarView .candidate-table thead');
    if (candidateTableHead) {
        const ordenarPeloCabecalho = th => {
            const campo = campoDoCabecalho(th);
            if (campoOrdenacao === campo) direcaoOrdenacao = direcaoOrdenacao === 'asc' ? 'desc' : 'asc';
            else {
                campoOrdenacao = campo;
                direcaoOrdenacao = 'asc';
            }
            if (sortUnifiedSelect) sortUnifiedSelect.value = `${campo === 'nome' ? 'name' : 'id'}_${direcaoOrdenacao}`;
            renderTable();
        };
        candidateTableHead.addEventListener('click', event => {
            const th = event.target.closest('th[data-sort]');
            if (th) ordenarPeloCabecalho(th);
        });
        candidateTableHead.addEventListener('keydown', event => {
            if (!['Enter', ' '].includes(event.key)) return;
            const th = event.target.closest('th[data-sort]');
            if (!th) return;
            event.preventDefault();
            ordenarPeloCabecalho(th);
        });
    }
    if (closeCurriculumModalButton) closeCurriculumModalButton.addEventListener('click', fecharCurriculo);

    if (confirmChangesButton) confirmChangesButton.addEventListener('click', confirmarAlteracoes);

    if (refreshCandidatesButton) {
        refreshCandidatesButton.addEventListener('click', async () => {
            if (!confirmarSaidaSemSalvar()) return;
            descartarAlteracoesPendentes();
            refreshCandidatesButton.disabled = true;
            try {
                await atualizarStatusETabela();
                showToast('Candidatos atualizados.', 'fa-rotate-right');
            } catch (error) {
                console.error('Não foi possível atualizar os candidatos:', error);
                showToast('Não foi possível atualizar os candidatos.', 'fa-triangle-exclamation');
            } finally {
                refreshCandidatesButton.disabled = false;
            }
        });
    }

    if (sortUnifiedSelect) {
        sortUnifiedSelect.addEventListener('change', (e) => {
            const [campo, direcao] = e.target.value.split('_');

            campoOrdenacao = campo === 'name' ? 'nome' : 'id';
            direcaoOrdenacao = direcao;

            renderTable();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            fecharCurriculo();
        }
    });

    window.addEventListener('beforeunload', (event) => {
        if (!temAlteracoesPendentes()) return;
        event.preventDefault();
        event.returnValue = '';
    });
});
