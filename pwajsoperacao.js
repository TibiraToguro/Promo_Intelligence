// ─────────────────────────────────────────────────────────────────────────────
// operacao.js — Fluxo completo: Check-in → Em Atividade → Pausa → Checkout
// JET Promo Intelligence — PWA
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers internos ─────────────────────────────────────────────────────────

function _fmtHora(v) {
  if (!v) return '—';
  const s = String(v);
  if (/^\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
  try { return new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  catch (_) { return '—'; }
}

function _calcDistancia(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _minutosAtraso(horaStr) {
  if (!horaStr) return 0;
  const [h, m] = String(horaStr).substring(0, 5).split(':').map(Number);
  const ref = new Date(); ref.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((Date.now() - ref.getTime()) / 60000));
}

function _minutosAntecipado(horaStr) {
  if (!horaStr) return 0;
  const [h, m] = String(horaStr).substring(0, 5).split(':').map(Number);
  const ref = new Date(); ref.setHours(h, m, 0, 0);
  return Math.max(0, Math.floor((ref.getTime() - Date.now()) / 60000));
}

function _formatTimer(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── GPS helper ────────────────────────────────────────────────────────────────

const _gps = {
  _watchId: null,
  _posicao: null,

  obter(timeout = 10000) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        ()  => resolve(null),
        { enableHighAccuracy: true, timeout, maximumAge: 15000 }
      );
    });
  },

  iniciarWatch(onUpdate) {
    if (!navigator.geolocation) return;
    this._watchId = navigator.geolocation.watchPosition(
      pos => {
        this._posicao = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (onUpdate) onUpdate(this._posicao);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 20000 }
    );
  },

  pararWatch() {
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
    this._posicao = null;
  },

  get posicao() { return this._posicao; }
};

// ── Timer ─────────────────────────────────────────────────────────────────────

const _timer = {
  _inicio: null,
  _acumulado: 0,
  _intervalo: null,
  _callbacks: [],

  iniciar(acumuladoSegundos = 0) {
    this._acumulado = acumuladoSegundos;
    this._inicio = Date.now();
    clearInterval(this._intervalo);
    this._intervalo = setInterval(() => {
      const s = this.segundos();
      this._callbacks.forEach(cb => cb(s));
      // Atualizar display se existir
      const el = document.getElementById('timer-display');
      if (el) el.textContent = _formatTimer(s);
    }, 1000);
  },

  pausar() {
    this._acumulado = this.segundos();
    this._inicio = null;
    clearInterval(this._intervalo);
    this._intervalo = null;
  },

  retomar() {
    this._inicio = Date.now();
    clearInterval(this._intervalo);
    this._intervalo = setInterval(() => {
      const s = this.segundos();
      this._callbacks.forEach(cb => cb(s));
      const el = document.getElementById('timer-display');
      if (el) el.textContent = _formatTimer(s);
    }, 1000);
  },

  parar() {
    clearInterval(this._intervalo);
    this._intervalo = null;
    this._inicio = null;
    this._acumulado = 0;
    this._callbacks = [];
  },

  segundos() {
    if (!this._inicio) return this._acumulado;
    return this._acumulado + Math.floor((Date.now() - this._inicio) / 1000);
  },

  onTick(cb) { this._callbacks.push(cb); }
};

// ── Modal de motivo ───────────────────────────────────────────────────────────

function _modalMotivo(titulo, descricao) {
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
    ov.innerHTML = `
      <div style="background:var(--card);border:1px solid var(--border);border-radius:20px 20px 0 0;padding:24px 20px 36px;width:100%;max-width:430px">
        <div style="font-size:17px;font-weight:700;margin-bottom:6px">${titulo}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:20px">${descricao}</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button data-m="CHUVA"      style="background:rgba(79,142,247,.15);border:1px solid rgba(79,142,247,.3);color:var(--accent);border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer">🌧️ Chuva ou condição climática</button>
          <button data-m="TRANSPORTE" style="background:rgba(241,196,15,.1);border:1px solid rgba(241,196,15,.25);color:var(--yellow);border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer">🚌 Problema de transporte</button>
          <button data-m="SAUDE"      style="background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.25);color:var(--red);border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer">🏥 Saúde</button>
          <button data-m="OUTRO"      style="background:var(--bg2);border:1px solid var(--border);color:var(--text2);border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer">Outro motivo</button>
          <button data-m="_CANCELAR"  style="background:none;border:none;color:var(--gray);padding:10px;font-size:14px;cursor:pointer">Cancelar</button>
        </div>
      </div>`;
    ov.querySelectorAll('button[data-m]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(ov);
        const m = btn.getAttribute('data-m');
        if (m === '_CANCELAR') { resolve(null); return; }
        resolve({ motivo_ocorrencia: m });
      });
    });
    document.body.appendChild(ov);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// operacao — objeto principal
// ─────────────────────────────────────────────────────────────────────────────

const operacao = {

  // ── CHECK-IN ──────────────────────────────────────────────────────────────
  async renderCheckin() {
    const slot = state.get('slot');

    ui.render(`
      <div class="screen">
        ${ui.header('Check-in', slot?.local || '', true)}
        <div class="content">

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              ${ui.statusBadge('ACEITO')}
              <span style="font-size:11px;color:var(--text2)">${slot?.slot_id || ''}</span>
            </div>
            <div style="font-size:17px;font-weight:700;margin-bottom:4px">${slot?.local || '—'}</div>
            <div style="font-size:13px;color:var(--text2)">${slot?.cidade || ''} · ${slot?.tipo_atividade || ''}</div>
            <div style="display:flex;gap:24px;margin-top:12px">
              <div>
                <div class="section-label" style="margin-bottom:2px">INÍCIO</div>
                <div style="font-weight:700">${_fmtHora(slot?.inicio)}</div>
              </div>
              <div>
                <div class="section-label" style="margin-bottom:2px">FIM</div>
                <div style="font-weight:700">${_fmtHora(slot?.fim)}</div>
              </div>
              <div>
                <div class="section-label" style="margin-bottom:2px">RAIO</div>
                <div style="font-weight:700">${slot?.raio_metros || 50}m</div>
              </div>
            </div>
          </div>

          <div class="gps-indicator" id="gps-strip">
            <div class="gps-dot waiting" id="gps-dot"></div>
            <div style="flex:1">
              <div style="font-weight:600" id="gps-label">Obtendo localização...</div>
              <div style="font-size:11px;color:var(--text2)" id="gps-coords"></div>
            </div>
            <div style="font-size:11px;color:var(--text2)" id="gps-acc"></div>
          </div>

          <div style="text-align:center;padding:8px 0">
            <div id="dist-valor" style="font-size:42px;font-weight:800;color:var(--text2)">—</div>
            <div style="font-size:12px;color:var(--text2);margin-top:2px" id="dist-hint">Aguardando GPS...</div>
          </div>

          <button id="btn-checkin" class="btn btn-success" disabled onclick="operacao._executarCheckin()">
            ✅ Fazer Check-in
          </button>

          <button class="btn btn-ghost" style="color:var(--red);border-color:rgba(231,76,60,.2)" onclick="router.go('slot')">
            Cancelar
          </button>
        </div>
      </div>
    `);

    // Buscar GPS imediatamente
    _gps.obter(8000).then(g => operacao._atualizarGpsCheckin(g, slot));

    // Watch contínuo para atualizar distância
    _gps.iniciarWatch(g => operacao._atualizarGpsCheckin(g, slot));

    // Timeout de 12s — liberar botão sem GPS
    setTimeout(() => {
      const btn = document.getElementById('btn-checkin');
      const hint = document.getElementById('dist-hint');
      if (btn && btn.disabled && !_gps.posicao) {
        btn.disabled = false;
        btn.style.background = 'var(--yellow)';
        btn.style.color = '#1a1a2e';
        btn.textContent = '⚠️ Check-in sem GPS';
        if (hint) hint.textContent = 'GPS indisponível. Você pode continuar, mas será registrado.';
      }
    }, 12000);
  },

  _atualizarGpsCheckin(g, slot) {
    const dot    = document.getElementById('gps-dot');
    const label  = document.getElementById('gps-label');
    const coords = document.getElementById('gps-coords');
    const acc    = document.getElementById('gps-acc');
    const distEl = document.getElementById('dist-valor');
    const hint   = document.getElementById('dist-hint');
    const btn    = document.getElementById('btn-checkin');
    if (!dot) return;

    if (!g) {
      dot.className = 'gps-dot error';
      if (label) label.textContent = 'GPS indisponível';
      return;
    }

    dot.className = 'gps-dot ok';
    if (label)  label.textContent  = 'GPS Ativo';
    if (coords) coords.textContent = `${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`;
    if (acc && g.accuracy) acc.textContent = `±${Math.round(g.accuracy)}m`;

    // Restaurar botão se estava no modo "sem GPS"
    if (btn && btn.textContent.includes('sem GPS')) {
      btn.style.background = '';
      btn.style.color      = '';
      btn.textContent      = '✅ Fazer Check-in';
    }

    if (!slot?.lat || !slot?.lng) {
      if (btn) btn.disabled = false;
      return;
    }

    const dist  = _calcDistancia(g.lat, g.lng, parseFloat(slot.lat), parseFloat(slot.lng));
    const raio  = parseFloat(slot.raio_metros || 50);
    const dentro = dist <= raio;

    if (distEl) {
      distEl.textContent = dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`;
      distEl.style.color = dentro ? 'var(--green)' : 'var(--yellow)';
    }
    if (hint) {
      hint.textContent = dentro
        ? `✅ Dentro do raio de ${raio}m`
        : `⚠️ Fora do raio (${Math.round(dist)}m do local)`;
    }
    if (btn) {
      btn.disabled = false;
      if (dentro) {
        btn.style.background = '';
        btn.style.color      = '';
        btn.textContent      = '✅ Fazer Check-in';
      } else {
        btn.style.background = 'var(--yellow)';
        btn.style.color      = '#1a1a2e';
        btn.textContent      = '⚠️ Check-in fora do raio';
      }
    }
  },

  async _executarCheckin() {
    const slot = state.get('slot');
    const g    = _gps.posicao;
    let forcar = false;

    // Validação de GPS
    if (!g) {
      if (!confirm('GPS não disponível. Fazer check-in sem validação de localização?\n\nA gestão será notificada.')) return;
      forcar = true;
    } else if (slot?.lat && slot?.lng) {
      const dist = _calcDistancia(g.lat, g.lng, parseFloat(slot.lat), parseFloat(slot.lng));
      const raio = parseFloat(slot.raio_metros || 50);
      if (dist > raio) {
        if (!confirm(`⚠️ Você está a ${Math.round(dist)}m do local (máx ${raio}m).\n\nA gestão será notificada e haverá penalidade no ranking.\n\nDeseja prosseguir?`)) return;
        forcar = true;
      }
    }

    // Motivo de atraso
    let motivo = null;
    const atraso = _minutosAtraso(slot?.inicio);
    if (atraso > 5) {
      motivo = await _modalMotivo(
        `Check-in com ${atraso} min de atraso`,
        'Informe o motivo para não afetar sua pontuação.'
      );
      if (motivo === null) return; // cancelou o modal
    }

    const btn = document.getElementById('btn-checkin');
    if (btn) { btn.disabled = true; btn.textContent = 'Registrando...'; }

    try {
      const payload = {
        evento:   'CHECKIN',
        slot_id:  slot?.slot_id,
        lat:      g?.lat  || 0,
        lng:      g?.lng  || 0,
        accuracy: g?.accuracy || 999,
        forcar,
        ...(motivo || {})
      };
      const res = await api.post(payload);

      if (res.ok) {
        _gps.pararWatch();
        // Atualizar state com novo status
        state.set('slot', { ...slot, status: 'EM_ATIVIDADE' });
        state.set('jornada', {
          jornada_id:   res.jornada_id || res.dados?.jornada_id,
          inicio_real:  new Date().toISOString(),
          status:       'EM_ATIVIDADE'
        });
        ui.toast('✅ Check-in registrado!', 'success');
        router.go('em-atividade');
      } else {
        ui.toast('❌ ' + (res.mensagem || res.erro || 'Erro no check-in'), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '✅ Fazer Check-in'; }
      }
    } catch (_) {
      ui.toast('❌ Sem conexão. Tente novamente.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Fazer Check-in'; }
    }
  },

  // ── EM ATIVIDADE ──────────────────────────────────────────────────────────
  renderAtivo() {
    const slot    = state.get('slot');
    const jornada = state.get('jornada');

    ui.render(`
      <div class="screen">
        ${ui.header('Em Atividade', slot?.local || '', false)}
        <div class="content">

          ${ui.statusBadge('EM_ATIVIDADE')}

          <div class="card" style="text-align:center;padding:24px 20px">
            <div class="section-label" style="margin-bottom:8px">TEMPO ATIVO</div>
            <div id="timer-display" style="font-size:50px;font-weight:800;color:var(--green);letter-spacing:-2px;line-height:1">00:00:00</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2)">
              <span>Progresso do slot</span><span id="progress-pct">0%</span>
            </div>
            <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
              <div id="progress-fill" style="height:100%;background:var(--green);width:0%;transition:width 1s linear;border-radius:2px"></div>
            </div>
          </div>

          <div class="card">
            <div class="info-row"><span class="info-label">Local</span><span class="info-value">${slot?.local || '—'}</span></div>
            <div class="info-row"><span class="info-label">Check-in</span><span class="info-value">${ui.hora(jornada?.inicio_real)}</span></div>
            <div class="info-row"><span class="info-label">Término previsto</span><span class="info-value">${_fmtHora(slot?.fim)}</span></div>
            <div class="info-row"><span class="info-label">Restante</span><span class="info-value" id="restante">—</span></div>
          </div>

          <div class="gps-indicator">
            <div class="gps-dot ok"></div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">Monitoramento ativo</div>
              <div id="gps-at-coords" style="font-size:11px;color:var(--text2)">—</div>
            </div>
            <div id="gps-at-acc" style="font-size:11px;color:var(--text2)"></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <button class="btn btn-warning" onclick="router.go('pausa')">⏸ Pausar</button>
            <button class="btn btn-danger"  onclick="router.go('checkout')">🏁 Encerrar</button>
          </div>

        </div>
      </div>
    `);

    // Calcular acumulado desde o check-in
    const ini = jornada?.inicio_real ? new Date(jornada.inicio_real).getTime() : Date.now();
    const acumulado = Math.floor((Date.now() - ini) / 1000);
    _timer.iniciar(acumulado);
    _timer.onTick(s => operacao._atualizarProgress(s, slot, jornada));

    // GPS watch para monitoramento
    _gps.iniciarWatch(g => {
      const coords = document.getElementById('gps-at-coords');
      const acc    = document.getElementById('gps-at-acc');
      if (g) {
        if (coords) coords.textContent = `${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`;
        if (acc && g.accuracy) acc.textContent = `±${Math.round(g.accuracy)}m`;
      }
    });

    // Aviso quando slot termina
    this._iniciarAvisoFim(slot, jornada);
  },

  _atualizarProgress(segundos, slot, jornada) {
    if (!slot?.fim || !jornada?.inicio_real) return;
    const fill   = document.getElementById('progress-fill');
    const pctEl  = document.getElementById('progress-pct');
    const restEl = document.getElementById('restante');

    const ini = new Date(jornada.inicio_real).getTime();
    const [h, m] = String(slot.fim).substring(0, 5).split(':').map(Number);
    const fimD = new Date(jornada.inicio_real);
    fimD.setHours(h, m, 0, 0);
    if (fimD.getTime() < ini) fimD.setDate(fimD.getDate() + 1);

    const totalS = (fimD.getTime() - ini) / 1000;
    const pct    = Math.min(100, (segundos / totalS) * 100).toFixed(1);
    const restS  = Math.max(0, totalS - segundos);
    const rh = Math.floor(restS / 3600);
    const rm = Math.floor((restS % 3600) / 60);

    if (fill)  fill.style.width   = pct + '%';
    if (pctEl) pctEl.textContent  = pct + '%';
    if (restEl) restEl.textContent = `${rh}h ${String(rm).padStart(2, '0')}m`;
  },

  _iniciarAvisoFim(slot, jornada) {
    if (!slot?.fim || !jornada?.inicio_real) return;
    const [h, m] = String(slot.fim).substring(0, 5).split(':').map(Number);
    const fimD = new Date(jornada.inicio_real);
    fimD.setHours(h, m, 0, 0);
    if (fimD.getTime() < new Date(jornada.inicio_real).getTime()) fimD.setDate(fimD.getDate() + 1);

    const msRestantes = fimD.getTime() - Date.now();
    if (msRestantes <= 0) return;

    setTimeout(() => {
      if (document.getElementById('banner-fim')) return;
      const banner = document.createElement('div');
      banner.id = 'banner-fim';
      banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:420px;background:var(--card);border:1px solid rgba(241,196,15,.4);border-radius:14px;padding:16px;z-index:500;box-shadow:var(--shadow)';
      banner.innerHTML = `
        <div style="font-size:15px;font-weight:700;color:var(--yellow);margin-bottom:6px">⌛ Slot encerrou às ${_fmtHora(slot.fim)}</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:14px">Você ainda está ativo. O que deseja fazer?</div>
        <div style="display:flex;gap:10px">
          <button onclick="document.getElementById('banner-fim').remove();router.go('checkout')" style="flex:1;background:var(--red);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer">🏁 Encerrar agora</button>
          <button onclick="document.getElementById('banner-fim').remove()" style="flex:1;background:rgba(241,196,15,.15);border:1px solid rgba(241,196,15,.3);color:var(--yellow);border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer">⏰ Continuar</button>
        </div>`;
      document.body.appendChild(banner);
    }, msRestantes);
  },

  // ── PAUSA ─────────────────────────────────────────────────────────────────
  renderPausa() {
    const acumulado = _formatTimer(_timer.segundos());

    ui.render(`
      <div class="screen">
        ${ui.header('Pausar Jornada', '', true)}
        <div class="content">

          <div class="card" style="text-align:center;padding:24px">
            <div class="section-label" style="margin-bottom:8px">TEMPO ACUMULADO</div>
            <div style="font-size:40px;font-weight:800;color:var(--yellow)">${acumulado}</div>
          </div>

          <div class="card" style="color:var(--text2);font-size:14px;line-height:1.6">
            O timer pausará enquanto você estiver fora. Retome quando estiver pronto para continuar.
          </div>

          <button id="btn-pausar" class="btn btn-warning" onclick="operacao._executarPausa()">
            ⏸ Confirmar Pausa
          </button>
          <button class="btn btn-ghost" onclick="router.back()">Voltar</button>
        </div>
      </div>
    `);
  },

  async _executarPausa() {
    const jornada = state.get('jornada');
    const btn = document.getElementById('btn-pausar');
    if (btn) { btn.disabled = true; btn.textContent = 'Pausando...'; }

    try {
      const res = await api.post({ evento: 'PAUSE', jornada_id: jornada?.jornada_id });
      if (res.ok) {
        _timer.pausar();
        _gps.pararWatch();
        state.set('slot', { ...state.get('slot'), status: 'PAUSADO' });
        state.set('jornada', { ...jornada, status: 'PAUSADO' });
        ui.toast('⏸ Jornada pausada', 'success');
        router.go('pausado');
      } else {
        ui.toast('❌ ' + (res.mensagem || 'Erro ao pausar'), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '⏸ Confirmar Pausa'; }
      }
    } catch (_) {
      ui.toast('❌ Sem conexão.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '⏸ Confirmar Pausa'; }
    }
  },

  // ── PAUSADO ───────────────────────────────────────────────────────────────
  renderPausado() {
    const acumulado = _formatTimer(_timer.segundos());

    ui.render(`
      <div class="screen">
        ${ui.header('Jornada Pausada', '', false)}
        <div class="content">

          ${ui.statusBadge('PAUSADO')}

          <div class="card" style="text-align:center;padding:24px">
            <div class="section-label" style="margin-bottom:8px">TEMPO ACUMULADO</div>
            <div style="font-size:40px;font-weight:800;color:var(--yellow)">${acumulado}</div>
            <div style="font-size:13px;color:var(--text2);margin-top:8px">⏸ Timer pausado</div>
          </div>

          <div class="card" style="color:var(--text2);font-size:14px">
            Retome quando estiver pronto para continuar a jornada.
          </div>

          <button id="btn-retomar" class="btn btn-success" onclick="operacao._executarResume()">
            ▶ Retomar Jornada
          </button>
          <button class="btn btn-danger" onclick="router.go('checkout')">🏁 Encerrar mesmo assim</button>
        </div>
      </div>
    `);
  },

  async _executarResume() {
    const jornada = state.get('jornada');
    const btn = document.getElementById('btn-retomar');
    if (btn) { btn.disabled = true; btn.textContent = 'Retomando...'; }

    try {
      const res = await api.post({ evento: 'RESUME', jornada_id: jornada?.jornada_id });
      if (res.ok) {
        _timer.retomar();
        state.set('slot', { ...state.get('slot'), status: 'EM_ATIVIDADE' });
        state.set('jornada', { ...jornada, status: 'EM_ATIVIDADE' });
        router.go('em-atividade');
      } else {
        ui.toast('❌ ' + (res.mensagem || 'Erro ao retomar'), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '▶ Retomar Jornada'; }
      }
    } catch (_) {
      ui.toast('❌ Sem conexão.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '▶ Retomar Jornada'; }
    }
  },

  // ── CHECKOUT ──────────────────────────────────────────────────────────────
  renderCheckout() {
    ui.render(`
      <div class="screen">
        ${ui.header('Encerrar Jornada', '', true)}
        <div class="content">

          <div class="card" style="font-size:14px;color:var(--text2);line-height:1.6">
            Sua localização atual será registrada. Esta ação <strong style="color:var(--text)">não pode ser desfeita</strong>.
          </div>

          <div class="gps-indicator">
            <div class="gps-dot waiting" id="co-gps-dot"></div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px" id="co-gps-label">Obtendo GPS...</div>
              <div style="font-size:11px;color:var(--text2)" id="co-gps-coords"></div>
            </div>
          </div>

          <button id="btn-checkout" class="btn btn-danger" onclick="operacao._executarCheckout(false)">
            🏁 Encerrar Jornada
          </button>
          <button class="btn btn-ghost" onclick="router.back()">Voltar</button>

          <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
            <div style="font-size:12px;color:var(--text2);margin-bottom:8px;text-align:center">Sem sinal de GPS?</div>
            <button class="btn btn-warning" style="font-size:13px" onclick="operacao._executarCheckout(true)">
              ⚠️ Checkout sem GPS — Gestão será notificada
            </button>
          </div>
        </div>
      </div>
    `);

    // Buscar GPS para checkout
    _gps.obter(8000).then(g => {
      const dot    = document.getElementById('co-gps-dot');
      const label  = document.getElementById('co-gps-label');
      const coords = document.getElementById('co-gps-coords');
      if (!dot) return;
      if (g) {
        dot.className = 'gps-dot ok';
        if (label)  label.textContent  = 'GPS pronto';
        if (coords) coords.textContent = `${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`;
        state.set('_gps_checkout', g);
      } else {
        dot.className = 'gps-dot error';
        if (label) label.textContent = 'GPS indisponível';
      }
    });
  },

  async _executarCheckout(excepcional = false) {
    const jornada = state.get('jornada');
    const slot    = state.get('slot');
    const g       = state.get('_gps_checkout');

    // Motivo de saída antecipada
    let motivo = null;
    const antecipado = _minutosAntecipado(slot?.fim);
    if (!excepcional && antecipado > 5) {
      motivo = await _modalMotivo(
        `Saída ${antecipado} min antes do previsto`,
        'Informe o motivo para não afetar sua pontuação.'
      );
    }

    const btn = document.getElementById('btn-checkout');
    if (btn) { btn.disabled = true; btn.textContent = 'Encerrando...'; }

    try {
      const payload = {
        evento:     excepcional ? 'CHECKOUT_EXCEPCIONAL' : 'CHECKOUT',
        jornada_id: jornada?.jornada_id,
        ...(g && !excepcional ? { lat: g.lat, lng: g.lng, accuracy: g.accuracy } : {}),
        ...(excepcional ? { motivo: 'EXCEPCIONAL_SEM_GPS' } : {}),
        ...(motivo || {})
      };

      const res = await api.post(payload);

      if (res.ok) {
        _timer.parar();
        _gps.pararWatch();
        // Limpar state imediatamente
        state.set('jornada', null);
        state.set('slot', null);
        state.set('_gps_checkout', null);
        router.go('encerrado');
      } else {
        ui.toast('❌ ' + (res.mensagem || res.erro || 'Erro ao encerrar'), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '🏁 Encerrar Jornada'; }
      }
    } catch (_) {
      ui.toast('❌ Sem conexão.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🏁 Encerrar Jornada'; }
    }
  },

  // ── ENCERRADO ─────────────────────────────────────────────────────────────
  renderEncerrado() {
    const total = _formatTimer(_timer.segundos());
    const agora = ui.hora(new Date().toISOString());

    ui.render(`
      <div class="screen no-bottom">
        ${ui.header('Jornada Encerrada', '', false)}
        <div class="content">

          <div class="card" style="text-align:center;padding:32px 20px">
            <div style="font-size:48px;margin-bottom:12px">✅</div>
            <div style="font-size:20px;font-weight:800;margin-bottom:4px">Jornada concluída!</div>
            <div style="font-size:13px;color:var(--text2)">Obrigado pelo seu trabalho hoje.</div>
          </div>

          <div class="card">
            <div class="info-row">
              <span class="info-label">Duração total</span>
              <span class="info-value" style="font-weight:800;font-size:18px;color:var(--green)">${total}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Check-out</span>
              <span class="info-value">${agora}</span>
            </div>
          </div>

          <button class="btn btn-primary" onclick="router.go('home')">← Voltar ao início</button>
        </div>
      </div>
    `);
  },

  // ── DISPATCH POR STATUS ───────────────────────────────────────────────────
  // Usado por router.go('operacao') — decide qual tela mostrar baseado no estado atual
  async renderPorStatus() {
    // Sempre busca estado fresco do servidor
    ui.render(`<div class="screen no-bottom" style="align-items:center;justify-content:center">${ui.spinner('Carregando...')}</div>`);

    try {
      const res = await api.get('GET_SLOT_ATUAL');
      if (res.ok && res.dados) {
        const slot    = res.dados;
        const jornada = res.jornada || null;
        state.set('slot', slot);
        if (jornada) state.set('jornada', jornada);

        const map = {
          'ACEITO':       'checkin',
          'EM_ATIVIDADE': 'em-atividade',
          'PAUSADO':      'pausado',
          'ENCERRADO':    'encerrado',
        };
        router.go(map[slot.status] || 'checkin', false);
        return;
      }
    } catch (_) {}

    // Fallback — usar state local
    const slot = state.get('slot');
    const status = slot?.status || 'ACEITO';
    const map = { 'ACEITO': 'checkin', 'EM_ATIVIDADE': 'em-atividade', 'PAUSADO': 'pausado' };
    router.go(map[status] || 'checkin', false);
  }
};
