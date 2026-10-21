import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.local.js';


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
        status: 'CON',
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
        status: 'PEN',
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
        status: 'NÃO',
        curriculoPath: 'curriculo_pedro_santos.pdf',
        pdfSize: '1.2 MB',
        dataEnvio: '12/10/2026'
    }
];

let candidatos = [];
const alteracoesPendentes = new Map();
const curriculoBaseUrl = 'https://kampbrxrosxtspcmgewr.supabase.co/storage/v1/object/public/curriculos/';
const candidatosCacheKey = 'candidatosCache';
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
const statConVal = document.getElementById('statConVal');
const statPenVal = document.getElementById('statPenVal');
const statNaoVal = document.getElementById('statNaoVal');
const darkModeToggle = document.getElementById('darkModeToggle');


const usuario = localStorage.getItem("usuarioLogado");
if (!usuario) {
    localStorage.setItem("usuarioLogado", "admin"); 
}


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
    if (!status) return 'PEN';
    const st = String(status).toUpperCase();
    if (st === 'CONTRATADO' || st === 'CONCLUÍDO') return 'CON';
    if (st === 'PENDENTE') return 'PEN';
    if (st === 'RECUSADO' || st === 'NÃO') return 'NÃO';
    return st;
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
        pdfSize: item.pdfSize || '1.8 MB',
        dataEnvio: item.dataEnvio || '10/10/2026'
    }));
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

async function atualizarStatusComFallback(id, status) {
    const urls = [
        `/candidato/${id}`,
        `https://fantastic-space-pancake-4j66jpw9gjp63qpjg-8080.app.github.dev/candidato/${id}`,
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
        showToast('Nenhuma alteração pendente para salvar.', 'fa-circle-info');
        return;
    }

    if (confirmChangesButton) {
        confirmChangesButton.disabled = true;
        confirmChangesButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    }

    try {
        for (const [id, alteracao] of alteracoesPendentes) {
            try {
                await atualizarStatusComFallback(id, alteracao.status);
            } catch (err) {
                console.warn(`Simulando persistência local para candidato #${id}`);
            }
            const item = candidatos.find(c => c.id === id);
            if (item) {
                item.status = alteracao.status;
            }
            alteracoesPendentes.delete(id);
        }

        salvarCandidatosNoCache(candidatos);
        showToast('Alterações salvas com sucesso!', 'fa-circle-check');
    } catch (error) {
        console.error('Não foi possível salvar as alterações:', error);
        showToast('Erro ao salvar alterações.', 'fa-triangle-exclamation');
    } finally {
        if (confirmChangesButton) {
            confirmChangesButton.disabled = false;
            confirmChangesButton.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar alterações';
        }
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
    const con = candidatos.filter(c => c.status === 'CON').length;
    const pen = candidatos.filter(c => c.status === 'PEN').length;
    const nao = candidatos.filter(c => c.status === 'NÃO').length;

    if (statTotalVal) statTotalVal.textContent = total;
    if (statConVal) statConVal.textContent = con;
    if (statPenVal) statPenVal.textContent = pen;
    if (statNaoVal) statNaoVal.textContent = nao;
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
                    class="status-select status-${item.status.toLowerCase()}"
                    onchange="window.handleTableStatusChange(this, ${item.id})"
                >
                    <option value="CON" ${item.status === 'CON' ? 'selected' : ''}>CON</option>
                    <option value="PEN" ${item.status === 'PEN' ? 'selected' : ''}>PEN</option>
                    <option value="NÃO" ${item.status === 'NÃO' ? 'selected' : ''}>NÃO</option>
                </select>
            </td>
    <div class="actions-cell" style="display: flex; gap: 8px; justify-content: flex-end;">
        <!-- Classe corrigida para btn-action-view e ID entre aspas -->
        <button class="btn-action-view" onclick="window.openCandidateModal('${item.id}')">
            <i class="fa-solid fa-address-card"></i> Ver Ficha
        </button>
        <button class="btn-action-delete" title="Excluir Candidato" onclick="window.apagarCandidato('${item.id}')">
            <i class="fa-solid fa-trash"></i>
        </button>
    </div>
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
        selectElem.className = `status-select status-${newStatus.toLowerCase()}`;
       
        if (activeCandidateId === id && modalStatusSelect) {
            modalStatusSelect.value = newStatus;
            modalStatusSelect.className = `status-select status-${newStatus.toLowerCase()}`;
        }

        updateStats();
        salvarCandidatosNoCache(candidatos);
        showToast(`Status do ID #${id} alterado para [${newStatus}]`);
    }
};

window.openCandidateModal = function(id) {
    const candidate = candidatos.find(c => String(c.id) === String(id));
    if (!candidate) return;

    activeCandidateId = id;

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
    if (modalPdfMeta) modalPdfMeta.textContent = `Tamanho: ${candidate.pdfSize} • Enviado em ${candidate.dataEnvio}`;

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

window.apagarCandidato = function(id) {
    if (confirm(`Tem certeza que deseja apagar o candidato #${id}?`)) {
        candidatos = candidatos.filter(c => c.id !== id);
        alteracoesPendentes.delete(id);
        salvarCandidatosNoCache(candidatos);
        renderTable();
        updateStats();
        showToast(`Candidato #${id} excluído com sucesso.`, 'fa-trash');

        if (activeCandidateId === id) {
            closeModal();
        }
    }
};



function obterCurriculoUrl(caminhoOriginal) {
    if (!caminhoOriginal) return null;

    let caminho = String(caminhoOriginal)
        .trim()
        .replace(/^\/+/, '');

   
    if (/^https?:\/\//i.test(caminho)) {
        return caminho;
    }

    caminho = caminho
        .replace(/^public\/curriculos\//i, '')
        .replace(/^curriculos\//i, '');

    const caminhoCodificado = caminho
        .split('/')
        .map(encodeURIComponent)
        .join('/');

    const baseUrl = SUPABASE_URL.replace(/\/+$/, '');

    return `${baseUrl}/storage/v1/object/public/curriculos/${caminhoCodificado}`;
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

            const iframe = document.createElement('iframe');
            iframe.src = fileUrl;
            iframe.title = `Currículo de ${candidate.nome}`;
            iframe.style.cssText =
                'width:100%;height:80vh;border:none;border-radius:8px;';

            curriculumPreview.appendChild(iframe);

            curriculumModal.hidden = false;
            document.body.classList.add('modal-open');
        } else {
            window.open(fileUrl, '_blank', 'noopener');
        }

        showToast('Abrindo currículo...', 'fa-file-pdf');

    } else if (action === 'Download') {
        // Abre o arquivo público em outra aba.
        // O navegador poderá exibir o PDF em vez de baixá-lo,
        // dependendo dos cabeçalhos enviados pelo Supabase.
        window.open(fileUrl, '_blank', 'noopener');

        showToast(
            'Abrindo currículo para download...',
            'fa-download'
        );
    }
};


function fecharCurriculo() {
    visualizacaoAtual += 1;

    if (curriculumPreview) {
        const blobUrl = curriculumPreview.dataset.blobUrl;

        curriculumPreview.replaceChildren();
        delete curriculumPreview.dataset.blobUrl;

        liberarUrlBlob(blobUrl);
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
        showToast(dark ? 'Modo Escuro ativado.' : 'Modo Claro ativado.', 'fa-moon');
    });
}


document.addEventListener('DOMContentLoaded', () => {
    setupDarkMode();
    carregarDadosIniciais();

    if (searchInput) searchInput.addEventListener('input', renderTable);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeCurriculumModalButton) closeCurriculumModalButton.addEventListener('click', fecharCurriculo);

    if (confirmChangesButton) confirmChangesButton.addEventListener('click', confirmarAlteracoes);

    if (refreshCandidatesButton) {
        refreshCandidatesButton.addEventListener('click', () => {
            localStorage.removeItem(candidatosCacheKey);
            carregarDadosIniciais();
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
});