/**
 * CloneVipMe - receptor de inscricoes na planilha
 * ---------------------------------------------------------------------------
 * Como instalar (5 passos):
 *
 *  1. Abra a planilha do Google Sheets que vai receber os nomes.
 *  2. Menu Extensoes > Apps Script. Apague o conteudo e cole este arquivo.
 *  3. Ajuste SHEET_NAME abaixo se quiser outra aba (ela e criada sozinha).
 *  4. Implantar > Nova implantacao > tipo "App da Web":
 *        Executar como.......: Eu (sua conta)
 *        Quem pode acessar...: Qualquer pessoa
 *     Autorize quando pedir. Copie a URL /exec gerada.
 *  5. Cole essa URL em SHEET_ENDPOINT, no bloco EDITE AQUI do app.js.
 *
 * IMPORTANTE ao ATUALIZAR: salvar o codigo no editor NAO altera o que esta no
 * ar. Depois de colar, va em Implantar > Gerenciar implantacoes > lapis >
 * Versao: "Nova versao" > Implantar. Sem isso o /exec continua servindo o
 * codigo antigo.
 *
 * Teste rapido: abra a URL /exec no navegador. Deve responder
 * {"ok":true,"service":"CloneVipMe"}.
 */

/**
 * Marcador de versao. Aparece ao abrir a URL /exec no navegador, e serve para
 * voce conferir em 2 segundos se a implantacao realmente pegou o codigo novo.
 * Salvar no editor NAO publica: so "Nova versao" em Gerenciar implantacoes.
 */
var SCRIPT_VERSION = 'v3-spreadsheet-id';

var SHEET_NAME = 'Lista Night Market';

/**
 * ID da planilha de destino.
 *
 * DEIXE VAZIO se este script foi criado de DENTRO da planilha
 * (Extensoes > Apps Script) - ele acha a planilha sozinho.
 *
 * PREENCHA se o script e avulso (criado em script.google.com). O ID esta na
 * URL da planilha, entre /d/ e /edit:
 *
 *   https://docs.google.com/spreadsheets/d/ISTO_AQUI_E_O_ID/edit#gid=0
 */
var SPREADSHEET_ID = '1fRtzSNO7r_bLhWq2AJCEGAgAq1epGYJVd9sP_6JuXaM';

/**
 * Colunas, na ordem em que aparecem na planilha.
 *
 * "Evento" vem logo depois da data para voce identificar a origem batendo o
 * olho, e para filtrar por evento quando a mesma pagina for reaproveitada.
 *
 * ATENCAO ao mexer nesta lista: o cabecalho da aba e escrito uma unica vez,
 * quando ela esta vazia. Se voce alterar as colunas depois que a aba ja tem
 * dados, o guarda em getSheet() trava os envios de proposito - a alternativa
 * seria gravar cada nome na coluna errada. Nesse caso, renomeie a aba antiga
 * e deixe o script criar uma nova com o cabecalho novo.
 */
var COLUMNS = [
  { header: 'Data/Hora',          get: function (p, g) { return formatTimestamp(p.submitted_at); } },
  { header: 'Evento',             get: function (p, g) { return p.event_name   || ''; } },
  { header: 'Nome',               get: function (p, g) { return g.name         || ''; } },
  { header: 'Telefone',           get: function (p, g) { return g.phone        || ''; } },
  { header: 'Data de nascimento', get: function (p, g) { return g.bday         || ''; } },
  { header: 'Data do evento',     get: function (p, g) { return formatEventDate(p.event_date); } },
  { header: 'Origem',             get: function (p, g) { return p.page_url     || ''; } }
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Corpo da requisicao vazio.' });
    }

    var payload = JSON.parse(e.postData.contents);
    var guests = (payload.guests && payload.guests.length) ? payload.guests : [payload];

    var sheet = getSheet();
    var rows = guests.map(function (g) {
      return COLUMNS.map(function (col) { return col.get(payload, g); });
    });

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, COLUMNS.length).setValues(rows);
    }

    return json({ ok: true, inserted: rows.length });

  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/**
 * Diagnostico. Abra a URL /exec no navegador para ver, de uma vez:
 * qual versao do codigo esta publicada, se a planilha esta acessivel e
 * quais colunas serao gravadas.
 */
function doGet() {
  var info = {
    ok: true,
    service: 'CloneVipMe',
    version: SCRIPT_VERSION,
    aba: SHEET_NAME,
    colunas: COLUMNS.map(function (c) { return c.header; })
  };

  /* Testa o acesso a planilha sem escrever nada. */
  try {
    info.planilha = getSpreadsheet().getName();
    info.planilha_ok = true;
  } catch (err) {
    info.planilha_ok = false;
    info.planilha_erro = String(err && err.message ? err.message : err);
  }

  return json(info);
}

/**
 * A planilha de destino, venha ela de onde vier.
 *
 * getActiveSpreadsheet() so funciona em script vinculado a uma planilha. Em
 * script avulso ele devolve null, e o erro que aparecia era o incompreensivel
 * "Cannot read properties of null". Aqui a mensagem diz o que fazer.
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error(
      'Este script nao esta vinculado a nenhuma planilha. Preencha ' +
      'SPREADSHEET_ID no topo do codigo com o ID que aparece na URL da sua ' +
      'planilha (entre /d/ e /edit), ou recrie o script por Extensoes > ' +
      'Apps Script de dentro da propria planilha.'
    );
  }

  return ss;
}

function getSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  var headers = COLUMNS.map(function (c) { return c.header; });

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }

  /* Guarda contra desalinhamento: se alguem mexeu em COLUMNS depois que a aba
     ja tinha dados, os nomes gravariam na coluna errada. Melhor falhar alto do
     que poluir a planilha em silencio. */
  var current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .slice(0, headers.length).join('|');

  if (current !== headers.join('|')) {
    throw new Error(
      'O cabecalho da aba "' + SHEET_NAME + '" nao bate com a lista COLUMNS. ' +
      'Nada foi gravado para nao desalinhar os dados. Renomeie a aba antiga e ' +
      'deixe o script criar uma nova, ou volte COLUMNS ao formato original.'
    );
  }

  return sheet;
}

/** ISO -> "dd/MM/yyyy HH:mm:ss" no fuso da planilha. Momento do envio. */
function formatTimestamp(iso) {
  var date = iso ? new Date(iso) : new Date();
  if (isNaN(date.getTime())) date = new Date();
  var tz = getSpreadsheet().getSpreadsheetTimeZone();
  return Utilities.formatDate(date, tz, 'dd/MM/yyyy HH:mm:ss');
}

/** ISO -> "dd/MM/yyyy HH:mm". Data do evento; devolve cru se nao der pra ler. */
function formatEventDate(iso) {
  if (!iso) return '';
  var date = new Date(iso);
  if (isNaN(date.getTime())) return String(iso);
  var tz = getSpreadsheet().getSpreadsheetTimeZone();
  return Utilities.formatDate(date, tz, 'dd/MM/yyyy HH:mm');
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
