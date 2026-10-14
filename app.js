(function(){
'use strict';
var CODE='CQC2027';
var app=document.getElementById('app'), homeBtn=document.getElementById('homeBtn');
var D=null, CAP=null, S=null, tick=null;

/* ---------- memoria locale, mai bloccante ---------- */
function get(k,d){try{var v=localStorage.getItem('cqc27_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function put(k,v){try{localStorage.setItem('cqc27_'+k,JSON.stringify(v))}catch(e){}}

/* ---------- utilità ---------- */
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function fmt(s){s=Math.max(0,s);var m=Math.floor(s/60),x=s%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x}
function capTit(c){return CAP[c]?CAP[c].t:c}
function capNum(c){return String(parseInt(c,10))}
function byParte(p){return D.q.filter(function(q){return q.p===p})}
function byCap(c){return D.q.filter(function(q){return q.c===c})}
function prep(q){return {i:q.i,q:q,a:-1}}   /* a: -1 nessuna, 1 vero, 0 falso */

function decode(){
  var b=atob(window.QDATA), u=new Uint8Array(b.length);
  for(var i=0;i<b.length;i++) u[i]=b.charCodeAt(i)^CODE.charCodeAt(i%CODE.length);
  if(typeof DecompressionStream==='undefined') return Promise.reject(new Error('nocomp'));
  var s=new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(s).text().then(function(t){return JSON.parse(t)});
}

/* ---------- accesso ---------- */
function gate(){
  homeBtn.classList.add('hidden');
  app.innerHTML='<div class="gate card"><h1>Accesso al simulatore</h1>'+
  '<p class="lead">Inserisci il codice di accesso che trovi nel libro, nella pagina «Il simulatore online».</p>'+
  '<input id="code" class="code" type="text" autocomplete="off" autocapitalize="characters" placeholder="CODICE" aria-label="Codice di accesso">'+
  '<div class="err" id="err"></div><button class="btn red" id="go" type="button">Entra</button></div>';
  var inp=document.getElementById('code');
  function tryGo(){
    if(inp.value.trim().toUpperCase().replace(/\s/g,'')===CODE){put('ok',true);start()}
    else document.getElementById('err').textContent='Codice non corretto. Lo trovi nel libro, nella pagina «Il simulatore online».';
  }
  document.getElementById('go').onclick=tryGo;
  inp.onkeydown=function(e){if(e.key==='Enter')tryGo()};
  inp.focus();
}
function start(){
  app.innerHTML='<div class="card"><p class="meta" style="margin:0">Carico le domande...</p></div>';
  decode().then(function(d){
    D=d; CAP={}; D.caps.forEach(function(c){CAP[c.n]=c}); home();
  }).catch(function(e){
    app.innerHTML='<div class="card"><h1>Non riesco a caricare le domande</h1>'+
      '<p class="lead">Se stai usando un browser molto vecchio, aprilo con Chrome, Safari o Firefox aggiornati. '+
      'Altrimenti ricarica la pagina.</p></div>';
  });
}

/* ---------- menu ---------- */
function home(){
  stopTimer(); S=null; homeBtn.classList.add('hidden'); window.scrollTo(0,0);
  var errs=get('errors',[]), hist=get('hist',[]);
  var h='<h1>Allenati alle condizioni dell\'esame</h1>'+
    '<p class="lead">'+D.q.length+' proposizioni vero/falso: '+byParte('sup').length+' per la patente C e CE, '+
    byParte('com').length+' di CQC parte comune, '+byParte('mer').length+' di CQC parte specifica merci. '+
    'Nelle simulazioni una risposta non data vale come errore, esattamente come alla prova.</p>';

  h+='<h2>Simulazioni d\'esame</h2><div class="grid2">';
  h+='<button class="tile red" data-ex="pat" type="button"><b>Patente C e CE</b><span>40 proposizioni in 40 minuti · si supera con non più di 4 errori · pescate ogni volta diverse</span></button>';
  h+='<button class="tile red" data-ex="cqc" type="button"><b>CQC merci — qualificazione iniziale</b><span>70 proposizioni in 90 minuti (40 di parte comune, 30 di merci) · non più di 7 errori</span></button>';
  D.sim.forEach(function(s,k){
    h+='<button class="tile" data-book="'+k+'" type="button"><b>'+esc(s.nome.replace(' del libro',''))+'</b><span>Le '+s.q.length+' proposizioni del libro, in ordine rimescolato</span></button>';
  });
  h+='</div>';

  h+='<h2>Allenamento per capitolo</h2><div class="card">'+
    '<label class="f" for="cap">Capitolo del libro</label><select id="cap">'+
    D.caps.map(function(c){
      var n=byCap(c.n).length; if(!n) return '';
      var p=c.p==='sup'?'Patente':(c.p==='com'?'CQC comune':'CQC merci');
      return '<option value="'+c.n+'">'+capNum(c.n)+' · '+esc(c.t)+' — '+p+' ('+n+')</option>';
    }).join('')+'</select>'+
    '<label class="f">Quante proposizioni</label><div class="chips" id="num">'+
    [10,20,30,0].map(function(n,i){return '<button type="button" class="chip'+(i===1?' on':'')+'" data-n="'+n+'">'+(n||'Tutte')+'</button>'}).join('')+'</div>'+
    '<p class="meta" style="margin:12px 0">Qui vedi subito se la risposta è giusta, senza cronometro.</p>'+
    '<button class="btn" id="train" type="button">Inizia</button></div>';

  h+='<h2>Ripasso degli errori</h2><div class="card"><p class="meta" style="margin-top:0">'+
    (errs.length?'Hai <b>'+errs.length+'</b> proposizioni sbagliate da ripassare. Quando rispondi bene, escono dalla lista.'
                :'Nessun errore da ripassare. Quello che sbagli finisce qui in automatico.')+
    '</p><button class="btn red" id="rev" type="button"'+(errs.length?'':' disabled')+'>Ripassa gli errori</button></div>';

  if(hist.length){
    h+='<h2>I tuoi ultimi risultati</h2><div class="card"><ul class="hist">'+
      hist.slice(0,8).map(function(r){
        return '<li><b>'+r.err+' error'+(r.err===1?'e':'i')+'</b> su '+r.tot+' · '+esc(r.title)+
        (r.soglia!=null?' · <span style="color:'+(r.err<=r.soglia?'#9ee7bd':'#ffb4b4')+'">'+(r.err<=r.soglia?'superata':'non superata')+'</span>':'')+
        ' · <span class="meta">'+esc(r.date)+'</span></li>';
      }).join('')+'</ul></div>';
  }

  app.innerHTML=h;
  app.querySelectorAll('[data-ex]').forEach(function(b){b.onclick=function(){esame(b.getAttribute('data-ex'))}});
  app.querySelectorAll('[data-book]').forEach(function(b){b.onclick=function(){esameLibro(+b.getAttribute('data-book'))}});
  var n=20;
  app.querySelectorAll('#num .chip').forEach(function(c){c.onclick=function(){
    app.querySelectorAll('#num .chip').forEach(function(x){x.classList.remove('on')});
    c.classList.add('on'); n=+c.getAttribute('data-n');
  }});
  document.getElementById('train').onclick=function(){
    var c=document.getElementById('cap').value, pool=shuffle(byCap(c));
    training(capNum(c)+' · '+capTit(c), n?pool.slice(0,n):pool);
  };
  document.getElementById('rev').onclick=function(){
    var ids=get('errors',[]);
    training('Ripasso errori', shuffle(D.q.filter(function(q){return ids.indexOf(q.i)>=0})));
  };
}

/* ---------- sessioni ---------- */
function esame(kind){
  var list, title, min, soglia;
  if(kind==='pat'){
    list=shuffle(byParte('sup')).slice(0,40);
    title='Esame Patente C e CE'; min=40; soglia=4;
  }else{
    list=shuffle(byParte('com')).slice(0,40).concat(shuffle(byParte('mer')).slice(0,30));
    title='Esame CQC merci'; min=90; soglia=7;
  }
  S={mode:'sim',title:title,soglia:soglia,items:shuffle(list).map(prep),i:0,end:Date.now()+min*60*1000};
  run();
}
function esameLibro(k){
  var s=D.sim[k], byId={};
  D.q.forEach(function(q){byId[q.i]=q});
  var list=s.q.map(function(i){return byId[i]}).filter(Boolean);
  var patente=list.length<=40;
  S={mode:'sim',title:s.nome,soglia:patente?4:7,items:shuffle(list).map(prep),i:0,
     end:Date.now()+(patente?40:90)*60*1000};
  run();
}
function training(title,list){
  if(!list.length){home();return}
  S={mode:'train',title:title,soglia:null,items:list.map(prep),i:0,t0:Date.now()};
  run();
}
function run(){homeBtn.classList.remove('hidden'); startTimer(); show(); window.scrollTo(0,0)}
function startTimer(){
  stopTimer();
  tick=setInterval(function(){
    if(!S) return;
    var el=document.getElementById('timer'); if(!el) return;
    if(S.mode==='sim'){
      var left=Math.round((S.end-Date.now())/1000);
      el.textContent=fmt(left); el.classList.toggle('low',left<=300);
      if(left<=0) finish(true);
    } else el.textContent=fmt(Math.round((Date.now()-S.t0)/1000));
  },1000);
}
function stopTimer(){if(tick){clearInterval(tick);tick=null}}

function show(){
  var it=S.items[S.i], tot=S.items.length;
  var date=S.items.filter(function(x){return x.a>=0}).length;
  var sim=S.mode==='sim', locked=!sim && it.a>=0;
  var tm=sim?fmt(Math.round((S.end-Date.now())/1000)):fmt(Math.round((Date.now()-S.t0)/1000));

  var h='<div class="qbar"><div><b>'+esc(S.title)+'</b><div class="meta">Proposizione '+(S.i+1)+' di '+tot+
        ' · risposte date: '+date+'</div></div><div class="timer" id="timer" aria-label="Tempo">'+tm+'</div></div>';
  h+='<div class="prog"><i style="width:'+Math.round(date/tot*100)+'%"></i></div>';
  h+='<div class="card"><span class="tag">'+capNum(it.q.c)+' · '+esc(capTit(it.q.c))+'</span>';
  h+='<div class="qtext">'+esc(it.q.t)+'</div><div class="vf">';
  [[1,'VERO'],[0,'FALSO']].forEach(function(v){
    var val=v[0], cls='opt';
    if(locked){ if(val===it.q.r) cls+=' ok'; else if(val===it.a) cls+=' ko'; }
    else if(val===it.a) cls+=' sel';
    h+='<button type="button" class="'+cls+'" data-v="'+val+'"'+(locked?' disabled':'')+'>'+v[1]+'</button>';
  });
  h+='</div>';
  if(locked){
    h+='<div class="expl"><b>'+(it.a===it.q.r?'Esatto.':'Sbagliato: la risposta giusta è '+(it.q.r?'VERO':'FALSO')+'.')+
       '</b> Se non ti torna, rileggi il capitolo '+capNum(it.q.c)+' del libro, «'+esc(capTit(it.q.c))+'».</div>';
  }
  h+='<div class="nav"><button class="btn light" id="prev" type="button"'+(S.i?'':' disabled')+'>‹ Indietro</button>';
  h+=S.i<tot-1?'<button class="btn" id="next" type="button">Avanti ›</button>'
              :'<button class="btn red" id="end" type="button">'+(sim?'Consegna':'Termina')+'</button>';
  h+='</div>';
  if(sim){
    h+='<div class="dots">'+S.items.map(function(x,k){
      return '<button type="button" class="dot'+(x.a>=0?' a':'')+(k===S.i?' cur':'')+'" data-j="'+k+'">'+(k+1)+'</button>';
    }).join('')+'</div><p style="text-align:center;margin-top:16px"><button class="btn red" id="end2" type="button">Consegna la prova</button></p>';
  }
  h+='</div>';
  app.innerHTML=h;

  app.querySelectorAll('.opt').forEach(function(b){b.onclick=function(){
    var v=+b.getAttribute('data-v');
    if(sim){ it.a=(it.a===v?-1:v); show(); }
    else if(it.a<0){ it.a=v; mark(it); show(); }
  }});
  var p=document.getElementById('prev'); if(p) p.onclick=function(){S.i--;show();window.scrollTo(0,0)};
  var n=document.getElementById('next'); if(n) n.onclick=function(){S.i++;show();window.scrollTo(0,0)};
  var e=document.getElementById('end'); if(e) e.onclick=confirmEnd;
  var e2=document.getElementById('end2'); if(e2) e2.onclick=confirmEnd;
  app.querySelectorAll('.dot').forEach(function(d){d.onclick=function(){S.i=+d.getAttribute('data-j');show();window.scrollTo(0,0)}});
}

function confirmEnd(){
  var vuote=S.items.filter(function(x){return x.a<0}).length;
  if(S.mode==='sim' && vuote>0 &&
     !window.confirm('Hai '+vuote+' proposizioni senza risposta. All\'esame una risposta non data conta come errore. Vuoi consegnare lo stesso?')) return;
  finish(false);
}
function mark(it){
  var errs=get('errors',[]), p=errs.indexOf(it.i);
  if(it.a===it.q.r){ if(p>=0) errs.splice(p,1); }
  else if(p<0) errs.push(it.i);
  put('errors',errs);
}
function finish(timeout){
  stopTimer();
  S.items.forEach(mark);
  var tot=S.items.length;
  var ok=S.items.filter(function(x){return x.a===x.q.r}).length;
  var sbagliate=S.items.filter(function(x){return x.a>=0&&x.a!==x.q.r}).length;
  var vuote=S.items.filter(function(x){return x.a<0}).length;
  var err=sbagliate+vuote, soglia=S.soglia;

  var per={};
  S.items.forEach(function(x){var c=x.q.c;per[c]=per[c]||{ok:0,n:0};per[c].n++;if(x.a===x.q.r)per[c].ok++});

  var hist=get('hist',[]), dt=new Date();
  hist.unshift({title:S.title,err:err,tot:tot,soglia:soglia,
    date:dt.toLocaleDateString('it-IT')+' '+dt.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})});
  put('hist',hist.slice(0,30));

  var h='<h1>'+esc(S.title)+'</h1>'+(timeout?'<p class="lead">Tempo scaduto: la prova è stata consegnata in automatico.</p>':'');
  h+='<div class="card score"><div class="big">'+err+'<small> error'+(err===1?'e':'i')+' su '+tot+'</small></div>';
  if(soglia!=null){
    h+='<div class="verdict '+(err<=soglia?'pass':'fail')+'">'+(err<=soglia?'PROVA SUPERATA':'PROVA NON SUPERATA')+'</div>'+
       '<p class="meta" style="margin:12px 0 0">Si supera con non più di '+soglia+' errori.</p>';
  }
  h+='<p class="meta" style="margin:12px 0 0">Esatte '+ok+' · sbagliate '+sbagliate+' · senza risposta '+vuote+'</p></div>';

  h+='<h2>Dove hai perso i punti</h2><div class="card"><table class="t"><tr><th>Capitolo del libro</th><th class="n">Esatte</th><th>%</th></tr>';
  Object.keys(per).sort().forEach(function(c){
    var pc=Math.round(per[c].ok/per[c].n*100);
    h+='<tr><td>'+capNum(c)+' · '+esc(capTit(c))+'</td><td class="n">'+per[c].ok+'/'+per[c].n+
       '</td><td><div class="bar"><i class="'+(pc<70?'low':'')+'" style="width:'+pc+'%"></i></div></td></tr>';
  });
  h+='</table></div>';

  var wrong=S.items.filter(function(x){return x.a!==x.q.r});
  h+='<div class="row"><button class="btn" id="again" type="button">Torna al menu</button>'+
     (wrong.length?'<button class="btn red" id="showw" type="button">Rivedi gli errori ('+wrong.length+')</button>':'')+
     '</div><div id="revlist"></div>';
  app.innerHTML=h; window.scrollTo(0,0);
  homeBtn.classList.add('hidden');
  document.getElementById('again').onclick=home;
  var sw=document.getElementById('showw');
  if(sw) sw.onclick=function(){
    document.getElementById('revlist').innerHTML='<h2>Le proposizioni sbagliate o senza risposta</h2><div class="card">'+
      wrong.map(function(x){
        return '<div class="rev"><span class="tag">'+capNum(x.q.c)+' · '+esc(capTit(x.q.c))+'</span> '+
          '<span class="tag ko">'+(x.a<0?'Senza risposta':'Tua risposta: '+(x.a?'VERO':'FALSO'))+'</span>'+
          '<div class="qtext">'+esc(x.q.t)+'</div>'+
          '<div class="expl"><b>Risposta giusta: '+(x.q.r?'VERO':'FALSO')+'.</b> Ripassa il capitolo '+
          capNum(x.q.c)+', «'+esc(capTit(x.q.c))+'».</div></div>';
      }).join('')+'</div>';
    sw.disabled=true;
  };
  S=null;
}
homeBtn.onclick=function(){
  if(S && S.mode==='sim' && !window.confirm('Vuoi abbandonare la prova? Le risposte date finora andranno perse.')) return;
  home();
};
if(get('ok',false)) start(); else gate();
})();
