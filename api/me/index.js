var id = require('../_shared/identity');
module.exports = async function(context, req){
  var p = id.getPrincipal(req);
  if(!p){ context.res = { status: 401, body: { error: 'Ikke logget ind' } }; return; }
  var admin = id.isAdmin(p);
  var catalogAdminOnly = String(process.env.CATALOG_ADMIN_ONLY || '').toLowerCase() === 'true';
  context.res = {
    headers: { 'Content-Type': 'application/json' },
    body: {
      userId: p.userId,
      name: p.userDetails || p.userId,
      isAdmin: admin,
      canEditCatalog: (!catalogAdminOnly) || admin
    }
  };
};
