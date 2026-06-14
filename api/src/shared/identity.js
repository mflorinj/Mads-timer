// v4: request.headers er et Headers-objekt (.get)
function getPrincipal(request){
  var header = request.headers.get('x-ms-client-principal');
  if(!header) return null;
  try{
    var p = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    return (p && p.userId) ? p : null;
  }catch(e){ return null; }
}
function isAdmin(principal){
  if(!principal) return false;
  var roles = principal.userRoles || [];
  if(roles.indexOf('admin') >= 0) return true;
  var list = (process.env.ADMIN_USERS || '').toLowerCase().split(',').map(function(s){return s.trim();}).filter(Boolean);
  var uid = (principal.userId || '').toLowerCase();
  var det = (principal.userDetails || '').toLowerCase();
  return list.indexOf(uid) >= 0 || list.indexOf(det) >= 0;
}
module.exports = { getPrincipal: getPrincipal, isAdmin: isAdmin };
