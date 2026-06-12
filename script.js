// Cole aqui a URL do seu Google Apps Script após configurar
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwVdqrdavJvJgaLW-0d0xypUjy-MwJHDcl79zTGrxiYNyYLBs7NvNVsmVLfUG2weAD5YA/exec";
const SENHA_ACESSO = "logoscontabil26";

let alunoNome  = "";
let alunoEmail = "";

function verificarSenha() {
  const senha = document.getElementById("inputSenha").value.trim();
  const erro  = document.getElementById("senhaErro");
  if (senha === SENHA_ACESSO) {
    document.getElementById("senha").style.display = "none";
    document.getElementById("intro").style.display = "block";
  } else {
    erro.innerText = "Senha incorreta. Tente novamente.";
    document.getElementById("inputSenha").value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inputSenha = document.getElementById("inputSenha");
  if (inputSenha) {
    inputSenha.addEventListener("keydown", (e) => {
      if (e.key === "Enter") verificarSenha();
    });
  }
});

function mostrarCadastro() {
  document.getElementById("intro").style.display = "none";
  document.getElementById("registro").style.display = "block";
}

function iniciarComCadastro() {
  const nome  = document.getElementById("inputNome").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const erro  = document.getElementById("cadastroErro");

  if (!nome)  { erro.innerText = "Por favor, informe seu nome."; return; }
  if (!email || !email.includes("@")) { erro.innerText = "Por favor, informe um e-mail válido."; return; }

  erro.innerText = "";
  alunoNome  = nome;
  alunoEmail = email;

  document.getElementById("registro").style.display = "none";
  document.getElementById("game").style.display = "grid";
  initSaldosM1();
}

function startGame() {
  document.getElementById("intro").style.display = "none";
  document.getElementById("game").style.display = "grid";
  initSaldosM1();
}

let usedCards = new Set();
let mission = 1;
const MAX_MISSIONS = 6;

// ── Saldos herdados do Módulo 1 ──────────────────────────────
let ativoTotal           = 120000; // Banco 60.000 + Estoques 60.000
let passivoTotal         = 20000;  // Fornecedores
let capitalSocial        = 100000;
let capitalAIntegralizar = 0;
let plTotal              = 100000;

// Pontuação
let score = 0;
let wrongAttemptsPerCard = {};

// Explicações
const explanations = {
  veiculos10000:
    "Os <strong>Veículos</strong> são um <strong>Ativo Imobilizado</strong> — bem de longa duração que pertence à empresa.",
  financiamento10000:
    "O <strong>Financiamento a Pagar</strong> é um <strong>Passivo</strong> — representa a dívida assumida com a financeira para comprar o carro.",
  fornecedoresPag500:
    "Os <strong>Fornecedores</strong> são um <strong>Passivo</strong> — ao pagar a dívida, esse valor é baixado (reduzido) do Passivo.",
  bancoPag500:
    "O <strong>Banco Conta Movimento</strong> é um <strong>Ativo</strong> — o pagamento reduz o saldo disponível na conta bancária.",
  estoques1000:
    "Os <strong>Estoques</strong> são um <strong>Ativo</strong> — nova compra de mercadoria aumenta o estoque da empresa.",
  fornecedores1000:
    "Os <strong>Fornecedores</strong> são um <strong>Passivo</strong> — a compra a prazo gera nova obrigação com o fornecedor.",
  clientesReceber2000:
    "Os <strong>Clientes a Receber</strong> são um <strong>Ativo</strong> — a venda a prazo gera um direito de recebimento futuro. A parte da receita será estudada no próximo módulo.",
  estoquesBaixa2000:
    "Os <strong>Estoques</strong> são um <strong>Ativo</strong> — ao vender a mercadoria, o estoque é reduzido pois saiu da empresa.",
  bancoReceb2000:
    "O <strong>Banco Conta Movimento</strong> é um <strong>Ativo</strong> — o recebimento do cliente aumenta o saldo bancário.",
  clientesBaixa2000:
    "Os <strong>Clientes a Receber</strong> são um <strong>Ativo</strong> — após o recebimento, a duplicata é baixada pois a dívida foi quitada.",
  fornecedoresPag8000:
    "Os <strong>Fornecedores</strong> são um <strong>Passivo</strong> — o pagamento reduz a obrigação da empresa com o fornecedor.",
  bancoPag8000:
    "O <strong>Banco Conta Movimento</strong> é um <strong>Ativo</strong> — o pagamento reduz o saldo disponível na conta bancária."
};

function format(v) { return v.toLocaleString("pt-BR"); }
function $(id)     { return document.getElementById(id); }

// Pré-carrega o balanço do Módulo 1 nos quadros
function initSaldosM1() {
  addItem("ativoItems",   "Banco Conta Movimento\nR$ 60.000");
  addItem("ativoItems",   "Estoques\nR$ 60.000");
  addItem("passivoItems", "Fornecedores\nR$ 20.000");
  addItem("plItems",      "Capital Social\nR$ 100.000");
  updateBalance();
}

function allowDrop(event) { event.preventDefault(); }
function drag(event) { event.dataTransfer.setData("id", event.currentTarget.id); }

let selectedCardId = null;

function selectCard(id) {
  selectedCardId = id;
  document.querySelectorAll(".card").forEach(c => c.classList.remove("card-selected"));
  const card = $(id);
  if (card) card.classList.add("card-selected");
  $("feedback").innerHTML = "Agora toque no quadro correto.";
}

function tapDrop(targetSide) {
  if (!selectedCardId) return;
  const fakeEvent = {
    preventDefault: () => {},
    dataTransfer: { getData: () => selectedCardId }
  };
  drop(fakeEvent, targetSide);
  selectedCardId = null;
}

function createCard(id, label, value, correct, action) {
  return `
    <div class="card" draggable="true"
      onclick="selectCard('${id}')"
      ondragstart="drag(event)"
      id="${id}"
      data-correct="${correct}"
      data-action="${action}"
      data-value="${value}">
      ${label}<br>R$ ${format(value)}
    </div>
  `;
}

function loadMission() {
  usedCards.clear();
  wrongAttemptsPerCard = {};
  $("cards").innerHTML = "";
  $("feedback").innerHTML = "Toque (ou arraste) uma conta e depois toque no quadro correto.";
  $("nextBtn").disabled = true;
  $("explanation").style.display = "none";
  $("explanation").innerHTML = "";

  if (mission === 1) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 1 de ${MAX_MISSIONS}</h2>
      <p><strong>A empresa comprou um carro financiado no valor de R$ 10.000.</strong></p>
      <p>Classifique as duas contas corretamente.</p>`;
    $("cards").innerHTML =
      createCard("veiculos", "Veículos", 10000, "ativo", "veiculos10000") +
      createCard("financiamento", "Financiamento a Pagar", 10000, "passivo", "financiamento10000");
  }

  if (mission === 2) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 2 de ${MAX_MISSIONS}</h2>
      <p><strong>A empresa pagou R$ 500 de fornecedores em dinheiro.</strong></p>
      <p>⚠️ Atenção: nesta missão as duas contas são <em>reduzidas</em>.</p>`;
    $("cards").innerHTML =
      createCard("fornecedoresPag", "Fornecedores", 500, "passivo", "fornecedoresPag500") +
      createCard("bancoPag", "Banco Conta Movimento", 500, "ativo", "bancoPag500");
  }

  if (mission === 3) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 3 de ${MAX_MISSIONS}</h2>
      <p><strong>A empresa comprou R$ 1.000 em mercadorias a prazo.</strong></p>
      <p>Classifique as duas contas corretamente.</p>`;
    $("cards").innerHTML =
      createCard("estoques1000", "Estoques", 1000, "ativo", "estoques1000") +
      createCard("fornecedores1000", "Fornecedores", 1000, "passivo", "fornecedores1000");
  }

  if (mission === 4) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 4 de ${MAX_MISSIONS}</h2>
      <p><strong>A empresa vendeu R$ 2.000 em mercadorias a prazo.</strong></p>
      <p>⚠️ As duas contas pertencem ao <em>Ativo</em>: uma entra, a outra sai.</p>`;
    $("cards").innerHTML =
      createCard("clientes2000", "Clientes a Receber", 2000, "ativo", "clientesReceber2000") +
      createCard("estoquesBaixa", "Estoques", 2000, "ativo", "estoquesBaixa2000");
  }

  if (mission === 5) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 5 de ${MAX_MISSIONS}</h2>
      <p><strong>O cliente pagou os R$ 2.000 da venda a prazo.</strong></p>
      <p>⚠️ As duas contas pertencem ao <em>Ativo</em>: uma entra, a outra sai.</p>`;
    $("cards").innerHTML =
      createCard("bancoReceb", "Banco Conta Movimento", 2000, "ativo", "bancoReceb2000") +
      createCard("clientesBaixa", "Clientes a Receber", 2000, "ativo", "clientesBaixa2000");
  }

  if (mission === 6) {
    $("missionBox").innerHTML = `
      <h2>📖 Missão 6 de ${MAX_MISSIONS}</h2>
      <p><strong>A empresa pagou R$ 8.000 de obrigações em dinheiro.</strong></p>
      <p>⚠️ Atenção: nesta missão as duas contas são <em>reduzidas</em>.</p>`;
    $("cards").innerHTML =
      createCard("fornecedoresPag8000", "Fornecedores", 8000, "passivo", "fornecedoresPag8000") +
      createCard("bancoPag8000", "Banco Conta Movimento", 8000, "ativo", "bancoPag8000");
  }

  updateBalance();
}

function drop(event, targetSide) {
  event.preventDefault();
  const id   = event.dataTransfer.getData("id");
  const card = $(id);
  if (!card || usedCards.has(id)) return;

  const correct = card.dataset.correct;
  const action  = card.dataset.action;
  const value   = Number(card.dataset.value);
  const name    = card.innerText;

  if (targetSide !== correct) {
    wrongAttemptsPerCard[id] = (wrongAttemptsPerCard[id] || 0) + 1;
    showError(name);
    const boxErro = document.getElementById(targetSide + "Box");
    if (boxErro) {
      boxErro.classList.add("erro-drop");
      setTimeout(() => boxErro.classList.remove("erro-drop"), 900);
    }
    return;
  }

  const erros  = wrongAttemptsPerCard[id] || 0;
  const pontos = erros === 0 ? 10 : erros === 1 ? 7 : 5;
  score += pontos;
  showPontosGanhos(pontos);
  showExplanation(action);
  usedCards.add(id);
  card.remove();

  if (action === "veiculos10000")       { ativoTotal += value;  addItem("ativoItems", name); }
  if (action === "financiamento10000")  { passivoTotal += value; addItem("passivoItems", name); }
  if (action === "fornecedoresPag500")  { passivoTotal -= value; addItem("passivoItems", "(-) " + name.split("\n")[0] + "\nR$ " + format(value), true); }
  if (action === "bancoPag500")         { ativoTotal -= value;   addItem("ativoItems",   "(-) " + name.split("\n")[0] + "\nR$ " + format(value), true); }
  if (action === "estoques1000")        { ativoTotal += value;   addItem("ativoItems", name); }
  if (action === "fornecedores1000")    { passivoTotal += value; addItem("passivoItems", name); }
  if (action === "clientesReceber2000") { ativoTotal += value;   addItem("ativoItems", name); }
  if (action === "estoquesBaixa2000")   { ativoTotal -= value;   addItem("ativoItems",   "(-) " + name.split("\n")[0] + "\nR$ " + format(value), true); }
  if (action === "bancoReceb2000")      { ativoTotal += value;   addItem("ativoItems", name); }
  if (action === "clientesBaixa2000")   { ativoTotal -= value;   addItem("ativoItems",   "(-) " + name.split("\n")[0] + "\nR$ " + format(value), true); }
  if (action === "fornecedoresPag8000") { passivoTotal -= value; addItem("passivoItems", "(-) " + name.split("\n")[0] + "\nR$ " + format(value), true); }
  if (action === "bancoPag8000")        { ativoTotal -= value;   addItem("ativoItems",   "(-) " + name.split("\n")[0] + "\nR$ " + format(value), true); }

  updateBalance();
  checkMissionComplete();
}

function checkMissionComplete() {
  if (usedCards.size >= 2) {
    if (mission < MAX_MISSIONS) {
      $("feedback").innerHTML = "✅ Missão concluída! Veja a explicação abaixo.";
      $("nextBtn").disabled = false;
      $("nextBtn").innerText = "➡ Próxima Missão";
    } else {
      $("feedback").innerHTML = "✅ Módulo 2 concluído!";
      $("nextBtn").disabled = false;
      $("nextBtn").innerText = "🏆 Ver Resultado Final";
    }
  }
}

function showPontosGanhos(pontos) {
  const el = document.createElement("div");
  el.className = "pontos-ganhos";
  el.innerText = "+" + pontos + " pts";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function showExplanation(action) {
  const texto = explanations[action];
  if (!texto) return;
  const el = $("explanation");
  el.style.display = "block";
  el.innerHTML = "💡 " + texto;
}

// Agrupa entradas por conta com subtotal
const areaGroups = {};

function parseAmount(text) {
  const match = text.match(/R\$\s*([\d.]+)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/\./g, "")) || 0;
}

function addItem(areaId, text, redutora = false) {
  const lines       = text.split("\n");
  const accountName = lines[0].replace("(-) ", "").trim();
  const isReduction = lines[0].startsWith("(-)");
  const amount      = parseAmount(lines[1] || lines[0]);
  const groupKey    = areaId + "|" + accountName;

  if (!areaGroups[groupKey]) {
    // Criar novo grupo para esta conta
    const groupEl = document.createElement("div");
    groupEl.className = "account-group inside";

    const titleEl = document.createElement("div");
    titleEl.className = "account-group-name";
    titleEl.innerText = accountName;
    groupEl.appendChild(titleEl);

    const entriesEl = document.createElement("div");
    entriesEl.className = "account-entries";
    groupEl.appendChild(entriesEl);

    const subtotalEl = document.createElement("div");
    subtotalEl.className = "account-subtotal";
    groupEl.appendChild(subtotalEl);

    $(areaId).appendChild(groupEl);
    areaGroups[groupKey] = { entriesEl, subtotalEl, total: 0, accountName };
  }

  const group = areaGroups[groupKey];

  // Adicionar entrada
  const entryEl = document.createElement("div");
  entryEl.className = isReduction ? "account-entry entry-redutora" : "account-entry entry-normal";
  entryEl.innerText = (isReduction ? "(−) R$ " : "+ R$ ") + format(amount);
  group.entriesEl.appendChild(entryEl);

  // Atualizar subtotal
  group.total += isReduction ? -amount : amount;
  if (group.entriesEl.children.length > 1) {
    group.subtotalEl.innerText = "Subtotal: R$ " + format(group.total);
    group.subtotalEl.style.display = "block";
  } else {
    group.subtotalEl.style.display = "none";
  }
}

function updateBalance() {
  plTotal = capitalSocial - capitalAIntegralizar;
  const ladoDireito = passivoTotal + plTotal;

  const pplt = $("passivoPLTotal");
  if (pplt) pplt.innerText = format(ladoDireito);

  $("ativoTotal").innerText    = format(ativoTotal);
  $("passivoTotal").innerText  = format(passivoTotal);
  $("plTotal").innerText       = format(plTotal);
  $("ativoEq").innerText       = format(ativoTotal);
  $("ladoDireitoEq").innerText = format(ladoDireito);

  const diff  = ativoTotal - ladoDireito;
  const angle = Math.max(Math.min(diff / 300, 28), -28);
  $("beam").style.transform = `rotate(${-angle}deg)`;

  const balanceArea = document.querySelector(".balance-area");
  if (diff !== 0) {
    balanceArea.classList.remove("balanca-vibrar");
    void balanceArea.offsetWidth;
    balanceArea.classList.add("balanca-vibrar");
    // Vibração háptica para Android
    if (navigator.vibrate) navigator.vibrate([150, 80, 150]);
  } else {
    balanceArea.classList.remove("balanca-vibrar");
  }

  ["ativoBox","passivoBox","plBox"].forEach(pid => {
    $(pid).classList.remove("destaque-ativo","destaque-passivo","destaque-equilibrado");
  });

  if (diff > 0)      { $("ativoBox").classList.add("destaque-ativo"); }
  else if (diff < 0) { $("passivoBox").classList.add("destaque-passivo"); $("plBox").classList.add("destaque-passivo"); }
  else               { ["ativoBox","passivoBox","plBox"].forEach(pid => $(pid).classList.add("destaque-equilibrado")); }
}

function showError(name) {
  $("feedback").innerHTML = `❌ Atenção! Revise a classificação de ${name.split("\n")[0]}.`;
}

function nextMission() {
  if (mission < MAX_MISSIONS) { mission++; loadMission(); }
  else showFinalResult();
}

function showFinalResult() {
  const existing = document.querySelector(".resultado-final");
  if (existing) existing.remove();
  $("game").style.display = "none";

  // Envia resultado para o Google Sheets
  if (GOOGLE_SHEET_URL !== "SUA_URL_AQUI") {
    const agora = new Date();
    const data  = agora.toLocaleDateString("pt-BR") + " " + agora.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
    const payload = {
      modulo: "Módulo 2",
      nome:   alunoNome,
      email:  alunoEmail,
      pontos: score + " / " + (MAX_MISSIONS * 2 * 10),
      data:   data
    };
    fetch(GOOGLE_SHEET_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }

  const maxScore = MAX_MISSIONS * 2 * 10;
  const percent  = Math.round((score / maxScore) * 100);

  let medal = "", msg = "";
  if (percent === 100)    { medal = "🥇"; msg = "Perfeito! Você acertou tudo de primeira!"; }
  else if (percent >= 70) { medal = "🥈"; msg = "Muito bem! Você domina os conceitos!"; }
  else                    { medal = "🥉"; msg = "Continue praticando! Você está evoluindo!"; }

  const equilibrado = ativoTotal === (passivoTotal + plTotal);

  const finalDiv = document.createElement("div");
  finalDiv.className = "resultado-final";
  finalDiv.innerHTML = `
    <h1>⚖️ Resultado — Módulo 2</h1>
    <div class="resultado-medal">${medal}</div>
    <div class="resultado-pontos">${score} / ${maxScore} pontos</div>
    <p class="resultado-msg">${msg}</p>

    <div class="resultado-balanco">
      <h2>📊 Balanço Patrimonial Final</h2>
      <div class="balanco-grid">

        <div class="balanco-col">
          <h3>ATIVO</h3>
          <div class="balanco-item">Total Ativo<br><strong>R$ ${format(ativoTotal)}</strong></div>
        </div>

        <div class="balanco-col-direita">
          <div class="balanco-subcol">
            <h3>PASSIVO</h3>
            <div class="balanco-item">Total Passivo<br><strong>R$ ${format(passivoTotal)}</strong></div>
          </div>
          <div class="balanco-subcol">
            <h3>PL</h3>
            <div class="balanco-item">Total do PL<br><strong>R$ ${format(plTotal)}</strong></div>
          </div>
        </div>

      </div>
      <div class="balanco-equacao ${equilibrado ? 'equilibrado' : ''}">
        Ativo: R$ ${format(ativoTotal)} ${equilibrado ? "= ✅" : "≠ ⚠️"} Passivo+PL: R$ ${format(passivoTotal + plTotal)}
      </div>
    </div>

    <button onclick="resetGame()">🔄 Jogar Novamente</button>
  `;
  document.body.appendChild(finalDiv);
}

function resetGame() {
  mission              = 1;
  ativoTotal           = 120000;
  passivoTotal         = 20000;
  capitalSocial        = 100000;
  capitalAIntegralizar = 0;
  plTotal              = 100000;
  score                = 0;
  wrongAttemptsPerCard = {};
  usedCards.clear();

  const fin = document.querySelector(".resultado-final");
  if (fin) fin.remove();

  $("ativoItems").innerHTML    = "";
  $("passivoItems").innerHTML  = "";
  $("plItems").innerHTML       = "";
  $("redutoraItems").innerHTML = "";
  // Limpar grupos ao reiniciar
  Object.keys(areaGroups).forEach(k => delete areaGroups[k]);
  $("redutoraArea").style.display = "none";
  $("nextBtn").innerText = "➡ Próxima Missão";
  $("game").style.display = "grid";

  initSaldosM1();
  loadMission();
}

loadMission();
initTouchDrag();

// ── Touch Drag ───────────────────────────────────────────────
let touchDragCard = null;
let touchClone    = null;

function initTouchDrag() {
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove',  onTouchMove,  { passive: false });
  document.addEventListener('touchend',   onTouchEnd,   { passive: false });
}

function onTouchStart(e) {
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  touchDragCard = card;
  const touch = e.touches[0];
  const cloneWidth = Math.min(card.offsetWidth, 120);
  touchClone = card.cloneNode(true);
  touchClone.style.cssText = `
    position:fixed;
    width:${cloneWidth}px;
    left:${touch.clientX - cloneWidth / 2}px;
    top:${touch.clientY - 30}px;
    opacity:0.88; pointer-events:none; z-index:9999;
    transform:rotate(2deg);
    box-shadow:0 8px 24px rgba(0,0,0,0.3);
    border-radius:10px; background:#dbeafe; border:2px solid #3b82f6;
    font-size:11px;
  `;
  document.body.appendChild(touchClone);
  card.style.opacity = '0.35';
}

function onTouchMove(e) {
  if (!touchDragCard) return;
  e.preventDefault();
  const touch = e.touches[0];
  touchClone.style.left = (touch.clientX - touchClone.offsetWidth  / 2) + 'px';
  touchClone.style.top  = (touch.clientY - touchClone.offsetHeight / 2 - 10) + 'px';
  ['ativoBox','passivoBox','plBox'].forEach(pid => {
    const el = $(pid); if (!el) return;
    const r = el.getBoundingClientRect();
    el.classList.toggle('hover-drop',
      touch.clientX >= r.left && touch.clientX <= r.right &&
      touch.clientY >= r.top  && touch.clientY <= r.bottom);
  });
}

function onTouchEnd(e) {
  if (!touchDragCard) return;
  const touch = e.changedTouches[0];
  if (touchClone) { touchClone.remove(); touchClone = null; }
  touchDragCard.style.opacity = '1';
  ['ativoBox','passivoBox','plBox'].forEach(pid => { const el=$(pid); if(el) el.classList.remove('hover-drop'); });

  const sideMap = { ativoBox:'ativo', passivoBox:'passivo', plBox:'pl' };
  let targetSide = null;
  for (const [pid, side] of Object.entries(sideMap)) {
    const el = $(pid); if (!el) continue;
    const r = el.getBoundingClientRect();
    if (touch.clientX >= r.left && touch.clientX <= r.right &&
        touch.clientY >= r.top  && touch.clientY <= r.bottom) { targetSide = side; break; }
  }
  if (targetSide) {
    drop({ preventDefault:()=>{}, dataTransfer:{ getData:()=>touchDragCard.id } }, targetSide);
  }
  touchDragCard = null;
}
