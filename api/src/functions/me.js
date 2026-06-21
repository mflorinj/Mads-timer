const { app } = require('@azure/functions');
const id = require('../shared/identity');

app.http('me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (request) => {
    const p = id.getPrincipal(request);
    if(!p) return { status: 401, jsonBody: { error: 'Ikke logget ind' } };
    const admin = id.isAdmin(p);
    const catalogAdminOnly = String(process.env.CATALOG_ADMIN_ONLY || '').toLowerCase() === 'true';
    return { jsonBody: {
      userId: p.userId,
      name: id.getDisplayName(p),
      isAdmin: admin,
      canEditCatalog: (!catalogAdminOnly) || admin
    } };
  }
});
