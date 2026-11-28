import { API_BASE_URL, SUPABASE_URL } from './config.js';
import { authenticatedFetch, supabase } from './auth.js?v=202611181938';

const MODE_KEY = 'empregamais:data-source';
const PING_TIMEOUT_MS = 8000;
const HISTORY_LIMIT = 5;

const ENDPOINTS = [
    { id: 'candidatos', label: 'Candidatos', path: '/gerenciar/candidatos' },
    { id: 'orcamentos', label: 'Orçamentos', path: '/comercial/orcamentos' },
    { id: 'analises', label: 'Análises', path: '/acompanhar/analises' }
];

const HTTP_HINTS = {
    401: 'Sessão inválida ou expirada',
    403: 'Perfil sem acesso a esta rota',
    404: 'Rota não encontrada'
};

const SOURCE_LABELS = {
    api: 'API real',
    cache: 'Cache local (dados reais)',
    mock: 'Mock (forçado)',
    fallback: 'Mock (fallback: API indisponível)'
};

const providers = new Map();
const sources = {};
const state = {
    status: 'checking',
    results: {},
    history: [],
    pinging: false,
    session: null,
    updatedAt: null
};

const byId = id => document.getElementById(id);

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatTime = timestamp => (timestamp ? timeFormat.format(new Date(timestamp)) : '—');

function formatBytes(bytes) {
    if (bytes == null) return null;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
}

function formatRemaining(timestamp) {
    const minutes = Math.round((timestamp - Date.now()) / 60000);
    if (minutes <= 0) return `expirado às ${formatTime(timestamp)}`;
    return `em ${minutes} min (${formatTime(timestamp)})`;
}

/* ---------- Fonte dos dados (real x mock) ---------- */

export function getDataMode() {
    try {
        return sessionStorage.getItem(MODE_KEY) === 'mock' ? 'mock' : 'real';
    } catch {
        return 'real';
    }
}

function setDataMode(mode) {
    if (mode === getDataMode()) return;
    try {
        if (mode === 'mock') sessionStorage.setItem(MODE_KEY, 'mock');
        else sessionStorage.removeItem(MODE_KEY);
    } catch {
        /* sessionStorage indisponível: o modo não persiste */
    }
    renderFooter();
    renderPanel();
    window.dispatchEvent(new CustomEvent('empregamais:data-mode-change', { detail: { mode } }));
    if (mode === 'real') checkApiStatus();
}

export function reportDataSource(name, source) {
    sources[name] = source;
    renderPanel();
}

export function registerDiagnostics(name, provider) {
    providers.set(name, provider);
}

/* ---------- Ping ---------- */

async function pingEndpoint(endpoint) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const started = performance.now();

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}${endpoint.path}`, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
        });
        const ms = Math.round(performance.now() - started);
        const text = await response.text();

        let records = null;
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) records = json.length;
        } catch {
            /* corpo não é JSON */
        }

        return {
            ok: response.ok,
            status: response.status,
            ms,
            total: Math.round(performance.now() - started),
            bytes: new Blob([text]).size,
            records,
            error: null,
            at: Date.now()
        };
    } catch (error) {
        return {
            ok: false,
            status: null,
            ms: Math.round(performance.now() - started),
            total: null,
            bytes: null,
            records: null,
            error: error?.name === 'AbortError' ? `Timeout (${PING_TIMEOUT_MS / 1000} s)` : (error?.message || 'Falha de rede'),
            at: Date.now()
        };
    } finally {
        clearTimeout(timer);
    }
}

function setStatus(status) {
    state.status = status;
    state.updatedAt = Date.now();
    renderFooter();
    renderPanel();
}

function pushHistory(entry) {
    state.history.unshift(entry);
    state.history.length = Math.min(state.history.length, HISTORY_LIMIT);
}

export async function checkApiStatus(endpoint) {
    setStatus('checking');
    const target = ENDPOINTS.find(item => String(endpoint || '').endsWith(item.path)) || ENDPOINTS[0];
    const result = await pingEndpoint(target);

    state.results[target.id] = result;
    pushHistory({
        at: result.at,
        scope: `GET ${target.path}`,
        ok: result.ok,
        ms: result.ms,
        detail: result.status ? `HTTP ${result.status}` : result.error
    });
    setStatus(result.ok ? 'online' : 'offline');
    return result;
}

async function pingAll() {
    if (state.pinging) return;
    state.pinging = true;
    setStatus('checking');

    try {
        const results = await Promise.all(ENDPOINTS.map(async endpoint => [endpoint, await pingEndpoint(endpoint)]));
        results.forEach(([endpoint, result]) => { state.results[endpoint.id] = result; });

        const oks = results.filter(([, result]) => result.ok);
        const average = oks.length
            ? Math.round(oks.reduce((sum, [, result]) => sum + result.ms, 0) / oks.length)
            : null;

        pushHistory({
            at: Date.now(),
            scope: 'Todos os endpoints',
            ok: oks.length > 0,
            ms: average,
            detail: `${oks.length}/${results.length} OK`
        });
        state.pinging = false;
        setStatus(oks.length > 0 ? 'online' : 'offline');
    } finally {
        state.pinging = false;
    }
}

/* ---------- Rodapé ---------- */

function renderFooter() {
    const indicator = byId('apiStatusIndicator');
    const text = byId('apiStatusText');
    if (!indicator || !text) return;

    if (getDataMode() === 'mock') {
        indicator.className = 'api-status-indicator is-mock';
        text.textContent = 'Dados fictícios (mock)';
        return;
    }

    const labels = {
        checking: ['is-checking', 'Verificando status da API...'],
        online: ['is-online', 'API online'],
        offline: ['is-offline', 'API offline']
    };
    const [className, label] = labels[state.status] || labels.checking;
    indicator.className = `api-status-indicator ${className}`;
    text.textContent = label;
}

/* ---------- Painel ---------- */

const info = (title, value, icon, mono = false) => `<div class="quote-detail-item"><span class="quote-detail-icon"><i class="fa-solid ${icon}"></i></span><div><small>${escapeHtml(title)}</small><strong${mono ? ' class="api-mono"' : ''}>${escapeHtml(value || 'Não informado')}</strong></div></div>`;

function statePill() {
    if (getDataMode() === 'mock') return ['status-visit', 'Mock ativo'];
    return {
        checking: ['status-qualifying', 'Verificando'],
        online: ['status-won', 'Online'],
        offline: ['status-lost', 'Offline']
    }[state.status];
}

function codeClass(result) {
    if (!result) return 'is-idle';
    if (result.ok) return 'is-ok';
    return result.status && result.status < 500 ? 'is-warn' : 'is-error';
}

function endpointRow(endpoint) {
    const result = state.results[endpoint.id];
    let detail = 'Sem dados — execute um ping';
    if (result) {
        detail = result.error
            || HTTP_HINTS[result.status]
            || [formatBytes(result.bytes), result.records != null ? `${result.records} registros` : null].filter(Boolean).join(' · ')
            || 'Sem corpo na resposta';
    }
    const timing = result
        ? `${result.ms} ms${result.total != null && result.total !== result.ms ? ` (corpo: ${result.total} ms)` : ''}`
        : '—';

    return `<div class="api-endpoint"><div><code>GET ${escapeHtml(endpoint.path)}</code><small>${escapeHtml(endpoint.label)} · ${escapeHtml(detail)}</small></div><div class="api-endpoint-result"><span class="api-code ${codeClass(result)}">${result ? (result.status ?? 'ERR') : '—'}</span><span>${escapeHtml(timing)}</span></div></div>`;
}

function historyRow(entry) {
    return `<div class="api-endpoint"><div><code>${escapeHtml(entry.scope)}</code><small>${formatTime(entry.at)}${entry.detail ? ` · ${escapeHtml(entry.detail)}` : ''}</small></div><div class="api-endpoint-result"><span class="api-code ${entry.ok ? 'is-ok' : 'is-error'}">${entry.ok ? 'OK' : 'FALHA'}</span><span>${entry.ms != null ? `${entry.ms} ms` : '—'}</span></div></div>`;
}

function scriptVersion() {
    const script = [...document.scripts].find(item => /gerenciaCandidatos\.js/.test(item.src));
    return script ? (new URL(script.src).searchParams.get('v') || 'sem versão') : 'indisponível';
}

function renderPanel() {
    const overlay = byId('apiStatusDetail');
    const content = byId('apiStatusContent');
    if (!overlay || !content || overlay.hidden) return;

    const mock = getDataMode() === 'mock';
    const [pillClass, pillLabel] = statePill();
    const activeId = document.activeElement?.id;
    const session = state.session;
    const last = state.history[0];

    const providerRows = [...providers.values()].flatMap(provider =>
        (provider.rows?.() || []).map(([title, value]) => info(`${provider.label} · ${title}`, String(value), 'fa-table-list'))
    ).join('');

    content.innerHTML = `
        <section class="quote-detail-status"><span>Estado da API</span><span class="quote-status ${pillClass}"><span class="quote-status-trigger api-pill"><span class="quote-status-dot"></span><span>${pillLabel}</span></span></span></section>
        <section class="quote-detail-section"><h3><i class="fa-solid fa-database"></i> Fonte dos dados</h3>
            <label class="api-switch-row" for="apiMockSwitch"><span class="api-switch-copy"><strong>Usar dados fictícios (mock)</strong><small>Candidatos, orçamentos e análises passam a vir de dados locais. Nenhuma alteração é enviada à API.</small></span><span class="api-switch"><input type="checkbox" role="switch" id="apiMockSwitch" ${mock ? 'checked' : ''}><span class="api-switch-track"></span></span></label>
            ${info('Candidatos', SOURCE_LABELS[sources.candidatos] || 'Ainda não carregado', 'fa-users')}
            ${info('Orçamentos', SOURCE_LABELS[sources.orcamentos] || 'Ainda não carregado', 'fa-file-invoice-dollar')}
        </section>
        <section class="quote-detail-section"><h3><i class="fa-solid fa-satellite-dish"></i> Conexão</h3>
            ${info('URL base', API_BASE_URL, 'fa-link', true)}
            ${info('Último ping', last ? `${formatTime(last.at)} · ${last.ms != null ? `${last.ms} ms` : last.detail}` : 'Nenhum ping executado', 'fa-stopwatch')}
            ${info('Navegador online', navigator.onLine ? 'Sim' : 'Não', 'fa-wifi')}
            <button class="commercial-refresh api-ping-btn" type="button" id="apiPingBtn" ${state.pinging ? 'disabled' : ''}><i class="fa-solid ${state.pinging ? 'fa-spinner fa-spin' : 'fa-bolt'}"></i><span>${state.pinging ? 'Executando ping…' : 'Executar ping'}</span></button>
        </section>
        <section class="quote-detail-section"><h3><i class="fa-solid fa-route"></i> Endpoints</h3>${ENDPOINTS.map(endpointRow).join('')}</section>
        ${state.history.length ? `<section class="quote-detail-section"><h3><i class="fa-solid fa-clock-rotate-left"></i> Últimos pings</h3>${state.history.map(historyRow).join('')}</section>` : ''}
        <section class="quote-detail-section"><h3><i class="fa-solid fa-key"></i> Sessão</h3>
            ${info('Usuário', session?.email, 'fa-user')}
            ${info('Papel', session?.role, 'fa-user-shield')}
            ${info('Token expira', session?.expiresAt ? formatRemaining(session.expiresAt) : '', 'fa-hourglass-half')}
            ${info('Projeto Supabase', SUPABASE_URL ? new URL(SUPABASE_URL).host : '', 'fa-cloud', true)}
        </section>
        ${providerRows ? `<section class="quote-detail-section"><h3><i class="fa-solid fa-memory"></i> Dados em memória</h3>${providerRows}</section>` : ''}
        <section class="quote-detail-section"><h3><i class="fa-solid fa-laptop-code"></i> Ambiente</h3>
            ${info('Origem da página', location.origin, 'fa-globe', true)}
            ${info('Versão dos scripts', scriptVersion(), 'fa-code-branch', true)}
            ${info('Fuso horário', Intl.DateTimeFormat().resolvedOptions().timeZone, 'fa-earth-americas')}
            ${info('Tema e viewport', `${document.body.classList.contains('dark-mode') ? 'Escuro' : 'Claro'} · ${innerWidth}×${innerHeight}`, 'fa-display')}
            ${info('User agent', navigator.userAgent, 'fa-window-maximize', true)}
        </section>
        <footer class="quote-detail-footer">Atualizado às ${formatTime(state.updatedAt || Date.now())}</footer>`;

    if (activeId) byId(activeId)?.focus?.();
}

async function loadSession() {
    try {
        const { data } = await supabase.auth.getSession();
        const current = data?.session;
        state.session = current ? {
            email: current.user?.email,
            role: current.user?.app_metadata?.role ?? current.user?.user_metadata?.role,
            expiresAt: current.expires_at ? current.expires_at * 1000 : null
        } : null;
    } catch {
        state.session = null;
    }
    renderPanel();
}

function openPanel() {
    const overlay = byId('apiStatusDetail');
    if (!overlay) return;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('quote-detail-open');
    renderPanel();
    overlay.querySelector('.quote-close')?.focus();
    loadSession();
}

function closePanel() {
    const overlay = byId('apiStatusDetail');
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('quote-detail-open');
    byId('apiStatusButton')?.focus();
}

function handleModeToggle(useMock) {
    const pending = [...providers.values()].reduce((total, provider) => total + (provider.pending?.() || 0), 0);
    if (pending && !window.confirm(`Há ${pending} alteração(ões) não salva(s). Trocar a fonte dos dados descarta essas alterações. Continuar?`)) {
        renderPanel();
        return;
    }
    setDataMode(useMock ? 'mock' : 'real');
}

const overlay = byId('apiStatusDetail');
if (overlay) {
    overlay.addEventListener('click', event => {
        if (event.target.closest('[data-close-api]')) closePanel();
        else if (event.target.closest('#apiPingBtn')) pingAll();
    });
    overlay.addEventListener('change', event => {
        if (event.target.id === 'apiMockSwitch') handleModeToggle(event.target.checked);
    });
}

byId('apiStatusButton')?.addEventListener('click', openPanel);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePanel();
});
window.addEventListener('online', renderPanel);
window.addEventListener('offline', renderPanel);

renderFooter();
