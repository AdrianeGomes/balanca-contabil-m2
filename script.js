// =============================================
//  MÓDULO 3 — RAZONETES  |  Logos Concursos
// =============================================

const SENHA_ACESSO    = "logoscontabil26";
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwVdqrdavJvJgaLW-0d0xypUjy-MwJHDcl79zTGrxiYNyYLBs7NvNVsmVLfUG2weAD5YA/exec";

let alunoNome  = "";
let alunoEmail = "";
let score      = 0;
let currentLancamento = 0;
let placedCards       = new Set();
let wrongAttempts     = {};
let visibleRazonetes  = [];
let razoneteSaldos    = {};
let selectedCardId    = null;

// =============================================
//  DEFINIÇÕES DOS RAZONETES
// =============================================
const razoneteDefs = {
  capitalIntegralizar: { label: "Capital a Integralizar",   tipo: "pl-redutora" },
  capitalSocial:       { label: "Capital Social Subscrito", tipo: "pl"          },
  banco:               { label: "Banco Conta Movimento",    tipo: "ativo"       },
  estoques:            { label: "Estoques",                 tipo: "ativo"       },
  fornecedores:        { label: "Fornecedores",             tipo: "passivo"     },
  veiculos:            { label: "Veículos",                 tipo: "ativo"       },
  financiamento:       { label: "Financiamento a Pagar",    tipo: "passivo"     },
  clientes:            { label: "Clientes a Receber",       tipo: "ativo"       },
};

const tipoLabel = {
  "ativo":       "ATIVO",
  "passivo":     "PASSIVO",
  "pl":          "PL",
  "pl-redutora": "PL — Redutora"
};

// =============================================
//  LANÇAMENTOS (Módulos 1 e 2)
// =============================================
const lancamentos = [
  {
    id: 1,
    descricao: "Os sócios <strong>subscreveram Capital Social</strong> de R$&nbsp;100.000.",
    cards: [
      { id: "c1a", label: "Capital a Integralizar",   value: 100000, conta: "capitalIntegralizar", lado: "debito"  },
      { id: "c1b", label: "Capital Social Subscrito", value: 100000, conta: "capitalSocial",       lado: "credito" }
    ],
    novosRazonetes: ["capitalIntegralizar", "capitalSocial"],
    explicacao: "O <strong>Capital Social Subscrito</strong> entra a <strong>Crédito</strong> — aumenta o Patrimônio Líquido. O <strong>Capital a Integralizar</strong> entra a <strong>Débito</strong> — é uma conta redutora do PL que representa o valor ainda não depositado pelos sócios."
  },
  {
    id: 2,
    descricao: "Os sócios <strong>depositaram R$&nbsp;60.000</strong> na conta bancária da empresa.",
    cards: [
      { id: "c2a", label: "Banco Conta Movimento", value: 60000, conta: "banco",               lado: "debito"  },
      { id: "c2b", label: "Capital a Integralizar", value: 60000, conta: "capitalIntegralizar", lado: "credito" }
    ],
    novosRazonetes: ["banco"],
    explicacao: "O <strong>Banco Conta Movimento</strong> entra a <strong>Débito</strong> — o dinheiro entrou no Ativo. O <strong>Capital a Integralizar</strong> é reduzido a <strong>Crédito</strong> — parte do compromisso dos sócios foi cumprida."
  },
  {
    id: 3,
    descricao: "Os sócios integralizaram os <strong>R$&nbsp;40.000 restantes em mercadorias</strong>.",
    cards: [
      { id: "c3a", label: "Estoques",               value: 40000, conta: "estoques",            lado: "debito"  },
      { id: "c3b", label: "Capital a Integralizar", value: 40000, conta: "capitalIntegralizar", lado: "credito" }
    ],
    novosRazonetes: ["estoques"],
    explicacao: "Os <strong>Estoques</strong> entram a <strong>Débito</strong> — as mercadorias são um bem do Ativo. O <strong>Capital a Integralizar</strong> é zerado a <strong>Crédito</strong> — os sócios cumpriram todo o compromisso."
  },
  {
    id: 4,
    descricao: "A empresa <strong>comprou R$&nbsp;20.000 em estoques a prazo</strong>.",
    cards: [
      { id: "c4a", label: "Estoques",     value: 20000, conta: "estoques",     lado: "debito"  },
      { id: "c4b", label: "Fornecedores", value: 20000, conta: "fornecedores", lado: "credito" }
    ],
    novosRazonetes: ["fornecedores"],
    explicacao: "Os <strong>Estoques</strong> aumentam a <strong>Débito</strong>. Os <strong>Fornecedores</strong> entram a <strong>Crédito</strong> — a compra a prazo gera uma obrigação (Passivo)."
  },
  {
    id: 5,
    descricao: "A empresa <strong>comprou um carro financiado</strong> no valor de R$&nbsp;10.000.",
    cards: [
      { id: "c5a", label: "Veículos",               value: 10000, conta: "veiculos",      lado: "debito"  },
      { id: "c5b", label: "Financiamento a Pagar",  value: 10000, conta: "financiamento", lado: "credito" }
    ],
    novosRazonetes: ["veiculos", "financiamento"],
    explicacao: "O <strong>Veículo</strong> entra a <strong>Débito</strong> — é um bem do Ativo. O <strong>Financiamento a Pagar</strong> entra a <strong>Crédito</strong> — é uma dívida do Passivo."
  },
  {
    id: 6,
    descricao: "A empresa <strong>pagou R$&nbsp;500 de fornecedores</strong> com dinheiro do banco.",
    cards: [
      { id: "c6a", label: "Fornecedores",          value: 500, conta: "fornecedores", lado: "debito"  },
      { id: "c6b", label: "Banco Conta Movimento", value: 500, conta: "banco",        lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Fornecedores</strong> diminui a <strong>Débito</strong> — quitação parcial da dívida (Passivo diminui). <strong>Banco</strong> diminui a <strong>Crédito</strong> — saída de dinheiro (Ativo diminui)."
  },
  {
    id: 7,
    descricao: "A empresa <strong>comprou R$&nbsp;1.000 em mercadorias a prazo</strong>.",
    cards: [
      { id: "c7a", label: "Estoques",     value: 1000, conta: "estoques",     lado: "debito"  },
      { id: "c7b", label: "Fornecedores", value: 1000, conta: "fornecedores", lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Estoques</strong> aumentam a <strong>Débito</strong>. <strong>Fornecedores</strong> aumenta a <strong>Crédito</strong> — nova obrigação a prazo."
  },
  {
    id: 8,
    descricao: "A empresa <strong>vendeu R$&nbsp;2.000 em mercadorias a prazo</strong>.",
    cards: [
      { id: "c8a", label: "Clientes a Receber", value: 2000, conta: "clientes",  lado: "debito"  },
      { id: "c8b", label: "Estoques",           value: 2000, conta: "estoques",  lado: "credito" }
    ],
    novosRazonetes: ["clientes"],
    explicacao: "<strong>Clientes a Receber</strong> entra a <strong>Débito</strong> — direito de receber (Ativo). <strong>Estoques</strong> saem a <strong>Crédito</strong> — baixa da mercadoria vendida."
  },
  {
    id: 9,
    descricao: "O <strong>cliente pagou os R$&nbsp;2.000</strong> da venda a prazo.",
    cards: [
      { id: "c9a", label: "Banco Conta Movimento", value: 2000, conta: "banco",     lado: "debito"  },
      { id: "c9b", label: "Clientes a Receber",    value: 2000, conta: "clientes",  lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Banco</strong> aumenta a <strong>Débito</strong> — dinheiro entrou. <strong>Clientes a Receber</strong> é baixado a <strong>Crédito</strong> — o direito de receber foi extinto com o pagamento."
  },
  {
    id: 10,
    descricao: "A empresa <strong>pagou R$&nbsp;8.000 de obrigações</strong> com dinheiro do banco.",
    cards: [
      { id: "c10a", label: "Fornecedores",          value: 8000, conta: "fornecedores", lado: "debito"  },
      { id: "c10b", label: "Banco Conta Movimento", value: 8000, conta: "banco",        lado: "credito" }
    ],
    novosRazonetes: [],
    explicacao: "<strong>Fornecedores</strong> diminui a <strong>Débito</strong> — quitação de dívida (Passivo diminui). <strong>Banco</strong> diminui a <strong>Crédito</strong> — saída de dinheiro (Ativo diminui)."
  }
];

// =============================================
//  AUTENTICAÇÃO
// =============================================
function verificarSenha() {
  const senha = document.getElementById("inputSenha").value.trim();
  const erro  = document.getElementById("senhaErro");
  if (senha === SENHA_ACESSO) {
    document.getElementById("senha").style.display  = "none";
    document.getElementById("intro").style.display  = "block";
  } else {
    erro.innerText = "Senha incorreta. Tente novamente.";
    document.getElementById("inputSenha").value = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inp = document.getElementById("inputSenha");
  if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") verificarSenha(); });
});

// =============================================
//  TOUCH DRAG — arrastar no celular
// =============================================
let touchDragId  = null;
let touchClone   = null;
let touchStartX  = 0;
let touchStartY  = 0;

document.addEventListener("touchstart", e => {
  const card = e.target.closest(".card");
  if (!card || placedCards.has(card.id)) return;
  touchDragId = card.id;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  selectCard(card.id);
}, { passive: true });

document.addEventListener("touchmove", e => {
  if (!touchDragId) return;
  const dx = e.touches[0].clientX - touchStartX;
  const dy = e.touches[0].clientY - touchStartY;
  // Criar clone só quando o dedo se mover (arrastar de verdade)
  if (!touchClone && Math.sqrt(dx * dx + dy * dy) > 20) {
    const card = document.getElementById(touchDragId);
    if (card) {
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = `
        position: fixed; pointer-events: none; opacity: 0.9;
        z-index: 9999; width: ${card.offsetWidth}px;
        transform: scale(1.08); transition: none; border-radius: 8px;
      `;
      document.body.appendChild(touchClone);
    }
  }
  if (touchClone) {
    e.preventDefault(); // bloqueia scroll só quando clone já existe (arraste confirmado)
    moveTouchClone(e.touches[0]);
    autoScroll(e.touches[0].clientY);
  }
}, { passive: false });

document.addEventListener("touchend", e => {
  const touch = e.changedTouches[0];
  const el    = document.elementFromPoint(touch.clientX, touch.clientY);
  const col   = el ? el.closest(".raz-col") : null;
  const match = col ? col.id.match(/^raz-(.+)-(debito|credito)$/) : null;

  if (touchClone) {
    // — fim do ARRASTAR —
    touchClone.remove(); touchClone = null;
    if (match && touchDragId) {
      dropRaz(
        { preventDefault: () => {}, dataTransfer: { getData: () => touchDragId } },
        match[1], match[2]
      );
    }
    touchDragId = null;

  } else if (match && selectedCardId) {
    // — toque simples no razonete após selecionar card —
    tapRaz(match[1], match[2]);
    touchDragId = null;

  } else {
    touchDragId = null;
  }
}, { passive: true });

function mostrarCadastro() {
  document.getElementById("intro").style.display    = "none";
  document.getElementById("registro").style.display = "block";
}

function iniciarComCadastro() {
  const nome  = document.getElementById("inputNome").value.trim();
  const email = document.getElementById("inputEmail").value.trim();
  const erro  = document.getElementById("cadastroErro");
  if (!nome)                        { erro.innerText = "Por favor, informe seu nome.";         return; }
  if (!email || !email.includes("@")) { erro.innerText = "Por favor, informe um e-mail válido."; return; }
  erro.innerText = "";
  alunoNome  = nome;
  alunoEmail = email;
  document.getElementById("registro").style.display = "none";
  document.getElementById("game").style.display     = "block";
  initGame();
}

// =============================================
//  INICIALIZAÇÃO
// =============================================
function initGame() {
  currentLancamento = 0;
  placedCards       = new Set();
  wrongAttempts     = {};
  visibleRazonetes  = [];
  razoneteSaldos    = {};
  score             = 0;
  selectedCardId    = null;
  document.getElementById("razonetesGrid").innerHTML = "";
  updateScoreDisplay();
  loadLancamento();
}

function resetGame() {
  document.getElementById("game").style.display      = "none";
  document.getElementById("resultado").style.display = "none";
  document.getElementById("intro").style.display     = "block";
}

// =============================================
//  CARREGAR LANÇAMENTO
// =============================================
function loadLancamento() {
  const lan = lancamentos[currentLancamento];

  document.getElementById("missionBox").innerHTML = `
    <h2>📖 Lançamento ${lan.id} de ${lancamentos.length}</h2>
    <p>${lan.descricao}</p>
    <p style="font-size:13px;color:#555;margin-top:6px;">
      Toque (ou arraste) cada conta para o lado correto (D ou C) do razonete correspondente.
    </p>
  `;

  // Adicionar novos razonetes (apenas os ainda não visíveis)
  lan.novosRazonetes.forEach(conta => {
    if (!visibleRazonetes.includes(conta)) {
      visibleRazonetes.push(conta);
      addRazonete(conta);
    }
  });

  // Criar cards
  document.getElementById("cards").innerHTML = lan.cards.map(c => `
    <div class="card" draggable="true"
      id="${c.id}"
      data-conta="${c.conta}"
      data-lado="${c.lado}"
      data-value="${c.value}"
      data-label="${c.label}"
      onclick="selectCard('${c.id}')"
      ondragstart="drag(event)">
      <div class="card-nome">${c.label}</div>
      <div class="card-valor">R$&nbsp;${format(c.value)}</div>
    </div>
  `).join("");

  document.getElementById("feedback").innerHTML =
    "💡 Toque em uma conta e depois toque no lado <strong>D</strong> ou <strong>C</strong> do razonete correto.";
  document.getElementById("nextBtn").disabled  = true;
  document.getElementById("nextBtn").innerText =
    currentLancamento < lancamentos.length - 1 ? "➡ Próximo Lançamento" : "🏆 Ver Resultado Final";
  document.getElementById("explanation").style.display = "none";
  document.getElementById("explanation").innerHTML     = "";
}

// =============================================
//  RAZONETE
// =============================================
function addRazonete(conta) {
  const def  = razoneteDefs[conta];
  const grid = document.getElementById("razonetesGrid");
  const div  = document.createElement("div");
  div.className = "razonete razonete-new";
  div.id        = `raz-${conta}`;
  div.innerHTML = `
    <div class="raz-titulo">${def.label}</div>
    <div class="raz-tipo ${def.tipo}">${tipoLabel[def.tipo]}</div>
    <div class="raz-tabela">
      <div class="raz-header">
        <div>Débito</div>
        <div>Crédito</div>
      </div>
      <div class="raz-body">
        <div class="raz-col raz-debito" id="raz-${conta}-debito"
          ondragover="allowDrop(event)"
          ondrop="dropRaz(event,'${conta}','debito')"
          onclick="tapRaz('${conta}','debito')"
          ontouchend="razTouchEnd(event,'${conta}','debito')">
          <div class="raz-drop-hint">D</div>
        </div>
        <div class="raz-col raz-credito" id="raz-${conta}-credito"
          ondragover="allowDrop(event)"
          ondrop="dropRaz(event,'${conta}','credito')"
          onclick="tapRaz('${conta}','credito')"
          ontouchend="razTouchEnd(event,'${conta}','credito')">
          <div class="raz-drop-hint">C</div>
        </div>
      </div>
    </div>
    <div class="raz-saldo" id="raz-${conta}-saldo">Saldo: —</div>
  `;
  grid.appendChild(div);
  // Acionar animação de entrada
  requestAnimationFrame(() => div.classList.remove("razonete-new"));
}

// =============================================
//  DRAG & DROP + TAP
// =============================================
function allowDrop(e) { e.preventDefault(); }
function drag(e)      { e.dataTransfer.setData("id", e.currentTarget.id); }

function selectCard(id) {
  selectedCardId = id;
  document.querySelectorAll(".card").forEach(c => c.classList.remove("card-selected"));
  const c = document.getElementById(id);
  if (c) c.classList.add("card-selected");
  document.getElementById("feedback").innerHTML =
    "👆 Agora toque no lado <strong>D</strong> ou <strong>C</strong> do razonete correto.";
}

function tapRaz(conta, lado) {
  if (!selectedCardId) return;
  dropRaz(
    { preventDefault: () => {}, dataTransfer: { getData: () => selectedCardId } },
    conta,
    lado
  );
  selectedCardId = null;
}

// Toque direto na coluna do razonete (mobile)
function razTouchEnd(e, conta, lado) {
  e.stopPropagation();
  if (touchClone) return; // está arrastando — deixa o touchend do documento tratar
  if (selectedCardId) {
    tapRaz(conta, lado);
  } else if (touchDragId) {
    dropRaz(
      { preventDefault: () => {}, dataTransfer: { getData: () => touchDragId } },
      conta, lado
    );
    touchDragId = null;
  }
}

function dropRaz(event, contaAlvo, ladoAlvo) {
  event.preventDefault();
  const id   = event.dataTransfer.getData("id");
  const card = document.getElementById(id);
  if (!card || placedCards.has(id)) return;

  const contaCard = card.dataset.conta;
  const ladoCard  = card.dataset.lado;
  const value     = Number(card.dataset.value);
  const label     = card.dataset.label;

  // Verificar se está correto
  if (contaCard !== contaAlvo || ladoCard !== ladoAlvo) {
    wrongAttempts[id] = (wrongAttempts[id] || 0) + 1;
    // Piscar vermelho no alvo errado
    const col = document.getElementById(`raz-${contaAlvo}-${ladoAlvo}`);
    if (col) {
      col.classList.add("raz-erro");
      setTimeout(() => col.classList.remove("raz-erro"), 700);
    }
    document.getElementById("feedback").innerHTML =
      "❌ Não é aqui. Verifique a conta e o lado (D ou C)!";
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    return;
  }

  // ✅ CORRETO!
  const erros  = wrongAttempts[id] || 0;
  const pontos = erros === 0 ? 10 : erros === 1 ? 7 : 5;
  score += pontos;
  updateScoreDisplay();
  showPontos(pontos);
  placedCards.add(id);
  card.remove();

  // Atualizar saldo interno
  if (!razoneteSaldos[contaCard]) razoneteSaldos[contaCard] = { debito: 0, credito: 0 };
  razoneteSaldos[contaCard][ladoAlvo] += value;

  // Inserir entrada no razonete
  const col = document.getElementById(`raz-${contaCard}-${ladoAlvo}`);
  if (col) {
    const entry = document.createElement("div");
    entry.className  = "raz-entry raz-entry-new";
    entry.innerHTML  = `<span class="raz-val">R$&nbsp;${format(value)}</span>`;
    col.appendChild(entry);
    setTimeout(() => entry.classList.remove("raz-entry-new"), 700);
  }

  updateSaldo(contaCard);
  document.getElementById("feedback").innerHTML = "✅ Correto! Continue.";
  checkLancamentoComplete();
}

// =============================================
//  SALDO DO RAZONETE
// =============================================
function updateSaldo(conta) {
  const saldoEl = document.getElementById(`raz-${conta}-saldo`);
  if (!saldoEl) return;
  const s   = razoneteSaldos[conta] || { debito: 0, credito: 0 };
  const def = razoneteDefs[conta];
  // Ativo e PL-redutora têm saldo devedor (D − C)
  // Passivo e PL têm saldo credor (C − D)
  let saldo, lado;
  if (def.tipo === "ativo" || def.tipo === "pl-redutora") {
    saldo = s.debito - s.credito; lado = "D";
  } else {
    saldo = s.credito - s.debito; lado = "C";
  }
  saldoEl.innerHTML = `Saldo ${lado}: R$&nbsp;${format(Math.abs(saldo))}`;
}

// =============================================
//  VERIFICAR CONCLUSÃO DO LANÇAMENTO
// =============================================
function checkLancamentoComplete() {
  const lan       = lancamentos[currentLancamento];
  const allPlaced = lan.cards.every(c => placedCards.has(c.id));
  if (!allPlaced) return;

  document.getElementById("explanation").style.display = "block";
  document.getElementById("explanation").innerHTML     = "💡 " + lan.explicacao;
  document.getElementById("nextBtn").disabled          = false;

  if (currentLancamento >= lancamentos.length - 1) {
    document.getElementById("feedback").innerHTML  = "🎉 Todos os lançamentos concluídos!";
    document.getElementById("nextBtn").innerText   = "🏆 Ver Resultado Final";
  } else {
    document.getElementById("feedback").innerHTML  = "✅ Lançamento correto! Veja a explicação abaixo.";
    document.getElementById("nextBtn").innerText   = "➡ Próximo Lançamento";
  }
}

function nextLancamento() {
  currentLancamento++;
  if (currentLancamento >= lancamentos.length) {
    showResult();
    return;
  }
  loadLancamento();
}

// =============================================
//  RESULTADO FINAL
// =============================================
function showResult() {
  document.getElementById("game").style.display = "none";
  const maxScore = lancamentos.length * 2 * 10; // 10 lançamentos × 2 cards × 10 pts = 200
  const pct      = Math.round((score / maxScore) * 100);
  const stars    = pct >= 90 ? "⭐⭐⭐" : pct >= 70 ? "⭐⭐" : "⭐";

  // Balancete
  const balanceteRows = visibleRazonetes.map(conta => {
    const def = razoneteDefs[conta];
    const s   = razoneteSaldos[conta] || { debito: 0, credito: 0 };
    let saldo, lado;
    if (def.tipo === "ativo" || def.tipo === "pl-redutora") {
      saldo = s.debito - s.credito; lado = "D";
    } else {
      saldo = s.credito - s.debito; lado = "C";
    }
    return `
      <tr class="tipo-${def.tipo}">
        <td>${def.label}</td>
        <td class="num">${s.debito  > 0 ? "R$&nbsp;" + format(s.debito)  : "—"}</td>
        <td class="num">${s.credito > 0 ? "R$&nbsp;" + format(s.credito) : "—"}</td>
        <td class="num saldo-${lado.toLowerCase()}">R$&nbsp;${format(Math.abs(saldo))} (${lado})</td>
      </tr>
    `;
  }).join("");

  const resultDiv = document.getElementById("resultado");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = `
    <div class="result-container">
      <h1>🏆 Resultado Final — Módulo 3</h1>
      <h2>${stars}</h2>
      <p class="result-score">Pontuação: <strong>${score} / ${maxScore} pts</strong> (${pct}%)</p>
      <p>Parabéns, <strong>${alunoNome}</strong>! Você completou o Módulo 3 — Razonetes! 🎉</p>

      <h3>📊 Balancete de Verificação</h3>
      <div class="balancete-wrap">
        <table class="balancete">
          <thead>
            <tr>
              <th>Conta</th>
              <th>Total Débito</th>
              <th>Total Crédito</th>
              <th>Saldo Final</th>
            </tr>
          </thead>
          <tbody>${balanceteRows}</tbody>
        </table>
      </div>

      <div class="actions" style="margin-top:24px;">
        <button onclick="resetGame()">↺ Jogar Novamente</button>
      </div>
    </div>
  `;

  enviarParaSheet();
}

// =============================================
//  GOOGLE SHEETS
// =============================================
function enviarParaSheet() {
  const maxScore = lancamentos.length * 2 * 10;
  const payload = {
    nome:   alunoNome,
    email:  alunoEmail,
    modulo: "Módulo 3",
    pontos: score + " / " + maxScore,
    data:   new Date().toLocaleString("pt-BR")
  };
  fetch(GOOGLE_SHEET_URL, {
    method:  "POST",
    mode:    "no-cors",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  }).catch(() => {});
}

// =============================================
//  UTILITÁRIOS
// =============================================
function format(v) { return v.toLocaleString("pt-BR"); }

function showPontos(pontos) {
  const el = document.createElement("div");
  el.className = "pontos-ganhos";
  el.innerText = "+" + pontos + " pts";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function updateScoreDisplay() {
  const el = document.getElementById("scoreDisplay");
  if (el) el.innerText = score;
}

function moveTouchClone(touch) {
  if (!touchClone) return;
  touchClone.style.left = (touch.clientX - touchClone.offsetWidth  / 2) + "px";
  touchClone.style.top  = (touch.clientY - touchClone.offsetHeight / 2 - 30) + "px";
}

function autoScroll(touchY) {
  const zona = 90; // pixels da borda para ativar o scroll
  const velocidade = 10;
  if (touchY > window.innerHeight - zona) {
    window.scrollBy(0, velocidade);   // rola para baixo
  } else if (touchY < zona) {
    window.scrollBy(0, -velocidade);  // rola para cima
  }
}
