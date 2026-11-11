/**
 * 1. CONFIGURAÇÕES E ESTADO GLOBAL
 */
const CONFIG = {
  webhookUrl: "", // URL para webhook externo (ex: N8N)
  sla: { candidato: 48, orcamento: 2 } // SLA de primeira resposta em horas
};

const USERS = [
  { email: "rh@metroform.demo", senha: "demo", nome: "Equipe RH", cargo: "Recrutamento e seleção" },
  { email: "comercial@metroform.demo", senha: "demo", nome: "Equipe Comercial", cargo: "Atendimento comercial" }
];

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
const FINAIS = ["Aprovado", "Não selecionado", "Banco de talentos", "Fechado", "Perdido"];

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

const CHECKLIST = {
  candidato: ["Resposta em até 48h úteis", "Informou número do protocolo", "Realizou triagem por requisitos", "Registrou próximo passo", "Forneceu retorno final"],
  orcamento: ["Resposta em até 2h úteis", "Informou número do protocolo", "Identificou escopo da obra", "Encaminhou ao consultor técnico", "Registrou status no painel"]
};

/**
 * 2. UTILITÁRIOS E FUNÇÕES AUXILIARES
 */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const checked = id => $$("#" + id + " input:checked").map(i => i.value);
const fmt = iso => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => t.hidden = true, 2600);
}

function protocolo(tipo) {
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return "MF-" + (tipo === "candidato" ? "C" : "O") + "-" + new Date().getFullYear() + "-" + n;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copiado";
  } catch (e) {
    btn.textContent = "Erro";
  }
  setTimeout(() => btn.textContent = "Copiar", 1500);
}

function sendWebhook(payload) {
  if (!CONFIG.webhookUrl) return;
  fetch(CONFIG.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

/**
 * 3. ARMAZENAMENTO LOCAL (LOCALSTORAGE / SESSIONSTORAGE)
 */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

let mem = {};
const sess = {
  get() { try { const v = sessionStorage.getItem("mf_user"); return v ? JSON.parse(v) : mem.user || null; } catch (e) { return mem.user || null; } },
  set(u) { mem.user = u; try { u ? sessionStorage.setItem("mf_user", JSON.stringify(u)) : sessionStorage.removeItem("mf_user"); } catch (e) {} }
};

/**
 * 4. CÁLCULO DE ADERÊNCIA À VAGA
 */
function aderencia(d) {
  const v = VAGAS.find(x => x.id === d.vagaId);
  if (!v) return { score: 0, itens: [] };
  
  const r = v.req, itens = [];
  const add = (nome, peso, ok, parcial) => itens.push({ nome, peso, pts: Math.round(peso * (ok ? 1 : (parcial || 0))) });
  const exp = Number(d.exp || 0);

  add("Experiência", 30, exp >= r.exp, r.exp ? Math.min(exp / r.exp, 1) * .7 : 1);
  if (v.area === "fabril") {
    const nrs = d.nrs || [], hab = d.hab || [];
    add("Normas (NRs)", 25, r.nrs.every(n => nrs.includes(n)), r.nrs.filter(n => nrs.includes(n)).length / r.nrs.length);
    add("Habilidades", 25, r.hab.every(h => hab.includes(h)), r.hab.filter(h => hab.includes(h)).length / r.hab.length);
    if (r.campo) add("Disponibilidade Obras", 20, d.campo === "sim");
    else add("Turno e Transporte", 20, (d.turnos || []).length > 0 && d.transp !== "nao", (d.turnos || []).length ? .5 : 0);
  } else {
    const ferr = d.ferr || [];
    add("Escolaridade", 25, Number(d.esc || 0) >= r.esc, .4);
    add("Ferramentas", 25, r.ferr.every(f => ferr.includes(f)), r.ferr.filter(f => ferr.includes(f)).length / r.ferr.length);
    add("Presencial", 20, d.pres === "sim");
  }
  return { score: itens.reduce((a, b) => a + b.pts, 0), itens };
}

const corAder = s => s >= 75 ? "var(--ok)" : s >= 50 ? "var(--warn)" : "var(--bad)";

/**
 * 5. SEED INICIAL DE DADOS
 */
function seed() {
  const h = n => new Date(Date.now() - n * 3600e3).toISOString();
  const cands = [
    { nome: "Marcos Vieira", email: "marcos@exemplo.com", tel: "(11) 90000-0001", cidade: "Guarulhos", vagaId: "mon", area: "fabril", exp: "4", nrs: ["NR-18", "NR-35"], hab: ["Montagem em obra"], turnos: ["1º turno"], transp: "sim", campo: "sim", porque: "Experiência prévia em montagem de estruturas.", h: 3, status: "Em triagem" },
    { nome: "Juliana Prado", email: "juliana@exemplo.com", tel: "(11) 90000-0002", cidade: "São Paulo", vagaId: "rh", area: "administrativo", exp: "2", esc: "4", ferr: ["Excel", "ATS"], pres: "sim", porque: "Atuação focada em recrutamento operacional.", h: 60, status: "Novo" }
  ].map(c => ({ id: crypto.randomUUID?.() || String(Math.random()), tipo: "candidato", protocolo: protocolo("candidato"), criadoEm: h(c.h), canal: "Site", status: c.status, exemplo: true, nome: c.nome, email: c.email, tel: c.tel, dados: c, notas: [] }));

  const orcs = [
    { nome: "Patrícia Lima", empresa: "Construtora Exemplo", cargo: "Engenheira", email: "patricia@exemplo.com", tel: "(11) 90000-0004", cidade: "São Paulo - SP", tipo: "Residencial vertical", fase: "Estrutura", pav: "22", linhas: ["Proteção coletiva metálica"], prazo: "urgente", h: 1.5, status: "Novo" }
  ].map(o => ({ id: crypto.randomUUID?.() || String(Math.random()), tipo: "orcamento", protocolo: protocolo("orcamento"), criadoEm: h(o.h), canal: "Site", status: o.status, exemplo: true, nome: o.nome, email: o.email, tel: o.tel, dados: o, notas: [] }));

  return [...cands, ...orcs];
}

let DB = store.get("mf_atendimentos", null);
if (!DB) { DB = seed(); store.set("mf_atendimentos", DB); }
const save = () => store.set("mf_atendimentos", DB);

/**
 * 6. ROTEAMENTO DE PÁGINAS (SPA)
 */
const PROTEGIDAS = ["painel", "novo"];

function route() {
  let r = (location.hash || "#inicio").slice(1).split("?")[0] || "inicio";
  const sec = document.querySelector('[data-page="' + r + '"]');
  
  if (!sec) {
    const alvo = document.getElementById(r);
    if (alvo) { alvo.scrollIntoView(); return; }
    r = "inicio";
  }

  if (PROTEGIDAS.includes(r) && !sess.get()) { location.hash = "#login"; return; }
  if (r === "login" && sess.get()) { location.hash = "#painel"; return; }

  $$("[data-page]").forEach(p => p.hidden = p.dataset.page !== r);
  $$(".nav a").forEach(a => a.classList.toggle("on", a.dataset.r === r));
  
  $("#nav").classList.remove("open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  $("#navLogin").textContent = sess.get() ? "Painel" : "Área do atendente";
  $("#navLogin").href = sess.get() ? "#painel" : "#login";

  window.scrollTo(0, 0);
  if (r === "painel") renderPainel();
}

window.addEventListener("hashchange", route);
$("#menuBtn").addEventListener("click", () => {
  const open = $("#nav").classList.toggle("open");
  $("#menuBtn").setAttribute("aria-expanded", open);
});

$$("[data-scroll]").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  document.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: "smooth" });
}));

$("#logo").addEventListener("error", () => {
  $("#logo").hidden = true;
  $("#wordmark").hidden = false;
});

/**
 * 7. LÓGICA DA SEÇÃO TRABALHE CONOSCO
 */
let areaAtual = "fabril";

function renderVagas() {
  $("#vagasList").innerHTML = VAGAS.filter(v => v.area === areaAtual).map(v => {
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

$("#vagasList").addEventListener("click", e => {
  const b = e.target.closest("[data-vaga]");
  if (!b) return;
  const v = VAGAS.find(x => x.id === b.dataset.vaga);
  $("#c_area").value = v.area;
  syncArea();
  $("#c_vaga").value = v.id;
  renderVagaInfo();
  $("#candidatura").scrollIntoView({ behavior: "smooth" });
});

function syncArea() {
  const a = $("#c_area").value;
  $("#c_vaga").innerHTML = VAGAS.filter(v => v.area === a).map(v => `<option value="${v.id}">${esc(v.titulo)}</option>`).join("");
  $("#qFabril").hidden = a !== "fabril";
  $("#qAdm").hidden = a !== "administrativo";
  renderVagaInfo();
}

function renderVagaInfo() {
  const v = VAGAS.find(x => x.id === $("#c_vaga").value);
  if (!v) return;
  const r = v.req;
  const reqs = v.area === "fabril"
    ? [`Experiência: ${r.exp ? "a partir de " + r.exp + " ano(s)" : "não exigida"}`, `Normas: ${r.nrs.join(", ")}`, `Habilidades: ${r.hab.join(", ")}`]
    : [`Experiência: a partir de ${r.exp} ano(s)`, `Escolaridade: ${["", "Médio completo", "Técnico", "Superior Cursando", "Superior Completo"][r.esc]}`, `Ferramentas: ${r.ferr.join(", ")}`];

  $("#vagaInfo").innerHTML = `<span class="kicker">Vaga Selecionada</span><h3>${esc(v.titulo)}</h3><p class="muted">${esc(v.desc)}</p><ul>${reqs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
}

$("#c_area").addEventListener("change", syncArea);
$("#c_vaga").addEventListener("change", renderVagaInfo);

/**
 * 8. ENVIO DE FORMULÁRIOS
 */
$("#formCand").addEventListener("submit", e => {
  e.preventDefault();
  const err = $("#c_err");
  err.hidden = true;

  const d = {
    nome: $("#c_nome").value.trim(),
    email: $("#c_email").value.trim(),
    tel: $("#c_tel").value.trim(),
    cidade: $("#c_cidade").value.trim(),
    area: $("#c_area").value,
    vagaId: $("#c_vaga").value,
    exp: $("#c_exp").value,
    porque: $("#c_porque").value.trim()
  };

  if (d.area === "fabril") {
    Object.assign(d, { turnos: checked("c_turnos"), nrs: checked("c_nrs"), hab: checked("c_hab"), transp: $("#c_transp").value, campo: $("#c_campo").value });
  } else {
    Object.assign(d, { esc: $("#c_esc").value, curso: $("#c_curso").value.trim(), ferr: checked("c_ferr"), pres: $("#c_pres").value, linkedin: $("#c_linkedin").value.trim() });
  }

  const falta = [];
  if (!d.nome) falta.push("Nome");
  if (!/^\S+@\S+\.\S+$/.test(d.email)) falta.push("E-mail válido");
  if (d.tel.replace(/\D/g, "").length < 10) falta.push("WhatsApp completo");
  if (!d.cidade) falta.push("Cidade");
  if (!$("#c_lgpd").checked) falta.push("Aceite da LGPD");

  if (falta.length) {
    err.textContent = "Preencha os campos obrigatórios: " + falta.join(", ") + ".";
    err.hidden = false;
    return;
  }

  const item = {
    id: crypto.randomUUID?.() || String(Math.random()),
    tipo: "candidato",
    protocolo: protocolo("candidato"),
    criadoEm: new Date().toISOString(),
    canal: "Site",
    status: "Novo",
    nome: d.nome,
    email: d.email,
    tel: d.tel,
    dados: d,
    notas: []
  };

  DB.unshift(item);
  save();
  sendWebhook(item);

  const v = VAGAS.find(x => x.id === d.vagaId);
  $("#formCand").hidden = true;
  $("#c_done").hidden = false;
  $("#c_done").innerHTML = `<span class="eyebrow">Candidatura registrada</span><h2>Obrigado, ${esc(d.nome.split(" ")[0])}!</h2><p>Sua vaga: <b>${esc(v ? v.titulo : "")}</b>.</p><span class="proto">${item.protocolo}</span><p class="muted">Retorno em até 48h úteis.</p>`;
});

$("#formOrc").addEventListener("submit", e => {
  e.preventDefault();
  const err = $("#o_err");
  err.hidden = true;

  const d = {
    nome: $("#o_nome").value.trim(),
    cargo: $("#o_cargo").value.trim(),
    empresa: $("#o_empresa").value.trim(),
    email: $("#o_email").value.trim(),
    tel: $("#o_tel").value.trim(),
    horario: $("#o_horario").value,
    cidade: $("#o_cidade").value.trim(),
    tipo: $("#o_tipo").value,
    fase: $("#o_fase").value,
    pav: $("#o_pav").value,
    linhas: checked("o_linhas"),
    prazo: $("#o_prazo").value,
    msg: $("#o_msg").value.trim()
  };

  const falta = [];
  if (!d.nome) falta.push("Nome");
  if (!d.empresa) falta.push("Empresa");
  if (!/^\S+@\S+\.\S+$/.test(d.email)) falta.push("E-mail válido");
  if (d.tel.replace(/\D/g, "").length < 10) falta.push("Telefone completo");
  if (!d.cidade) falta.push("Cidade da obra");
  if (!d.linhas.length) falta.push("Ao menos uma solução");
  if (!$("#o_lgpd").checked) falta.push("Aceite da LGPD");

  if (falta.length) {
    err.textContent = "Preencha os campos: " + falta.join(", ") + ".";
    err.hidden = false;
    return;
  }

  const item = {
    id: crypto.randomUUID?.() || String(Math.random()),
    tipo: "orcamento",
    protocolo: protocolo("orcamento"),
    criadoEm: new Date().toISOString(),
    canal: "Site",
    status: "Novo",
    nome: d.nome,
    email: d.email,
    tel: d.tel,
    dados: d,
    notas: []
  };

  DB.unshift(item);
  save();
  sendWebhook(item);

  $("#formOrc").hidden = true;
  $("#o_done").hidden = false;
  $("#o_done").innerHTML = `<span class="eyebrow">Solicitação registrada</span><h2>Obrigado, ${esc(d.nome.split(" ")[0])}!</h2><p>Orçamento para: <b>${esc(d.empresa)}</b>.</p><span class="proto">${item.protocolo}</span><p class="muted">Contato em até 2h úteis.</p>`;
});

/**
 * 9. RENDERING DE ROTEIROS E STATUS
 */
$("#stCand").innerHTML = STATUS.candidato.map(s => `<span class="chip">${esc(s)}</span>`).join("");
$("#stOrc").innerHTML = STATUS.orcamento.map(s => `<span class="chip">${esc(s)}</span>`).join("");

const scriptHTML = s => `<div class="script"><div class="script-h"><h4>${esc(s.t)}</h4><button class="copy" type="button">Copiar</button></div><pre>${esc(s.x)}</pre></div>`;

function renderScripts(k) {
  $("#scriptList").innerHTML = SCRIPTS[k].map(scriptHTML).join("");
}

$$("#scriptTabs .tab").forEach(t => t.addEventListener("click", () => {
  $$("#scriptTabs .tab").forEach(x => x.setAttribute("aria-selected", x === t));
  renderScripts(t.dataset.s);
}));

document.addEventListener("click", e => {
  const b = e.target.closest(".copy");
  if (b) copyText(b.closest(".script").querySelector("pre").textContent, b);
});

function syncManual() {
  const ok = store.get("mf_manual_ok", null);
  $("#m_ok").checked = !!ok;
  $("#m_status").textContent = ok ? "Ciência registrada em " + fmt(ok) + "." : "";
}
$("#m_ok").addEventListener("change", () => {
  store.set("mf_manual_ok", $("#m_ok").checked ? new Date().toISOString() : null);
  syncManual();
});

/**
 * 10. AUTHENTICATION (DEMO)
 */
function entrar(u) {
  sess.set({ nome: u.nome, cargo: u.cargo, email: u.email });
  toast("Bem-vindo(a), " + u.nome);
  location.hash = "#painel";
}

$("#formLogin").addEventListener("submit", e => {
  e.preventDefault();
  const em = $("#l_email").value.trim().toLowerCase();
  const pw = $("#l_senha").value;
  const u = USERS.find(x => x.email === em && x.senha === pw);
  if (!u) {
    $("#l_err").textContent = "Credenciais inválidas.";
    $("#l_err").hidden = false;
    return;
  }
  $("#l_err").hidden = true;
  entrar(u);
});

$("#l_demo").addEventListener("click", () => entrar(USERS[0]));
$("#p_sair").addEventListener("click", () => { sess.set(null); toast("Sessão encerrada"); location.hash = "#login"; });

/**
 * 11. GESTÃO E FILA DO PAINEL
 */
let selId = null;
const horas = it => (Date.now() - new Date(it.criadoEm)) / 3600e3;
const atrasado = it => it.status === "Novo" && horas(it) > CONFIG.sla[it.tipo];
const aberto = it => !FINAIS.includes(it.status);

function assunto(it) {
  if (it.tipo === "candidato") {
    const v = VAGAS.find(x => x.id === it.dados.vagaId);
    return v ? v.titulo : (it.dados.assunto || "Candidatura");
  }
  return it.dados.empresa ? `${it.dados.empresa} · ${(it.dados.linhas || []).join(", ")}` : (it.dados.assunto || "Orçamento");
}

function pillClass(s) {
  if (s === "Novo") return "p-novo";
  if (["Aprovado", "Fechado"].includes(s)) return "p-ok";
  if (["Não selecionado", "Perdido"].includes(s)) return "p-bad";
  return "p-and";
}

function prazoTxt(it) {
  if (!aberto(it)) return "—";
  if (it.status !== "Novo") return "Respondido";
  const rest = CONFIG.sla[it.tipo] - horas(it);
  return rest < 0 ? `<span class="late">Vencido há ${Math.ceil(-rest)}h</span>` : `${Math.ceil(rest)}h restantes`;
}

function renderPainel() {
  const u = sess.get();
  if (!u) return;

  $("#p_nome").textContent = u.nome;
  $("#p_cargo").textContent = u.cargo;
  $("#p_av").textContent = u.nome.trim()[0];
  $("#p_manual_warn").hidden = !!store.get("mf_manual_ok", null);

  const hoje = new Date().toDateString();
  $("#k_abertos").textContent = DB.filter(aberto).length;
  $("#k_atraso").textContent = DB.filter(atrasado).length;
  $("#k_hoje").textContent = DB.filter(i => new Date(i.criadoEm).toDateString() === hoje).length;
  $("#k_concl").textContent = DB.filter(i => !aberto(i)).length;

  const ft = $("#f_tipo").value, fs = $("#f_status").value, q = $("#f_busca").value.trim().toLowerCase();

  const list = DB.filter(i => (!ft || i.tipo === ft)
    && (fs === "todos" || (fs === "abertos" && aberto(i)) || (fs === "atraso" && atrasado(i)) || (fs === "concluidos" && !aberto(i)))
    && (!q || [i.nome, i.protocolo, assunto(i), i.dados.empresa].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => (atrasado(b) - atrasado(a)) || (new Date(b.criadoEm) - new Date(a.criadoEm)));

  $("#q_empty").hidden = list.length > 0;
  $("#q_body").innerHTML = list.map(i => {
    const ad = i.tipo === "candidato" && i.dados.vagaId ? aderencia(i.dados).score : null;
    return `<tr data-id="${i.id}" class="${i.id === selId ? "sel" : ""}" tabindex="0">
      <td style="white-space:nowrap">${esc(i.protocolo)}</td>
      <td><span class="typ ${i.tipo === "orcamento" ? "o" : ""}">${i.tipo === "candidato" ? "Candidato" : "Orçamento"}</span></td>
      <td>${esc(i.nome)}<br><small class="muted">${esc(i.canal)} · ${fmt(i.criadoEm)}</small></td>
      <td>${esc(assunto(i))}</td>
      <td>${ad === null ? "—" : `<div style="display:flex;align-items:center;gap:8px"><div class="meter"><i style="width:${ad}%;background:${corAder(ad)}"></i></div><b>${ad}%</b></div>`}</td>
      <td><span class="pill ${pillClass(i.status)}">${esc(i.status)}</span></td>
      <td style="white-space:nowrap">${prazoTxt(i)}</td>
    </tr>`;
  }).join("");

  renderDetail();
}

["#f_tipo", "#f_status"].forEach(s => $(s).addEventListener("change", renderPainel));
$("#f_busca").addEventListener("input", renderPainel);

$("#q_body").addEventListener("click", e => {
  const tr = e.target.closest("tr[data-id]");
  if (tr) {
    selId = tr.dataset.id;
    renderPainel();
    if (innerWidth < 1000) $("#detail").scrollIntoView({ behavior: "smooth" });
  }
});

$("#p_novo").addEventListener("click", () => location.hash = "#novo");

/**
 * 12. DETALHES DO ATENDIMENTO SELECIONADO
 */
function linha(k, v) {
  return v && (!Array.isArray(v) || v.length) ? `<dt>${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join(", ") : v)}</dd>` : "";
}

function renderDetail() {
  const it = DB.find(i => i.id === selId);
  if (!it) {
    $("#detail").innerHTML = `<div class="empty">Selecione um atendimento na fila para ver os detalhes.</div>`;
    return;
  }

  const d = it.dados, isC = it.tipo === "candidato";
  let dados = linha("E-mail", it.email) + linha("Telefone", it.tel) + linha("Canal", it.canal) + linha("Recebido em", fmt(it.criadoEm));
  let extra = "";

  if (isC) {
    const v = VAGAS.find(x => x.id === d.vagaId);
    dados += linha("Vaga", v ? v.titulo : d.assunto) + linha("Cidade", d.cidade) + linha("Experiência", { 0: "Nenhuma", 1: "Até 1 ano", 2: "1 a 3 anos", 4: "3 a 5 anos", 6: "Mais de 5 anos" }[d.exp])
      + linha("Turnos", d.turnos) + linha("NRs", d.nrs) + linha("Habilidades", d.hab) + linha("Motivação", d.porque);

    if (d.vagaId) {
      const a = aderencia(d);
      extra = `<div><span class="kicker">Aderência à Vaga</span>
        <div style="display:flex;align-items:center;gap:12px;margin:8px 0">
          <strong style="font-family:var(--display);font-size:2.2rem;color:${corAder(a.score)}">${a.score}%</strong>
          <div class="meter" style="flex:1"><i style="width:${a.score}%;background:${corAder(a.score)}"></i></div>
        </div>
        <dl class="dl">${a.itens.map(x => `<dt>${esc(x.nome)}</dt><dd>${x.pts} de ${x.peso}</dd>`).join("")}</dl>
      </div>`;
    }
  } else {
    dados += linha("Empresa", d.empresa) + linha("Cargo", d.cargo) + linha("Obra", d.cidade) + linha("Soluções", d.linhas) + linha("Observações", d.msg);
    if (d.prazo === "urgente") extra = `<div><span class="pill p-bad">Prioridade Alta</span> <span class="muted" style="font-size:.9rem">Entrega em até 15 dias.</span></div>`;
  }

  const ck = (it.check || []);
  const scripts = SCRIPTS[isC ? "cand" : "orc"];
  const fill = s => s.replaceAll("[nome]", it.nome.split(" ")[0]).replaceAll("[protocolo]", it.protocolo).replaceAll("[seu nome]", sess.get()?.nome || "Atendente").replaceAll("[cidade]", d.cidade || "sua região");

  $("#detail").innerHTML = `
    <div style="display:grid;gap:8px">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
        <span class="typ ${isC ? "" : "o"}">${isC ? "Candidato" : "Orçamento"}</span>
        <span style="font-family:var(--display);font-weight:800">${esc(it.protocolo)}</span>
      </div>
      <h3>${esc(it.nome)}</h3>
      <label class="f" style="margin-top:6px">Status
        <select id="d_status">${STATUS[it.tipo].map(s => `<option ${s === it.status ? "selected" : ""}>${s}</option>`).join("")}</select>
      </label>
    </div>
    ${extra}
    <div><span class="kicker">Informações</span><dl class="dl" style="margin-top:8px">${dados}</dl></div>
    <div><span class="kicker">Checklist de Conformidade</span>
      <div class="checklist" style="margin-top:8px">${CHECKLIST[it.tipo].map((c, i) => `<label><input type="checkbox" data-ck="${i}" ${ck.includes(i) ? "checked" : ""}> ${esc(c)}</label>`).join("")}</div>
    </div>
    <div style="display:grid;gap:10px"><span class="kicker">Roteiros Adaptados</span>${scripts.map(s => scriptHTML({ t: s.t, x: fill(s.x) })).join("")}</div>
    <div style="display:grid;gap:10px"><span class="kicker">Histórico de Interações</span>
      <div class="notes">${it.notas.length ? it.notas.map(n => `<div class="note"><small>${fmt(n.quando)} · ${esc(n.autor)}</small><br>${esc(n.texto)}</div>`).join("") : '<p class="muted">Sem notas cadastradas.</p>'}</div>
      <label class="f">Novo Registro<textarea id="d_nota" placeholder="Digite aqui o andamento..."></textarea></label>
      <button class="btn sm" type="button" id="d_add" style="justify-self:start">Salvar Registro</button>
    </div>`;

  $("#d_status").addEventListener("change", e => {
    const de = it.status;
    it.status = e.target.value;
    it.notas.unshift({ quando: new Date().toISOString(), autor: sess.get().nome, texto: `Status alterado: ${de} → ${it.status}` });
    save();
    sendWebhook({ evento: "status", protocolo: it.protocolo, status: it.status });
    toast("Status atualizado");
    renderPainel();
  });

  $$("#detail [data-ck]").forEach(c => c.addEventListener("change", () => {
    it.check = $$("#detail [data-ck]:checked").map(x => Number(x.dataset.ck));
    save();
  }));

  $("#d_add").addEventListener("click", () => {
    const t = $("#d_nota").value.trim();
    if (!t) return;
    it.notas.unshift({ quando: new Date().toISOString(), autor: sess.get().nome, texto: t });
    save();
    toast("Registro salvo");
    renderDetail();
  });
}

/**
 * 13. REGISTRO MANUAL DE CONTATO
 */
$("#formNovo").addEventListener("submit", e => {
  e.preventDefault();
  const nome = $("#n_nome").value.trim();
  const contato = $("#n_contato").value.trim();

  if (!nome || !contato) {
    $("#n_err").textContent = "Preencha o nome e o canal de contato.";
    $("#n_err").hidden = false;
    return;
  }

  $("#n_err").hidden = true;
  const tipo = $("#n_tipo").value;
  const isEmail = contato.includes("@");

  const item = {
    id: crypto.randomUUID?.() || String(Math.random()),
    tipo,
    protocolo: protocolo(tipo),
    criadoEm: new Date().toISOString(),
    canal: $("#n_canal").value,
    status: "Novo",
    nome,
    email: isEmail ? contato : "",
    tel: isEmail ? "" : contato,
    dados: { assunto: $("#n_assunto").value.trim(), resumo: $("#n_resumo").value.trim() },
    notas: [{ quando: new Date().toISOString(), autor: sess.get().nome, texto: "Registro manual via " + $("#n_canal").value }]
  };

  DB.unshift(item);
  save();
  sendWebhook(item);
  selId = item.id;
  $("#formNovo").reset();
  toast("Protocolo " + item.protocolo + " criado com sucesso");
  location.hash = "#painel";
});

/**
 * 14. INICIALIZAÇÃO DA APLICAÇÃO
 */
syncArea();
renderVagas();
renderScripts("cand");
syncManual();
route();
setInterval(() => {
  if (!$('[data-page="painel"]').hidden) renderPainel();
}, 60000);