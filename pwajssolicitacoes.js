const solicitacoes = {
  renderNova(){ ui.render(`<div class="screen">${ui.header('Nova Solicitação')}<div class="content"><div class="card">Fase 3</div></div></div>`); },
  renderLista(){ ui.render(`<div class="screen">${ui.header('Minhas Solicitações')}<div class="content"><div class="card">Fase 3</div></div></div>`); },
  renderRealocacao(){ this.renderNova(); },
  renderReforco(){ this.renderNova(); },
  renderBateria(){ this.renderNova(); },
  renderOcorrencia(){ this.renderNova(); }
};
