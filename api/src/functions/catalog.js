const { app } = require('@azure/functions');
const id = require('../shared/identity');
const db = require('../shared/cosmos');

const PK = '__catalog__', DOC_ID = 'catalog';

function clean(arr){
  if(!Array.isArray(arr)) return [];
  const seen = {}, out = [];
  arr.forEach(function(v){
    let s = String(v == null ? '' : v).trim();
    if(!s) return;
    if(s.length > 120) s = s.slice(0,120);
    const k = s.toLowerCase();
    if(seen[k]) return;
    seen[k] = 1; out.push(s);
  });
  out.sort(function(a,b){ return a.localeCompare(b,'da'); });
  return out.slice(0,500);
}

app.http('catalog', {
  methods: ['GET','PUT'],
  authLevel: 'anonymous',
  route: 'catalog',
  handler: async (request) => {
    const p = id.getPrincipal(request);
    if(!p) return { status: 401, jsonBody: { error: 'Ikke logget ind' } };

    let container;
    try { container = await db.getContainer(); }
    catch(e){ return { status: 500, jsonBody: { error: e.message } }; }

    try {
      if(request.method === 'GET'){
        let it = null;
        try { const r = await container.item(DOC_ID, PK).read(); it = r.resource; } catch(e){ it = null; }
        return { jsonBody: { kunder: (it && it.kunder) || [], opgaver: (it && it.opgaver) || [] } };
      }
      if(request.method === 'PUT'){
        const adminOnly = String(process.env.CATALOG_ADMIN_ONLY || '').toLowerCase() === 'true';
        if(adminOnly && !id.isAdmin(p)) return { status: 403, jsonBody: { error: 'Kun admin kan redigere kataloget' } };
        let b = {};
        try { b = await request.json(); } catch(e){ b = {}; }
        const doc = { id: DOC_ID, employeeId: PK, kunder: clean(b.kunder), opgaver: clean(b.opgaver), updatedAt: new Date().toISOString() };
        await container.items.upsert(doc);
        return { jsonBody: { kunder: doc.kunder, opgaver: doc.opgaver } };
      }
      return { status: 405, jsonBody: { error: 'Metode ikke understøttet' } };
    } catch(e){ return { status: 500, jsonBody: { error: e.message } }; }
  }
});
