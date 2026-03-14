# Deploy rápido — JET Promo Intelligence PWA

## 1) Backend (Apps Script)
- Planilha: `19RwgqT3Bukng97ooUfeCLoOL1MzoxypfpwUHJepi4iQ`
- Deploy Web App: `https://script.google.com/macros/s/AKfycbxsWriuYAFDkqiwDDoKpu0L34u5DGa23rIz4qwN6hLklxw3qnXQrbZXjbut0kSBe56N/exec`

## 2) Frontend
- URL da API definida em `js/config.js` (`window.APP_CONFIG.API_URL`).
- Para trocar ambiente (staging/prod), altere somente `js/config.js`.

## 3) Publicação
Publique a pasta `pwa/` em host estático (GitHub Pages, Netlify, Vercel, Firebase Hosting).

## 4) Testes básicos
- Abrir `index.html?token=TOKEN_TESTE_001`
- Splash valida token
- Home carrega perfil
- Slot atual abre sem erro
