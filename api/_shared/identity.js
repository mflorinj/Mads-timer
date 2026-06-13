// Læser SWA's client principal og afgør admin-status.
function getPrincipal(req){
  var header = req.headers && (req.headers['x-ms-client-principal'] || req.headers['X-MS-CLIENT-PRINCIPAL']);
  if(!header) return null;
  try{
    var decoded = Buffer.from(header,'base64').toString('utf8');
    var p = JSON.parse(decoded);
    return (p && p.userId) ? p : null;
  }catch(e){ return null; }
}

function isAdmin(principal){
  if(!principal) return false;
  var roles = principal.userRoles || [];
  if(roles.indexOf('admin') >= 0) return true; // SWA-rolle, hvis tildelt
  var list = (process.env.ADMIN_USERS || '').toLowerCase().split(',').map(function(s){return s.trim();}).filter(Boolean);
  var id = (principal.userId || '').toLowerCase();
  var details = (principal.userDetails || '').toLowerCase();
  return list.indexOf(id) >= 0 || list.indexOf(details) >= 0;
}

module.exports = { getPrincipal: getPrincipal, isAdmin: isAdmin };
