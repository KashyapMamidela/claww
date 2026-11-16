// Minimal stand-in for the design canvas runtime: renders the {{ }} templates and runs each screen's logic, so the screens work in a normal browser.
// Tweaks: add ?moment=evening or ?rings=current to Main.dc.html.
// Local fonts so the screens render without the internet.
(function(){var css='';[[400],[500],[600],[700],[800],[900]].forEach(function(w){css+="@font-face{font-family:Inter;font-weight:"+w[0]+";src:url(fonts/inter-latin-"+w[0]+"-normal.woff2) format('woff2')}";});
[500,700].forEach(function(w){css+="@font-face{font-family:Caveat;font-weight:"+w+";src:url(fonts/caveat-latin-"+w+"-normal.woff2) format('woff2')}";});
var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);})();
// Minimal local stand-in for the canvas runtime, for screenshots only.
window.DCLogic = class { constructor(p){ this.props = p; this.state = {}; } setState(s){ Object.assign(this.state, s); window.__render(); } };
document.addEventListener('DOMContentLoaded', () => {
  const xdc = document.querySelector('x-dc');
  const helmet = xdc.querySelector('helmet');
  if (helmet) { [...helmet.childNodes].forEach(n => document.head.appendChild(n)); helmet.remove(); }
  const tpl = document.createElement('template'); tpl.innerHTML = xdc.innerHTML; xdc.innerHTML = '';
  const sc = document.querySelector('script[data-dc-script]');
  const pdef = JSON.parse(sc.getAttribute('data-props') || '{}');
  const props = {}; for (const k in pdef) if (k[0] !== '$') props[k] = (window.__props || Object.fromEntries(new URLSearchParams(location.search)))[k] ?? pdef[k].default;
  const Comp = new Function('DCLogic', sc.textContent + '; return Component;')(window.DCLogic);
  const comp = new Comp(props);
  const ev = (expr, scope) => { try { return new Function('s', 'with(s){return (' + expr + ')}')(scope); } catch (e) { return ''; } };
  const sub = (str, scope) => {
    const m = str.match(/^\{\{([^}]+)\}\}$/s); if (m) return ev(m[1], scope);
    return str.replace(/\{\{(.+?)\}\}/gs, (_, e) => { const v = ev(e, scope); return v == null ? '' : v; });
  };
  const walk = (node, scope, out) => {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(sub(node.textContent, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = ev(node.getAttribute('list').replace(/^\{\{|\}\}$/g, ''), scope) || [];
      const as = node.getAttribute('as');
      list.forEach(item => [...node.childNodes].forEach(c => walk(c, { ...scope, [as]: item }, out)));
      return;
    }
    if (tag === 'sc-if') { if (ev(node.getAttribute('value').replace(/^\{\{|\}\}$/g, ''), scope)) [...node.childNodes].forEach(c => walk(c, scope, out)); return; }
    const el = node.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS(node.namespaceURI, tag) : document.createElement(tag);
    for (const a of node.attributes) {
      const v = sub(a.value, scope);
      if (/^on[A-Z]/.test(a.name) || /^on/.test(a.name) && typeof v === 'function') { el.addEventListener(a.name.slice(2).toLowerCase(), v); continue; }
      el.setAttribute(a.name, v);
    }
    (node.content || node).childNodes.forEach(c => walk(c, scope, el));
    out.appendChild(el);
  };
  window.__render = () => { const vals = comp.renderVals(); xdc.innerHTML = ''; [...tpl.content.childNodes].forEach(c => walk(c, vals, xdc)); };
  window.__render();
});
