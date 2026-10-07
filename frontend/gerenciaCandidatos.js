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
}

function atualizarIndicadoresOrdenacao() {
    const classeSetaAtual = direcaoOrdenacao === 'asc' ? 'fa-arrow-down' : 'fa-arrow-up';

    sortByIdIcon.className = `sort-indicator fa-solid ${campoOrdenacao === 'id' ? classeSetaAtual : 'fa-sort'}`;
    sortByNameIcon.className = `sort-indicator fa-solid ${campoOrdenacao === 'name' ? classeSetaAtual : 'fa-sort'}`;
}

let activeCandidateId = null;

// Stats elements
const statTotalVal = document.getElementById('statTotalVal');
const statConVal = document.getElementById('statConVal');
const statPenVal = document.getElementById('statPenVal');
const statNaoVal = document.getElementById('statNaoVal');

// Modal elements
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
const toastContainer = document.getElementById('toastContainer');

function getInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function showToast(message, icon = 'fa-circle-check') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateStats() {
    const total = data.length;
    const con = data.filter(c => c.status === 'CON').length;
    const pen = data.filter(c => c.status === 'PEN').length;
    const nao = data.filter(c => c.status === 'NÃO').length;

    statTotalVal.textContent = total;
    statConVal.textContent = con;
    statPenVal.textContent = pen;
    statNaoVal.textContent = nao;
}

function renderTable(data) {
    tableBody.innerHTML = '';

    if (data.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    data.forEach(item => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td style="font-weight: 800; color: var(--accent-red);">#${item.id}</td>
            <td>
                <div class="user-cell">
                    <div class="avatar-circle">${getInitials(item.nome)}</div>
                    <div class="user-info">
                        <div class="user-name">${item.nome}</div>
                        <div class="user-role">${item.cargo}</div>
                    </div>
                </div>
            </td>
            <td style="color: var(--text-secondary); font-weight: 500;">${item.telefone}</td>
            <td style="color: var(--text-secondary);">${item.email}</td>
            <td>
                <select 
                    class="status-select status-${item.status}" 
                    onchange="handleTableStatusChange(this, ${item.id})"
                >
                    <option value="CON" ${item.status === 'CON' ? 'selected' : ''}>CON</option>
                    <option value="PEN" ${item.status === 'PEN' ? 'selected' : ''}>PEN</option>
                    <option value="NÃO" ${item.status === 'NÃO' ? 'selected' : ''}>NÃO</option>
                </select>
            </td>
            <td style="text-align: right;">
                <button class="btn-view-details" onclick="openCandidateModal(${item.id})">
                    <i class="fa-solid fa-address-card"></i> Ver Ficha
                </button>
            </td>
        `;

        tableBody.appendChild(tr);
    });
}

function handleTableStatusChange(selectElem, id) {
    const newStatus = selectElem.value;
    const item = data.find(c => c.id === id);

    if (item) {
        item.status = newStatus;
        selectElem.className = `status-select status-${newStatus}`;
        
        if (activeCandidateId === id) {
            modalStatusSelect.value = newStatus;
            modalStatusSelect.className = `status-select status-${newStatus}`;
        }

        updateStats();
        showToast(`Status do ID #${id} alterado para [${newStatus}]`);
    }
}

function openCandidateModal(id) {
    const candidate = data.find(c => c.id === id);
    if (!candidate) return;

    activeCandidateId = id;

    modalAvatar.textContent = getInitials(candidate.nome);
    modalName.textContent = candidate.nome;
    modalRole.textContent = `${candidate.cargo} • ID #${candidate.id}`;

    modalPhone.textContent = candidate.telefone;
    modalPhoneBtn.href = `https://wa.me/55${candidate.telefone.replace(/\D/g, '')}`;
    modalEmail.textContent = candidate.email;
    modalEmailBtn.href = `mailto:${candidate.email}`;

    modalPdfName.textContent = candidate.pdfName;
    modalPdfMeta.textContent = `Tamanho: ${candidate.pdfSize} • Enviado em ${candidate.dataEnvio}`;

    modalMessageText.textContent = `"${candidate.mensagem}"`;
    modalStatusSelect.value = candidate.status;
    modalStatusSelect.className = `status-select status-${candidate.status}`;
    replyTextarea.value = '';

    detailModal.classList.add('active');
    detailModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
    detailModal.classList.remove('active');
    detailModal.setAttribute('aria-hidden', 'true');
    activeCandidateId = null;
}

closeModalBtn.addEventListener('click', closeModal);

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('active')) {
        closeModal();
    }
});

modalStatusSelect.addEventListener('change', (e) => {
    if (activeCandidateId) {
        const newStatus = e.target.value;
        const item = data.find(c => c.id === activeCandidateId);
        if (item) {
            item.status = newStatus;
            modalStatusSelect.className = `status-select status-${newStatus}`;
            
            const currentSearch = searchInput.value.toLowerCase().trim();
            filterAndRenderTable(currentSearch);
            updateStats();
            
            showToast(`Status alterado para [${newStatus}] com sucesso.`);
        }
    }
});

sendReplyBtn.addEventListener('click', () => {
    const text = replyTextarea.value.trim();
    if (!text) {
        showToast('Por favor, digite uma mensagem de resposta.', 'fa-triangle-exclamation');
        return;
    }

    replyTextarea.value = '';
    showToast('Resposta enviada com sucesso!', 'fa-paper-plane');
});

function simulatePdfAction(action) {
    if (activeCandidateId) {
        const candidate = data.find(c => c.id === activeCandidateId);
        showToast(`${action} do arquivo (${candidate.pdfName}) iniciado.`, 'fa-file-pdf');
    }
}

function filterAndRenderTable(searchTerm) {
    const filtered = data.filter(item => {
        const nameMatch = item.nome.toLowerCase().includes(searchTerm);
        const roleMatch = item.cargo.toLowerCase().includes(searchTerm);
        const idMatch = item.id.toString().includes(searchTerm);
        return nameMatch || roleMatch || idMatch;
    });
    renderTable(filtered);
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    filterAndRenderTable(term);
});

updateStats();
var data = receberDadosComFallback();
renderTable(data);