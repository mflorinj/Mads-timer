var id = require('../_shared/identity');
var db = require('../_shared/cosmos');

var DAYS = ["Mandag","Tirsdag","Onsdag","Torsdag","Fredag","Lørdag","Søndag"];
var MONTHS = ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"];

function toMin(t){ if(!t || String(t).indexOf(':')<0) return null; var p=String(t).split(':'); var h=parseInt(p[0],10), m=parseInt(p[1],10); return (isNaN(h)||isNaN(m))?null:h*60+m; }
function rowHours(r){ var s=toMin(r.start), e=toMin(r.slut); if(s===null||e===null) return 0; var d=e-s; if(d<0) d+=1440; var h=(d-(parseFloat(r.pause)||0))/60; return h>0?h:0; }

// Mandagen i en given ISO-uge (UTC)
function isoWeekMonday(y,w){
  var jan4=new Date(Date.UTC(y,0,4));
  var jan4Day=jan4.getUTCDay()||7;
  var wk1=new Date(jan4); wk1.setUTCDate(jan4.getUTCDate()-(jan4Day-1));
  var mon=new Date(wk1); mon.setUTCDate(wk1.getUTCDate()+(w-1)*7);
  return mon;
}

module.exports = async function(context, req){
  var p = id.getPrincipal(req);
  if(!p){ context.res = { status: 401, body: { error: 'Ikke logget ind' } }; return; }
  if(!id.isAdmin(p)){ context.res = { status: 403, body: { error: 'Kun for admin' } }; return; }

  var q = req.query || {};
  var now = new Date();
  var selYear = parseInt(q.year,10) || now.getUTCFullYear();
  var selWeek = parseInt(q.week,10) || 1;

  // Måneden bestemmes af torsdagen i den valgte uge (ISO-konvention)
  var monday = isoWeekMonday(selYear, selWeek);
  var thursday = new Date(monday); thursday.setUTCDate(monday.getUTCDate()+3);
  var mYear = thursday.getUTCFullYear();
  var mMonth = thursday.getUTCMonth(); // 0-baseret

  try {
    var container = await db.getContainer();
    var all = await container.items.query('SELECT * FROM c').fetchAll();
    var emps = {};

    all.resources.forEach(function(doc){
      if(doc.employeeId === '__catalog__' || !Array.isArray(doc.rows)) return; // ikke en medarbejder
      var e = emps[doc.employeeId] || { employeeId: doc.employeeId, employeeName: doc.employeeName || doc.employeeId, weekTotal: 0, monthTotal: 0 };
      emps[doc.employeeId] = e;
      var docMon = isoWeekMonday(doc.year, doc.week);
      (doc.rows || []).forEach(function(r){
        var h = rowHours(r);
        if(doc.year === selYear && doc.week === selWeek) e.weekTotal += h;
        var di = DAYS.indexOf(r.day);
        if(di >= 0){
          var dt = new Date(docMon); dt.setUTCDate(docMon.getUTCDate()+di);
          if(dt.getUTCFullYear() === mYear && dt.getUTCMonth() === mMonth) e.monthTotal += h;
        }
      });
    });

    var list = Object.keys(emps).map(function(k){ return emps[k]; })
      .sort(function(a,b){ return a.employeeName.localeCompare(b.employeeName,'da'); });

    var monthLabel = MONTHS[mMonth].charAt(0).toUpperCase()+MONTHS[mMonth].slice(1)+' '+mYear;
    context.res = { headers: { 'Content-Type': 'application/json' }, body: { year: selYear, week: selWeek, monthLabel: monthLabel, employees: list } };
  } catch(e){
    context.res = { status: 500, body: { error: e.message } };
  }
};
