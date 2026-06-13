var id = require('../_shared/identity');
var db = require('../_shared/cosmos');

function json(context, status, body){ context.res = { status: status, headers: { 'Content-Type': 'application/json' }, body: body }; }
function docId(y,w){ return String(y) + '-' + (Number(w) < 10 ? '0'+Number(w) : Number(w)); }

module.exports = async function(context, req){
  var p = id.getPrincipal(req);
  if(!p){ return json(context, 401, { error: 'Ikke logget ind' }); }

  var me = p.userId;
  var admin = id.isAdmin(p);
  var q = req.query || {};
  var container;
  try { container = await db.getContainer(); }
  catch(e){ return json(context, 500, { error: e.message }); }

  // hvilken medarbejder gælder forespørgslen? Skriv altid på egen bruger.
  var targetRead = q.employeeId || me;
  if(targetRead !== me && !admin){ return json(context, 403, { error: 'Ingen adgang til andres timer' }); }

  try {
    if(req.method === 'GET'){
      if(q.year && q.week){
        var sel = await container.item(docId(q.year, q.week), targetRead).read();
        var item = sel.resource;
        return json(context, 200, item ? { year: item.year, week: item.week, rows: item.rows } : { year: Number(q.year), week: Number(q.week), rows: null });
      }
      // liste over uger for medarbejderen
      var query = {
        query: 'SELECT c.year, c.week FROM c WHERE c.employeeId = @e',
        parameters: [{ name: '@e', value: targetRead }]
      };
      var res = await container.items.query(query, { partitionKey: targetRead }).fetchAll();
      return json(context, 200, res.resources);
    }

    if(req.method === 'PUT'){
      var b = req.body || {};
      if(b.year == null || b.week == null || !Array.isArray(b.rows)) return json(context, 400, { error: 'year, week og rows kræves' });
      var doc = {
        id: docId(b.year, b.week),
        employeeId: me,                          // altid egen bruger – kan ikke skrive på andre
        employeeName: p.userDetails || me,
        year: Number(b.year),
        week: Number(b.week),
        rows: b.rows,
        updatedAt: new Date().toISOString()
      };
      await container.items.upsert(doc);
      return json(context, 200, { ok: true });
    }

    if(req.method === 'DELETE'){
      if(!q.year || !q.week) return json(context, 400, { error: 'year og week kræves' });
      try { await container.item(docId(q.year, q.week), me).delete(); } catch(e){ /* findes måske ikke */ }
      return json(context, 200, { ok: true });
    }

    return json(context, 405, { error: 'Metode ikke understøttet' });
  } catch(e){
    return json(context, 500, { error: e.message });
  }
};
