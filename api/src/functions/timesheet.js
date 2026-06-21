const { app } = require('@azure/functions');
const id = require('../shared/identity');
const db = require('../shared/cosmos');

const NO_CACHE = { 'Cache-Control': 'no-store' };
function docId(y,w){ return String(y) + '-' + (Number(w) < 10 ? '0' + Number(w) : Number(w)); }

app.http('timesheet', {
  methods: ['GET','PUT','DELETE'],
  authLevel: 'anonymous',
  route: 'timesheet',
  handler: async (request) => {
    const p = id.getPrincipal(request);
    if(!p) return { status: 401, headers: NO_CACHE, jsonBody: { error: 'Ikke logget ind' } };
    const me = p.userId, admin = id.isAdmin(p);

    let container;
    try { container = await db.getContainer(); }
    catch(e){ return { status: 500, headers: NO_CACHE, jsonBody: { error: e.message } }; }

    const year = request.query.get('year');
    const week = request.query.get('week');
    const employeeId = request.query.get('employeeId');
    const targetRead = employeeId || me;
    if(targetRead !== me && !admin) return { status: 403, headers: NO_CACHE, jsonBody: { error: 'Ingen adgang til andres timer' } };

    try {
      if(request.method === 'GET'){
        if(year && week){
          try {
            const r = await container.item(docId(year, week), targetRead).read();
            const item = r.resource;
            return { headers: NO_CACHE, jsonBody: item ? { year: item.year, week: item.week, rows: item.rows } : { year: Number(year), week: Number(week), rows: null } };
          } catch(e){ return { headers: NO_CACHE, jsonBody: { year: Number(year), week: Number(week), rows: null } }; }
        }
        const q = { query: 'SELECT c.year, c.week FROM c WHERE c.employeeId = @e', parameters: [{ name: '@e', value: targetRead }] };
        const res = await container.items.query(q, { partitionKey: targetRead }).fetchAll();
        return { headers: NO_CACHE, jsonBody: res.resources };
      }

      if(request.method === 'PUT'){
        let b = {};
        try { b = await request.json(); } catch(e){ b = {}; }
        if(b.year == null || b.week == null || !Array.isArray(b.rows)) return { status: 400, headers: NO_CACHE, jsonBody: { error: 'year, week og rows kræves' } };
        const doc = {
          id: docId(b.year, b.week),
          employeeId: me,
          employeeName: p.userDetails || me,
          year: Number(b.year), week: Number(b.week),
          rows: b.rows, updatedAt: new Date().toISOString()
        };
        await container.items.upsert(doc);
        return { headers: NO_CACHE, jsonBody: { ok: true } };
      }

      if(request.method === 'DELETE'){
        if(!year || !week) return { status: 400, headers: NO_CACHE, jsonBody: { error: 'year og week kræves' } };
        try { await container.item(docId(year, week), me).delete(); } catch(e){}
        return { headers: NO_CACHE, jsonBody: { ok: true } };
      }

      return { status: 405, headers: NO_CACHE, jsonBody: { error: 'Metode ikke understøttet' } };
    } catch(e){ return { status: 500, headers: NO_CACHE, jsonBody: { error: e.message } }; }
  }
});
