# ListaNight (CloneVipMe)

Página de lista de convidados para eventos, no estilo Vipme. O visitante preenche
os dados, o formulário valida e envia para uma planilha do Google Sheets via
Google Apps Script.

## Estrutura

```
.
├── index.html          # Marcação da página
├── styles.css          # Estilos (grid Bootstrap 3 + componentes Vipme + cards)
├── app.js              # Lógica: config do evento, validação, envio, cards de grupo
├── apps-script/
│   └── Codigo.gs       # Backend do Google Apps Script (recebe e grava na planilha)
├── logo_tickethub.png  # Imagem do card de grupo "TicketHub"
└── Offs_Logo.png       # Imagem do card de grupo "OFFS BH"
```

## Como configurar um evento

Edite o bloco **`EDITE AQUI`** no topo de `app.js`:

- `EVENTO` — nome, lista, local, data/hora, aviso, vários nomes, link de divulgação.
- `GRUPOS` — os dois cards de grupo de WhatsApp (título, descrição, foto, link).
- `CAMPOS` — quais campos do formulário aparecem (nome, telefone, nascimento).
- `SHEET_ENDPOINT` — URL `/exec` do Web App do Apps Script. Vazio = modo teste
  (grava só no `localStorage` e no console, sem enviar nada).

## Backend (Google Apps Script)

As instruções de instalação estão no cabeçalho de `apps-script/Codigo.gs`
(5 passos: colar o código, ajustar a aba, implantar como App da Web para
"Qualquer pessoa" e colar a URL `/exec` em `SHEET_ENDPOINT`).

## Rodar localmente

É um site estático. Basta abrir `index.html` no navegador, ou servir a pasta:

```bash
python -m http.server 8000
```

## Aviso de segurança

Este projeto embute, no cliente, a URL do endpoint do Apps Script e os links
dos grupos de WhatsApp — eles são visíveis para qualquer visitante do site.
O `SPREADSHEET_ID` em `apps-script/Codigo.gs` identifica sua planilha; mantenha
o compartilhamento dela restrito. Prefira manter este repositório **privado**.
