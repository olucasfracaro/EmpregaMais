import { API_BASE_URL, SUPABASE_URL } from './config.js';
import { authenticatedFetch, requireAdminSession, supabase } from './auth.js';

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

let candidatos = [];
const alteracoesPendentes = new Map();
const exclusoesPendentes = new Map();
const curriculoBaseUrl = 'https://kampbrxrosxtspcmgewr.supabase.co/storage/v1/object/public/curriculos/';
const candidatosCacheKey = 'candidatosCache-v2';
const candidatosCacheTtl = 5 * 60 * 1000;

let campoOrdenacao = 'id';
let direcaoOrdenacao = 'asc';
let visualizacaoAtual = 0;
let activeCandidateId = null;


const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');
const confirmChangesButton = document.getElementById('confirmChanges') || document.getElementById('saveChangesBtn');
const refreshCandidatesButton = document.getElementById('refreshCandidates') || document.getElementById('refreshBtn');

const sortUnifiedSelect = document.getElementById('sortUnifiedSelect');

const curriculumModal = document.getElementById('curriculumModal');
const curriculumModalTitle = document.getElementById('curriculumModalTitle');
const curriculumPreview = document.getElementById('curriculumPreview');
const closeCurriculumModalButton = document.getElementById('closeCurriculumModal');

const detailModal = document.getElementById('detailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalAvatar = document.getElementById('modalAvatar');
const modalName = document.getElementById('modalName');
const modalRole = document.getElementById('modalRole');
const modalPhone = document.getElementById('modalPhone');
const modalPhoneBtn = document.getElementById('modalPhoneBtn');
const modalEmail = document.getElementById('modalEmail');
const modalEmailBtn = document.getElementById('modalEmailBtn');
const modalPdfName = document.getElementById('modalPdfName');
const modalPdfMeta = document.getElementById('modalPdfMeta');
const modalMessageText = document.getElementById('modalMessageText');
const modalStatusSelect = document.getElementById('modalStatusSelect');
const replyTextarea = document.getElementById('replyTextarea');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const modalDeleteBtn = document.getElementById('modalDeleteBtn');
const toastContainer = document.getElementById('toastContainer');

const statTotalVal = document.getElementById('statTotalVal');
const statConcluidoVal = document.getElementById('statConcluidoVal');
const statPendenteVal = document.getElementById('statPendenteVal');
const statRecusadoVal = document.getElementById('statRecusadoVal');
const darkModeToggle = document.getElementById('darkModeToggle');
const apiStatusIndicator = document.getElementById('apiStatusIndicator');
const apiStatusText = document.getElementById('apiStatusText');


function formatPhone(phoneDigits) {
    if (!phoneDigits) return '(00) 00000-0000';
    const cleaned = ('' + phoneDigits).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})\$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
    const matchShort = cleaned.match(/^(\d{2})(\d{4})(\d{4})\$/);
    if (matchShort) return `(${matchShort[1]}) ${matchShort[2]}-${matchShort[3]}`;
    return phoneDigits;
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
        const response = await authenticatedFetch(`${API_BASE_URL}/candidatos`, {
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

function temAlteracoesPendentes() {
    return alteracoesPendentes.size > 0 || exclusoesPendentes.size > 0;
}

function atualizarBotaoConfirmacao() {
    if (!confirmChangesButton) return;

    const totalPendencias = alteracoesPendentes.size + exclusoesPendentes.size;
    confirmChangesButton.disabled = totalPendencias === 0;
    confirmChangesButton.innerHTML = totalPendencias > 0
        ? `<i class="fa-solid fa-check"></i> Confirmar alterações (${totalPendencias})`
        : '<i class="fa-solid fa-check"></i> Confirmar alterações';
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
        const response = await authenticatedFetch(`${API_BASE_URL}/candidato/${id}`, {
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

    if (confirmChangesButton) {
        confirmChangesButton.disabled = true;
        confirmChangesButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    }

    try {
        for (const [id, alteracao] of alteracoesPendentes) {
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

            const response = await authenticatedFetch(`${API_BASE_URL}/candidato/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error(`Erro ao excluir candidato ${id}: ${response.status}`);
            }
            exclusoesPendentes.delete(id);
        }

        salvarCandidatosNoCache(candidatos);
        showToast('Alterações salvas com sucesso!', 'fa-circle-check');
    } catch (error) {
        console.error('Não foi possível salvar as alterações:', error);
        showToast('Não foi possível salvar todas as alterações. Tente novamente.', 'fa-triangle-exclamation');
    } finally {
        atualizarBotaoConfirmacao();
    }
}


async function carregarDadosIniciais() {
    let dados = receberCandidatosDoCache();
    if (!dados) {
        try {
            dados = await receberDadosComFallback();
        } catch (error) {
            console.warn("Servidor API indisponível. Carregando dados fictícios...");
            dados = mockData;
        }
    }

    candidatos = normalizarDados(dados);
    salvarCandidatosNoCache(candidatos);
    atualizarBotaoConfirmacao();
    renderTable();
    updateStats();
}

function ordenarCandidatos(data) {
    const lista = [...data];

    lista.sort((a, b) => {
        let valA = a[campoOrdenacao];
        let valB = b[campoOrdenacao];

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
        }

        if (typeof valB === 'string') {
            valB = valB.toLowerCase();
        }

        if (valA < valB) {
            return direcaoOrdenacao === 'asc' ? -1 : 1;
        }

        if (valA > valB) {
            return direcaoOrdenacao === 'asc' ? 1 : -1;
        }

        return 0;
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
    const classeSetaAtual = direcaoOrdenacao === 'asc' ? 'fa-arrow-down-short-wide' : 'fa-arrow-up-wide-short';

    if (sortByIdIcon) {
        sortByIdIcon.className = `sort-indicator fa-solid ${campoOrdenacao === 'id' ? classeSetaAtual : 'fa-sort'}`;
    }
    if (sortByNameIcon) {
        sortByNameIcon.className = `sort-indicator fa-solid ${campoOrdenacao === 'name' ? classeSetaAtual : 'fa-sort'}`;
    }
}

function updateStats() {
    const total = candidatos.length;
    const concluido = candidatos.filter(c => c.status === 'CONCLUÍDO').length;
    const pendente = candidatos.filter(c => c.status === 'PENDENTE').length;
    const recusado = candidatos.filter(c => c.status === 'RECUSADO').length;

    if (statTotalVal) statTotalVal.textContent = total;
    if (statConcluidoVal) statConcluidoVal.textContent = concluido;
    if (statPendenteVal) statPendenteVal.textContent = pendente;
    if (statRecusadoVal) statRecusadoVal.textContent = recusado;
}

function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtrados = candidatos.filter(item => {
        const idMatch = item.id.toString().includes(searchTerm);
        const nameMatch = item.nome.toLowerCase().includes(searchTerm);
        const roleMatch = (item.cargo || '').toLowerCase().includes(searchTerm);
        return idMatch || nameMatch || roleMatch;
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
        tr.innerHTML = `
            <td style="font-weight: 800; color: var(--red-primary, #dc2626);">#${item.id}</td>
            <td>
                <div class="user-cell">
                    <div class="avatar-circle">${getInitials(item.nome)}</div>
                    <div class="user-info">
                        <div class="user-name" style="font-weight: 600;">${item.nome}</div>
                        <div class="user-role" style="font-size: 0.75rem; color: var(--text-secondary);">${item.cargo}</div>
                    </div>
                </div>
            </td>
            <td style="color: var(--text-secondary); font-weight: 500;">${formatPhone(item.telefone)}</td>
            <td style="color: var(--text-secondary);">${sanitizeEmail(item.email)}</td>
            <td>
                <select
                    class="status-select ${classeStatus(item.status)}"
                    onchange="window.handleTableStatusChange(this, ${item.id})"
                >
                    <option value="CONCLUÍDO" ${item.status === 'CONCLUÍDO' ? 'selected' : ''}>CONCLUÍDO</option>
                    <option value="PENDENTE" ${item.status === 'PENDENTE' ? 'selected' : ''}>PENDENTE</option>
                    <option value="RECUSADO" ${item.status === 'RECUSADO' ? 'selected' : ''}>RECUSADO</option>
                </select>
            </td>
            <td class="actions-cell">
                <button class="btn-action-view" onclick="window.openCandidateModal('${item.id}')">
                    <i class="fa-solid fa-address-card"></i> Ver Ficha
                </button>
                <button class="btn-action-delete" title="Excluir Candidato" onclick="window.apagarCandidato('${item.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}


window.handleTableStatusChange = function(selectElem, id) {
    const newStatus = selectElem.value;
    const item = candidatos.find(c => c.id === id);

    if (item) {
        item.status = newStatus;
        alteracoesPendentes.set(id, { status: newStatus });
        selectElem.className = `status-select ${classeStatus(newStatus)}`;
       
        if (activeCandidateId === id && modalStatusSelect) {
            modalStatusSelect.value = newStatus;
            modalStatusSelect.className = `status-select ${classeStatus(newStatus)}`;
        }

        updateStats();
        atualizarBotaoConfirmacao();
        showToast(`Status do ID #${id} alterado para [${newStatus}]`);
    }
};

window.openCandidateModal = function(id) {
    const candidate = candidatos.find(c => String(c.id) === String(id));
    if (!candidate) return;

    activeCandidateId = candidate.id;

    if (modalAvatar) modalAvatar.textContent = getInitials(candidate.nome);
    if (modalName) modalName.textContent = candidate.nome;
    if (modalRole) modalRole.textContent = `${candidate.cargo} • ID #${candidate.id}`;

    const formattedPhone = formatPhone(candidate.telefone);
    if (modalPhone) modalPhone.textContent = formattedPhone;
    if (modalPhoneBtn) modalPhoneBtn.href = `https://wa.me/55${candidate.telefone.replace(/\D/g, '')}`;

    const formattedEmail = sanitizeEmail(candidate.email);
    if (modalEmail) modalEmail.textContent = formattedEmail;
    if (modalEmailBtn) modalEmailBtn.href = `mailto:${formattedEmail}`;

    if (modalPdfName) {
        modalPdfName.textContent = candidate.curriculoPath
            ? candidate.curriculoPath.split('/').pop()
            : 'Currículo não disponível';
    }
    if (modalPdfMeta) {
        modalPdfMeta.textContent = `Tamanho: ${candidate.pdfSize || 'calculando...'} • Enviado em ${candidate.dataEnvio}`;
    }
    atualizarTamanhoCurriculo(candidate);

    if (modalMessageText) modalMessageText.textContent = `"${candidate.mensagem}"`;
    if (modalStatusSelect) {
        modalStatusSelect.value = candidate.status;
        modalStatusSelect.className = `status-select status-${candidate.status.toLowerCase()}`;
    }
    if (replyTextarea) replyTextarea.value = '';

    if (detailModal) {
        detailModal.classList.add('active');
        detailModal.setAttribute('aria-hidden', 'false');
    }
};

function closeModal() {
    if (detailModal) {
        detailModal.classList.remove('active');
        detailModal.setAttribute('aria-hidden', 'true');
    }
    activeCandidateId = null;
}

window.apagarCandidato = async function(id) {
    if (!confirm(`Tem certeza que deseja apagar o candidato #${id}?`)) return;

    const candidate = candidatos.find(c => String(c.id) === String(id));
    if (!candidate) return;

    candidatos = candidatos.filter(c => String(c.id) !== String(id));
    alteracoesPendentes.delete(Number(id));
    exclusoesPendentes.set(Number(id), candidate);
    renderTable();
    updateStats();
    atualizarBotaoConfirmacao();
    showToast(`Candidato #${id} marcado para exclusão. Confirme para salvar.`, 'fa-trash');

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
        if (activeCandidateId === candidate.id && modalPdfMeta) {
            modalPdfMeta.textContent = `Tamanho: ${tamanho} • Enviado em ${candidate.dataEnvio}`;
        }
    } catch (error) {
        console.warn('Não foi possível consultar o tamanho do currículo:', error);
    }
}

window.simulatePdfAction = function(action) {
    if (!activeCandidateId) return;

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
    if (isDark) {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    darkModeToggle.addEventListener('click', () => {
        const dark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme_dark', dark);
        darkModeToggle.innerHTML = dark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
}

async function verificarStatusApi() {
    if (!apiStatusIndicator || !apiStatusText) return;

    apiStatusIndicator.className = 'api-status-indicator is-checking';
    apiStatusText.textContent = 'Verificando status da API...';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/candidatos`, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`API retornou ${response.status}`);
        }

        apiStatusIndicator.className = 'api-status-indicator is-online';
        apiStatusText.textContent = 'API online';
    } catch (error) {
        apiStatusIndicator.className = 'api-status-indicator is-offline';
        apiStatusText.textContent = 'API offline';
        console.warn('Não foi possível verificar o status da API:', error);
    } finally {
        clearTimeout(timeout);
    }
}

async function atualizarStatusETabela() {
    if (temAlteracoesPendentes()) {
        showToast('Confirme ou descarte as alterações antes de atualizar.', 'fa-triangle-exclamation');
        return;
    }

    await verificarStatusApi();
    localStorage.removeItem(candidatosCacheKey);
    await carregarDadosIniciais();
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAdminSession();
    } catch (error) {
        console.error(error);
        return;
    }

    setupDarkMode();
    verificarStatusApi();
    setInterval(atualizarStatusETabela, 60 * 1000);
    carregarDadosIniciais();

    if (searchInput) searchInput.addEventListener('input', renderTable);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeCurriculumModalButton) closeCurriculumModalButton.addEventListener('click', fecharCurriculo);

    if (confirmChangesButton) confirmChangesButton.addEventListener('click', confirmarAlteracoes);

    if (refreshCandidatesButton) {
        refreshCandidatesButton.addEventListener('click', () => {
            if (!confirmarSaidaSemSalvar()) return;
            descartarAlteracoesPendentes();
            atualizarStatusETabela();
            showToast('Dados atualizados com sucesso!', 'fa-rotate-right');
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

    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            fecharCurriculo();
        }
    });

    if (modalStatusSelect) {
        modalStatusSelect.addEventListener('change', (e) => {
            if (activeCandidateId) {
                window.handleTableStatusChange(modalStatusSelect, activeCandidateId);
            }
        });
    }

    if (sendReplyBtn) {
        sendReplyBtn.addEventListener('click', () => {
            const text = replyTextarea ? replyTextarea.value.trim() : '';
            if (!text) {
                showToast('Por favor, digite uma mensagem de resposta.', 'fa-triangle-exclamation');
                return;
            }
            if (replyTextarea) replyTextarea.value = '';
            showToast('Resposta enviada com sucesso!', 'fa-paper-plane');
        });
    }

    if (modalDeleteBtn) {
        modalDeleteBtn.addEventListener('click', () => {
            if (activeCandidateId) window.apagarCandidato(activeCandidateId);
        });
    }

    window.addEventListener('beforeunload', (event) => {
        if (!temAlteracoesPendentes()) return;
        event.preventDefault();
        event.returnValue = '';
    });
});
