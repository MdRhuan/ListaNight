/* =============================================================================
   CloneVipMe - logica da pagina
   Carregado no fim do <body> do index.html, depois do SweetAlert2 - por isso
   o DOM ja existe quando este arquivo roda, sem precisar de DOMContentLoaded.
   O bloco EDITE AQUI, logo abaixo, e a unica parte que voce mexe por evento.
   ========================================================================== */

/* ===========================================================================
   ###                                                                     ###
   ###                        E D I T E   A Q U I                          ###
   ###                                                                     ###
   Esta e a UNICA parte que voce mexe a cada evento novo.
   Tudo que esta em EVENTO viaja junto com cada inscricao ate a planilha,
   entao da pra reaproveitar a mesma pagina e depois filtrar por evento la.

   ATENCAO: a planilha guarda o nome que estava AQUI no momento do envio.
   Trocou o titulo? As inscricoes antigas continuam com o titulo antigo
   (que e o comportamento certo). Mas so troque quando o evento anterior
   ja tiver encerrado, senao os dois viram a mesma linha na sua analise.
=========================================================================== */

const EVENTO = {
  // O titulo. Aparece no H1, na aba do navegador e na coluna "Evento".
  nome: "SUBMUNDO EDITION COM WS DA IGREJINHA",

  // Nome da lista. Aparece em laranja acima do formulario e vai pra planilha.
  lista: "Lista OFFs BH",

  // Local do evento.
  local: "Night Market",

  // Data e hora. Formato: "AAAA-MM-DDTHH:MM" (ano-mes-diaThora:minuto).
  data: "2026-10-16T22:00",

  // Aviso que aparece logo abaixo do nome da lista. Ex: "Free ate 23h".
  aviso_da_lista: "",

  // true = mostra o botao "Adicionar outro convidado". false = um nome so.
  varios_nomes: true,

  // Link usado nos botoes de compartilhar. Vazio = usa a URL da propria pagina.
  link_divulgacao: ""
};

/* ---------------------------------------------------------------------------
   OS DOIS CARDS DE GRUPO DE WHATSAPP
   ---------------------------------------------------------------------------
   PREENCHA O "link" DOS DOIS. Enquanto estiver vazio o botao fica desligado
   (cinza, sem clique) de proposito - botao verde que nao leva a lugar nenhum
   queima a confianca de quem clica.

   foto:   arquivo na pasta (ex: "logo_tickethub.png") ou URL. Vazio = placeholder.
   ajuste: "cover"   preenche o quadro e corta o que sobra (bom para FOTO).
           "contain" mostra a imagem inteira, sem cortar  (bom para LOGO).
   fundo:  cor do quadro. Use a mesma cor de fundo da imagem para nao aparecer
           emenda entre a imagem e a moldura.
--------------------------------------------------------------------------- */
const GRUPOS = [
  {
    titulo:    "TicketHub",
    descricao: "Ingressos e listas para todos os eventos de BH.",
    foto:      "logo_tickethub.png",
    ajuste:    "cover",     // o ticket fica no meio: o corte do topo/base nao o atinge
    fundo:     "#F1F1F1",   // cor real do fundo da imagem (medida no arquivo)
    link:      "https://chat.whatsapp.com/EGrwvkC1N8WJyfp9Rsb8LM",
    botao:     "Entrar no grupo"
  },
  {
    titulo:    "OFFS BH",
    descricao: "Ingressos e listas para todos os eventos do Night Market.",
    foto:      "Offs_Logo.png",
    ajuste:    "contain",   // o circulo ocupa toda a altura: cortar destruiria o logo
    fundo:     "#010101",   // cor real do fundo da imagem (medida no arquivo)
    link:      "https://chat.whatsapp.com/EoUyx0kLkte7OXVVQWIHSZ",
    botao:     "Entrar no grupo"
  }
];

/* Titulo que aparece acima dos dois cards. */
const GRUPOS_TITULO = "Nossos grupos";

/* Campos do formulario. Comente com // para esconder, descomente para mostrar.
   A ordem na tela e fixa (nome, nascimento, telefone) - a ordem desta lista
   nao importa.                                                               */
const CAMPOS = [
  { id: 0, obrigatorio: true },     // Nome
  { id: 2, obrigatorio: true },     // Telefone
  { id: 4, obrigatorio: false },    // Data de nascimento
];

/* URL do Web App do Google Apps Script (instrucoes em apps-script/Codigo.gs).
   Enquanto estiver vazio, o formulario funciona em modo teste: valida, mostra
   o modal de sucesso e grava no localStorage + console, sem enviar nada.     */
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxBXER4pCNn1VdCDzzkOBEnlOfcA1RrFHMHcjr4qjd5mWTXsD58FXtwI2TQcXHwM_RB/exec";

/* ===========================================================================
   ###                  F I M   D A   E D I C A O                          ###
   Daqui pra baixo e mecanica. So mexa se souber o que esta fazendo.
=========================================================================== */

const EVENT = {
  event_name: EVENTO.nome,
  place_name: EVENTO.local,
  start_date: EVENTO.data,
  list_name: EVENTO.lista,
  list_description: EVENTO.aviso_da_lista,
  allow_multiple_names: EVENTO.varios_nomes,
  share_url: EVENTO.link_divulgacao
};

const FIELD_LIST = CAMPOS.map(c => ({ id: c.id, required: c.obrigatorio ? "1" : "0" }));

/* ========================= Definicao dos campos ============================
   So os tres campos que a lista realmente pede. Os ids sao os do proprio app
   da Vipme (0=Nome, 2=Telefone, 4=Data de nascimento); os outros que existiam
   la - e-mail, sexo, CPF e RG - foram removidos porque nos nao perguntamos.

   A ordem de renderizacao e fixa (nome, nascimento, telefone), e nao segue a
   ordem desta lista nem a de CAMPOS.                                         */
const FIELD_DEFS = {
  0: { key: "name",  label: "Nome:",                     type: "text", mask: null,              autocomplete: "name" },
  4: { key: "bday",  label: "Data do seu aniversário: ", type: "tel",  mask: "00/00/0000",      autocomplete: "bday" },
  2: { key: "phone", label: "Telefone: ",                type: "tel",  mask: "(00) 00000-0000", autocomplete: "tel" }
};
const RENDER_ORDER = [0, 4, 2];

const activeFields = RENDER_ORDER
  .filter(id => FIELD_LIST.some(f => Number(f.id) === id))
  .map(id => {
    const api = FIELD_LIST.find(f => Number(f.id) === id);
    return Object.assign({ id: id, required: String(api.required) === "1" }, FIELD_DEFS[id]);
  });

/* =============================== Estado =================================== */
let attendingList = [];

function blankGuest() {
  const g = {};
  activeFields.forEach(f => { g[f.key] = ""; });
  return g;
}

/* ========================= Mascara posicional =============================
   Replica o ngx-mask do original: os digitos preenchem os slots "0" na ordem
   e os caracteres literais aparecem conforme necessario.                     */
function applyMask(value, mask) {
  if (!mask) return value;
  const digits = String(value).replace(/\D/g, "");
  let out = "", di = 0;
  for (let i = 0; i < mask.length && di < digits.length; i++) {
    if (mask[i] === "0") { out += digits[di]; di++; }
    else { out += mask[i]; }
  }
  return out;
}

/* =============================== Validacao ================================ */
function isValidDate(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (!m) return false;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return false;
  if (d > new Date(y, mo, 0).getDate()) return false;
  if (y < 1900) return false;
  if (new Date(y, mo - 1, d) > new Date()) return false;
  return true;
}

function isValidPhone(str) {
  const digits = str.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

/* Retorna null se ok, ou a mensagem de erro (mesmos textos do original). */
function fieldError(field, value) {
  const v = (value || "").trim();
  if (field.required && !v) return "* obrigatório";
  if (!v) return null;
  if (field.key === "bday"  && !isValidDate(v))  return "* Inválido";
  if (field.key === "phone" && !isValidPhone(v)) return "* Inválido";
  return null;
}

/* ============================== Renderizacao ============================== */
const attendingEl = document.getElementById("attendingList");

function renderGuests() {
  attendingEl.innerHTML = "";

  attendingList.forEach((guest, index) => {
    const row = document.createElement("div");
    row.className = "row";

    activeFields.forEach(field => {
      const col = document.createElement("div");
      col.className = "col-xs-12 col-sm-4";

      const fs = document.createElement("fieldset");
      fs.className = "form-group";

      const inputId = "f-" + index + "-" + field.key;

      const label = document.createElement("label");
      label.className = "blue-grey lighten-1";
      label.setAttribute("for", inputId);
      label.textContent = field.label;
      fs.appendChild(label);

      const err = document.createElement("span");
      err.className = "error-message";
      err.id = "err-" + index + "-" + field.key;
      err.hidden = true;
      fs.appendChild(err);

      const input = document.createElement("input");
      input.type = field.type;
      if (field.autocomplete) input.autocomplete = field.autocomplete;
      if (field.mask) {
        input.setAttribute("inputmode", "numeric");
        input.maxLength = field.mask.length;
      }
      input.className = "form-control";
      input.id = inputId;
      input.value = guest[field.key] || "";
      if (field.required) input.required = true;

      input.addEventListener("input", e => {
        if (field.mask) e.target.value = applyMask(e.target.value, field.mask);
        attendingList[index][field.key] = e.target.value;
        clearError(index, field);
      });
      input.addEventListener("blur", () => showError(index, field));

      fs.appendChild(input);
      col.appendChild(fs);
      row.appendChild(col);
    });

    attendingEl.appendChild(row);
  });

  renderMultiNameRow();
}

function renderMultiNameRow() {
  const multiRow = document.getElementById("multiNameRow");
  const removeSlot = document.getElementById("removeSlot");

  multiRow.hidden = !EVENT.allow_multiple_names;
  removeSlot.innerHTML = "";

  /* No original o botao Remover so aparece com mais de um convidado e remove
     sempre o ultimo bloco (removeAttending() nao recebe indice).             */
  if (attendingList.length > 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-default m-t-10";
    btn.innerHTML = '<i class="fa fa-minus"></i> Remover';
    btn.addEventListener("click", () => {
      attendingList.pop();
      renderGuests();
    });
    removeSlot.appendChild(btn);
  }
}

function showError(index, field) {
  const err = document.getElementById("err-" + index + "-" + field.key);
  const input = document.getElementById("f-" + index + "-" + field.key);
  if (!err || !input) return;
  const msg = fieldError(field, attendingList[index][field.key]);
  if (!msg) { clearError(index, field); return; }
  err.textContent = msg;
  err.hidden = false;
  input.closest("fieldset").classList.add("has-error");
}

function clearError(index, field) {
  const err = document.getElementById("err-" + index + "-" + field.key);
  const input = document.getElementById("f-" + index + "-" + field.key);
  if (!err || !input) return;
  err.hidden = true;
  input.closest("fieldset").classList.remove("has-error");
}

function validateAll() {
  let firstInvalid = null;
  attendingList.forEach((guest, index) => {
    activeFields.forEach(field => {
      showError(index, field);
      if (!firstInvalid && fieldError(field, guest[field.key])) {
        firstInvalid = document.getElementById("f-" + index + "-" + field.key);
      }
    });
  });
  return firstInvalid;
}

/* ============================ Cabecalho do evento ========================= */
function renderEventInfo() {
  document.getElementById("eventName").textContent = EVENT.event_name;
  document.getElementById("placeName").textContent = EVENT.place_name;
  document.getElementById("listName").textContent = EVENT.list_name;
  document.getElementById("listDescription").textContent = EVENT.list_description || "";


  const d = new Date(EVENT.start_date);
  const pad = n => String(n).padStart(2, "0");

  /* O original imprime o dia da semana em INGLES dentro de um .text-capitalize
     (locale nao configurado no app deles). Comportamento replicado.          */
  document.getElementById("eventWeekday").textContent =
    " " + d.toLocaleDateString("en-US", { weekday: "long" });
  document.getElementById("eventDate").textContent =
    pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " às " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + " ";

  const url = EVENT.share_url || window.location.href;
  const whats = document.getElementById("shareWhats");
  const fb = document.getElementById("shareFacebook");
  const tw = document.getElementById("shareTwitter");
  whats.href = "whatsapp://send?text=" + encodeURIComponent(url);
  fb.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url);
  tw.href = "https://twitter.com/intent/tweet?url=" + encodeURIComponent(url);
  fb.target = "_blank"; fb.rel = "noopener";
  tw.target = "_blank"; tw.rel = "noopener";

  /* Um unico lugar define o titulo: EVENTO.nome. Aba, og: e twitter: seguem. */
  document.title = EVENT.event_name;
  document.getElementById("ogTitle").content = EVENT.event_name;
  document.getElementById("ogSite").content = EVENT.event_name;
  document.getElementById("twTitle").content = EVENT.event_name;
}

/* ========================= Cards de grupo (WhatsApp) ======================
   Um card por item de GRUPOS. Sem link configurado, o botao nasce desligado:
   e melhor um CTA visivelmente morto do que um verde que nao leva a lugar
   nenhum - o clique frustrado custa mais caro que o botao apagado.          */
function renderGrupos() {
  const wrap = document.getElementById("gruposCards");
  document.getElementById("gruposTitulo").textContent = GRUPOS_TITULO;
  wrap.innerHTML = "";

  const semLink = [];

  GRUPOS.forEach((grupo, i) => {
    const card = document.createElement("div");
    card.className = "group-card";

    /* --- foto (ou placeholder) + selo circular --- */
    const photo = document.createElement("div");
    photo.className = "group-photo" + (grupo.ajuste === "contain" ? " is-contain" : "");
    /* Quadro na cor de fundo da propria imagem: sem emenda visivel na borda. */
    if (grupo.fundo) photo.style.background = grupo.fundo;

    if (grupo.foto) {
      const img = document.createElement("img");
      img.src = grupo.foto;
      img.alt = grupo.titulo || "Grupo de WhatsApp";
      img.loading = "lazy";
      /* Se a imagem nao carregar, cai no placeholder em vez do icone quebrado. */
      img.addEventListener("error", () => {
        img.remove();
        photo.insertAdjacentHTML("afterbegin",
          '<div class="group-photo-empty"><i class="fa fa-image"></i></div>');
      });
      photo.appendChild(img);
    } else {
      photo.innerHTML = '<div class="group-photo-empty"><i class="fa fa-users"></i></div>';
    }

    card.appendChild(photo);

    /* --- titulo e apoio --- */
    const h = document.createElement("h3");
    h.textContent = grupo.titulo || "Grupo " + (i + 1);
    card.appendChild(h);

    if (grupo.descricao) {
      const p = document.createElement("p");
      p.textContent = grupo.descricao;
      card.appendChild(p);
    }

    /* --- CTA --- */
    const rotulo = grupo.botao || "Entrar no grupo";
    const link = (grupo.link || "").trim();
    let cta;

    if (link) {
      cta = document.createElement("a");
      cta.href = link;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      cta.setAttribute("aria-label", rotulo + " - " + (grupo.titulo || ""));
    } else {
      cta = document.createElement("span");
      cta.setAttribute("aria-disabled", "true");
      semLink.push(grupo.titulo || "Grupo " + (i + 1));
    }

    cta.className = "group-cta" + (link ? "" : " is-disabled");
    cta.innerHTML = '<i class="fa fa-whatsapp" aria-hidden="true"></i>';
    cta.appendChild(document.createTextNode(link ? rotulo : "Link nao configurado"));
    card.appendChild(cta);

    wrap.appendChild(card);
  });

  if (semLink.length) {
    console.warn("[CloneVipMe] Sem link de WhatsApp: " + semLink.join(", ") +
      '. Preencha "link" em GRUPOS para ativar o botao.');
  }
}

/* =============================== Envio ==================================== */
function buildPayload() {
  /* So o que a planilha realmente usa. Nome da lista, local e produtora ficam
     de fora: aparecem na pagina (ou em lugar nenhum) e nao precisam viajar.
     Tambem nao mando os ids internos da Vipme - reaproveitando esta pagina
     para outros eventos eles ficariam desatualizados, e id errado na planilha
     e pior do que id nenhum. O evento e identificado pelo titulo + data.     */
  return {
    event_name: EVENT.event_name,
    event_date: EVENT.start_date,
    submitted_at: new Date().toISOString(),
    page_url: window.location.href,
    guests: attendingList.map(g => {
      const out = {};
      activeFields.forEach(f => { out[f.key] = (g[f.key] || "").trim(); });
      return out;
    })
  };
}

async function sendToSheet(payload) {
  if (!SHEET_ENDPOINT) {
    /* Modo offline: guarda localmente para voce testar antes de conectar. */
    const store = JSON.parse(localStorage.getItem("vipme_submissions") || "[]");
    store.push(payload);
    localStorage.setItem("vipme_submissions", JSON.stringify(store));
    console.group("[CloneVipMe] SHEET_ENDPOINT vazio - nada foi enviado de verdade.");
    console.log("Payload que seria enviado:", payload);
    console.log("Historico local (localStorage.vipme_submissions):", store);
    console.groupEnd();
    return { offline: true };
  }

  /* text/plain evita o preflight CORS, que o Google Apps Script nao responde.
     No Apps Script leia com JSON.parse(e.postData.contents).                  */
  const res = await fetch(SHEET_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error("Falha ao enviar (HTTP " + res.status + ")");

  const bruto = await res.text();
  console.log("[CloneVipMe] Resposta do Apps Script:", bruto);

  let data;
  try {
    data = JSON.parse(bruto);
  } catch (e) {
    /* Resposta que nao e JSON quase sempre e a tela de login/erro do Google:
       a implantacao nao esta como "Qualquer pessoa". */
    throw new Error("O servidor nao respondeu em JSON. Confira se a implantacao " +
                    'esta como "Qualquer pessoa". Resposta: ' + bruto.slice(0, 120));
  }

  /* O Apps Script responde HTTP 200 mesmo quando recusa o envio (ex: o guarda
     de cabecalho da planilha disparou). Sem esta checagem a pagina mostrava
     "Nome enviado!" e nada era gravado - falha silenciosa, a pior de todas.  */
  if (data && data.ok === false) {
    throw new Error(data.error || "O script recusou o envio.");
  }
  if (data && typeof data.inserted === "number" && data.inserted === 0) {
    throw new Error("O script respondeu, mas gravou 0 linhas.");
  }

  return data;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* Replica o modal de sucesso do original (SweetAlert2 + lista de nomes). */
function showSuccess(names) {
  Swal.fire({
    title: names.length > 1 ? "Nomes enviados" : "Nome enviado",
    html: names
      .map(n => '<div class="swal-name-item"><i class="fa fa-check text-success"></i> ' + escapeHtml(n) + "</div>")
      .join(""),
    icon: "success",
    confirmButtonColor: "#FF4D00"
  });
}

/* ================================ Bind ==================================== */
document.getElementById("btnAdd").addEventListener("click", () => {
  attendingList.push(blankGuest());
  renderGuests();
  const last = attendingEl.lastElementChild;
  const firstInput = last && last.querySelector("input");
  if (firstInput) firstInput.focus();
});

document.getElementById("guestForm").addEventListener("submit", async e => {
  e.preventDefault();

  const firstInvalid = validateAll();
  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const btn = e.target.querySelector(".btn-send-data");
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Enviando...";

  const payload = buildPayload();

  try {
    const result = await sendToSheet(payload);
    showSuccess(payload.guests.map(g => g.name || "(sem nome)"));
    if (result && result.offline) {
      console.info("[CloneVipMe] Sucesso simulado. Preencha SHEET_ENDPOINT para enviar de verdade.");
    }
    attendingList = [blankGuest()];
    renderGuests();
  } catch (err) {
    Swal.fire({
      title: "",
      text: err.message || "Não foi possível enviar.",
      icon: "error",
      confirmButtonColor: "#FF4D00"
    });
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
});

/* =============================== Boot ===================================== */
renderEventInfo();
renderGrupos();
attendingList = [blankGuest()];
renderGuests();
