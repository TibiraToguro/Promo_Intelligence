const operacao = {
  renderCheckin() { ui.render(`<div class="screen">${ui.header('Check-in')}<div class="content"><div class="card">Tela de check-in (Fase 2)</div></div></div>`); },
  renderPausa() { ui.render(`<div class="screen">${ui.header('Pausa')}<div class="content"><div class="card">Tela de pausa (Fase 2)</div></div></div>`); },
  renderResume() { ui.render(`<div class="screen">${ui.header('Retomar')}<div class="content"><div class="card">Tela de retorno (Fase 2)</div></div></div>`); },
  renderCheckout() { ui.render(`<div class="screen">${ui.header('Check-out')}<div class="content"><div class="card">Tela de check-out (Fase 2)</div></div></div>`); }
};
