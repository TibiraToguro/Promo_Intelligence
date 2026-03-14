const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL)
  || 'https://script.google.com/macros/s/AKfycbxsWriuYAFDkqiwDDoKpu0L34u5DGa23rIz4qwN6hLklxw3qnXQrbZXjbut0kSBe56N/exec';

function _headers(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`
  };
}

async function _parseResponse(res) {
  if (!res.ok) throw new Error(`Erro de conexão (${res.status}).`);
  return res.json();
}

const api = {
  async get(evento, params = {}, tokenOverride = null) {
    const token = tokenOverride ?? state.get('token');
    const qs = new URLSearchParams({ evento, token: token || '', ...params }).toString();
    const res = await fetch(`${API_URL}?${qs}`, { headers: _headers(token) });
    return _parseResponse(res);
  },

  async post(body, options = {}) {
    const token = options.tokenOverride ?? state.get('token');
    const payload = options.skipToken ? { ...body } : { ...body, token };
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: _headers(token),
      body: JSON.stringify(payload)
    });
    return _parseResponse(res);
  }
};
