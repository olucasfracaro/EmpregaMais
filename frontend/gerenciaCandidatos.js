const mockData = [
    { id: 1, nome: 'João Silva', telefone: '(11) 99999-9999', email: 'joao.silva@email.com', mensagem: 'Olá, estou interessado na vaga.', status: 'CONTRATADO' },
    { id: 2, nome: 'Maria Oliveira', telefone: '(21) 88888-8888', email: 'maria.oliveira@email.com', mensagem: 'Gostaria de mais informações sobre a oportunidade.', status: 'PENDENTE' },
    { id: 3, nome: 'Pedro Santos', telefone: '(31) 77777-7777', email: 'pedro.santos@email.com', mensagem: 'Estou disponível para uma entrevista.', status: 'NÃO' }
];
let candidatos = [];
const curriculoBaseUrl = 'https://kampbrxrosxtspcmgewr.supabase.co/storage/v1/object/public/curriculos/';

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const emptyState = document.getElementById('emptyState');

/*const usuario = localStorage.getItem("usuarioLogado");
if (!usuario) {
    window.location.href = "login.html";
}*/

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
        item.status = newStatus;
    }
}

function showMessage(message) {
    window.alert(message);
}

async function downloadCurriculum(curriculoPath, nome, id) {
    if (!curriculoPath) {
        window.alert('Este candidato não possui currículo disponível.');
        return;
    }

    try {
        const caminho = String(curriculoPath).replace(/^\/+/, '');
        const curriculoUrl = /^https?:\/\//i.test(caminho)
            ? caminho
            : `${curriculoBaseUrl}${caminho}`;
        const response = await fetch(curriculoUrl);
        if (!response.ok) {
            throw new Error(`Erro ao baixar o currículo: ${response.status}`);
        }

        const arquivo = await response.blob();
        const urlTemporaria = URL.createObjectURL(arquivo);
        const link = document.createElement('a');
        const nomeArquivo = String(nome || `candidato-${id}`)
            .replace(/[^a-z0-9]/gi, '-')
            .replace(/-+/g, '-')
            .toLowerCase();

        link.href = urlTemporaria;
        link.download = `curriculo-${nomeArquivo}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(urlTemporaria);
    } catch (error) {
        console.error('Não foi possível baixar o currículo:', error);
        window.alert('Não foi possível baixar o currículo.');
    }
}

function renderTable(data) {
    tableBody.innerHTML = '';

    if (data.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    data.forEach(item => {
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
        curriculumButton.addEventListener('click', () => {
            downloadCurriculum(item.curriculoPath, item.nome, item.id);
        });

        const statusSelect = tr.querySelector('.status-select');
        statusSelect.addEventListener('change', () => updateStatusStyle(statusSelect, item.id));
    });
}

searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();

    const filteredData = candidatos.filter(item => {
        const matchesName = item.nome.toLowerCase().includes(term);
        const matchesId = item.id.toString().includes(term);
        return matchesName || matchesId;
    });

    renderTable(filteredData);
});

window.onload = async () => {
    try {
        candidatos = await receberDadosComFallback();
    } catch (error) {
        console.error('Não foi possível receber os candidatos:', error);
        // Fallback para os dados mockados
        candidatos = mockData;
    }

    renderTable(candidatos);
};