const auth = {
  async init() {
    router.go('splash', false);
    const token = state.loadToken();
    if (!token) return this.renderAcesso('negado', 'Nenhum token encontrado. Verifique o link recebido.');

    try {
      const res = await api.post({ evento: 'VALIDAR_TOKEN', token }, { skipToken: true, tokenOverride: token });
      if (!res.ok) {
        const tipo = (res.mensagem || '').toLowerCase().includes('expirado') ? 'expirado' : 'negado';
        return this.renderAcesso(tipo, res.mensagem || 'Acesso negado.');
      }

      state.saveToken(token);
      const me = await api.get('GET_ME');
      if (!me.ok) return this.renderAcesso('negado', me.mensagem || 'Não foi possível carregar perfil.');
      state.setPromotor(me.dados);
      router.replace('home');
    } catch (_) {
      this.renderAcesso('erro', 'Sem conexão. Verifique sua internet e tente novamente.');
    }
  },

  loginComTokenManual() {
    const el = document.getElementById('token-manual');
    const token = (el?.value || '').trim();
    if (!token) {
      ui.toast('Informe um token válido.', 'warning');
      return;
    }
    state.saveToken(token);
    this.init();
  },

  renderSplash() {
    ui.render(`
      <div class="screen no-bottom" style="align-items:center;justify-content:center;gap:20px;padding:24px">
        <img src="assets/logo-jet.svg" alt="JET Promo Intelligence" style="width:min(280px,70vw);height:auto" />
        ${ui.spinner('Verificando acesso…')}
      </div>
    `);
  },

  renderAcesso(tipo, msg) {
    const cfg = {
      negado: { icon: '🔒', color: 'var(--red)', btn: false },
      expirado: { icon: '⏰', color: 'var(--yellow)', btn: false },
      erro: { icon: '📡', color: 'var(--gray)', btn: true }
    };
    const { icon, color, btn } = cfg[tipo] || cfg.negado;

    const blocoToken = tipo === 'negado'
      ? `<div class="card" style="width:min(520px,92vw)">
           <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Cole seu token para entrar:</div>
           <input id="token-manual" class="input" placeholder="TOKEN_TESTE_001" />
           <div style="height:10px"></div>
           <button class="btn btn-primary" onclick="auth.loginComTokenManual()">Entrar com token</button>
         </div>`
      : '';

    ui.render(`
      <div class="screen no-bottom" style="align-items:center;justify-content:center;gap:20px;padding:32px">
        <img src="assets/logo-jet.svg" alt="JET Promo Intelligence" style="width:min(220px,62vw);height:auto" />
        <div style="font-size:48px">${icon}</div>
        <div style="font-size:18px;font-weight:700;color:${color};text-align:center">${msg}</div>
        ${blocoToken}
        ${btn ? '<button class="btn btn-ghost" onclick="auth.init()">🔄 Tentar novamente</button>' : ''}
      </div>
    `);
  }
};

const homeScreen = {
  render() {
    const p = state.get('promotor');
    const slot = state.get('slot');
    if (!p) return router.go('splash');
    const statusAtual = slot?.status || 'SEM_SLOT';

    ui.render(`
      <div class="screen">
        <div class="header">
          <img src="assets/logo-jet.svg" alt="JET" style="width:36px;height:36px;border-radius:6px" />
          <div style="flex:1">
            <div class="header-title">${p.nome || 'Promotor'}</div>
            <div class="header-sub">${p.cidade || '—'}</div>
          </div>
          <div>${ui.statusBadge(statusAtual)}</div>
        </div>

        <div class="content">
          <div class="score-card">
            <div style="font-size:36px">⭐</div>
            <div>
              <div class="score-value">${p.score_atual || 0}</div>
              <div class="text2">pontos · ${p.nivel_atual || 'Bronze'}</div>
            </div>
          </div>

          ${slot ? this._slotCard(slot) : this._semSlot()}

          <div>
            <div class="section-label">Ações</div>
            ${this._acoes(statusAtual)}
          </div>
        </div>

        ${ui.bottomNav('home')}
      </div>
    `);
  },

  _slotCard(slot) {
    return `<div class="slot-card" onclick="router.go('slot')" style="cursor:pointer"><div class="slot-card-top"><div class="slot-local">📍 ${slot.local || '—'}</div>${ui.statusBadge(slot.status)}</div><div class="slot-horario">🕐 ${ui.hora(slot.inicio)} – ${ui.hora(slot.fim)}</div></div>`;
  },

  _semSlot() {
    return `<div class="card" style="text-align:center">Nenhum slot ativo no momento</div>`;
  },

  _acoes(status) {
    if (status === 'ACEITO') return `<button class="btn btn-success" onclick="router.go('checkin')">✅ CHECK-IN</button>`;
    if (status === 'EM_ATIVIDADE') return `<div style="display:flex;flex-direction:column;gap:10px"><button class="btn btn-warning" onclick="router.go('pausa')">⏸️ Pausar</button><button class="btn btn-ghost" onclick="router.go('checkout')">🏁 Check-out</button></div>`;
    if (status === 'PAUSADO') return `<div style="display:flex;flex-direction:column;gap:10px"><button class="btn btn-success" onclick="router.go('resume')">▶️ Retomar</button><button class="btn btn-ghost" onclick="router.go('checkout')">🏁 Check-out</button></div>`;
    return '';
  }
};
