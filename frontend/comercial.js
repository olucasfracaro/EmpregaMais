import { API_BASE_URL } from "./config.js";
import { authenticatedFetch } from "./auth.js?v=202611181938";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const statuses = ["Novo", "Em qualificação", "Visita técnica", "Proposta enviada", "Fechado", "Perdido"];
let quotes = [];
let loading = false;
let saving = false;
const pendingStatuses = new Map();
let sortKey = "data";
let sortDirection = "descending";

const body = $("#quoteTableBody");
const detail = $("#quoteDetail");
const statusMenu = $("#quoteStatusMenu");
const statusClass = status => ({ Novo: "new", "Em qualificação": "qualifying", "Visita técnica": "visit", "Proposta enviada": "proposal", Fechado: "won", Perdido: "lost" }[status] || "new");
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const dateLabel = raw => {
  if (!raw) return "Data não informada";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
const phoneHref = value => `https://wa.me/${String(value || "").replace(/\D/g, "")}`;
const statusFor = quote => pendingStatuses.get(String(quote.id)) || quote.status || "Novo";
const renderStatusDropdown = (id, status, location) => `<span class="quote-status status-${statusClass(status)}"><button class="quote-status-trigger" type="button" data-status-trigger data-status-id="${escapeHtml(id)}" data-status-location="${location}" aria-controls="quoteStatusMenu" aria-haspopup="listbox" aria-expanded="false" aria-label="Status: ${escapeHtml(status)}"><span class="quote-status-dot"></span><span>${escapeHtml(status)}</span><i class="fa-solid fa-chevron-down"></i></button></span>`;

function updateSaveButton() {
  const count = pendingStatuses.size;
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
  document.querySelectorAll(".quote-table th[data-sort]").forEach(th => th.setAttribute("aria-sort", th.dataset.sort === sortKey ? sortDirection : "none"));
  body.innerHTML = filtered.map(quote => {
    const status = statusFor(quote);
    const solutions = String(quote.solucoesRequeridas || "").split(",").map(value => value.trim()).filter(Boolean);
    return `<tr>
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
  $("#quoteCount").textContent = `${filtered.length} ${filtered.length === 1 ? "solicitação" : "solicitações"}${filtered.length !== quotes.length ? ` de ${quotes.length}` : ""}`;
  $("#quoteTotal").textContent = quotes.length;
  $("#quoteNew").textContent = quotes.filter(quote => statusFor(quote) === "Novo").length;
  $("#quoteActive").textContent = quotes.filter(quote => ["Em qualificação", "Visita técnica", "Proposta enviada"].includes(statusFor(quote))).length;
  $("#quoteWon").textContent = quotes.filter(quote => statusFor(quote) === "Fechado").length;
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
    render();
  } catch (error) {
    quotes = [];
    render();
    $("#quoteEmptyTitle").textContent = "Não foi possível carregar os orçamentos";
    $("#quoteEmptyText").textContent = error.message || "Verifique a conexão com a API e tente novamente.";
    $("#quoteCount").textContent = "Falha ao carregar";
  } finally {
    loading = false;
    $("#refreshQuotes").disabled = false;
    window.dispatchEvent(new CustomEvent("empregamais:commercial-loaded"));
  }
}

function stageStatus(id, status) {
  const quote = quotes.find(item => String(item.id) === String(id));
  if (!quote) return;
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
  const quote = quotes.find(item => String(item.id) === trigger.dataset.statusId);
  if (!quote) return;
  const currentStatus = statusFor(quote);
  statusMenu.innerHTML = statuses.map(status => `<button type="button" role="option" aria-selected="${status === currentStatus}" class="quote-status-option${status === currentStatus ? " is-current" : ""} status-option-${statusClass(status)}" data-select-status="${escapeHtml(status)}"><span class="quote-status-dot"></span><span>${escapeHtml(status)}</span>${status === currentStatus ? '<i class="fa-solid fa-check"></i>' : ""}</button>`).join("");
  statusMenu._trigger = trigger;
  trigger.setAttribute("aria-expanded", "true");
  statusMenu.hidden = false;
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(204, rect.width);
  const maxLeft = window.innerWidth - width - 12;
  const left = Math.max(12, Math.min(rect.left, maxLeft));
  const estimatedHeight = Math.min(320, statuses.length * 39 + 12);
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
  if (saving || pendingStatuses.size === 0) return;
  saving = true;
  updateSaveButton();
  const failed = [];
  for (const [id, status] of [...pendingStatuses]) {
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
  saving = false;
  render();
  if (!detail.hidden) openDetail(detail.dataset.quoteId);
  if (failed.length) window.alert(`Não foi possível salvar ${failed.length} alteração(ões). Elas continuam pendentes para uma nova tentativa.`);
}

async function deleteQuoteAndRequester(id) {
  const quote = quotes.find(item => String(item.id) === String(id));
  if (!quote || !window.confirm(`Apagar o orçamento #${quote.id} e os dados do solicitante ${quote.solicitanteNome || "associado"}? Esta ação não pode ser desfeita.`)) return;
  const button = $("#deleteQuoteAndRequester");
  if (button) button.disabled = true;
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/comercial/orcamentos/${encodeURIComponent(id)}/com-solicitante`, { method: "DELETE" });
    if (response.status === 409) throw new Error(await response.text() || "O solicitante possui outros orçamentos associados.");
    if (!response.ok && response.status !== 204) throw new Error(`Não foi possível apagar o orçamento (${response.status}).`);
    pendingStatuses.delete(String(id));
    quotes = quotes.filter(item => String(item.id) !== String(id));
    closeDetail();
    render();
  } catch (error) {
    window.alert(error.message || "Erro ao apagar o orçamento.");
    if (button) button.disabled = false;
  }
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
    <section class="quote-delete-section"><div><strong>Excluir oportunidade</strong><p>Apaga o orçamento e os dados do solicitante, se não estiverem vinculados a outros orçamentos.</p></div><button id="deleteQuoteAndRequester" type="button"><i class="fa-regular fa-trash-can"></i> Apagar orçamento e solicitante</button></section>
    <footer class="quote-detail-footer">Solicitação #${escapeHtml(quote.id)} · Recebida em ${escapeHtml(dateLabel(quote.createdAt))}</footer>`;
  detail.hidden = false;
  detail.setAttribute("aria-hidden", "false");
  document.body.classList.add("quote-detail-open");
  detail.querySelector(".quote-close").focus();
  $("#deleteQuoteAndRequester").addEventListener("click", () => deleteQuoteAndRequester(quote.id));
}

$("#quoteSearch").addEventListener("input", render);
$("#quoteFilter").addEventListener("change", render);
$("#saveQuoteChanges").addEventListener("click", saveStatuses);
$("#refreshQuotes").addEventListener("click", () => {
  if (pendingStatuses.size && !window.confirm("Há alterações de status não salvas. Descartar e atualizar a lista?")) return;
  pendingStatuses.clear();
  loadQuotes();
});
document.querySelector(".quote-table thead").addEventListener("click", event => {
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
    closeStatusMenu();
    if (id) stageStatus(id, status);
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
    event.stopPropagation();
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
