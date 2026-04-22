// ─── slots.js (gestor) v2 ────────────────────────────────────────────────────
// Lista slots + criação unitária + lote (repetição semanal, cópia, CSV)

const slotsScreen = (() => {
  let _slots = [];
  let _allSlotsRange = [];
  let _dailyStats = {};
  let _locaisFrequentes = [];
  let _selectedSlots = new Set();
  let _currentYear = new Date().getFullYear();
  let _currentMonth = new Date().getMonth();
  let _selectedDate = new Date().toISOString().split('T')[0];
  let _map = null;
  let _mapMarkers = [];

  function _abrirMapa() {
    _openModal('modal-mapa');
    setTimeout(() => {
      if (!_map) {
        _map = L.map('slots-map-container').setView([-23.55, -46.63], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(_map);
      }
      
      // Limpar markers
      _mapMarkers.forEach(m => _map.removeLayer(m));
      _mapMarkers = [];

      const points = [];
      _slots.forEach(s => {
        if (s.lat && s.lng) {
          const color = s.status === 'DISPONIVEL' ? '#fc8181' : '#68d391';
          const marker = L.circleMarker([s.lat, s.lng], {
            radius: 8, fillOpacity: 0.8, color: '#fff', weight: 1, fillColor: color
          }).addTo(_map)
            .bindPopup(`<strong>${s.nome}</strong><br>${s.inicio_slot} - ${s.fim_slot}<br>Status: ${s.status}`);
          
          _mapMarkers.push(marker);
          points.push([s.lat, s.lng]);
        }
      });

      if (points.length > 0) {
        _map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
      }
    }, 300);
  }

  function fecharMapa() {
    _closeModal('modal-mapa');
  }

  // ── Editar Slot ──────────────────────────────────────────────────────────
    _injectCalendarStyles();
    const app = document.getElementById('app');
    app.innerHTML = `
      <section class="screen" id="screen-slots">
        <div class="screen-header">
          <h2 class="screen-title">Gestão de Slots</h2>
          <div style="display:flex;gap:8px;margin-left:auto">
            <button class="btn-icon" id="btn-importar-csv" title="Importar CSV" style="color:#b794f4;border-color:#b794f440">CSV</button>
            <button class="btn-icon" id="btn-lote" title="Criar em lote" style="color:#f6ad55;border-color:#f6ad5540;font-size:13px;width:auto;padding:0 10px">+ Lote</button>
            <button class="btn-icon" id="btn-novo-slot" title="Novo slot" style="color:#63b3ed;border-color:#63b3ed40;font-size:18px">+</button>
            <button class="btn-icon" id="btn-refresh-slots" title="Atualizar">↻</button>
          </div>
        </div>

        <div class="calendar-layout">
          <div class="calendar-container card">
            <div class="calendar-header">
              <button id="cal-prev" class="cal-nav">&lt;</button>
              <h3 id="cal-title" class="cal-title">Abril 2026</h3>
              <button id="cal-next" class="cal-nav">&gt;</button>
            </div>
            <div class="calendar-weekdays">
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>
            <div id="calendar-days" class="calendar-days"></div>
          </div>

          <div class="slots-panel">
            <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;width:100%">
              <div>Slots em <span id="selected-date-label">...</span></div>
              <div style="display:flex;gap:6px">
                <button id="btn-ver-mapa" class="btn-sm" style="background:rgba(99,179,237,0.1);color:#63b3ed;border:1px solid rgba(99,179,237,0.3);font-size:11px;padding:4px 8px;cursor:pointer;border-radius:4px">🗺️ Ver no Mapa</button>
                <button id="btn-replicar-dia" class="btn-sm" style="background:rgba(246,173,85,0.1);color:#f6ad55;border:1px solid rgba(246,173,85,0.3);font-size:11px;padding:4px 8px;cursor:pointer;border-radius:4px">🔄 Replicar Dia</button>
              </div>
            </div>

            <div id="batch-actions-bar" style="display:none;background:rgba(99,179,237,0.1);border:1px solid rgba(99,179,237,0.3);padding:10px 16px;border-radius:8px;margin-top:10px;align-items:center;justify-content:space-between">
              <span style="font-size:12px;color:#63b3ed;font-weight:700"><span id="batch-count">0</span> selecionados</span>
              <div style="display:flex;gap:8px">
                <button class="btn-danger btn-sm" onclick="slotsScreen.excluirSelecionados()">✕ Excluir</button>
                <button class="btn-sm" style="background:none;border:none;color:#718096" onclick="slotsScreen.limparSelecao()">Cancelar</button>
              </div>
            </div>

            <div class="filter-bar" style="margin-top:10px">
              <button class="filter-btn active" data-filter="TODOS">Todos</button>
              <button class="filter-btn" data-filter="DISPONIVEL">Disponíveis</button>
              <button class="filter-btn" data-filter="OCUPADO">Ocupados</button>
              <button class="filter-btn" data-filter="ENCERRADO">Encerrados</button>
            </div>

            <div id="slots-lista" class="card-list" style="margin-top:16px; grid-template-columns: 1fr;">
              <div class="list-loading">Selecione um dia no calendário</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal: Novo Slot (unitário) -->
      <div id="modal-novo-slot" class="modal hidden">
        <div class="modal-box" style="max-width:520px;max-height:90vh;overflow-y:auto">
          <div class="modal-title">+ Novo Slot</div>
          ${_formSlotHTML('ns')}
          <div id="ns-error" style="display:none;color:#fc8181;font-size:12px;margin-bottom:12px;padding:8px;background:rgba(252,129,129,.1);border-radius:4px"></div>
          <div class="modal-actions">
            <button class="btn-danger" id="btn-ns-cancel">Cancelar</button>
            <button class="btn-success" id="btn-ns-criar">✓ Criar Slot</button>
          </div>
        </div>
      </div>

      <!-- Modal: Criar em Lote -->
      <div id="modal-lote" class="modal hidden">
        <div class="modal-box" style="max-width:580px;max-height:90vh;overflow-y:auto">
          <div class="modal-title">+ Criar Slots em Lote</div>

          <!-- Tabs -->
          <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:1px solid rgba(255,255,255,.08)">
            <button class="lote-tab active" data-tab="repetir" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid #63b3ed;color:#63b3ed;cursor:pointer;font-size:13px">📅 Repetição</button>
            <button class="lote-tab" data-tab="semana" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#718096;cursor:pointer;font-size:13px">🔄 Replicar Semana</button>
            <button class="lote-tab" data-tab="copiar" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#718096;cursor:pointer;font-size:13px">📋 Copiar slot</button>
          </div>

          <!-- Tab: Repetição semanal -->
          <div id="tab-repetir">
            ${_formSlotHTML('lt')}
            <div style="margin-bottom:12px">
              <label class="modal-label">DIAS DA SEMANA</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
                ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i) => `
                  <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:13px;color:#a0aec0">
                    <input type="checkbox" class="lote-dia" value="${i}" style="accent-color:#63b3ed"> ${d}
                  </label>`).join('')}
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div>
                <label class="modal-label">DATA INÍCIO</label>
                <input id="lt-data-ini" class="modal-textarea" style="height:40px;resize:none" type="date" />
              </div>
              <div>
                <label class="modal-label">DATA FIM</label>
                <input id="lt-data-fim" class="modal-textarea" style="height:40px;resize:none" type="date" />
              </div>
            </div>
            <div id="lt-preview" style="font-size:12px;color:#718096;margin-bottom:12px"></div>
          </div>

          <!-- Tab: Replicar Semana -->
          <div id="tab-semana" style="display:none">
            <div style="background:rgba(99,179,237,.05);border:1px solid rgba(99,179,237,.2);padding:12px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#a0aec0;line-height:1.5">
              Copia TODOS os slots de uma semana inteira (7 dias) para uma nova semana de destino. Ideal para manter escalas fixas.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
              <div>
                <label class="modal-label">SEGUNDA-FEIRA DE ORIGEM</label>
                <input id="rs-data-origem" class="modal-textarea" style="height:40px" type="date" />
              </div>
              <div>
                <label class="modal-label">SEGUNDA-FEIRA DE DESTINO</label>
                <input id="rs-data-destino" class="modal-textarea" style="height:40px" type="date" />
              </div>
            </div>
          </div>

          <!-- Tab: Copiar slot -->
          <div id="tab-copiar" style="display:none">
            <div style="margin-bottom:12px">
              <label class="modal-label">SLOT DE ORIGEM</label>
              <select id="cp-slot-origem" class="modal-textarea" style="height:40px;resize:none">
                <option value="">Selecione um slot...</option>
              </select>
            </div>
            <div style="margin-bottom:12px">
              <label class="modal-label">NOVAS DATAS (uma por linha)</label>
              <textarea id="cp-datas" class="modal-textarea" rows="5" placeholder="2026-04-01&#10;2026-04-08&#10;2026-04-15"></textarea>
            </div>
          </div>

          <div id="lote-error" style="display:none;color:#fc8181;font-size:12px;margin-bottom:12px;padding:8px;background:rgba(252,129,129,.1);border-radius:4px"></div>
          <div id="lote-progress" style="display:none;font-size:12px;color:#63b3ed;margin-bottom:12px;padding:8px;background:rgba(99,179,237,.08);border-radius:4px"></div>

          <div class="modal-actions">
            <button class="btn-danger" id="btn-lote-cancel">Cancelar</button>
            <button class="btn-success" id="btn-lote-criar">✓ Criar Slots</button>
          </div>
        </div>
      </div>

      <!-- Modal: Importar CSV -->
      <div id="modal-csv" class="modal hidden">
        <div class="modal-box" style="max-width:520px">
          <div class="modal-title">📄 Importar Slots via CSV</div>
          <div style="font-size:12px;color:#718096;margin-bottom:12px;line-height:1.6">
            Formato esperado (com cabeçalho):<br>
            <code style="color:#63b3ed">nome,cidade,lat,lng,data,inicio,fim,raio_metros,cargo_previsto</code>
          </div>
          <button id="btn-baixar-modelo" class="panel-btn" style="margin-bottom:12px">⬇️ Baixar modelo CSV</button>
          <div style="margin-bottom:12px">
            <label class="modal-label">SELECIONAR ARQUIVO CSV</label>
            <input id="csv-file" type="file" accept=".csv,.txt" style="width:100%;padding:10px;background:#0a0f1e;border:1px solid rgba(99,179,237,.2);border-radius:4px;color:#e2e8f0;font-size:13px" />
          </div>
          <div id="csv-preview" style="display:none;margin-bottom:12px;max-height:200px;overflow-y:auto"></div>
          <div id="csv-error" style="display:none;color:#fc8181;font-size:12px;margin-bottom:12px;padding:8px;background:rgba(252,129,129,.1);border-radius:4px"></div>
          <div id="csv-progress" style="display:none;font-size:12px;color:#63b3ed;margin-bottom:12px;padding:8px;background:rgba(99,179,237,.08);border-radius:4px"></div>
          <div class="modal-actions">
            <button class="btn-danger" id="btn-csv-cancel">Cancelar</button>
            <button class="btn-success" id="btn-csv-importar" disabled>✓ Importar</button>
          </div>
        </div>
      </div>

      <!-- Modal: Mapa do Dia -->
      <div id="modal-mapa" class="modal hidden">
        <div class="modal-box" style="max-width:800px; width:95%">
          <div class="modal-title">🗺️ Distribuição de Slots</div>
          <div id="slots-map-container"></div>
          <div class="modal-actions">
            <button class="btn-danger" onclick="slotsScreen.fecharMapa()">Fechar Mapa</button>
          </div>
        </div>
      </div>
    `;

    _bindEvents();
    _preencherDataHoje();
    _renderCalendar();
    _loadRange();
    _load();
  }

  function _injectCalendarStyles() {
    if (document.getElementById('slots-calendar-styles')) return;
    const s = document.createElement('style');
    s.id = 'slots-calendar-styles';
    s.textContent = `
      .calendar-layout { display: grid; grid-template-columns: 350px 1fr; gap: 24px; align-items: start; padding-top: 10px; }
      @media (max-width: 900px) { .calendar-layout { grid-template-columns: 1fr; } }
      
      .calendar-container { background: #0d1526; border-radius: 12px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); }
      .calendar-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
      .cal-title { font-size: 15px; font-weight: 700; color: #fff; margin: 0; font-family: 'IBM Plex Mono', monospace; text-transform: uppercase; letter-spacing: 1px; }
      .cal-nav { background: rgba(99,179,237,0.05); border: 1px solid rgba(99,179,237,0.3); color: #63b3ed; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-weight: bold; transition: all 0.2s; }
      .cal-nav:hover { background: rgba(99,179,237,0.15); border-color: #63b3ed; }
      
      .calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; margin-bottom: 12px; }
      .calendar-weekdays span { font-size: 10px; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 1px; }
      
      .calendar-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
      .cal-day { 
        aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
        border-radius: 8px; font-size: 13px; font-weight: 500; color: #718096; cursor: pointer; transition: all 0.2s;
        position: relative; border: 1px solid transparent; background: rgba(255,255,255,0.02);
      }
      .cal-day:hover { background: rgba(99,179,237,0.08); color: #fff; border-color: rgba(99,179,237,0.2); }
      .cal-day.other-month { opacity: 0.1; cursor: default; background: none; }
      .cal-day.today { border-color: rgba(104,211,145,0.4); color: #68d391; font-weight: 700; background: rgba(104,211,145,0.05); }
      .cal-day.selected { background: #63b3ed !important; color: #0a0f1e !important; font-weight: 700; box-shadow: 0 4px 12px rgba(99,179,237,0.3); }
      
      .cal-dot { width: 4px; height: 4px; border-radius: 50%; background: #63b3ed; position: absolute; bottom: 6px; display: none; }
      .cal-day.has-vagos .cal-dot { display: block; background: #fc8181; }
      .cal-day.has-full .cal-dot { display: block; background: #68d391; }
      .cal-day.has-done .cal-dot { display: block; background: #718096; }
      .cal-day.selected .cal-dot { background: #0a0f1e; }
      
      .slots-panel { display: flex; flex-direction: column; gap: 16px; background: rgba(0,0,0,0.1); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03); }
      .card.selected { border-color: #63b3ed; background: rgba(99,179,237,0.05); box-shadow: 0 0 0 1px rgba(99,179,237,0.3); }

      /* Live Status Badges */
      .live-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
      .live-dot.active { background: #68d391; box-shadow: 0 0 8px #68d391; animation: pulse-green 2s infinite; }
      .live-dot.late { background: #fc8181; box-shadow: 0 0 8px #fc8181; animation: pulse-red 2s infinite; }
      .live-dot.done { background: #718096; }
      
      @keyframes pulse-green { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
      @keyframes pulse-red { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); } }

      #slots-map-container { height: 400px; width: 100%; border-radius: 8px; background: #0a0f1e; margin-top: 10px; border: 1px solid rgba(255,255,255,0.1); }
    `;
    document.head.appendChild(s);
  }

  function _renderCalendar() {
    const daysCont = document.getElementById('calendar-days');
    const titleCont = document.getElementById('cal-title');
    if (!daysCont || !titleCont) return;

    const firstDay = new Date(_currentYear, _currentMonth, 1);
    const lastDay = new Date(_currentYear, _currentMonth + 1, 0);
    const prevLastDay = new Date(_currentYear, _currentMonth, 0);
    
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    titleCont.textContent = `${meses[_currentMonth]} ${_currentYear}`;

    let html = '';
    
    // Dias do mês anterior
    for (let i = startDay; i > 0; i--) {
      html += `<div class="cal-day other-month">${prevLastDay.getDate() - i + 1}</div>`;
    }
    
    // Dias do mês atual
    const hojeStr = new Date().toISOString().split('T')[0];
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(_currentYear, _currentMonth, i);
      const dStr = d.toISOString().split('T')[0];
      const isToday = dStr === hojeStr;
      const isSelected = dStr === _selectedDate;
      const stats = _dailyStats[dStr];
      let colorClass = '';
      if (stats) {
        if (stats.vagos > 0) colorClass = 'has-vagos';
        else if (stats.ocupados > 0) colorClass = 'has-full';
        else if (stats.encerrados > 0) colorClass = 'has-done';
      }
      
      html += `
        <div class="cal-day ${isToday?'today':''} ${isSelected?'selected':''} ${colorClass}" 
             onclick="slotsScreen.selectDate('${dStr}')">
          ${i}
          <div class="cal-dot"></div>
        </div>`;
    }
    
    daysCont.innerHTML = html;
    const label = document.getElementById('selected-date-label');
    if (label) {
      const [y, m, d] = _selectedDate.split('-');
      label.textContent = `${d}/${m}/${y}`;
    }
  }

  function selectDate(dStr) {
    _selectedDate = dStr;
    _renderCalendar();
    _load();
  }

  async function _loadRange() {
    try {
      const de = new Date(_currentYear, _currentMonth, 1).toISOString().split('T')[0];
      const ate = new Date(_currentYear, _currentMonth + 1, 0).toISOString().split('T')[0];
      const res = await api.getSlotsRange(de, ate);
      _allSlotsRange = res?.data || [];
      _dailyStats = res?.stats || {};
      _renderCalendar();
    } catch (e) { console.error('Erro ao carregar range:', e); }
  }

  function _formSlotHTML(prefix) {
    const isNew = prefix === 'ns';
    return `
      ${isNew ? `
      <div style="margin-bottom:16px;background:rgba(99,179,237,0.05);padding:12px;border-radius:8px;border:1px solid rgba(99,179,237,0.2)">
        <label class="modal-label" style="color:#63b3ed">BIBLIOTECA DE LOCAIS</label>
        <select id="${prefix}-lib" class="modal-textarea" style="height:40px;margin-top:6px" onchange="slotsScreen.usarTemplate('${prefix}')">
          <option value="">-- Selecione um local salvo --</option>
        </select>
      </div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="modal-label">LOCAL / NOME *</label><input id="${prefix}-nome" class="modal-textarea" style="height:40px;resize:none" placeholder="Ex: Parque Ibirapuera" /></div>
        <div><label class="modal-label">CIDADE *</label><input id="${prefix}-cidade" class="modal-textarea" style="height:40px;resize:none" placeholder="São Paulo" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="modal-label">LATITUDE *</label><input id="${prefix}-lat" class="modal-textarea" style="height:40px;resize:none" placeholder="-23.5873" type="number" step="any" /></div>
        <div><label class="modal-label">LONGITUDE *</label><input id="${prefix}-lng" class="modal-textarea" style="height:40px;resize:none" placeholder="-46.6573" type="number" step="any" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="modal-label">DATA *</label><input id="${prefix}-data" class="modal-textarea" style="height:40px;resize:none" type="date" /></div>
        <div><label class="modal-label">INÍCIO *</label><input id="${prefix}-inicio" class="modal-textarea" style="height:40px;resize:none" type="time" /></div>
        <div><label class="modal-label">FIM *</label><input id="${prefix}-fim" class="modal-textarea" style="height:40px;resize:none" type="time" /></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="modal-label">RAIO (m)</label><input id="${prefix}-raio" class="modal-textarea" style="height:40px;resize:none" type="number" placeholder="100" value="100" /></div>
        <div><label class="modal-label">OPERAÇÃO</label><input id="${prefix}-operacao" class="modal-textarea" style="height:40px;resize:none" placeholder="PROMO" value="PROMO" /></div>
      </div>
      <div style="margin-bottom:12px">
        <label class="modal-label">CARGO PREVISTO</label>
        <input id="${prefix}-cargo" class="modal-textarea" style="height:40px;resize:none" placeholder="PROMOTOR" value="PROMOTOR" />
      </div>
      ${isNew ? `
      <div style="margin-bottom:12px">
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#a0aec0;cursor:pointer">
          <input type="checkbox" id="${prefix}-save-lib" style="accent-color:#63b3ed"> Salvar este local na biblioteca
        </label>
      </div>` : ''}`;
  }

  function _bindEvents() {
    // Navegação calendário
    document.getElementById('cal-prev')?.addEventListener('click', () => {
      _currentMonth--;
      if (_currentMonth < 0) { _currentMonth = 11; _currentYear--; }
      _renderCalendar();
      _loadRange();
    });
    document.getElementById('cal-next')?.addEventListener('click', () => {
      _currentMonth++;
      if (_currentMonth > 11) { _currentMonth = 0; _currentYear++; }
      _renderCalendar();
      _loadRange();
    });

    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _renderLista(btn.dataset.filter);
      });
    });

    document.getElementById('btn-refresh-slots').addEventListener('click', _load);
    document.getElementById('btn-replicar-dia')?.addEventListener('click', _replicarDia);
    document.getElementById('btn-ver-mapa')?.addEventListener('click', _abrirMapa);

    // Modal unitário
    document.getElementById('btn-novo-slot').addEventListener('click', () => {
      _editandoSlotId = null;
      document.querySelector('#modal-novo-slot .modal-title').textContent = '+ Novo Slot';
      document.getElementById('btn-ns-criar').textContent = '✓ Criar Slot';
      // Limpar form opcionalmente
      ['nome','cidade','lat','lng','inicio','fim'].forEach(k => {
        const el = document.getElementById(`ns-${k}`);
        if (el) el.value = '';
      });
      document.getElementById('ns-data').value = _selectedDate;
      _openModal('modal-novo-slot');
    });
    document.getElementById('btn-ns-cancel').addEventListener('click', () => _closeModal('modal-novo-slot'));
    document.getElementById('btn-ns-criar').addEventListener('click', _criarUnitario);

    // Modal lote
    document.getElementById('btn-lote').addEventListener('click', () => {
      _popularSelectSlots();
      _openModal('modal-lote');
    });
    document.getElementById('btn-lote-cancel').addEventListener('click', () => _closeModal('modal-lote'));
    document.getElementById('btn-lote-criar').addEventListener('click', _criarLote);

    // Tabs do lote
    document.querySelectorAll('.lote-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lote-tab').forEach(t => {
          t.style.borderBottomColor = 'transparent';
          t.style.color = '#718096';
          t.classList.remove('active');
        });
        tab.style.borderBottomColor = '#63b3ed';
        tab.style.color = '#63b3ed';
        tab.classList.add('active');
        document.getElementById('tab-repetir').style.display = tab.dataset.tab === 'repetir' ? 'block' : 'none';
        document.getElementById('tab-semana').style.display  = tab.dataset.tab === 'semana'  ? 'block' : 'none';
        document.getElementById('tab-copiar').style.display  = tab.dataset.tab === 'copiar'  ? 'block' : 'none';
      });
    });

    // Preview de datas no lote
    ['lt-data-ini','lt-data-fim'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', _atualizarPreview);
    });
    document.querySelectorAll('.lote-dia').forEach(cb => cb.addEventListener('change', _atualizarPreview));

    // Modal CSV
    document.getElementById('btn-importar-csv').addEventListener('click', () => _openModal('modal-csv'));
    document.getElementById('btn-csv-cancel').addEventListener('click', () => _closeModal('modal-csv'));
    document.getElementById('btn-csv-importar').addEventListener('click', _importarCSV);
    document.getElementById('btn-baixar-modelo').addEventListener('click', _baixarModeloCSV);
    document.getElementById('csv-file').addEventListener('change', _previewCSV);

    // Fechar modais clicando fora
    ['modal-novo-slot','modal-lote','modal-csv'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', e => {
        if (e.target.id === id) _closeModal(id);
      });
    });
  }

  function _preencherDataHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    const amanhã = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const nsData = document.getElementById('ns-data');
    if (nsData) nsData.value = hoje;
    const ltIni = document.getElementById('lt-data-ini');
    if (ltIni) ltIni.value = hoje;
    const ltFim = document.getElementById('lt-data-fim');
    if (ltFim) ltFim.value = new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0];
  }

  async function _load() {
    const lista = document.getElementById('slots-lista');
    if (lista) lista.innerHTML = '<div class="list-loading">Carregando...</div>';
    try {
      const res = await api.getSlotsHoje(_selectedDate);
      _slots = res?.data || [];
      state.set('slots', _slots);
      _renderLista('TODOS');
    } catch (err) {
      if (lista) lista.innerHTML = `<div class="list-error">Erro: ${err.message}</div>`;
    }
  }

  function _renderLista(filtro) {
    const lista = document.getElementById('slots-lista');
    if (!lista) return;
    const filtrados = filtro === 'TODOS' ? _slots : _slots.filter(s => s.status === filtro);
    if (!filtrados.length) {
      lista.innerHTML = `<div class="list-empty">Nenhum slot encontrado para este dia.</div>`;
      _atualizarBarraLote();
      return;
    }
    lista.innerHTML = filtrados.map(s => {
      const si = _statusSlot(s.status);
      const isSelected = _selectedSlots.has(s.slot_id);
      
      // Lógica de Live Status para Promotores alocados
      let liveStatusHTML = '';
      if (s.promotores && s.promotores.length > 0) {
        liveStatusHTML = s.promotores.map(p => {
          let dotClass = '';
          let statusLabel = p.status;
          const agora = new Date();
          const [hIni, mIni] = (s.inicio_slot || '00:00').split(':').map(Number);
          const inicioSlot = new Date(agora); inicioSlot.setHours(hIni, mIni, 0, 0);

          if (['EM_ATIVIDADE', 'EM_TURNO'].includes(p.status)) {
            dotClass = 'active';
            statusLabel = 'Em atividade';
          } else if (p.status === 'ACEITO') {
            if (agora > new Date(inicioSlot.getTime() + 15 * 60000)) { // 15 min de tolerância
              dotClass = 'late';
              statusLabel = 'Atrasado (sem check-in)';
            } else {
              statusLabel = 'Aguardando início';
            }
          } else if (p.status === 'ENCERRADO') {
            dotClass = 'done';
            statusLabel = 'Concluído';
          }

          return `
            <div style="display:flex;align-items:center;margin-top:4px;font-size:11px;color:#a0aec0">
              <span class="live-dot ${dotClass}"></span>
              <strong>${p.nome}</strong>: ${statusLabel}
            </div>`;
        }).join('');
      }

      return `
        <div class="card ${isSelected?'selected':''}" style="position:relative">
          <div style="position:absolute;top:12px;left:12px;z-index:2">
            <input type="checkbox" style="width:18px;height:18px;accent-color:#63b3ed;cursor:pointer" 
                   ${isSelected?'checked':''} 
                   onchange="slotsScreen.toggleSelecao('${s.slot_id}', this.checked)">
          </div>
          <div class="card-header" style="padding-left:44px">
            <div>
              <div class="card-title">${s.nome || s.slot_id}</div>
              <div class="card-sub">${s.slot_id || ''}</div>
            </div>
            <span class="status-badge" style="background:${si.color}20;color:${si.color};border-color:${si.color}40">${si.label}</span>
          </div>
          <div class="card-body" style="padding-left:44px">
            <div class="card-row"><span>Horário</span><strong>${s.inicio_slot||'—'} → ${s.fim_slot||'—'}</strong></div>
            <div class="card-row"><span>Local</span><strong>${s.cidade || ''}</strong></div>
            <div class="card-row" style="flex-direction:column;align-items:flex-start">
              <span>Equipe:</span>
              <div style="width:100%">${liveStatusHTML || '<em style="font-size:11px;color:#718096">Nenhum promotor alocado</em>'}</div>
            </div>
          </div>
          <div class="card-actions" style="padding-left:44px">
            <button class="btn-success btn-sm" onclick="slotsScreen.copiarSlot('${s.slot_id}')">📋 Copiar</button>
            <button class="btn-sm" style="background:rgba(99,179,237,0.15);color:#63b3ed;border:1px solid rgba(99,179,237,0.3)" onclick="slotsScreen.editarSlot('${s.slot_id}')">✏️ Editar</button>
            <button class="btn-danger btn-sm" onclick="slotsScreen.excluirSlot('${s.slot_id}')">✕ Excluir</button>
          </div>
        </div>`;
    }).join('');
    _atualizarBarraLote();
  }

  function toggleSelecao(id, checked) {
    if (checked) _selectedSlots.add(id); else _selectedSlots.delete(id);
    _atualizarBarraLote();
    // Adicionar classe visual sem renderizar tudo se possível, mas para simplificar:
    _renderLista(document.querySelector('.filter-btn.active')?.dataset.filter || 'TODOS');
  }

  function limparSelecao() {
    _selectedSlots.clear();
    _renderLista(document.querySelector('.filter-btn.active')?.dataset.filter || 'TODOS');
  }

  function _atualizarBarraLote() {
    const bar = document.getElementById('batch-actions-bar');
    const count = document.getElementById('batch-count');
    if (!bar || !count) return;
    if (_selectedSlots.size > 0) {
      bar.style.display = 'flex';
      count.textContent = _selectedSlots.size;
    } else {
      bar.style.display = 'none';
    }
  }

  async function excluirSelecionados() {
    const ids = [..._selectedSlots];
    if (!ids.length) return;
    if (!confirm(`Deseja excluir ${ids.length} slots selecionados?`)) return;
    
    try {
      const res = await api.excluirSlotsLote(ids);
      if (res.ok) {
        _selectedSlots.clear();
        await _load();
        await _loadRange();
      } else alert(res.erro || 'Erro na exclusão');
    } catch(e) { alert('Erro de conexão'); }
  }

  // ── Editar Slot ──────────────────────────────────────────────────────────
  let _editandoSlotId = null;

  async function excluirSlot(slotId) {
    if (!confirm('Deseja realmente excluir este slot?')) return;
    try {
      const res = await api.excluirSlot(slotId);
      if (res.ok) {
        await _load();
        await _loadRange();
      } else {
        alert(res.erro || 'Erro ao excluir');
      }
    } catch (e) { alert('Erro de conexão'); }
  }

  function editarSlot(slotId) {
    const s = _slots.find(x => x.slot_id === slotId);
    if (!s) return;
    _editandoSlotId = slotId;
    _openModal('modal-novo-slot');
    document.querySelector('#modal-novo-slot .modal-title').textContent = '✏️ Editar Slot';
    document.getElementById('btn-ns-criar').textContent = '✓ Salvar Alterações';
    
    // Preencher form
    const p = 'ns';
    document.getElementById(`${p}-nome`).value = s.nome || '';
    document.getElementById(`${p}-cidade`).value = s.cidade || '';
    document.getElementById(`${p}-lat`).value = s.lat || '';
    document.getElementById(`${p}-lng`).value = s.lng || '';
    document.getElementById(`${p}-data`).value = s.data_slot || s.data || '';
    document.getElementById(`${p}-inicio`).value = s.inicio_slot || s.inicio || '';
    document.getElementById(`${p}-fim`).value = s.fim_slot || s.fim || '';
    document.getElementById(`${p}-raio`).value = s.raio_metros || 100;
    document.getElementById(`${p}-cargo`).value = s.cargo_previsto || 'PROMOTOR';
    document.getElementById(`${p}-operacao`).value = s.operacao || 'PROMO';
  }

  async function _salvarEdicao() {
    const dados = _coletarForm('ns');
    if (!dados) return;
    dados.slot_id = _editandoSlotId;

    const btn = document.getElementById('btn-ns-criar');
    btn.disabled = true; btn.textContent = 'Salvando...';
    try {
      // Usando CRIAR_SLOT mas passando slot_id o backend deve entender como UPDATE se implementado, 
      // ou eu deveria ter um EDITAR_SLOT.
      // Vamos verificar se CRIAR_SLOT suporta update.
      const res = await api.post('CRIAR_SLOT', dados); 
      if (res.ok) { 
        _closeModal('modal-novo-slot'); 
        await _load(); 
        await _loadRange();
      } else {
        _showError('ns-error', res.erro || res.mensagem || 'Erro ao salvar.');
      }
    } catch(e) { _showError('ns-error', 'Sem conexão.'); }
    btn.disabled = false; btn.textContent = '✓ Salvar Alterações';
  }

  // ── Criar unitário ────────────────────────────────────────────────────────
  async function _criarUnitario(ignorarConflito = false) {
    if (_editandoSlotId) return _salvarEdicao();
    const dados = _coletarForm('ns');
    if (!dados) return;
    if (ignorarConflito) dados.ignorar_conflito = true;

    const btn = document.getElementById('btn-ns-criar');
    btn.disabled = true; btn.textContent = 'Criando...';
    try {
      const res = await api.criarSlot(dados);
      if (res.ok) { 
        if (document.getElementById('ns-save-lib')?.checked) {
          await api.salvarLocalFrequente(dados);
        }
        _closeModal('modal-novo-slot'); 
        await _load(); 
        await _loadRange();
      } else if (res.conflito) {
        if (confirm(res.mensagem)) {
          return _criarUnitario(true);
        }
      }
      else _showError('ns-error', res.erro || res.mensagem || 'Erro ao criar slot.');
    } catch(e) { _showError('ns-error', 'Sem conexão.'); }
    btn.disabled = false; btn.textContent = '✓ Criar Slot';
  }

  // ── Criar em lote ─────────────────────────────────────────────────────────
  async function _criarLote() {
    const tabAtiva = document.querySelector('.lote-tab.active')?.dataset.tab;
    const btn = document.getElementById('btn-lote-criar');
    btn.disabled = true; btn.textContent = 'Criando...';

    let slots = [];

    if (tabAtiva === 'repetir') {
      const base = _coletarForm('lt');
      if (!base) { btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }

      const dias = [...document.querySelectorAll('.lote-dia:checked')].map(c => parseInt(c.value));
      const dataIni = document.getElementById('lt-data-ini')?.value;
      const dataFim = document.getElementById('lt-data-fim')?.value;

      if (!dias.length) { _showError('lote-error', 'Selecione pelo menos um dia da semana.'); btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }
      if (!dataIni || !dataFim) { _showError('lote-error', 'Informe data início e fim.'); btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }

      const datas = _gerarDatas(dataIni, dataFim, dias);
      slots = datas.map(data => ({ ...base, data }));

    } else if (tabAtiva === 'semana') {
      const origem = document.getElementById('rs-data-origem').value;
      const destino = document.getElementById('rs-data-destino').value;
      if (!origem || !destino) { _showError('lote-error', 'Informe as datas de segunda-feira.'); btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }
      
      try {
        const progEl = document.getElementById('lote-progress');
        progEl.style.display = 'block'; progEl.textContent = 'Replicando semana...';
        const res = await api.post('REPLICAR_SEMANA', { data_inicio_origem: origem, data_inicio_destino: destino });
        if (res.ok) {
          progEl.textContent = `✅ ${res.count} slots replicados com sucesso!`;
          setTimeout(async () => { _closeModal('modal-lote'); await _load(); }, 1500);
          return;
        } else {
          _showError('lote-error', res.erro || 'Erro ao replicar semana');
        }
      } catch(e) { _showError('lote-error', 'Erro de conexão.'); }
      btn.disabled = false; btn.textContent = '✓ Criar Slots';
      return;

    } else if (tabAtiva === 'copiar') {
      const slotOrigemId = document.getElementById('cp-slot-origem')?.value;
      const datasRaw     = document.getElementById('cp-datas')?.value || '';
      const slotOrigem   = _slots.find(s => s.slot_id === slotOrigemId);

      if (!slotOrigem) { _showError('lote-error', 'Selecione um slot de origem.'); btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }

      const datas = datasRaw.split('\n').map(d => d.trim()).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      if (!datas.length) { _showError('lote-error', 'Informe pelo menos uma data válida (AAAA-MM-DD).'); btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }

      slots = datas.map(data => ({
        nome:          slotOrigem.nome,
        cidade:        slotOrigem.cidade || '',
        lat:           slotOrigem.lat,
        lng:           slotOrigem.lng,
        inicio:        slotOrigem.inicio_slot || '',
        fim:           slotOrigem.fim_slot    || '',
        raio_metros:   slotOrigem.raio_metros || 100,
        cargo_previsto:slotOrigem.cargo_previsto || 'PROMOTOR',
        operacao:      slotOrigem.operacao || 'PROMO',

        data,
      }));
    }

    if (!slots.length) { _showError('lote-error', 'Nenhum slot a criar.'); btn.disabled = false; btn.textContent = '✓ Criar Slots'; return; }

    // Criar em sequência com progress
    let criados = 0;
    const progEl = document.getElementById('lote-progress');
    progEl.style.display = 'block';

    for (const slot of slots) {
      progEl.textContent = `Criando ${criados + 1} de ${slots.length}...`;
      try {
        const res = await api.criarSlot(slot);
        if (res.ok) criados++;
      } catch(_) {}
    }

    progEl.textContent = `✅ ${criados} de ${slots.length} slots criados com sucesso.`;
    btn.textContent = 'Concluído';
    setTimeout(async () => { _closeModal('modal-lote'); await _load(); }, 1500);
  }

  // ── Copiar slot (atalho da lista) ─────────────────────────────────────────
  function copiarSlot(slotId) {
    const slot = _slots.find(s => s.slot_id === slotId);
    if (!slot) return;
    _popularSelectSlots();
    _openModal('modal-lote');
    // Ativar tab copiar
    document.querySelectorAll('.lote-tab').forEach(t => {
      const ativo = t.dataset.tab === 'copiar';
      t.style.borderBottomColor = ativo ? '#63b3ed' : 'transparent';
      t.style.color = ativo ? '#63b3ed' : '#718096';
      if (ativo) t.classList.add('active'); else t.classList.remove('active');
    });
    document.getElementById('tab-repetir').style.display = 'none';
    document.getElementById('tab-copiar').style.display  = 'block';
    const sel = document.getElementById('cp-slot-origem');
    if (sel) sel.value = slotId;
  }

  // ── Importar CSV ──────────────────────────────────────────────────────────
  function _previewCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const linhas = ev.target.result.split('\n').filter(l => l.trim());
      const preview = document.getElementById('csv-preview');
      const btnImportar = document.getElementById('btn-csv-importar');
      preview.style.display = 'block';
      preview.innerHTML = `
        <div style="font-size:11px;color:#718096;margin-bottom:6px">${linhas.length - 1} slots encontrados</div>
        <div style="background:#0a0f1e;border-radius:4px;padding:10px;font-size:11px;font-family:'IBM Plex Mono',monospace;color:#a0aec0;white-space:pre-wrap;max-height:150px;overflow-y:auto">${linhas.slice(0, 6).join('\n')}${linhas.length > 6 ? '\n...' : ''}</div>`;
      btnImportar.disabled = linhas.length < 2;
    };
    reader.readAsText(file);
  }

  async function _importarCSV() {
    const file = document.getElementById('csv-file').files[0];
    if (!file) return;

    const btn = document.getElementById('btn-csv-importar');
    btn.disabled = true; btn.textContent = 'Importando...';

    const reader = new FileReader();
    reader.onload = async ev => {
      const linhas = ev.target.result.split('\n').filter(l => l.trim());
      const header = linhas[0].split(',').map(h => h.trim().toLowerCase());
      const slots  = [];

      for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i].split(',').map(c => c.trim());
        const slot = {};
        header.forEach((h, idx) => { slot[h] = cols[idx] || ''; });
        if (slot.nome && slot.lat && slot.lng && slot.data && slot.inicio && slot.fim) {
          slots.push(slot);
        }
      }

      if (!slots.length) {
        _showError('csv-error', 'Nenhum slot válido encontrado. Verifique o formato.');
        btn.disabled = false; btn.textContent = '✓ Importar';
        return;
      }

      let criados = 0;
      const progEl = document.getElementById('csv-progress');
      progEl.style.display = 'block';

      for (const slot of slots) {
        progEl.textContent = `Importando ${criados + 1} de ${slots.length}...`;
        try {
          const res = await api.criarSlot({
            nome:          slot.nome,
            cidade:        slot.cidade || 'São Paulo',
            lat:           slot.lat,
            lng:           slot.lng,
            data:          slot.data,
            inicio:        slot.inicio,
            fim:           slot.fim,
            raio_metros:   slot.raio_metros || 100,
            cargo_previsto:slot.cargo_previsto || 'PROMOTOR',
            operacao:      slot.operacao || 'PROMO',
          });
          if (res.ok) criados++;
        } catch(_) {}
      }

      progEl.textContent = `✅ ${criados} de ${slots.length} slots importados.`;
      btn.textContent = 'Concluído';
      setTimeout(async () => { _closeModal('modal-csv'); await _load(); }, 1500);
    };
    reader.readAsText(file);
  }

  function _baixarModeloCSV() {
    const csv = 'nome,cidade,lat,lng,data,inicio,fim,raio_metros,cargo_previsto\nParque Ibirapuera,São Paulo,-23.5873,-46.6573,2026-04-01,09:00,13:00,100,PROMOTOR\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'modelo_slots.csv';
    a.click();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _gerarDatas(dataIni, dataFim, diasSemana) {
    const datas = [];
    const cur   = new Date(dataIni + 'T12:00:00');
    const fim   = new Date(dataFim + 'T12:00:00');
    while (cur <= fim) {
      if (diasSemana.includes(cur.getDay())) {
        datas.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return datas;
  }

  function _atualizarPreview() {
    const dias    = [...document.querySelectorAll('.lote-dia:checked')].map(c => parseInt(c.value));
    const dataIni = document.getElementById('lt-data-ini')?.value;
    const dataFim = document.getElementById('lt-data-fim')?.value;
    const preview = document.getElementById('lt-preview');
    if (!preview) return;
    if (!dias.length || !dataIni || !dataFim) { preview.textContent = ''; return; }
    const datas = _gerarDatas(dataIni, dataFim, dias);
    preview.textContent = `${datas.length} slot(s) serão criados: ${datas.slice(0,3).join(', ')}${datas.length > 3 ? '...' : ''}`;
    preview.style.color = '#63b3ed';
  }

  function _popularSelectSlots() {
    const sel = document.getElementById('cp-slot-origem');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione um slot...</option>' +
      _slots.map(s => `<option value="${s.slot_id}">${s.nome || s.slot_id} (${s.inicio_slot||''}–${s.fim_slot||''})</option>`).join('');
  }

  function _coletarForm(prefix) {
    const v = id => document.getElementById(id)?.value?.trim() || '';
    const nome   = v(`${prefix}-nome`);
    const cidade = v(`${prefix}-cidade`);
    const lat    = v(`${prefix}-lat`);
    const lng    = v(`${prefix}-lng`);
    const inicio = v(`${prefix}-inicio`);
    const fim    = v(`${prefix}-fim`);

    const data = v(`${prefix}-data`) || new Date().toISOString().split('T')[0];

    if (!nome || !cidade || !lat || !lng || !inicio || !fim || !data) {
      _showError(`${prefix}-error`, 'Preencha todos os campos obrigatórios (*).');
      return null;
    }
    return {
      nome, cidade, lat, lng, data, inicio, fim,
      raio_metros:    v(`${prefix}-raio`)    || 100,
      cargo_previsto: v(`${prefix}-cargo`)   || 'PROMOTOR',
      operacao:       v(`${prefix}-operacao`)|| 'PROMO',
    };
  }

  function _showError(elId, msg) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  async function _openModal(id) {
    if (id === 'modal-novo-slot' && !_editandoSlotId) {
      await _carregarBiblioteca();
    }
    document.getElementById(id)?.classList.remove('hidden');
  }

  async function _carregarBiblioteca() {
    const sel = document.getElementById('ns-lib');
    if (!sel) return;
    try {
      const res = await api.getLocaisFrequentes();
      _locaisFrequentes = res?.data || [];
      sel.innerHTML = '<option value="">-- Selecione um local salvo --</option>' +
        _locaisFrequentes.map((l, i) => `<option value="${i}">${l.nome} (${l.cidade})</option>`).join('');
    } catch(e) {}
  }

  function usarTemplate(prefix) {
    const idx = document.getElementById(`${prefix}-lib`)?.value;
    if (idx === '' || idx === undefined) return;
    const l = _locaisFrequentes[idx];
    if (!l) return;
    
    document.getElementById(`${prefix}-nome`).value = l.nome || '';
    document.getElementById(`${prefix}-cidade`).value = l.cidade || '';
    document.getElementById(`${prefix}-lat`).value = l.lat || '';
    document.getElementById(`${prefix}-lng`).value = l.lng || '';
    document.getElementById(`${prefix}-raio`).value = l.raio_metros || 100;
    document.getElementById(`${prefix}-cargo`).value = l.cargo_previsto || 'PROMOTOR';
    document.getElementById(`${prefix}-operacao`).value = l.operacao || 'PROMO';
  }

  async function _replicarDia(ignorarConflito = false) {
    const destino = prompt('Para qual data deseja replicar os slots de ' + _selectedDate + '?\n(Formato: AAAA-MM-DD)', 
      new Date(new Date(_selectedDate + 'T12:00:00').getTime() + 86400000).toISOString().split('T')[0]);
    
    if (!destino) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(destino)) return alert('Data inválida');

    if (!confirm(`Replicar ${_slots.length} slots para o dia ${destino}?`)) return;

    try {
      const res = await api.post('REPLICAR_ESCALA', { 
        data_origem: _selectedDate, 
        data_destino: destino,
        ignorar_conflito: ignorarConflito 
      });
      
      if (res.ok) {
        if (res.conflitos > 0 && !ignorarConflito) {
          if (confirm(`Existem ${res.conflitos} slots conflitantes no destino. Deseja forçar a criação de todos?`)) {
            return _replicarDia(true);
          }
        }
        alert(res.mensagem || 'Dia replicado com sucesso!');
        await _loadRange();
        if (destino === _selectedDate) await _load();
      } else alert(res.erro || 'Erro ao replicar');
    } catch(e) { alert('Erro de conexão'); }
  }
  function _closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

  function _statusSlot(status) {
    const m = {
      DISPONIVEL: { label:'Disponível', color:'#68d391' },
      OCUPADO:    { label:'Ocupado',    color:'#f6ad55' },
      ENCERRADO:  { label:'Encerrado',  color:'#718096' },
    };
    return m[status] || { label: status||'—', color:'#718096' };
  }

  function destroy() {}
  return { 
    render, destroy, copiarSlot, editarSlot, excluirSlot, selectDate, 
    usarTemplate, toggleSelecao, limparSelecao, excluirSelecionados,
    fecharMapa
  };
})();