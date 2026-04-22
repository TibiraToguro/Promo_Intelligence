const mapa = {
  _map: null,
  _markers: {},
  _watchId: null,

  render() {
    document.getElementById('app').innerHTML = `
      <div class="screen no-bottom" style="height:100dvh;background:#0A0A0A;display:flex;flex-direction:column;overflow:hidden">
        <div class="header" style="background:#0A0A0A;border-bottom:1px solid #2C2C2C;flex-shrink:0;z-index:100;height:70px">
          <button onclick="router.back()" style="width:40px;height:40px;border-radius:10px;background:#161616;border:1px solid #2C2C2C;color:#fff;font-size:18px;cursor:pointer">←</button>
          <div style="flex:1;margin-left:12px">
            <div style="font-size:16px;font-weight:900;color:#fff;font-family:'Syne'">Mapa Operacional</div>
            <div id="mapa-gps-status" style="font-size:10px;color:#555;font-family:var(--mono);text-transform:uppercase;margin-top:2px">Obtendo GPS...</div>
          </div>
          <button onclick="mapa._centralizar()" style="background:#00FF87;border:none;color:#000;font-size:11px;font-weight:900;padding:8px 14px;border-radius:10px;cursor:pointer;letter-spacing:0.5px">CENTRALIZAR</button>
        </div>

        <div id="mapa-container" style="flex:1;position:relative;background:#0A0A0A">
          <div id="leaflet-map" style="width:100%;height:100%;z-index:1"></div>
          <div id="mapa-loading" style="position:absolute;inset:0;background:#0A0A0A;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;z-index:1000">
            <div class="spinner"></div>
            <div style="color:#555;font-size:12px;font-weight:800;letter-spacing:1px">CARREGANDO MAPA</div>
          </div>
        </div>

        <div style="background:#0A0A0A;border-top:1px solid #2C2C2C;padding:12px 20px;display:flex;gap:15px;align-items:center;flex-shrink:0;z-index:100">
           <span style="font-size:10px;font-weight:800;color:#555;display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:#00FF87"></span>ATIVO</span>
           <span style="font-size:10px;font-weight:800;color:#555;display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:#F5B700"></span>EM PAUSA</span>
           <span style="font-size:10px;font-weight:800;color:#555;display:flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:#3B9EFF"></span>MEU PONTO</span>
        </div>

        <nav class="bottom-nav">
          <button class="nav-item" onclick="router.go('home')"><span class="nav-icon">🏠</span><span>Home</span></button>
          <button class="nav-item" onclick="router.go('slot')"><span class="nav-icon">📍</span><span>Vagas</span></button>
          <button class="nav-item active" onclick="router.go('mapa')"><span class="nav-icon">🗺️</span><span>Mapa</span></button>
        </nav>
      </div>`;

    this._carregarLeaflet();
  },

  _carregarLeaflet() {
    if (window.L) { this._inicializar(); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => this._inicializar();
    document.head.appendChild(script);
  },

  async _inicializar() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl) return;
    this._map = L.map('leaflet-map', { center: [-23.55, -46.63], zoom: 13, zoomControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
      attribution: '&copy; CartoDB' 
    }).addTo(this._map);
    
    document.getElementById('mapa-loading').style.display = 'none';
    await Promise.all([this._plotarSlot(), this._plotarPromotoresAtivos(), this._iniciarGPS()]);
  },

  async _plotarSlot() {
    try {
      const res = await api.get('GET_SLOT_ATUAL');
      if (res.ok && res.jornadas?.length) {
        const slot = res.jornadas[0].slot;
        const lat = parseFloat(slot.lat), lng = parseFloat(slot.lng);
        const icon = L.divIcon({ 
          html: `<div style="background:#3B9EFF;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 0 15px rgba(59,158,255,0.5)"></div>`, 
          className: '', iconSize: [16, 16], iconAnchor: [8, 8] 
        });
        L.marker([lat, lng], { icon }).addTo(this._map).bindPopup(`<b>📍 ${slot.local_nome || slot.local}</b>`);
        L.circle([lat, lng], { radius: parseFloat(slot.raio_metros || 100), color: '#3B9EFF', fillOpacity: 0.1, weight: 1 }).addTo(this._map);
        this._slotLatLng = [lat, lng];
        this._map.setView([lat, lng], 15);
      }
    } catch(_) {}
  },

  async _plotarPromotoresAtivos() {
    try {
      const res = await api.get('GET_MAPA_PROMOTOR');
      if (!res.ok || !res.pontos?.length) return;
      const meuId = state.get('promotor')?.user_id;
      res.pontos.forEach(p => {
        if (!p.lat || !p.lng || p.user_id === meuId) return;
        
        const isPausa = p.status_jornada === 'PAUSADO';
        const cor = isPausa ? '#F5B700' : '#00FF87';
        const nomeCurto = (p.nome_completo || 'Promotor').split(' ')[0];

        const icon = L.divIcon({
          html: `<div style="display:flex;flex-direction:column;align-items:center">
                  <div style="background:${cor};border:2px solid #000;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#000;box-shadow:0 0 10px ${cor}88">${nomeCurto[0]}</div>
                  <div style="background:rgba(22,22,22,0.9);color:#fff;font-size:8px;font-weight:800;padding:2px 5px;border-radius:4px;margin-top:2px;white-space:nowrap;border:1px solid #2C2C2C">${nomeCurto}</div>
                </div>`,
          className: '', iconSize: [40, 42], iconAnchor: [20, 42]
        });

        L.marker([parseFloat(p.lat), parseFloat(p.lng)], { icon }).addTo(this._map).bindPopup(`<b>${p.nome_completo}</b><br>Status: ${p.status_jornada}`);
      });
    } catch(_) {}
  },

  _iniciarGPS() {
    if (!navigator.geolocation) return;
    this._watchId = navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude, acc = Math.round(pos.coords.accuracy);
      const statusEl = document.getElementById('mapa-gps-status');
      if (!this._markers.eu) {
        const icon = L.divIcon({ 
          html: `<div style="background:#fff;border:3px solid #00FF87;border-radius:50%;width:16px;height:16px;box-shadow:0 0 15px #00FF87"></div>`, 
          className: '', iconSize: [16, 16], iconAnchor: [8, 8] 
        });
        this._markers.eu = L.marker([lat, lng], { icon }).addTo(this._map).bindPopup('<b>🟢 Você</b>');
      } else { this._markers.eu.setLatLng([lat, lng]); }
      if (statusEl) statusEl.innerHTML = `GPS Ativo (${acc}m)`;
    }, null, { enableHighAccuracy: true });
  },

  _centralizar() {
    if (this._markers.eu) this._map.setView(this._markers.eu.getLatLng(), 16);
    else if (this._slotLatLng) this._map.setView(this._slotLatLng, 15);
  },

  destroy() {
    if (this._watchId !== null) navigator.geolocation.clearWatch(this._watchId);
    if (this._map) this._map.remove();
    this._map = null; this._markers = {};
  }
};
