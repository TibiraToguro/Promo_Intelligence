const state = (() => {
  const _s = { token: null, promotor: null, slot: null, currentScreen: null };
  return {
    get: k => _s[k],
    set: (k,v) => { _s[k]=v; },
    saveToken(token){ _s.token = token; try{ localStorage.setItem('pwa_token', token);}catch(_){} },
    loadToken(){
      try {
        const urlToken = new URLSearchParams(location.search).get('token');
        if (urlToken) { _s.token = urlToken; return urlToken; }
        const saved = localStorage.getItem('pwa_token');
        if (saved) { _s.token = saved; return saved; }
      } catch(_) {}
      return null;
    },
    clearToken(){ _s.token = null; try{ localStorage.removeItem('pwa_token'); }catch(_){} },
    setPromotor(p){ _s.promotor = p; _s.slot = p?.slot_atual || null; }
  };
})();
