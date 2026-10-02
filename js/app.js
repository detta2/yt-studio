/* Content Studio v2 — YouTube Studio style. Fase 1: localStorage */
(function(){
"use strict";
var LS="ytstudio_v1";
var state=load()||{queue:[],settings:{time:"19:00",auto:true,themes:["hewan","misteri"]}};
function load(){try{return JSON.parse(localStorage.getItem(LS))}catch(e){return null}}
function save(){localStorage.setItem(LS,JSON.stringify(state))}
function uid(){return "q"+Date.now().toString(36)+Math.floor(Math.random()*999)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function $(id){return document.getElementById(id)}
function fmtDT(s){if(!s)return"—";var d=new Date(s);return d.toLocaleDateString("id-ID",{day:"numeric",month:"short"})+" · "+d.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}

if(!localStorage.getItem(LS+"_seed")){
  var t=new Date();t.setDate(t.getDate()+1);t.setHours(19,0,0,0);
  state.queue=[
    {id:uid(),title:"KETANGKEP CCTV! Kucing Nyelinap Masuk Pekarangan Jam 2 Pagi",theme:"hewan",hashtags:"#shorts #cctv #kucing",scheduled_at:t.toISOString().slice(0,16),status:"scheduled",created_at:new Date().toISOString()},
    {id:uid(),title:"KETANGKEP CCTV! Musang Masuk Pekarangan Tengah Malam",theme:"hewan",hashtags:"#shorts #cctv #musang",scheduled_at:"",status:"draft",created_at:new Date().toISOString()}
  ];
  save();localStorage.setItem(LS+"_seed","1");
}

/* demo stats: deterministik dari id */
function statsFor(v){
  var s=0;for(var k=0;k<v.id.length;k++)s+=v.id.charCodeAt(k);
  var views=v.status==="published"?800+((s*7919)%9000):0;
  var likes=Math.floor(views*(0.04+((s%7)/200))),comments=Math.floor(likes*0.12);
  var series=[],ls=[];
  for(var i=0;i<14;i++){var f=0.5+0.5*Math.abs(Math.sin(s+i*1.7));series.push(Math.floor(views/14*f));ls.push(Math.floor(likes/14*f))}
  return{views:views,likes:likes,comments:comments,series:series,likesSeries:ls};
}
var themeIco={hewan:"🐾",misteri:"👻"};
var stName={draft:"Draft",scheduled:"Terjadwal",published:"Dipublikasikan"};

/* ---------- nav ---------- */
document.querySelectorAll(".nav-item").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll(".nav-item").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");
    document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active")});
    var vw=b.dataset.view;
    $("view-"+vw).classList.add("active");
    $("sidebar").classList.remove("open");
    if(vw==="dash")renderDash();
    if(vw==="content")renderQueue();
    if(vw==="calendar")renderCal();
    if(vw==="analytics")renderAnalytics();
  });
});
$("btn-menu").addEventListener("click",function(){$("sidebar").classList.toggle("open")});
$("dash-range-label").textContent="28 hari terakhir · "+new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});

/* ---------- canvas helpers ---------- */
function setup(cv,h){var r=cv.getBoundingClientRect();cv.width=Math.max(r.width,50)*2;cv.height=h*2;return cv.getContext("2d")}
function line(ctx,pts,color,fill,W,H,pad){
  pad=pad||8;var max=Math.max.apply(null,pts.concat([1]));
  ctx.beginPath();
  pts.forEach(function(p,i){var x=pad+i*(W-2*pad)/(pts.length-1),y=H-pad-(p/max)*(H-2*pad);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();
  if(fill){ctx.lineTo(W-pad,H-pad);ctx.lineTo(pad,H-pad);ctx.closePath();
    var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,color+"55");g.addColorStop(1,color+"00");
    ctx.fillStyle=g;ctx.fill()}
}
function spark(id,pts,color){
  var cv=$(id);if(!cv)return;var ctx=setup(cv,44);
  line(ctx,pts,color,true,cv.width,cv.height);
}

/* ---------- dashboard ---------- */
function renderDash(){
  var pub=state.queue.filter(function(x){return x.status==="published"});
  var tv=0,tl=0;pub.forEach(function(v){var s=statsFor(v);tv+=s.views;tl+=s.likes});
  $("k-views").textContent=tv>=1000?(tv/1000).toFixed(1)+"K":tv;
  $("k-likes").textContent=tl>=1000?(tl/1000).toFixed(1)+"K":tl;
  $("k-subs").textContent=pub.length?("+"+(12+pub.length*7)):"+0";
  $("k-views-d").textContent="+14.3% dari 28 hari lalu";
  $("k-likes-d").textContent="+6.8% dari 28 hari lalu";
  $("k-subs-d").textContent="+9.1% dari 28 hari lalu";
  /* sparkline agregat */
  var agg=Array(14).fill(0),aggl=Array(14).fill(0);
  pub.forEach(function(v){var s=statsFor(v);s.series.forEach(function(p,i){agg[i]+=p});s.likesSeries.forEach(function(p,i){aggl[i]+=p})});
  if(!pub.length){agg=agg.map(function(_,i){return 10+10*Math.abs(Math.sin(i))});aggl=aggl.map(function(){return 2})}
  spark("sp-views",agg,"#8b7cf6");spark("sp-likes",aggl,"#3ea6ff");spark("sp-subs",agg.map(function(a){return a/40}),"#f5b301");
  /* latest */
  var box=$("latest-list");box.innerHTML="";
  var items=state.queue.slice().sort(function(a,b){return (b.created_at||"")<(a.created_at||"")?-1:1}).slice(0,4);
  if(!items.length)box.innerHTML='<p class="dim">Belum ada konten.</p>';
  items.forEach(function(it){
    var r=document.createElement("div");r.className="latest-row";
    r.innerHTML='<div class="thumb '+it.theme+'">'+themeIco[it.theme]+'<span class="dur">00:10</span></div>'+
      '<div class="lr-body"><div class="lr-title">'+esc(it.title)+'</div>'+
      '<div class="lr-meta">'+themeIco[it.theme]+" "+it.theme+" · "+fmtDT(it.scheduled_at)+'<span class="stbadge '+it.status+'">'+stName[it.status]+"</span></div></div>";
    box.appendChild(r);
  });
  renderMiniCal();drawMainChart();drawBars();
}
function renderMiniCal(){
  var now=new Date(),y=now.getFullYear(),m=now.getMonth();
  $("mcal-title").textContent=now.toLocaleDateString("id-ID",{month:"short",year:"numeric"});
  var el=$("mini-cal");el.innerHTML="";
  ["S","S","R","K","J","S","M"].forEach(function(d){var e=document.createElement("div");e.className="dow";e.textContent=d;el.appendChild(e)});
  var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=now.getDate();
  var adj=(first+6)%7;
  for(var i=0;i<adj;i++)el.appendChild(document.createElement("div"));
  for(var d=1;d<=days;d++){
    (function(dn){
      var c=document.createElement("div");c.className="d"+(dn===today?" today":"");
      var n=0;state.queue.forEach(function(it){if(!it.scheduled_at)return;var s=new Date(it.scheduled_at);
        if(s.getFullYear()===y&&s.getMonth()===m&&s.getDate()===dn)n++});
      if(n)c.classList.add("has");
      c.innerHTML=dn+(n?'<span class="n">'+n+"</span>":"");
      el.appendChild(c);
    })(d);
  }
  var up=state.queue.filter(function(x){return x.status==="scheduled"&&x.scheduled_at&&new Date(x.scheduled_at)>now}).length;
  $("mini-legend").textContent=up?("● "+up+" terjadwal bulan ini"):"Tidak ada jadwal bulan ini";
}
var mcalOff=0;
function drawMainChart(){
  var cv=$("chart-main");if(!cv)return;var ctx=setup(cv,180),W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  var pub=state.queue.filter(function(x){return x.status==="published"});
  var agg=Array(14).fill(0),aggl=Array(14).fill(0);
  pub.forEach(function(v){var s=statsFor(v);s.series.forEach(function(p,i){agg[i]+=p});s.likesSeries.forEach(function(p,i){aggl[i]+=p})});
  if(!pub.length){agg=agg.map(function(_,i){return 20+15*Math.abs(Math.sin(i*1.3))});aggl=aggl.map(function(_,i){return 3+2*Math.abs(Math.cos(i))})}
  line(ctx,agg,"#8b7cf6",true,W,H);line(ctx,aggl.map(function(a){return a*20}),"#3ea6ff",false,W,H);
}
function drawBars(){
  var cv=$("chart-bars");if(!cv)return;var ctx=setup(cv,180),W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  var pub=state.queue.filter(function(x){return x.status==="published"}).slice(0,6);
  if(!pub.length){ctx.fillStyle="#aaa";ctx.font="26px sans-serif";ctx.fillText("Belum ada data",30,60);return}
  var max=Math.max.apply(null,pub.map(function(v){return statsFor(v).views}));
  var bw=W/(pub.length*2);
  pub.forEach(function(v,i){
    var s=statsFor(v),h=(s.views/max)*(H-60),x=i*2*bw+bw/2;
    ctx.fillStyle="#8b7cf6";ctx.beginPath();ctx.roundRect(x,H-30-h,bw,h,8);ctx.fill();
    ctx.fillStyle="#aaa";ctx.font="20px sans-serif";ctx.fillText("V"+(i+1),x+bw/2-14,H-8);
  });
}

/* ---------- queue ---------- */
function renderQueue(){
  var list=$("queue-list");list.innerHTML="";
  var q=state.queue.slice().sort(function(a,b){return (a.scheduled_at||"9999")<(b.scheduled_at||"9999")?-1:1});
  $("queue-empty").hidden=q.length>0;
  q.forEach(function(it){
    var el=document.createElement("div");el.className="qcard";
    el.innerHTML='<div class="thumb '+it.theme+'" style="width:72px;height:96px">'+themeIco[it.theme]+"</div>"+
      '<div class="qbody"><div class="qtitle">'+esc(it.title)+"</div>"+
      '<div class="qmeta"><span class="badge '+it.theme+'">'+themeIco[it.theme]+" "+it.theme+"</span>"+
      '<span class="badge '+it.status+'">'+stName[it.status]+'</span><span class="qsched">📅 '+fmtDT(it.scheduled_at)+"</span></div>"+
      (it.hashtags?'<div class="dim" style="margin-top:6px">'+esc(it.hashtags)+"</div>":"")+"</div>"+
      '<div class="qactions">'+(it.status!=="published"?'<button class="qbtn go" data-a="pub">✓ Terbit</button>':"")+
      '<button class="qbtn" data-a="edit">✏️</button><button class="qbtn del" data-a="del">🗑</button></div>';
    el.querySelectorAll(".qbtn").forEach(function(btn){
      btn.addEventListener("click",function(){
        var a=btn.dataset.a;
        if(a==="del"&&confirm("Hapus dari antrian?")){state.queue=state.queue.filter(function(x){return x.id!==it.id});save();renderQueue()}
        else if(a==="pub"){it.status="published";save();renderQueue()}
        else if(a==="edit")openModal(it);
      });
    });
    list.appendChild(el);
  });
}

/* ---------- modal ---------- */
var editing=null;
function openModal(it){
  editing=it||null;
  $("modal-title").textContent=it?"Edit Konten":"Tambah Konten";
  $("f-title").value=it?it.title:"";$("f-theme").value=it?it.theme:"hewan";
  $("f-tags").value=it?(it.hashtags||""):"";$("f-sched").value=it?(it.scheduled_at||""):"";
  $("modal-back").hidden=false;
}
["btn-add","btn-add2","btn-add3"].forEach(function(id){var b=$(id);if(b)b.addEventListener("click",function(){openModal(null)})});
$("modal-cancel").addEventListener("click",function(){$("modal-back").hidden=true});
$("modal-back").addEventListener("click",function(e){if(e.target.id==="modal-back")e.target.hidden=true});
$("modal-save").addEventListener("click",function(){
  var title=$("f-title").value.trim();if(!title){alert("Judul wajib diisi");return}
  var sched=$("f-sched").value;
  var data={title:title,theme:$("f-theme").value,hashtags:$("f-tags").value.trim(),scheduled_at:sched,status:sched?"scheduled":"draft"};
  if(editing)Object.assign(editing,data);
  else state.queue.push(Object.assign({id:uid(),created_at:new Date().toISOString()},data));
  save();renderQueue();if($("view-dash").classList.contains("active"))renderDash();
  $("modal-back").hidden=true;
});

/* ---------- calendar ---------- */
var calCursor=new Date();calCursor.setDate(1);
function renderCal(){
  var y=calCursor.getFullYear(),m=calCursor.getMonth();
  $("cal-title").textContent=calCursor.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  var grid=$("cal-grid");grid.innerHTML="";
  ["Min","Sen","Sel","Rab","Kam","Jum","Sab"].forEach(function(d){var e=document.createElement("div");e.className="cal-dow";e.textContent=d;grid.appendChild(e)});
  var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=new Date();today.setHours(0,0,0,0);
  for(var i=0;i<first;i++){var p=document.createElement("div");p.className="cal-day other";grid.appendChild(p)}
  for(var dn=1;dn<=days;dn++)(function(dnum){
    var cell=document.createElement("div");cell.className="cal-day";
    var dt=new Date(y,m,dnum);if(dt.getTime()===today.getTime())cell.classList.add("today");
    cell.innerHTML='<div class="cal-num">'+dnum+"</div>";
    state.queue.forEach(function(it){if(!it.scheduled_at)return;var s=new Date(it.scheduled_at);
      if(s.getFullYear()===y&&s.getMonth()===m&&s.getDate()===dnum){
        var c=document.createElement("span");c.className="cal-chip "+it.status;
        c.textContent=themeIco[it.theme]+" "+it.title.slice(0,24);c.title=it.title+" — "+fmtDT(it.scheduled_at);
        cell.appendChild(c)}});
    grid.appendChild(cell);
  })(dn);
}
$("cal-prev").addEventListener("click",function(){calCursor.setMonth(calCursor.getMonth()-1);renderCal()});
$("cal-next").addEventListener("click",function(){calCursor.setMonth(calCursor.getMonth()+1);renderCal()});

/* ---------- analytics ---------- */
function renderAnalytics(){
  var pub=state.queue.filter(function(x){return x.status==="published"});
  var tv=0,tl=0,tc=0;pub.forEach(function(v){var s=statsFor(v);tv+=s.views;tl+=s.likes;tc+=s.comments});
  $("a-views").textContent=tv.toLocaleString("id-ID");$("a-likes").textContent=tl.toLocaleString("id-ID");$("a-comments").textContent=tc.toLocaleString("id-ID");
  var tb=document.querySelector("#stats-table tbody");tb.innerHTML="";
  state.queue.forEach(function(v){
    var s=statsFor(v),tr=document.createElement("tr");
    tr.innerHTML="<td>"+esc(v.title.slice(0,42))+"</td><td>"+s.views.toLocaleString("id-ID")+"</td><td>"+s.likes.toLocaleString("id-ID")+"</td><td>"+s.comments+'</td><td><span class="badge '+v.status+'">'+stName[v.status]+"</span></td>";
    tb.appendChild(tr);
  });
}

/* ---------- settings ---------- */
$("set-time").value=state.settings.time;$("set-auto").checked=state.settings.auto;
$("theme-hewan").checked=state.settings.themes.indexOf("hewan")>=0;
$("theme-misteri").checked=state.settings.themes.indexOf("misteri")>=0;
$("set-time").addEventListener("change",function(e){state.settings.time=e.target.value;save()});
$("set-auto").addEventListener("change",function(e){state.settings.auto=e.target.checked;save()});
["hewan","misteri"].forEach(function(t){
  $("theme-"+t).addEventListener("change",function(e){
    var th=state.settings.themes;
    if(e.target.checked&&th.indexOf(t)<0)th.push(t);
    if(!e.target.checked)th=th.filter(function(x){return x!==t});
    state.settings.themes=th.length?th:["hewan"];save();
  });
});
$("btn-wipe").addEventListener("click",function(){
  if(confirm("Hapus SEMUA data lokal?")){localStorage.removeItem(LS);localStorage.removeItem(LS+"_seed");location.reload()}
});

renderDash();
})();
