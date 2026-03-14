const ui = {
  render(html) { document.getElementById('app').innerHTML = html; },
  toast(msg, type='info', duration=3000){
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    setTimeout(() => { el.className = 'toast hidden'; }, duration);
  },
  spinner(label='Carregando…'){ return `<div class="spinner-wrap"><div class="spinner"></div><span class="spinner-label">${label}</span></div>`; },
  statusBadge(status){
    const map = {
      EM_ATIVIDADE:['badge-green','● Em atividade'],ACEITO:['badge-blue','● Aceito'],PAUSADO:['badge-yellow','● Pausado'],
      ENCERRADO:['badge-gray','● Encerrado'],REALOCADO:['badge-purple','● Realocado'],SEM_SLOT:['badge-gray','● Sem slot']
    };
    const [cls, label] = map[status] || ['badge-gray', status || '—'];
    return `<span class="badge ${cls}">${label}</span>`;
  },
  hora(iso){ if (!iso) return '—'; try{return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}catch(_){return '—';} },
  header(title, sub='', showBack=true){
    return `<div class="header">${showBack?'<button class="header-back" onclick="router.back()">‹</button>':''}<div><div class="header-title">${title}</div>${sub?`<div class="header-sub">${sub}</div>`:''}</div></div>`;
  },
  bottomNav(active){
    const items=[{id:'home',icon:'🏠',label:'Home',screen:'home'},{id:'slot',icon:'📍',label:'Slot',screen:'slot'}];
    return `<nav class="bottom-nav">${items.map(it=>`<button class="nav-item ${active===it.id?'active':''}" onclick="router.go('${it.screen}')"><span class="nav-icon">${it.icon}</span><span>${it.label}</span></button>`).join('')}</nav>`;
  }
};
