// v4: request.headers er et Headers-objekt (.get)
function claimVal(claims, types){
  if(!claims || !claims.length) return '';
  for(var i=0;i<types.length;i++){
    var want=types[i];
    for(var j=0;j<claims.length;j++){
      if(claims[j].typ===want && claims[j].val) return String(claims[j].val).trim();
    }
  }
  return '';
}
function getDisplayName(principal){
  if(!principal) return '';
  var claims=principal.claims||[];
  var name=claimVal(claims,['name','http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']);
  if(name) return name;
  var given=claimVal(claims,['given_name','http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']);
  var family=claimVal(claims,['family_name','http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']);
  if(given||family) return (given+' '+family).trim();
  return principal.userDetails||principal.userId||'';
}
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
module.exports = { getPrincipal: getPrincipal, isAdmin: isAdmin, getDisplayName: getDisplayName };
