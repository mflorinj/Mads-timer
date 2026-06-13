var id = require('../_shared/identity');
var db = require('../_shared/cosmos');
module.exports = async function(context, req){
  var p = id.getPrincipal(req);
  if(!p){ context.res = { status: 401, body: { error: 'Ikke logget ind' } }; return; }
  if(!id.isAdmin(p)){ context.res = { status: 403, body: { error: 'Kun for admin' } }; return; }
  try{
    var container = await db.getContainer();
    var res = await container.items.query(
      'SELECT DISTINCT c.employeeId, c.employeeName FROM c'
    ).fetchAll();
    context.res = { headers: { 'Content-Type': 'application/json' }, body: res.resources };
  }catch(e){ context.res = { status: 500, body: { error: e.message } }; }
};
