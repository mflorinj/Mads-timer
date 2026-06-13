var id = require('../_shared/identity');
var db = require('../_shared/cosmos');

var PK = '__catalog__';   // reserveret partition – tælles ikke med som medarbejder
var DOC_ID = 'catalog';

function clean(arr){
  if(!Array.isArray(arr)) return [];
  var seen = {}, out = [];
  arr.forEach(function(v){
    var s = String(v == null ? '' : v).trim();
    if(!s) return;
    if(s.length > 120) s = s.slice(0,120);
    var k = s.toLowerCase();
    if(seen[k]) return;
    seen[k] = 1; out.push(s);
  });
  out.sort(function(a,b){ return a.localeCompare(b,'da'); });
  return out.slice(0,500);
}
function json(context, status, body){ context.res = { status: status, headers: { 'Content-Type': 'application/json' }, body: body }; }

module.exports = async function(context, req){
  var p = id.getPrincipal(req);
  if(!p) return json(context, 401, { error: 'Ikke logget ind' });

  var container;
  try { container = await db.getContainer(); } catch(e){ return json(context, 500, { error: e.message }); }

  try {
    if(req.method === 'GET'){
      var it = null;
      try { var r = await container.item(DOC_ID, PK).read(); it = r.resource; } catch(e){ it = null; }
      return json(context, 200, { kunder: (it && it.kunder) || [], opgaver: (it && it.opgaver) || [] });
    }
    if(req.method === 'PUT'){
      var adminOnly = String(process.env.CATALOG_ADMIN_ONLY || '').toLowerCase() === 'true';
      if(adminOnly && !id.isAdmin(p)) return json(context, 403, { error: 'Kun admin kan redigere kataloget' });
      var b = req.body || {};
      var doc = { id: DOC_ID, employeeId: PK, kunder: clean(b.kunder), opgaver: clean(b.opgaver), updatedAt: new Date().toISOString() };
      await container.items.upsert(doc);
      return json(context, 200, { kunder: doc.kunder, opgaver: doc.opgaver });
    }
    return json(context, 405, { error: 'Metode ikke understøttet' });
  } catch(e){ return json(context, 500, { error: e.message }); }
};
