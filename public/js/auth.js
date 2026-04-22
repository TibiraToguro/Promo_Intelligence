const auth = {
  _BADGES_DEF: [
    { id: 'CHECKIN', label: 'Pontualidade', icon: '⏱️' },
    { id: 'TURNO',   label: 'Consistência', icon: '🔥' },
    { id: 'VENDA',   label: 'Vendedor',     icon: '💰' },
    { id: 'ACADEMY', label: 'Expert',       icon: '🎓' }
  ],

  async init() {
    this._renderLogin('');
    const token = state.loadToken();
    if (token) {
      this._renderSplash();
      try {
        const res = await api.post({ evento: 'VALIDAR_TOKEN', token }, { skipToken: true, tokenOverride: token });
        if (res.ok) {
          state.saveToken(token);
          const me = await api.get('GET_ME');
          if (me.ok) {
            const user = me.dados || me.user;
            state.setPromotor(user);
            if (typeof pushManager !== 'undefined') pushManager.init();
            if (user.lgpd_aceite) { this._rotearPorPerfil(user); } 
            else { this._renderLGPD(user); }
            return;
          }
        }
      } catch (_) {}
      state.clearToken();
    }
    this._renderLogin('');
  },

  _rotearPorPerfil(user) {
    const vinculo = (user.tipo_vinculo || '').toUpperCase();
    const cargo = (user.cargo_principal || '').toUpperCase();
    if (vinculo === 'GESTOR' || vinculo === 'LIDER' || cargo === 'GESTOR' || cargo === 'LIDER') {
      window.location.href = '/gestor/';
      return;
    }
    router.replace(vinculo === 'CLT' || vinculo === 'FISCAL' ? 'home-clt' : 'home');
    this._atualizarDadosGlobais();
    setInterval(() => this._atualizarDadosGlobais(), 60000);
  },

  async _atualizarDadosGlobais() {
    try {
      const me = await api.get('GET_ME');
      const user = me?.user || me?.dados || {};
      state.setPromotor(user);
      const score = user.score_operacional ?? user.score ?? 0;
      document.querySelectorAll('#hdr-score').forEach(el => {
        el.textContent = '⭐ ' + score;
        el.style.display = 'block';
      });
      this._atualizarBadgeSlots();
    } catch(_) {}
  },

  async _atualizarBadgeSlots() {
    try {
      const disp = await api.get('GET_SLOTS_DISPONIVEIS');
      const count = disp?.slots?.length || 0;
      document.querySelectorAll('#badge-slots').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'block' : 'none';
      });
    } catch(_) {}
  },

  _renderLogin(erro) {
    document.getElementById("app").innerHTML = `
      <div style="min-height:100dvh;background:#0A0A0A;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;gap:16px">
        <div style="font-size:42px;font-weight:900;color:#00FF87;font-family:'Syne',sans-serif;letter-spacing:-2px">JET <span style="color:#fff">One</span></div>
        <div style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px">
          <div style="background:#161616;border:1px solid #2C2C2C;border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px">
            <input id="inp-cpf" type="tel" placeholder="CPF" 
              style="background:#0A0A0A;border:1px solid #2C2C2C;border-radius:12px;color:#fff;padding:15px;width:100%;outline:none;font-weight:600"/>
            <input id="inp-senha" type="password" placeholder="Data Nascimento (DDMMYYYY)"
              style="background:#0A0A0A;border:1px solid #2C2C2C;border-radius:12px;color:#fff;padding:15px;width:100%;outline:none;font-weight:600"/>
          </div>
          <button id="btn-entrar" onclick="auth._loginCPF()"
            style="background:#00FF87;color:#000;border:none;border-radius:14px;font-size:16px;font-weight:800;padding:18px;width:100%;cursor:pointer">Acessar Painel</button>
        </div>
        ${erro ? `<div style="color:#FF3B5C;font-size:13px;font-weight:600">${erro}</div>` : ""}
      </div>`;
  },

  async _loginCPF() {
    const cpf = (document.getElementById("inp-cpf")?.value || "").replace(/\D/g, "");
    const senha = (document.getElementById("inp-senha")?.value || "").replace(/\D/g, "");
    if (!cpf || !senha) return;
    const btn = document.getElementById("btn-entrar");
    btn.disabled = true; btn.textContent = "Autenticando...";
    try {
      const res = await api.post({ evento: "LOGIN_CLT", cpf, senha }, { skipToken: true });
      if (!res.ok) { alert(res.erro || "Falha no acesso."); this._renderLogin(""); return; }
      state.saveToken(res.token);
      state.setPromotor(res.user);
      if (res.user.lgpd_aceite) this._rotearPorPerfil(res.user);
      else this._renderLGPD(res.user);
    } catch (_) { alert("Erro de conexão."); btn.disabled = false; btn.textContent = "Acessar Painel"; }
  },

  _renderSplash() {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100dvh;background:#0A0A0A;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">
        <div style="font-size:48px;font-weight:900;color:#00FF87;font-family:'Syne',sans-serif;letter-spacing:-2px">JET <span style="color:#fff">One</span></div>
        <div class="spinner"></div>
      </div>`;
  },

  _renderLGPD(user) {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100dvh;background:#0A0A0A;color:#EFEFEF;padding:30px;display:flex;flex-direction:column">
        <h2 style="font-family:'Syne';font-size:28px;margin-bottom:20px">Privacidade & Dados</h2>
        <div style="flex:1;background:#161616;border:1px solid #2C2C2C;border-radius:20px;padding:24px;overflow-y:auto;font-size:14px;line-height:1.6;color:#A0A0A0">
          <p style="color:#fff;font-weight:700;margin-bottom:15px">Olá, ${user.nome_completo || 'Promotor'}!</p>
          <p>Para operar no sistema JET One, coletamos sua localização em tempo real durante o turno para validar sua presença nos pontos de venda e garantir sua segurança.</p>
        </div>
        <button onclick="auth._aceitarLGPD()" style="background:#00FF87;color:#000;border:none;border-radius:14px;padding:20px;font-weight:800;margin-top:20px;cursor:pointer">CONCORDO E CONTINUAR</button>
      </div>`;
  },

  async _aceitarLGPD() {
    try {
      const res = await api.post({ evento: 'ACEITAR_LGPD' });
      if (res.ok) {
        const me = await api.get('GET_ME');
        this._rotearPorPerfil(me.user || me.dados);
      }
    } catch(e) { alert('Falha ao gravar aceite.'); }
  },

  logout() {
    state.clearToken();
    try { sessionStorage.clear(); } catch(_) {}
    window.location.reload();
  },

  // ── Renderizadores Modernos ──────────────────────────────────────────
  renderAchievements(badges) {
    return `
      <div class="achievements-container" style="margin-top:30px">
        <div style="font-size:12px;font-weight:900;color:#555;letter-spacing:2px;margin-bottom:15px;padding-left:4px">MINHAS CONQUISTAS</div>
        <div class="badges-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          ${this._BADGES_DEF.map(def => {
            const conquistasDef = (badges || []).filter(b => b.tipo && b.tipo.startsWith(def.id));
            const nivelAtingido = conquistasDef.length;
            const ultimaConquista = nivelAtingido > 0 ? conquistasDef[nivelAtingido-1] : null;
            const opacity = nivelAtingido > 0 ? 1 : 0.3;
            return `
              <div class="badge-card" style="background:#161616;border:1px solid #2C2C2C;padding:20px 16px;border-radius:22px;text-align:center;opacity:${opacity};transition:all 0.3s ease">
                <div style="font-size:36px;margin-bottom:10px;filter:${nivelAtingido > 0 ? 'none' : 'grayscale(1)'}">${def.icon}</div>
                <div style="font-size:14px;font-weight:800;color:#fff">${def.label}</div>
                <div style="font-size:10px;color:#555;margin-top:6px;min-height:24px;line-height:1.3">${ultimaConquista ? ultimaConquista.descricao : 'Ainda não conquistado'}</div>
                ${nivelAtingido > 0 ? `<div style="background:#00FF87;color:#000;font-size:9px;font-weight:900;padding:3px 10px;border-radius:10px;display:inline-block;margin-top:12px;letter-spacing:1px">NÍVEL ${nivelAtingido}</div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  renderExtrato(extrato) {
    if (!extrato || !extrato.length) return '<div style="padding:20px;text-align:center;color:#555">Nenhuma movimentação recente.</div>';
    return `
      <div class="extrato-container" style="margin-top:30px">
        <div style="font-size:12px;font-weight:900;color:#555;letter-spacing:2px;margin-bottom:15px;padding-left:4px">HISTÓRICO RECENTE</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${extrato.slice(0, 10).map(it => `
            <div class="extrato-item" style="background:#161616;border:1px solid #2C2C2C;padding:16px 20px;border-radius:18px;display:flex;align-items:center;justify-content:space-between">
              <div style="flex:1">
                <div style="font-size:14px;font-weight:800;color:#fff">${it.descricao || it.tipo}</div>
                <div style="font-size:11px;color:#555;margin-top:4px">${new Date(it.criado_em).toLocaleDateString('pt-BR')} • ${new Date(it.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <div style="font-size:16px;font-weight:900;font-family:var(--mono);color:${it.pontos >= 0 ? '#00FF87' : '#FF3B5C'}">
                ${it.pontos >= 0 ? '+' : ''}${it.pontos}
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }
};

const homeScreen = {
  async render() {
    const p = state.get('promotor');
    if (!p) return router.go('splash');

    // Tentar carregar do cache para renderização instantânea
    const cachedData = state.get('home_cache');
    if (cachedData) {
      this._renderLayout(p, cachedData.resJornada, cachedData.resBadges, cachedData.resExtrato);
      // Atualiza em background
      this._fetchAndRefresh(p);
    } else {
      ui.render(ui.spinner('Sincronizando...'));
      await this._fetchAndRefresh(p);
    }
  },

  async _fetchAndRefresh(p) {
    try {
      const [resJornada, resBadges, resExtrato] = await Promise.all([
        api.get('GET_SLOT_ATUAL'),
        api.get('GET_BADGES'),
        api.get('GET_EXTRATO_RECENTE')
      ]);
      state.set('home_cache', { resJornada, resBadges, resExtrato });
      this._renderLayout(p, resJornada, resBadges, resExtrato);
      auth._atualizarDadosGlobais();
    } catch(e) {
      console.error(e);
      if (!state.get('home_cache')) {
        ui.render(ui.header('Erro') + '<div class="content">Falha ao carregar dados.</div>' + ui.bottomNav('home'));
      }
    }
  },

  _renderLayout(p, resJornada, resBadges, resExtrato) {
    const html = `
      <div class="screen">
        <div class="header" style="background:#0A0A0A;border:none;height:100px;padding:0 24px">
          <div style="flex:1">
            <div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1.5px;margin-bottom:2px">BEM-VINDO AO JET ONE,</div>
            <div style="font-size:24px;font-weight:900;color:#fff;font-family:'Syne'">${(p.nome || p.nome_completo || 'Promotor').split(' ')[0]}</div>
          </div>
          <div id="hdr-score" style="font-size:14px;font-weight:900;color:#00FF87;background:rgba(0,255,135,.1);padding:10px 18px;border-radius:16px;font-family:var(--mono);box-shadow:0 0 20px rgba(0,255,135,0.1)">⭐ —</div>
        </div>

        <div class="content" style="padding:0 20px 40px">
          <!-- Jornada Ativa -->
          <div id="home-jornada-container">
            ${this._renderJornadaCard(resJornada.jornadas)}
          </div>

          <!-- Menu Rápido -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">
            <button onclick="router.go('slot')" style="background:#161616;border:1px solid #2C2C2C;border-radius:24px;padding:26px 20px;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:12px;text-align:left">
              <span style="font-size:32px">📍</span>
              <div style="font-weight:900;font-size:15px;letter-spacing:-0.3px">Reservar<br>Vagas</div>
            </button>
            <button onclick="router.go('ranking')" style="background:#161616;border:1px solid #2C2C2C;border-radius:24px;padding:26px 20px;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:12px;text-align:left">
              <span style="font-size:32px">🏆</span>
              <div style="font-weight:900;font-size:15px;letter-spacing:-0.3px">Ranking<br>Geral</div>
            </button>
            <button onclick="router.go('calculadora')" style="background:#161616;border:1px solid #2C2C2C;border-radius:24px;padding:26px 20px;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:12px;text-align:left">
              <span style="font-size:32px">🧮</span>
              <div style="font-weight:900;font-size:15px;letter-spacing:-0.3px">Ganhos<br>Estimados</div>
            </button>
            <button onclick="router.go('historico')" style="background:#161616;border:1px solid #2C2C2C;border-radius:24px;padding:26px 20px;color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:12px;text-align:left">
              <span style="font-size:32px">📋</span>
              <div style="font-weight:900;font-size:15px;letter-spacing:-0.3px">Meu<br>Histórico</div>
            </button>
          </div>

          <button onclick="router.go('academy')" style="background:linear-gradient(135deg, #161616, #0A0A0A);border:1px solid #2C2C2C;border-radius:24px;padding:22px;color:#fff;margin-top:15px;display:flex;align-items:center;gap:18px;width:100%;text-align:left;position:relative;overflow:hidden">
            <div style="position:absolute;top:0;right:0;width:80px;height:80px;background:rgba(0,255,135,0.03);border-radius:50%;transform:translate(20px, -20px)"></div>
            <div style="width:54px;height:54px;background:rgba(0,255,135,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px">🎓</div>
            <div style="flex:1">
              <div style="font-weight:900;font-size:16px;color:#fff">JET Academy</div>
              <div style="font-size:12px;color:#555;margin-top:2px;font-weight:600">Aprenda e multiplique seus pontos</div>
            </div>
            <div style="color:#00FF87;font-size:20px;font-weight:900">›</div>
          </button>

          <!-- Conquistas -->
          ${auth.renderAchievements(resBadges.badges)}

          <!-- Extrato -->
          ${auth.renderExtrato(resExtrato.data || resExtrato.extrato)}
        </div>
        ${ui.bottomNav('home')}
      </div>`;
    ui.render(html);
  },

  _renderJornadaCard(jornadas) {
    if (!jornadas || !jornadas.length) {
      return `
        <div style="background:#161616;border:1px solid #2C2C2C;border-radius:24px;padding:28px 24px;text-align:center">
          <div style="font-size:11px;font-weight:900;color:#555;letter-spacing:1.5px;margin-bottom:6px">STATUS ATUAL</div>
          <div style="font-size:18px;font-weight:900;color:#A0A0A0;letter-spacing:-0.5px">Sem jornada ativa</div>
        </div>`;
    }
    const item = jornadas[0];
    const statusCor = item.jornada.status === 'EM_ATIVIDADE' ? '#00FF87' : '#3B9EFF';
    return `
      <div onclick="state.set('slot', ${JSON.stringify(item.slot).replace(/"/g,'&quot;')}); state.saveJornada(${JSON.stringify(item.jornada).replace(/"/g,'&quot;')}); router.go('operacao')" 
        style="background:#161616;border:1px solid ${statusCor}44;border-radius:26px;padding:28px 24px;position:relative;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.3)">
        <div style="position:absolute;top:0;left:0;width:5px;height:100%;background:${statusCor}"></div>
        <div style="font-size:11px;font-weight:900;color:${statusCor};letter-spacing:1.5px;margin-bottom:10px;text-transform:uppercase">${item.jornada.status.replace(/_/g,' ')}</div>
        <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">${item.slot.local_nome || item.slot.local}</div>
        <div style="font-size:14px;color:#555;margin-top:6px;font-weight:600">⏰ ${item.slot.inicio} - ${item.slot.fim}</div>
        <div style="margin-top:18px;color:${statusCor};font-size:14px;font-weight:900;display:flex;align-items:center;gap:8px">ACESSAR OPERAÇÃO <span style="font-size:20px">→</span></div>
      </div>`;
  }
};
