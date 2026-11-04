// Cadastro de produtos salvo no navegador (IndexedDB), compartilhado entre as páginas.
const Produtos = (() => {
  let conn;
  const open = () => conn ??= new Promise((res, rej) => {
    const r = indexedDB.open('custo3d', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('produtos', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('produtos', mode);
      const req = fn(t.objectStore('produtos'));
      t.oncomplete = () => res(req.result);
      t.onerror = () => rej(t.error);
    });
  };

  return {
    all: () => tx('readonly', s => s.getAll()),
    get: id => tx('readonly', s => s.get(id)),
    put: p => tx('readwrite', s => s.put(p)),
    del: id => tx('readwrite', s => s.delete(id)),
    uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    nextSku(list) {
      const n = list.reduce((m, p) => {
        const k = /^3D-(\d+)$/.exec(p.sku || '');
        return k ? Math.max(m, +k[1]) : m;
      }, 0);
      return '3D-' + String(n + 1).padStart(4, '0');
    },
    // Reduz a foto para no máximo 1000 px no maior lado e salva como JPEG
    resizeImage(file, max = 1000) {
      return new Promise((res, rej) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const s = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * s);
          c.height = Math.round(img.height * s);
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          res(c.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Arquivo não é uma imagem')); };
        img.src = url;
      });
    },
  };
})();

function toast(msg, linkText, href) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.replaceChildren(Object.assign(document.createElement('span'), { textContent: msg }));
  if (linkText) el.append(Object.assign(document.createElement('a'), { href, textContent: linkText }));
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 5000);
}

// Mostra a quantidade de produtos no menu
Produtos.all().then(list => {
  const c = document.getElementById('nav-count');
  if (c && list.length) { c.textContent = list.length; c.hidden = false; }
}).catch(() => {});
