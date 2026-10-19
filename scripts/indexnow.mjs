// Tell Bing (and so ChatGPT search), Yandex and the other IndexNow engines that claww.me changed.
// Run after deploying a content change: npm run indexnow
// The key is public by design: it is served at https://claww.me/<key>.txt to prove we own the site.

const KEY = '97abadbcb9870e688c4b60f23ef5ffd9';
const URLS = ['https://claww.me/', 'https://claww.me/privacy', 'https://claww.me/terms', 'https://claww.me/llms.txt'];
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://www.bing.com/indexnow', 'https://yandex.com/indexnow'];

const body = JSON.stringify({ host: 'claww.me', key: KEY, keyLocation: `https://claww.me/${KEY}.txt`, urlList: URLS });

for (const url of ENDPOINTS) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
  console.log(`${url} -> ${res.status} ${res.status === 200 || res.status === 202 ? 'accepted' : 'check this'}`);
}
