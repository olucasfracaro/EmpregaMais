import { enviarCandidato, uploadCurriculo } from "./cadastroCandidato.js";
import { enviarOrcamento } from "./envioOrcamento.js";

const VAGAS = [
  { id: "op", area: "fabril", titulo: "Operador(a) de Produção", local: "Fábrica", req: { exp: 0, nrs: ["NR-12"], hab: ["Ferramentas manuais e elétricas"], turno: true }, desc: "Operação de máquinas e montagem de peças metálicas." },
  { id: "sol", area: "fabril", titulo: "Soldador(a)", local: "Fábrica", req: { exp: 2, nrs: ["NR-12"], hab: ["Solda MIG/MAG", "Leitura de desenho técnico"], turno: true }, desc: "Soldagem de estruturas metálicas conforme desenho técnico." },
  { id: "mon", area: "fabril", titulo: "Montador(a) de Proteção", local: "Obras", req: { exp: 1, nrs: ["NR-18", "NR-35"], hab: ["Montagem em obra"], campo: true }, desc: "Instalação de guarda-corpos, redes e linhas de vida." },
  { id: "alm", area: "fabril", titulo: "Auxiliar de Logística", local: "Fábrica", req: { exp: 0, nrs: ["NR-11"], hab: ["Empilhadeira"], turno: true }, desc: "Separação e movimentação de materiais." },
  { id: "adm", area: "administrativo", titulo: "Assistente Administrativo", local: "Escritório", req: { exp: 1, esc: 1, ferr: ["Excel"] }, desc: "Rotinas de cadastro, documentos e suporte." },
  { id: "rh", area: "administrativo", titulo: "Analista de RH", local: "Escritório", req: { exp: 2, esc: 4, ferr: ["Excel", "ATS"] }, desc: "Recrutamento fabril e administrativo, integração." },
  { id: "com", area: "administrativo", titulo: "Consultor Técnico Comercial", local: "Escritório + Visitas", req: { exp: 1, esc: 3, ferr: ["CRM", "Excel"] }, desc: "Atendimento a construtoras e propostas técnicas." },
  { id: "fin", area: "administrativo", titulo: "Assistente Financeiro", local: "Escritório", req: { exp: 1, esc: 3, ferr: ["Excel", "ERP"] }, desc: "Contas a pagar/receber e conciliação." }
];

const STATUS = {
  candidato: ["Novo", "Em triagem", "Entrevista agendada", "Banco de talentos", "Aprovado", "Não selecionado"],
  orcamento: ["Novo", "Em qualificação", "Visita técnica", "Proposta enviada", "Fechado", "Perdido"]
};

const SCRIPTS = {
  cand: [
    { t: "Abertura", x: "Olá, [nome]! Aqui é [seu nome], do RH da Metroform. Recebemos sua candidatura para a vaga de [vaga]. Seu protocolo é [protocolo]." },
    { t: "Triagem Fabril", x: "[nome], para seguir com a candidatura: 1. Qual sua disponibilidade de turno? 2. Possui certificado de NR? 3. Conte uma experiência na área." },
    { t: "Triagem ADM", x: "[nome]: 1. Qual seu nível de Excel? 2. Possui experiência com sistemas ERP/CRM? 3. Disponibilidade presencial em [cidade]?" },
    { t: "Convite Entrevista", x: "[nome], seu perfil foi selecionado para entrevista! Podemos agendar para [data] às [hora]?" },
    { t: "Follow-up", x: "Olá, [nome]! Apenas confirmando seu interesse na oportunidade [vaga] (protocolo [protocolo])." },
    { t: "Encerramento", x: "Agradecemos sua participação, [nome]. Guardaremos seu perfil em nosso banco de talentos para futuras vagas." }
  ],
  orc: [
    { t: "Abertura", x: "Olá, [nome]! Sou [seu nome], consultor da Metroform. Recebi seu pedido de orçamento (protocolo [protocolo]). Podemos alinhar os detalhes da obra?" },
    { t: "Qualificação", x: "Para preparar a proposta: 1. Qual a fase da obra? 2. Quantos pavimentos? 3. Prazo de entrega do material?" },
    { t: "Visita Técnica", x: "[nome], podemos agendar uma visita técnica ao local em [data] às [hora]?" },
    { t: "Envio de Proposta", x: "Segue a proposta comercial referente ao protocolo [protocolo]. Fico à disposição para esclarecimentos." },
    { t: "Follow-up", x: "Olá, [nome]! Conseguiram analisar a proposta para a obra em [cidade]?" },
    { t: "Encerramento", x: "Obrigado pelo retorno, [nome]. Ficamos à disposição para novas oportunidades." }
  ]
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const checked = id => $$("#" + id + " input:checked").map(i => i.value);

function route() {
  const hash = location.hash.slice(1) || "inicio";
  const pages = $$("[data-page]");

  const target = pages.find(p => p.dataset.page === hash)
    || pages.find(p => p.dataset.page === "inicio");

  if (!target) return;

  pages.forEach(page => {
    page.hidden = page !== target;
  });

  $$(".nav a[data-r]").forEach(link => {
    const active = link.dataset.r === target.dataset.page;

    link.classList.toggle("active", active);
    link.setAttribute("aria-current", active ? "page" : "false");
  });

  // Fecha o menu mobile após navegar
  if (menuBtn && nav) {
    menuBtn.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });
}

window.addEventListener("hashchange", route);

const menuBtn = $("#menuBtn");
const nav = $("#nav");

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    const expanded = menuBtn.getAttribute("aria-expanded") === "true";

    menuBtn.setAttribute("aria-expanded", String(!expanded));
    nav.classList.toggle("open", !expanded);
  });
}

/**
 * ============================================================================
 * 3. LÓGICA DA SEÇÃO TRABALHE CONOSCO (VAGAS)
 * - Renderiza dinamicamente os cards de vagas na tela.
 * ============================================================================
 */
let areaAtual = "fabril";

function renderVagas() {
  const container = $("#vagasList");
  if (!container) return;

  container.innerHTML = VAGAS.filter(v => v.area === areaAtual).map(v => {
    const r = v.req;
    const tags = v.area === "fabril"
      ? [...r.nrs, ...(r.campo ? ["Obras"] : ["Turnos"])]
      : [...r.ferr, ["", "Médio", "Técnico", "Superior Cursando", "Superior"][r.esc]];

    return `<div class="box vaga top-brand">
      <span class="ex-badge" style="justify-self:start">Disponível</span>
      <h3>${esc(v.titulo)}</h3>
      <p class="muted" style="font-size:.93rem">${esc(v.desc)}</p>
      <div class="tags">
        ${tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}
        <span class="tag">${esc(v.local)}</span>
      </div>
      <button class="btn sm" data-vaga="${v.id}" type="button">Candidatar-se</button>
    </div>`;
  }).join("");
}

$$('.tabs [data-area]').forEach(t => t.addEventListener("click", () => {
  areaAtual = t.dataset.area;
  $$('.tabs [data-area]').forEach(x => x.setAttribute("aria-selected", x === t));
  renderVagas();
}));

document.addEventListener("click", e => {
  const b = e.target.closest("[data-vaga]");
  if (!b) return;
  const v = VAGAS.find(x => x.id === b.dataset.vaga);
  if (!v) return;
  
  if ($("#c_area")) $("#c_area").value = v.area;
  syncArea();
  if ($("#c_vaga")) $("#c_vaga").value = v.id;
  renderVagaInfo();
  
  const formSec = $("#candidatura");
  if (formSec) formSec.scrollIntoView({ behavior: "smooth" });
});

function syncArea() {
  const areaSelect = $("#c_area");
  const vagaSelect = $("#c_vaga");
  if (!areaSelect || !vagaSelect) return;

  const a = areaSelect.value;
  vagaSelect.innerHTML = VAGAS.filter(v => v.area === a).map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join("");
  
  const qFabril = $("#qFabril");
  const qAdm = $("#qAdm");
  if (qFabril) qFabril.hidden = a !== "fabril";
  if (qAdm) qAdm.hidden = a !== "administrativo";
  
  renderVagaInfo();
}

function renderVagaInfo() {
  const vagaSelect = $("#c_vaga");
  const vagaInfo = $("#vagaInfo");
  if (!vagaSelect || !vagaInfo) return;

  const v = VAGAS.find(x => x.id === vagaSelect.value);
  if (!v) return;
  const r = v.req;
  const reqs = v.area === "fabril"
    ? [`Experiência: ${r.exp ? "a partir de " + r.exp + " ano(s)" : "não exigida"}`, `Normas: ${r.nrs.join(", ")}`, `Habilidades: ${r.hab.join(", ")}`]
    : [`Experiência: a partir de ${r.exp} ano(s)`, `Escolaridade: ${["", "Ensino Médio", "Técnico", "Superior Cursando", "Superior Completo", "Pós-Graduação"][r.esc]}`, `Ferramentas: ${r.ferr.join(", ")}`];

  vagaInfo.innerHTML = `<span class="kicker">Vaga Selecionada</span><h3>${esc(v.titulo)}</h3><p class="muted">${esc(v.desc)}</p><ul>${reqs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

if ($("#c_area")) $("#c_area").addEventListener("change", syncArea);
if ($("#c_vaga")) $("#c_vaga").addEventListener("change", renderVagaInfo);


/**
 * ============================================================================
 * 4. ENVIO DE FORMULÁRIOS (CANDIDATURA E ORÇAMENTO)
 * ============================================================================
 */

// Formulário de Candidatura
const formCand = $("#formCand");
if (formCand) {
  formCand.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#c_err");
    if (err) err.hidden = true;

    const d = {
      nome: $("#c_nome")?.value.trim() || "",
      email: $("#c_email")?.value.trim() || "",
      tel: $("#c_tel")?.value.trim() || "",
      curriculo: $("#c_curriculo")?.files?.[0] || null,
      cidade: $("#c_cidade")?.value.trim() || "",
      area: $("#c_area")?.value || "",
      vagaId: $("#c_vaga")?.value || "",
      exp: $("#c_exp")?.value || "",
      porque: $("#c_porque")?.value.trim() || ""
    };

    if (d.area === "fabril") {
      Object.assign(d, { turnos: checked("c_turnos"), nrs: checked("c_nrs"), hab: checked("c_hab"), transp: $("#c_transp")?.value, campo: $("#c_campo")?.value });
    } else {
      Object.assign(d, { esc: $("#c_esc")?.value, curso: $("#c_curso")?.value.trim(), ferr: checked("c_ferr"), pres: $("#c_pres")?.value, linkedin: $("#c_linkedin")?.value.trim() });
    }

    const falta = [];
    if (!d.nome) falta.push("Nome");
    if (!/^\S+@\S+\.\S+$/.test(d.email)) falta.push("E-mail válido");
    if (d.tel.replace(/\D/g, "").length < 10) falta.push("WhatsApp completo");
    if (!d.cidade) falta.push("Cidade");
    if (!d.curriculo) falta.push("Currículo em PDF");
    if ($("#c_lgpd") && !$("#c_lgpd").checked) falta.push("Aceite da LGPD");

    if (falta.length) {
      if (err) {
        err.textContent = "Preencha os campos obrigatórios: " + falta.join(", ") + ".";
        err.hidden = false;
      }
      return;
    }

    try {      
      const curriculoPath = await uploadCurriculo(d.curriculo);
      const resposta = await enviarCandidato({
        nome: d.nome,
        email: d.email,
        telefone: d.tel,
        mensagem: JSON.stringify({
          cidade: d.cidade,
          area: d.area,
          vagaId: d.vagaId,
          experiencia: d.exp,
          porque: d.porque,
          turnos: d.turnos,
          nrs: d.nrs,
          habilidades: d.hab,
          transporte: d.transp,
          disponibilidadeCampo: d.campo,
          escolaridade: d.esc,
          curso: d.curso,
          ferramentas: d.ferr,
          disponibilidadePresencial: d.pres,
          linkedin: d.linkedin
        }),
        curriculo_path: curriculoPath
      });
      const candidato = await resposta.json();

      const v = VAGAS.find(x => x.id === d.vagaId);
      formCand.hidden = true;
      const doneBox = $("#c_done");
      if (doneBox) {
        doneBox.hidden = false;
        doneBox.innerHTML = `<span class="eyebrow">Candidatura registrada</span><h2>Obrigado, ${esc(d.nome.split(" ")[0])}!</h2><p>Sua vaga: <b>${esc(v ? v.titulo : "")}</b>.</p><span class="proto">Protocolo: ${esc(candidato.id ?? "")}</span><p class="muted">Retorno em até 48h úteis.</p>`;
      }
    } catch (error) {
      console.error(error);
      if (err) {
        err.textContent = error.message || "Erro ao enviar candidatura.";
        err.hidden = false;
      }
    }
  });
}

// Formulário de Orçamento
const formOrc = $("#formOrc");
if (formOrc) {
  formOrc.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#o_err");
    if (err) err.hidden = true;

    const solicitante = {
      nome: $("#o_nome")?.value.trim() || "",
      cargo: $("#o_cargo")?.value.trim() || "",
      empresa: $("#o_empresa")?.value.trim() || "",
      email: $("#o_email")?.value.trim() || "",
      telefone: $("#o_tel")?.value.trim() || "",
      horarioPreferido: $("#o_horario")?.value || ""
    };

    const orcamento = {
      cidade: $("#o_cidade")?.value.trim() || "",
      tipoObra: $("#o_tipo")?.value || "",
      faseAtual: $("#o_fase")?.value || "",
      pavimentos: $("#o_pav")?.value ? Number($("#o_pav").value) : null,
      solucoesRequeridas: checked("o_linhas").join(", "),
      prazo: $("#o_prazo")?.value || "",
      observacoes: $("#o_msg")?.value.trim() || ""
    };

    const falta = [];
    if (!solicitante.nome) falta.push("Nome");
    if (!solicitante.empresa) falta.push("Empresa");
    if (!/^\S+@\S+\.\S+$/.test(solicitante.email)) falta.push("E-mail válido");
    if (solicitante.telefone.replace(/\D/g, "").length < 10) falta.push("Telefone completo");
    if (!orcamento.cidade) falta.push("Cidade da obra");
    if (!orcamento.solucoesRequeridas) falta.push("Ao menos uma solução");
    if ($("#o_lgpd") && !$("#o_lgpd").checked) falta.push("Aceite da LGPD");

    if (falta.length) {
      if (err) {
        err.textContent = "Preencha os campos: " + falta.join(", ") + ".";
        err.hidden = false;
      }
      return;
    }

    try {
      const resposta = await enviarOrcamento({ solicitante, ...orcamento });
      formOrc.hidden = true;
      const doneBox = $("#o_done");
      if (doneBox) {
        doneBox.hidden = false;
        doneBox.innerHTML = `<span class="eyebrow">Solicitação registrada</span><h2>Obrigado, ${esc(solicitante.nome.split(" ")[0])}!</h2><p>Orçamento para: <b>${esc(solicitante.empresa)}</b>.</p><span class="proto">Protocolo: ${esc(resposta.id ?? "")}</span><p class="muted">Contato em até 2h úteis.</p>`;
      }
    } catch (error) {
      console.error(error);
      if (err) {
        err.textContent = error.message || "Erro ao solicitar orçamento.";
        err.hidden = false;
      }
    }
  });
}


syncArea();
renderVagas();
route();
