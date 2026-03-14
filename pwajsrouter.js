const router = (() => {
  const _history = [];
  const routes = {
    splash: () => auth.renderSplash(),
    home: () => homeScreen.render(),
    slot: () => slotScreen.render(),
    checkin: () => operacao.renderCheckin(),
    pausa: () => operacao.renderPausa(),
    resume: () => operacao.renderResume(),
    checkout: () => operacao.renderCheckout(),
    'solicitacoes-nova': () => solicitacoes.renderNova(),
    'solicitacoes-lista': () => solicitacoes.renderLista(),
    'sol-realocacao': () => solicitacoes.renderRealocacao(),
    'sol-reforco': () => solicitacoes.renderReforco(),
    'sol-bateria': () => solicitacoes.renderBateria(),
    'sol-ocorrencia': () => solicitacoes.renderOcorrencia(),
    vendas: () => vendas.render(),
    mapa: () => mapa.render(),
    historico: () => historico.render()
  };

  return {
    go(screen, pushHistory=true){
      const fn = routes[screen];
      if (!fn) return;
      if (pushHistory && state.get('currentScreen')) _history.push(state.get('currentScreen'));
      state.set('currentScreen', screen);
      fn();
      window.scrollTo(0,0);
    },
    back(){ const prev = _history.pop(); this.go(prev || 'home', false); },
    replace(screen){ this.go(screen, false); }
  };
})();

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  auth.init();
});
