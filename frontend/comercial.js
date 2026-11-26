import { API_BASE_URL } from "./config.js";
import { authenticatedFetch } from "./auth.js?v=202611181938";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const statuses = ["Novo", "Em qualificação", "Visita técnica", "Proposta enviada", "Fechado", "Perdido"];
const mockQuotes = [
  { id: 301, solicitanteNome: "Mariana Costa", solicitanteEmpresa: "Construtora Horizonte", solicitanteCargo: "Engenheira civil", solicitanteEmail: "mariana@horizonte.example", solicitanteTelefone: "11987654321", solicitanteHorarioPreferido: "Manhã", cidade: "Campinas, SP", tipoObra: "Edifício residencial", faseAtual: "Estrutura", pavimentos: 12, solucoesRequeridas: "Linha de vida, Guarda-corpo", prazo: "Próximos 30 dias", observacoes: "Solicita visita técnica para levantamento inicial.", status: "Novo", createdAt: "2026-11-24T13:20:00Z" },
  { id: 302, solicitanteNome: "Rafael Almeida", solicitanteEmpresa: "Almeida & Filhos Obras", solicitanteCargo: "Comprador", solicitanteEmail: "rafael@almeida.example", solicitanteTelefone: "21976543210", cidade: "Niterói, RJ", tipoObra: "Reforma comercial", faseAtual: "Orçamento", pavimentos: 3, solucoesRequeridas: "Andaime fachadeiro", prazo: "Neste mês", status: "Proposta enviada", createdAt: "2026-11-21T10:05:00Z" },
  { id: 303, solicitanteNome: "Beatriz Nunes", solicitanteEmpresa: "BN Engenharia", solicitanteCargo: "Diretora de projetos", solicitanteEmail: "beatriz@bnengenharia.example", solicitanteTelefone: "31965432109", cidade: "Belo Horizonte, MG", tipoObra: "Galpão industrial", faseAtual: "Projeto", pavimentos: 1, solucoesRequeridas: "Guarda-corpo, Escada marinheiro", prazo: "A combinar", status: "Em qualificação", createdAt: "2026-11-18T16:40:00Z" }
];
let quotes = [];
let loading = false;
let saving = false;
let usingMockData = false;
const pendingStatuses = new Map();
const pendingDeletes = new Set();
const pendingTotal = () => pendingDeletes.size + [...pendingStatuses.keys()].filter(id => !pendingDeletes.has(id)).length;
let sortKey = "data";
let sortDirection = "descending";

const body = $("#quoteTableBody");
const quoteTable = body.closest("table");
const sortLabels = {
  solicitante: { label: "nome do solicitante", ascending: "A → Z", descending: "Z → A" },
  cidade: { label: "cidade da obra", ascending: "A → Z", descending: "Z → A" },
  data: { label: "data de recebimento", ascending: "mais antigos primeiro", descending: "mais recentes primeiro" },
  status: { label: "status", ascending: "A → Z", descending: "Z → A" }
};
const detail = $("#quoteDetail");
const statusMenu = $("#quoteStatusMenu");
const statusClass = status => ({ Novo: "new", "Em qualificação": "qualifying", "Visita técnica": "visit", "Proposta enviada": "proposal", Fechado: "won", Perdido: "lost", "CONCLUÍDO": "concluido", PENDENTE: "pendente", RECUSADO: "recusado", todos: "all" }[status] || "new");
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const dateLabel = raw => {
  if (!raw) return "Data não informada";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
const phoneHref = value => `https://wa.me/${String(value || "").replace(/\D/g, "")}`;
const statusFor = quote => pendingStatuses.get(String(quote.id)) || quote.status || "Novo";
const renderStatusDropdown = (id, status, location, kind = "commercial") => `<span class="quote-status status-${statusClass(status)}"><button class="quote-status-trigger" type="button" data-status-trigger data-status-kind="${kind}" data-status-id="${escapeHtml(id)}" data-status-current="${escapeHtml(status)}" data-status-location="${location}" aria-controls="quoteStatusMenu" aria-haspopup="listbox" aria-expanded="false" aria-label="Status: ${escapeHtml(status)}"><span class="quote-status-dot"></span><span>${escapeHtml(status)}</span><i class="fa-solid fa-chevron-down"></i></button></span>`;
window.renderStatusDropdown = renderStatusDropdown;

const renderFilterDropdown = select => {
  const label = select.selectedOptions[0]?.textContent || "";
  return `<span class="quote-status quote-status-filter status-${statusClass(select.value)}"><button class="quote-status-trigger" type="button" data-status-trigger data-status-kind="filter" data-status-id="${escapeHtml(select.id)}" data-status-current="${escapeHtml(select.value)}" data-status-location="filter" aria-controls="quoteStatusMenu" aria-haspopup="listbox" aria-expanded="false" aria-label="${escapeHtml(select.getAttribute("aria-label") || "Filtrar por status")}: ${escapeHtml(label)}"><span class="quote-status-dot"></span><span>${escapeHtml(label)}</span><i class="fa-solid fa-chevron-down"></i></button></span>`;
};
function setupStatusFilter(select) {
  if (!select || select.dataset.statusFilterReady) return;
  select.dataset.statusFilterReady = "true";
  select.hidden = true;
  select.insertAdjacentHTML("afterend", renderFilterDropdown(select));
}
function applyFilterSelection(trigger, value) {
  const select = document.getElementById(trigger.dataset.statusId);
  if (!select) return;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  trigger.closest(".quote-status").outerHTML = renderFilterDropdown(select);
}

function updateSaveButton() {
  const count = pendingTotal();
  const button = $("#saveQuoteChanges");
  button.disabled = count === 0 || saving;
  button.innerHTML = saving
    ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Salvando…</span>'
    : `<i class="fa-solid fa-floppy-disk"></i><span>Salvar alterações</span>${count ? `<span class="quote-pending-count">${count}</span>` : ""}`;
}

function render() {
  const term = $("#quoteSearch").value.trim().toLocaleLowerCase("pt-BR");
  const filter = $("#quoteFilter").value;
  const filtered = quotes.filter(quote => {
    const matchesTerm = [quote.solicitanteNome, quote.solicitanteEmpresa, quote.cidade, quote.solucoesRequeridas, quote.id]
      .some(value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(term));
    return matchesTerm && (filter === "todos" || statusFor(quote) === filter);
  }).sort((a, b) => {
    let result = 0;
    if (sortKey === "solicitante") result = String(a.solicitanteNome || "").localeCompare(String(b.solicitanteNome || ""), "pt-BR", { sensitivity: "base" });
    else if (sortKey === "cidade") result = String(a.cidade || "").localeCompare(String(b.cidade || ""), "pt-BR", { sensitivity: "base" });
    else if (sortKey === "status") result = statusFor(a).localeCompare(statusFor(b), "pt-BR", { sensitivity: "base" });
    else if (sortKey === "id") result = Number(a.id) - Number(b.id);
    else result = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    return sortDirection === "ascending" ? result : -result;
  });
  quoteTable.querySelectorAll("th[data-sort]").forEach(th => {
    const key = th.dataset.sort;
    const active = key === sortKey;
    th.setAttribute("aria-sort", active ? sortDirection : "none");
    const info = sortLabels[key];
    if (!info) return;
    const direction = active ? sortDirection : (key === "data" ? "descending" : "ascending");
    const order = `${info[direction]} (${direction === "ascending" ? "crescente" : "decrescente"})`;
    th.title = active ? `Ordenado por ${info.label}: ${order}. Clique para inverter.` : `Ordenar por ${info.label}: ${order}.`;
  });
  body.innerHTML = filtered.map(quote => {
    const status = statusFor(quote);
    const solutions = String(quote.solucoesRequeridas || "").split(",").map(value => value.trim()).filter(Boolean);
    return `<tr${pendingDeletes.has(String(quote.id)) ? ' class="is-pending-delete"' : ""}>
      <td><button class="quote-person" type="button" data-open-quote="${escapeHtml(quote.id)}"><span class="quote-avatar">${escapeHtml(initials(quote.solicitanteNome))}</span><span class="quote-person-copy"><strong>${escapeHtml(quote.solicitanteNome || "Solicitante sem nome")}</strong><span>${escapeHtml(quote.solicitanteEmpresa || "Empresa não informada")}</span></span></button></td>
      <td><div class="quote-work"><strong>${escapeHtml(quote.tipoObra || "Obra não especificada")}</strong><span><i class="fa-solid fa-location-dot"></i>${escapeHtml(quote.cidade || "Cidade não informada")}</span><div class="quote-tags">${solutions.slice(0, 2).map(item => `<span>${escapeHtml(item)}</span>`).join("")}${solutions.length > 2 ? `<span>+${solutions.length - 2}</span>` : ""}</div></div></td>
      <td><span class="quote-date">${escapeHtml(dateLabel(quote.createdAt))}</span><small>Orçamento #${escapeHtml(quote.id)}</small></td>
      <td>${renderStatusDropdown(quote.id, status, "table")}</td>
      <td><button class="quote-open-button" type="button" data-open-quote="${escapeHtml(quote.id)}" aria-label="Ver orçamento de ${escapeHtml(quote.solicitanteNome)}"><i class="fa-solid fa-arrow-up-right-from-square"></i></button></td>
    </tr>`;
  }).join("");
  const isEmpty = filtered.length === 0;
  $("#quoteEmpty").hidden = !isEmpty;
  $("#quoteEmptyTitle").textContent = quotes.length ? "Nenhum resultado encontrado" : "Nenhum orçamento por aqui";
  $("#quoteEmptyText").textContent = quotes.length ? "Tente mudar a busca ou o filtro de status." : "As novas solicitações aparecerão nesta lista.";
  $("#quoteCount").textContent = `${filtered.length} ${filtered.length === 1 ? "solicitação" : "solicitações"}${filtered.length !== quotes.length ? ` de ${quotes.length}` : ""}${usingMockData ? " · dados de demonstração" : ""}`;
  const alive = quotes.filter(quote => !pendingDeletes.has(String(quote.id)));
  $("#quoteTotal").textContent = alive.length;
  $("#quoteNew").textContent = alive.filter(quote => statusFor(quote) === "Novo").length;
  $("#quoteActive").textContent = alive.filter(quote => ["Em qualificação", "Visita técnica", "Proposta enviada"].includes(statusFor(quote))).length;
  $("#quoteWon").textContent = alive.filter(quote => statusFor(quote) === "Fechado").length;
  updateSaveButton();
}

async function loadQuotes() {
  if (loading) return;
  loading = true;
  $("#refreshQuotes").disabled = true;
  $("#quoteCount").textContent = "Carregando orçamentos…";
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/comercial/orcamentos`);
    if (!response.ok) throw new Error(response.status === 403 ? "Seu perfil não tem acesso à área comercial." : `Não foi possível carregar os orçamentos (${response.status}).`);
    const data = await response.json();
    quotes = Array.isArray(data) ? data : [];
    usingMockData = false;
    render();
  } catch {
    usingMockData = true;
    quotes = mockQuotes.map(quote => ({ ...quote }));
    render();
  } finally {
    loading = false;
    $("#refreshQuotes").disabled = false;
    window.dispatchEvent(new CustomEvent("empregamais:commercial-loaded"));
  }
}

function stageStatus(id, status) {
  const quote = quotes.find(item => String(item.id) === String(id));
  if (!quote || pendingDeletes.has(String(id))) return;
  if (status === (quote.status || "Novo")) pendingStatuses.delete(String(id));
  else pendingStatuses.set(String(id), status);
  render();
  if (!detail.hidden && String(detail.dataset.quoteId) === String(id)) openDetail(id);
}

function closeStatusMenu(returnFocus = false) {
  const trigger = statusMenu._trigger;
  statusMenu.hidden = true;
  statusMenu.replaceChildren();
  statusMenu._trigger = null;
  if (trigger) trigger.setAttribute("aria-expanded", "false");
  if (returnFocus && trigger?.isConnected) trigger.focus();
}

function openStatusMenu(trigger) {
  if (statusMenu._trigger === trigger && !statusMenu.hidden) {
    closeStatusMenu();
    return;
  }
  closeStatusMenu();
  const isCandidate = trigger.dataset.statusKind === "candidate";
  const isFilter = trigger.dataset.statusKind === "filter";
  const filterSelect = isFilter ? document.getElementById(trigger.dataset.statusId) : null;
  const quote = quotes.find(item => String(item.id) === trigger.dataset.statusId);
  if (isFilter ? !filterSelect : (!isCandidate && !quote)) return;
  const options = (isFilter ? [...filterSelect.options].map(option => ({ value: option.value, label: option.textContent }))
    : (isCandidate ? ["CONCLUÍDO", "PENDENTE", "RECUSADO"] : statuses).map(value => ({ value, label: value })));
  const currentStatus = isFilter ? filterSelect.value : isCandidate ? trigger.dataset.statusCurrent : statusFor(quote);
  statusMenu.innerHTML = options.map(({ value, label }) => `<button type="button" role="option" aria-selected="${value === currentStatus}" class="quote-status-option${value === currentStatus ? " is-current" : ""} status-option-${statusClass(value)}" data-select-status="${escapeHtml(value)}"><span class="quote-status-dot"></span><span>${escapeHtml(label)}</span>${value === currentStatus ? '<i class="fa-solid fa-check"></i>' : ""}</button>`).join("");
  statusMenu._trigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  statusMenu.hidden = false;
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(204, rect.width);
  const maxLeft = window.innerWidth - width - 12;
  const left = Math.max(12, Math.min(rect.left, maxLeft));
  const estimatedHeight = Math.min(320, options.length * 39 + 12);
  const belowSpace = window.innerHeight - rect.bottom - 12;
  const top = belowSpace < estimatedHeight && rect.top > estimatedHeight
    ? rect.top - estimatedHeight - 6
    : Math.min(rect.bottom + 6, window.innerHeight - estimatedHeight - 12);
  statusMenu.style.left = `${left}px`;
  statusMenu.style.top = `${Math.max(12, top)}px`;
  statusMenu.style.minWidth = `${width}px`;
  requestAnimationFrame(() => statusMenu.querySelector('[aria-selected="true"]')?.focus());
}

async function saveStatuses() {
  if (saving || pendingTotal() === 0) return;
  if (usingMockData) {
    for (const [id, status] of pendingStatuses) {
      const quote = quotes.find(item => String(item.id) === id);
      if (quote && !pendingDeletes.has(id)) quote.status = status;
    }
    quotes = quotes.filter(item => !pendingDeletes.has(String(item.id)));
    pendingStatuses.clear();
    pendingDeletes.clear();
    render();
    return;
  }
  saving = true;
  updateSaveButton();
  const failed = [];
  let deleteError = "";
  for (const [id, status] of [...pendingStatuses]) {
    if (pendingDeletes.has(id)) {
      pendingStatuses.delete(id);
      continue;
    }
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/comercial/orcamentos/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const quote = quotes.find(item => String(item.id) === id);
      if (quote) Object.assign(quote, await response.json());
      pendingStatuses.delete(id);
    } catch {
      failed.push(id);
    }
  }
  for (const id of [...pendingDeletes]) {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/comercial/orcamentos/${encodeURIComponent(id)}/com-solicitante`, { method: "DELETE" });
      if (response.status === 409) throw new Error(await response.text() || "O solicitante possui outros orçamentos associados.");
      if (!response.ok && response.status !== 204) throw new Error(`Não foi possível apagar o orçamento (${response.status}).`);
      quotes = quotes.filter(item => String(item.id) !== id);
      pendingDeletes.delete(id);
    } catch (error) {
      failed.push(id);
      deleteError ||= error.message;
    }
  }
  saving = false;
  render();
  if (!detail.hidden) openDetail(detail.dataset.quoteId);
  if (failed.length) window.alert(`Não foi possível salvar ${failed.length} alteração(ões). Elas continuam pendentes para uma nova tentativa.${deleteError ? `\n\n${deleteError}` : ""}`);
}

function toggleQuoteDeletion(id) {
  const key = String(id);
  const quote = quotes.find(item => String(item.id) === key);
  if (!quote) return;
  if (pendingDeletes.has(key)) {
    pendingDeletes.delete(key);
    render();
    if (!detail.hidden) openDetail(id);
    return;
  }
  if (!window.confirm(`Marcar o orçamento #${quote.id} e os dados do solicitante ${quote.solicitanteNome || "associado"} para exclusão? Eles só serão apagados quando você salvar as alterações.`)) return;
  pendingDeletes.add(key);
  closeDetail();
  render();
}

function openDetail(id) {
  const quote = quotes.find(item => String(item.id) === String(id));
  if (!quote) return;
  detail.dataset.quoteId = quote.id;
  const status = statusFor(quote);
  const info = (title, value, icon) => `<div class="quote-detail-item"><span class="quote-detail-icon"><i class="fa-solid ${icon}"></i></span><div><small>${title}</small><strong>${escapeHtml(value || "Não informado")}</strong></div></div>`;
  const solutions = String(quote.solucoesRequeridas || "").split(",").map(value => value.trim()).filter(Boolean);
  $("#quoteDetailContent").innerHTML = `
    <section class="quote-detail-status"><span>Status atual</span>${renderStatusDropdown(quote.id, status, "detail")}</section>
    <section class="quote-detail-section"><h3><i class="fa-regular fa-address-card"></i> Solicitante</h3><div class="quote-detail-person"><span class="quote-avatar">${escapeHtml(initials(quote.solicitanteNome))}</span><div><strong>${escapeHtml(quote.solicitanteNome || "Solicitante sem nome")}</strong><span>${escapeHtml(quote.solicitanteCargo || "")}</span></div></div>${info("Empresa", quote.solicitanteEmpresa, "fa-building")}${info("E-mail", quote.solicitanteEmail, "fa-envelope")}<a class="quote-contact-link" href="mailto:${escapeHtml(quote.solicitanteEmail || "")}"><i class="fa-regular fa-paper-plane"></i> Enviar e-mail</a>${info("Telefone", quote.solicitanteTelefone, "fa-phone")}<a class="quote-contact-link" href="${escapeHtml(phoneHref(quote.solicitanteTelefone))}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Conversar no WhatsApp</a>${quote.solicitanteHorarioPreferido ? info("Melhor horário", quote.solicitanteHorarioPreferido, "fa-clock") : ""}</section>
    <section class="quote-detail-section"><h3><i class="fa-solid fa-helmet-safety"></i> Dados da obra</h3>${info("Tipo de obra", quote.tipoObra, "fa-building-circle-check")}${info("Local", quote.cidade, "fa-location-dot")}${quote.faseAtual ? info("Fase atual", quote.faseAtual, "fa-bars-progress") : ""}${quote.pavimentos ? info("Pavimentos", quote.pavimentos, "fa-stairs") : ""}${quote.prazo ? info("Prazo", quote.prazo, "fa-calendar") : ""}<div class="quote-detail-solutions"><small>Soluções requeridas</small><div>${solutions.length ? solutions.map(solution => `<span>${escapeHtml(solution)}</span>`).join("") : "<span>Não informado</span>"}</div></div>${quote.observacoes ? `<div class="quote-detail-notes"><small>Observações</small><p>${escapeHtml(quote.observacoes)}</p></div>` : ""}</section>
    <section class="quote-delete-section"><div><strong>Excluir oportunidade</strong><p>Apaga o orçamento e os dados do solicitante, se não estiverem vinculados a outros orçamentos.</p></div><button id="deleteQuoteAndRequester" type="button">${pendingDeletes.has(String(quote.id)) ? '<i class="fa-solid fa-rotate-left"></i> Desfazer exclusão' : '<i class="fa-regular fa-trash-can"></i> Apagar orçamento e solicitante'}</button></section>
    <footer class="quote-detail-footer">Solicitação #${escapeHtml(quote.id)} · Recebida em ${escapeHtml(dateLabel(quote.createdAt))}</footer>`;
  detail.hidden = false;
  detail.setAttribute("aria-hidden", "false");
  document.body.classList.add("quote-detail-open");
  detail.querySelector(".quote-close").focus();
  $("#deleteQuoteAndRequester").addEventListener("click", () => toggleQuoteDeletion(quote.id));
}

setupStatusFilter($("#quoteFilter"));
setupStatusFilter(document.getElementById("candidateFilter"));
$("#quoteSearch").addEventListener("input", render);
$("#quoteFilter").addEventListener("change", render);
$("#saveQuoteChanges").addEventListener("click", saveStatuses);
$("#refreshQuotes").addEventListener("click", () => {
  if (pendingTotal() && !window.confirm("Há alterações não salvas. Descartar e atualizar a lista?")) return;
  pendingStatuses.clear();
  pendingDeletes.clear();
  window.dispatchEvent(new CustomEvent("empregamais:check-api-status", { detail: { endpoint: `${API_BASE_URL}/comercial/orcamentos` } }));
  loadQuotes();
});
quoteTable.querySelector("thead").addEventListener("click", event => {
  const th = event.target.closest("th[data-sort]");
  if (!th) return;
  if (sortKey === th.dataset.sort) sortDirection = sortDirection === "ascending" ? "descending" : "ascending";
  else {
    sortKey = th.dataset.sort;
    sortDirection = sortKey === "data" ? "descending" : "ascending";
  }
  render();
});
body.addEventListener("click", event => {
  const button = event.target.closest("[data-open-quote]");
  if (button) openDetail(button.dataset.openQuote);
});
document.addEventListener("click", event => {
  const option = event.target.closest("[data-select-status]");
  if (option && statusMenu.contains(option)) {
    const trigger = statusMenu._trigger;
    const id = trigger?.dataset.statusId;
    const status = option.dataset.selectStatus;
    const location = trigger?.dataset.statusLocation;
    const kind = trigger?.dataset.statusKind;
    closeStatusMenu();
    if (kind === "filter") applyFilterSelection(trigger, status);
    else if (id && kind === "candidate") {
      const candidateId = Number.isNaN(Number(id)) ? id : Number(id);
      window.handleTableStatusChange?.({ value: status, className: "" }, candidateId);
    } else if (id) stageStatus(id, status);
    requestAnimationFrame(() => [...document.querySelectorAll("[data-status-trigger]")]
      .find(item => item.dataset.statusId === id && item.dataset.statusLocation === location)?.focus());
    return;
  }
  const trigger = event.target.closest("[data-status-trigger]");
  if (trigger) {
    event.preventDefault();
    openStatusMenu(trigger);
    return;
  }
  if (!event.target.closest("#quoteStatusMenu")) closeStatusMenu();
});
detail.addEventListener("click", event => { if (event.target.closest("[data-close-quote]")) closeDetail(); });
function closeDetail() {
  detail.hidden = true;
  detail.setAttribute("aria-hidden", "true");
  document.body.classList.remove("quote-detail-open");
}
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !statusMenu.hidden) {
    event.stopImmediatePropagation();
    closeStatusMenu(true);
    return;
  }
  if (event.key === "Escape" && !detail.hidden) closeDetail();
  if (!statusMenu.hidden && ["ArrowDown", "ArrowUp"].includes(event.key)) {
    const options = [...statusMenu.querySelectorAll("[role=option]")];
    const current = options.indexOf(document.activeElement);
    const next = event.key === "ArrowDown" ? Math.min(options.length - 1, current + 1) : Math.max(0, current - 1);
    options[next]?.focus();
    event.preventDefault();
  }
});
window.addEventListener("scroll", event => { if (!statusMenu.hidden && event.target !== statusMenu) closeStatusMenu(); }, true);
window.addEventListener("resize", () => { if (!statusMenu.hidden) closeStatusMenu(); });
$("#commercialNav")?.addEventListener("click", () => { if (!quotes.length) loadQuotes(); });
loadQuotes();
