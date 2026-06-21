const { app } = require('@azure/functions');
const id = require('../shared/identity');
const db = require('../shared/cosmos');

const NO_CACHE = { 'Cache-Control': 'no-store' };

const DAYS = ["Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"];
const MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function toMin(t){ if(!t || String(t).indexOf(':') < 0) return null; const p = String(t).split(':'); const h = parseInt(p[0],10), m = parseInt(p[1],10); return (isNaN(h)||isNaN(m)) ? null : h*60+m; }
function rowHours(r){ const s = toMin(r.start), e = toMin(r.slut); if(s===null||e===null) return 0; let d = e-s; if(d<0) d += 1440; const h = (d - (parseFloat(r.pause)||0))/60; return h>0?h:0; }
function isoWeekMonday(y,w){ const jan4 = new Date(Date.UTC(y,0,4)); const day = jan4.getUTCDay()||7; const wk1 = new Date(jan4); wk1.setUTCDate(jan4.getUTCDate()-(day-1)); const mon = new Date(wk1); mon.setUTCDate(wk1.getUTCDate()+(w-1)*7); return mon; }

app.http('overview', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'overview',
  handler: async (request) => {
    const p = id.getPrincipal(request);
    if(!p) return { status: 401, headers: NO_CACHE, jsonBody: { error: 'Ikke logget ind' } };
    if(!id.isAdmin(p)) return { status: 403, headers: NO_CACHE, jsonBody: { error: 'Kun for admin' } };

    const now = new Date();
    const selYear = parseInt(request.query.get('year'),10) || now.getUTCFullYear();
    const selWeek = parseInt(request.query.get('week'),10) || 1;
    const monday = isoWeekMonday(selYear, selWeek);
    const thursday = new Date(monday); thursday.setUTCDate(monday.getUTCDate()+3);
    const mYear = thursday.getUTCFullYear(), mMonth = thursday.getUTCMonth();

    try {
      const container = await db.getContainer();
      const all = await container.items.query('SELECT * FROM c').fetchAll();
      const emps = {};
      all.resources.forEach(function(doc){
        if(doc.employeeId === '__catalog__' || !Array.isArray(doc.rows)) return;
        const e = emps[doc.employeeId] || { employeeId: doc.employeeId, employeeName: doc.employeeName || doc.employeeId, weekTotal: 0, monthTotal: 0 };
        emps[doc.employeeId] = e;
        const docMon = isoWeekMonday(doc.year, doc.week);
        doc.rows.forEach(function(r){
          const h = rowHours(r);
          if(doc.year === selYear && doc.week === selWeek) e.weekTotal += h;
          const di = DAYS.indexOf(r.day);
          if(di >= 0){ const dt = new Date(docMon); dt.setUTCDate(docMon.getUTCDate()+di); if(dt.getUTCFullYear()===mYear && dt.getUTCMonth()===mMonth) e.monthTotal += h; }
        });
      });
      const list = Object.keys(emps).map(function(k){ return emps[k]; }).sort(function(a,b){ return a.employeeName.localeCompare(b.employeeName,'da'); });
      const monthLabel = MONTHS[mMonth].charAt(0).toUpperCase() + MONTHS[mMonth].slice(1) + ' ' + mYear;
      return { headers: NO_CACHE, jsonBody: { year: selYear, week: selWeek, monthLabel: monthLabel, employees: list } };
    } catch(e){ return { status: 500, headers: NO_CACHE, jsonBody: { error: e.message } }; }
  }
});
