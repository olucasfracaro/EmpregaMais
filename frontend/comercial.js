import { API_BASE_URL } from "./config.js";
import { authenticatedFetch } from "./auth.js?v=202611181938";

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const statuses = ["Novo", "Em qualificação", "Visita técnica", "Proposta enviada", "Fechado", "Perdido"];
let quotes = [];
let loading = false;

const body = $("#quoteTableBody");
const detail = $("#quoteDetail");
const statusClass = status => ({ Novo: "new", "Em qualificação": "qualifying", "Visita técnica": "visit", "Proposta enviada": "proposal", Fechado: "won", Perdido: "lost" }[status] || "new");
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const dateLabel = raw => {
  if (!raw) return "Data não informada";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "Data não informada" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};
const phoneHref = value => `https://wa.me/${String(value || "").replace(/\D/g, "")}`;

function render() {
  const term = $("#quoteSearch").value.trim().toLocaleLowerCase("pt-BR");
  const filter = $("#quoteFilter").value;
  const filtered = quotes.filter(quote => {
    const matchesTerm = [quote.solicitanteNome, quote.solicitanteEmpresa, quote.cidade, quote.solucoesRequeridas, quote.id]
      .some(value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(term));
    return matchesTerm && (filter === "todos" || (quote.status || "Novo") === filter);
  });
  body.innerHTML = filtered.map(quote => {
    const status = quote.status || "Novo";
    const solutions = String(quote.solucoesRequeridas || "").split(",").map(value => value.trim()).filter(Boolean);
    return `<tr>
      <td><button class="quote-person" type="button" data-open-quote="${escapeHtml(quote.id)}"><span class="quote-avatar">${escapeHtml(initials(quote.solicitanteNome))}</span><span class="quote-person-copy"><strong>${escapeHtml(quote.solicitanteNome || "Solicitante sem nome")}</strong><span>${escapeHtml(quote.solicitanteEmpresa || "Empresa não informada")}</span></span></button></td>
      <td><div class="quote-work"><strong>${escapeHtml(quote.tipoObra || "Obra não especificada")}</strong><span><i class="fa-solid fa-location-dot"></i>${escapeHtml(quote.cidade || "Cidade não informada")}</span><div class="quote-tags">${solutions.slice(0, 2).map(item => `<span>${escapeHtml(item)}</span>`).join("")}${solutions.length > 2 ? `<span>+${solutions.length - 2}</span>` : ""}</div></div></td>
      <td><span class="quote-date">${escapeHtml(dateLabel(quote.createdAt))}</span><small>Orçamento #${escapeHtml(quote.id)}</small></td>
      <td><label class="quote-status status-${statusClass(status)}"><span></span><select data-quote-status="${escapeHtml(quote.id)}" aria-label="Status do orçamento ${escapeHtml(quote.id)}">${statuses.map(option => `<option${option === status ? " selected" : ""}>${option}</option>`).join("")}</select><i class="fa-solid fa-chevron-down"></i></label></td>
      <td><button class="quote-open-button" type="button" data-open-quote="${escapeHtml(quote.id)}" aria-label="Ver orçamento de ${escapeHtml(quote.solicitanteNome)}"><i class="fa-solid fa-arrow-up-right-from-square"></i></button></td>
    </tr>`;
  }).join("");
  const isEmpty = filtered.length === 0;
  $("#quoteEmpty").hidden = !isEmpty;
  $("#quoteEmptyTitle").textContent = quotes.length ? "Nenhum resultado encontrado" : "Nenhum orçamento por aqui";
  $("#quoteEmptyText").textContent = quotes.length ? "Tente mudar a busca ou o filtro de status." : "As novas solicitações aparecerão nesta lista.";
  $("#quoteCount").textContent = `${filtered.length} ${filtered.length === 1 ? "solicitação" : "solicitações"}${filtered.length !== quotes.length ? ` de ${quotes.length}` : ""}`;
  $("#quoteTotal").textContent = quotes.length;
  $("#quoteNew").textContent = quotes.filter(quote => (quote.status || "Novo") === "Novo").length;
  $("#quoteActive").textContent = quotes.filter(quote => ["Em qualificação", "Visita técnica", "Proposta enviada"].includes(quote.status)).length;
  $("#quoteWon").textContent = quotes.filter(quote => quote.status === "Fechado").length;
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
  }
}

async function updateStatus(id, status, select) {
  const original = quotes.find(quote => String(quote.id) === String(id));
  if (!original) return;
  select.disabled = true;
  try {
    const response = await authenticatedFetch(`${API_BASE_URL}/comercial/orcamentos/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error(`Não foi possível salvar o status (${response.status}).`);
    Object.assign(original, await response.json());
    render();
    if (!detail.hidden && String(detail.dataset.quoteId) === String(id)) openDetail(id);
  } catch (error) {
    select.value = original.status || "Novo";
    select.closest(".quote-status").className = `quote-status status-${statusClass(select.value)}`;
    window.alert(error.message || "Erro ao atualizar o status.");
  } finally {
    select.disabled = false;
  }
}

function openDetail(id) {
  const quote = quotes.find(item => String(item.id) === String(id));
  if (!quote) return;
  detail.dataset.quoteId = quote.id;
  const status = quote.status || "Novo";
  const info = (title, value, icon) => `<div class="quote-detail-item"><span class="quote-detail-icon"><i class="fa-solid ${icon}"></i></span><div><small>${title}</small><strong>${escapeHtml(value || "Não informado")}</strong></div></div>`;
  const solutions = String(quote.solucoesRequeridas || "").split(",").map(value => value.trim()).filter(Boolean);
  $("#quoteDetailContent").innerHTML = `
    <section class="quote-detail-status"><span>Status atual</span><label class="quote-status status-${statusClass(status)}"><span></span><select data-detail-status="${escapeHtml(quote.id)}" aria-label="Alterar status">${statuses.map(option => `<option${option === status ? " selected" : ""}>${option}</option>`).join("")}</select><i class="fa-solid fa-chevron-down"></i></label></section>
    <section class="quote-detail-section"><h3><i class="fa-regular fa-address-card"></i> Solicitante</h3><div class="quote-detail-person"><span class="quote-avatar">${escapeHtml(initials(quote.solicitanteNome))}</span><div><strong>${escapeHtml(quote.solicitanteNome || "Solicitante sem nome")}</strong><span>${escapeHtml(quote.solicitanteCargo || "")}</span></div></div>${info("Empresa", quote.solicitanteEmpresa, "fa-building")}${info("E-mail", quote.solicitanteEmail, "fa-envelope")}<a class="quote-contact-link" href="mailto:${escapeHtml(quote.solicitanteEmail || "")}"><i class="fa-regular fa-paper-plane"></i> Enviar e-mail</a>${info("Telefone", quote.solicitanteTelefone, "fa-phone")}<a class="quote-contact-link" href="${escapeHtml(phoneHref(quote.solicitanteTelefone))}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Conversar no WhatsApp</a>${quote.solicitanteHorarioPreferido ? info("Melhor horário", quote.solicitanteHorarioPreferido, "fa-clock") : ""}</section>
    <section class="quote-detail-section"><h3><i class="fa-solid fa-helmet-safety"></i> Dados da obra</h3>${info("Tipo de obra", quote.tipoObra, "fa-building-circle-check")}${info("Local", quote.cidade, "fa-location-dot")}${quote.faseAtual ? info("Fase atual", quote.faseAtual, "fa-bars-progress") : ""}${quote.pavimentos ? info("Pavimentos", quote.pavimentos, "fa-stairs") : ""}${quote.prazo ? info("Prazo", quote.prazo, "fa-calendar") : ""}<div class="quote-detail-solutions"><small>Soluções requeridas</small><div>${solutions.length ? solutions.map(solution => `<span>${escapeHtml(solution)}</span>`).join("") : "<span>Não informado</span>"}</div></div>${quote.observacoes ? `<div class="quote-detail-notes"><small>Observações</small><p>${escapeHtml(quote.observacoes)}</p></div>` : ""}</section>
    <footer class="quote-detail-footer">Solicitação #${escapeHtml(quote.id)} · Recebida em ${escapeHtml(dateLabel(quote.createdAt))}</footer>`;
  detail.hidden = false;
  detail.setAttribute("aria-hidden", "false");
  document.body.classList.add("quote-detail-open");
  detail.querySelector(".quote-close").focus();
}

$("#quoteSearch").addEventListener("input", render);
$("#quoteFilter").addEventListener("change", render);
$("#refreshQuotes").addEventListener("click", loadQuotes);
body.addEventListener("change", event => {
  const select = event.target.closest("[data-quote-status]");
  if (select) {
    select.closest(".quote-status").className = `quote-status status-${statusClass(select.value)}`;
    updateStatus(select.dataset.quoteStatus, select.value, select);
  }
});
body.addEventListener("click", event => {
  const button = event.target.closest("[data-open-quote]");
  if (button) openDetail(button.dataset.openQuote);
});
$("#quoteDetailContent").addEventListener("change", event => {
  const select = event.target.closest("[data-detail-status]");
  if (!select) return;
  select.closest(".quote-status").className = `quote-status status-${statusClass(select.value)}`;
  updateStatus(select.dataset.detailStatus, select.value, select);
});
detail.addEventListener("click", event => { if (event.target.closest("[data-close-quote]")) closeDetail(); });
function closeDetail() {
  detail.hidden = true;
  detail.setAttribute("aria-hidden", "true");
  document.body.classList.remove("quote-detail-open");
}
document.addEventListener("keydown", event => { if (event.key === "Escape" && !detail.hidden) closeDetail(); });
$("#commercialNav")?.addEventListener("click", () => { if (!quotes.length) loadQuotes(); });
loadQuotes();
