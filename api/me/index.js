var id = require('../_shared/identity');
module.exports = async function(context, req){
  var p = id.getPrincipal(req);
  if(!p){ context.res = { status: 401, body: { error: 'Ikke logget ind' } }; return; }
  context.res = {
    headers: { 'Content-Type': 'application/json' },
    body: { userId: p.userId, name: p.userDetails || p.userId, isAdmin: id.isAdmin(p) }
  };
};
