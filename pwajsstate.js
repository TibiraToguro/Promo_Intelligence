const state = (() => {
  const _s = {
    token:         null,
    promotor:      null,
    slot:          null,
    jornada:       null,   // { jornada_id, status, inicio_real }
    currentScreen: null,
    _gps_checkout: null,
  };

  return {
    get: k => _s[k],
    set: (k, v) => { _s[k] = v; },

    patch(k, partial) { _s[k] = { ..._s[k], ...partial }; },

    saveToken(token) {
      _s.token = token;
      try { localStorage.setItem('pwa_token', token); } catch (_) {}
    },

    loadToken() {
      try {
        const urlToken = new URLSearchParams(location.search).get('token');
        if (urlToken) { _s.token = urlToken; return urlToken; }
        const saved = localStorage.getItem('pwa_token');
        if (saved) { _s.token = saved; return saved; }
      } catch (_) {}
      return null;
    },

    clearToken() {
      _s.token   = null;
      _s.jornada = null;
      _s.slot    = null;
      try { localStorage.removeItem('pwa_token'); } catch (_) {}
    },

    // Salva promotor E atualiza slot/jornada a partir do perfil
    setPromotor(p) {
      _s.promotor = p;
      _s.slot     = p?.slot_atual   || null;
      _s.jornada  = p?.jornada_atual || null;
    },

    // Persistência de jornada em sessionStorage
    saveJornada(jornada) {
      _s.jornada = jornada;
      try { sessionStorage.setItem('jet_jornada', JSON.stringify(jornada)); } catch (_) {}
    },

    loadJornada() {
      if (_s.jornada) return _s.jornada;
      try {
        const j = JSON.parse(sessionStorage.getItem('jet_jornada') || 'null');
        if (j) _s.jornada = j;
        return j;
      } catch (_) { return null; }
    }
  };
})();
