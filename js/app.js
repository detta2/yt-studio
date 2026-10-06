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
function fmtN(n){n=+n||0;return n>=1e6?(n/1e6).toFixed(1)+"Jt":n>=1000?(n/1000).toFixed(1)+"K":String(n)}
/* LIVE = data asli dari YouTube (live.json, ditulis backend tiap sinkron) */
var LIVE=null;
function loadLive(){
  fetch("live.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){
    if(!d||!d.channel)return;
    LIVE=d;
    $("yt-status").innerHTML="Status: <b style='color:#4caf50'>● terhubung</b> — "+esc(d.channel.title)+
      " ("+d.channel.subs+" subs) · sinkron "+esc(d.synced_at||"");
    $("btn-yt-connect").textContent="🔄 Hubungkan ulang";
    renderDash();
    var va=$("view-analytics");if(va&&!va.hidden)renderAnalytics();
    var vc=$("view-comments");if(vc&&!vc.hidden)renderComments();
  }).catch(function(){});
}

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
    if(vw==="monitor")renderMonitor();
    if(vw==="chanalytics")renderChAnalytics();
    if(vw==="dash")renderDash();
    if(vw==="content")renderQueue();
    if(vw==="calendar")renderCal();
    if(vw==="analytics")renderAnalytics();
    if(vw==="comments")renderComments();
    if(vw==="story"){stoRoute={name:"home"};renderStory()}
    if(vw==="dante")renderDante();
    if(vw==="dantestory")renderChanView(CHANVIEWS.dantestory);
    if(vw==="dantejr")renderChanView(CHANVIEWS.dantejr);
    if(vw==="dantekids")renderChanView(CHANVIEWS.dantekids);
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
  var subs=pub.length?("+ "+(12+pub.length*7)):"+0";
  var vd="+14.3% dari 28 hari lalu",ld="+6.8% dari 28 hari lalu",sd="+9.1% dari 28 hari lalu";
  if(LIVE){
    tv=LIVE.channel.views;subs=String(LIVE.channel.subs);
    tl=0;LIVE.videos.forEach(function(v){tl+=v.likes});
    vd="total semua video";ld="total semua video";sd="subscriber channel";
  }
  $("k-views").textContent=fmtN(tv);
  $("k-likes").textContent=fmtN(tl);
  $("k-subs").textContent=subs;
  $("k-views-d").textContent=vd;
  $("k-likes-d").textContent=ld;
  $("k-subs-d").textContent=sd;
  /* sparkline agregat */
  var agg=Array(14).fill(0),aggl=Array(14).fill(0);
  pub.forEach(function(v){var s=statsFor(v);s.series.forEach(function(p,i){agg[i]+=p});s.likesSeries.forEach(function(p,i){aggl[i]+=p})});
  if(!pub.length){agg=agg.map(function(_,i){return 10+10*Math.abs(Math.sin(i))});aggl=aggl.map(function(){return 2})}
  spark("sp-views",agg,"#8b7cf6");spark("sp-likes",aggl,"#3ea6ff");spark("sp-subs",agg.map(function(a){return a/40}),"#f5b301");
  /* latest */
  var box=$("latest-list");box.innerHTML="";
  if(LIVE&&LIVE.videos.length){
    LIVE.videos.slice(0,4).forEach(function(v){
      var r=document.createElement("div");r.className="latest-row";
      r.innerHTML='<div class="thumb hewan">🎬<span class="dur">:--</span></div>'+
        '<div class="lr-body"><div class="lr-title">'+esc(v.title)+'</div>'+
        '<div class="lr-meta">👁 '+fmtN(v.views)+' · 👍 '+fmtN(v.likes)+' · 💬 '+v.comments+' · '+esc(v.published)+'</div></div>';
      box.appendChild(r);
    });
  }else{
  var items=state.queue.slice().sort(function(a,b){return (b.created_at||"")<(a.created_at||"")?-1:1}).slice(0,4);
  if(!items.length)box.innerHTML='<p class="dim">Belum ada konten.</p>';
  items.forEach(function(it){
    var r=document.createElement("div");r.className="latest-row";
    r.innerHTML='<div class="thumb '+it.theme+'">'+themeIco[it.theme]+'<span class="dur">00:10</span></div>'+
      '<div class="lr-body"><div class="lr-title">'+esc(it.title)+'</div>'+
      '<div class="lr-meta">'+themeIco[it.theme]+" "+it.theme+" · "+fmtDT(it.scheduled_at)+'<span class="stbadge '+it.status+'">'+stName[it.status]+"</span></div></div>";
    box.appendChild(r);
  });
  }
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
    ctx.fillStyle="#8b7cf6";
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,H-30-h,bw,h,8);ctx.fill()}
    else ctx.fillRect(x,H-30-h,bw,h);
    ctx.fillStyle="#aaa";ctx.font="20px sans-serif";ctx.fillText("V"+(i+1),x+bw/2-14,H-8);
  });
}

/* ---------- queue (tabel ala Studio) ---------- */
var contentFilter="all";
document.querySelectorAll("#content-filters .ftab").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll("#content-filters .ftab").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");contentFilter=b.dataset.f;renderQueue();
  });
});
var visIco={draft:"🔒",scheduled:"🕐",published:"🌐"};
var visName={draft:"Pribadi",scheduled:"Terjadwal",published:"Publik"};
function renderQueue(){
  var tb=$("content-tbody");tb.innerHTML="";
  var q=state.queue.filter(function(x){return contentFilter==="all"||x.status===contentFilter})
    .sort(function(a,b){return (b.created_at||"")<(a.created_at||"")?-1:1});
  $("queue-empty").hidden=q.length>0;
  q.forEach(function(it){
    var s=statsFor(it);
    var tr=document.createElement("tr");
    tr.innerHTML='<td><input type="checkbox"></td>'+
      '<td><div class="cvideo"><div class="cthumb '+it.theme+'">'+themeIco[it.theme]+'<span class="dur">00:10</span></div>'+
      '<div><div class="cv-title">'+esc(it.title)+'</div><div class="cv-sub">'+themeIco[it.theme]+" "+it.theme+"</div></div></div></td>"+
      '<td><span class="viscell"><span class="lock">'+visIco[it.status]+"</span>"+visName[it.status]+"</span></td>"+
      '<td><span class="dim">—</span></td>'+
      '<td>'+fmtDT(it.scheduled_at||it.created_at)+'</td>'+
      '<td>'+(it.status==="published"?s.views.toLocaleString("id-ID"):"—")+'</td>'+
      '<td>'+(it.status==="published"?s.comments:"—")+'</td>'+
      '<td>'+(it.status==="published"?s.likes.toLocaleString("id-ID"):"—")+'</td>'+
      '<td><span class="rowact"><button data-a="edit" title="Edit">✏️</button><button data-a="pub" title="Tandai terbit">✓</button><button data-a="del" title="Hapus">🗑</button></span></td>';
    tr.querySelectorAll(".rowact button").forEach(function(btn){
      btn.addEventListener("click",function(){
        var a=btn.dataset.a;
        if(a==="del"&&confirm("Hapus dari antrian?")){state.queue=state.queue.filter(function(x){return x.id!==it.id});save();renderQueue()}
        else if(a==="pub"){it.status="published";save();renderQueue()}
        else if(a==="edit")openModal(it);
      });
    });
    tb.appendChild(tr);
  });
  var ck=$("ck-all");
  if(ck)ck.onclick=function(){tb.querySelectorAll('input[type=checkbox]').forEach(function(c){c.checked=ck.checked})};
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

/* ---------- analytics (tab: ringkasan/jangkauan/interaksi/audiens) ---------- */
document.querySelectorAll("#ana-tabs .ftab").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll("#ana-tabs .ftab").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");
    document.querySelectorAll(".ana-panel").forEach(function(p){p.hidden=true});
    var p=$("ana-"+b.dataset.t);p.hidden=false;
    if(b.dataset.t==="ringkas")drawAnaMain();
    if(b.dataset.t==="audiens")drawAge();
  });
});
function renderAnalytics(){
  var pub=state.queue.filter(function(x){return x.status==="published"});
  var tv=0,tl=0,tc=0;pub.forEach(function(v){var s=statsFor(v);tv+=s.views;tl+=s.likes;tc+=s.comments});
  var subs=pub.length?("+"+(12+pub.length*7)):"+0";
  var vids=null;
  if(LIVE){tv=LIVE.channel.views;subs=String(LIVE.channel.subs);vids=LIVE.videos;
    tl=0;tc=0;vids.forEach(function(v){tl+=v.likes;tc+=v.comments});}
  $("a-views").textContent=tv.toLocaleString("id-ID");
  $("a-likes").textContent=tl.toLocaleString("id-ID");
  $("a-subs").textContent=subs;
  /* jangkauan */
  var imp=Math.floor(tv*8.4);
  $("j-imp").textContent=imp.toLocaleString("id-ID");
  $("j-ctr").textContent=(3.2+pub.length*0.4).toFixed(1)+"%";
  $("j-src").textContent=Math.floor(tv*0.31).toLocaleString("id-ID");
  var src=[["Shorts feed",0.58],["Penelusuran",0.21],["Rekomendasi",0.13],["Lainnya",0.08]];
  var tb=$("traffic-tbody");tb.innerHTML="";
  src.forEach(function(r){
    var tr=document.createElement("tr");
    tr.innerHTML="<td>"+r[0]+"</td><td>"+Math.floor(tv*r[1]).toLocaleString("id-ID")+"</td><td>"+Math.floor(r[1]*100)+"%</td>";
    tb.appendChild(tr);
  });
  /* interaksi */
  $("i-likes").textContent=tl.toLocaleString("id-ID");
  $("i-comments").textContent=tc.toLocaleString("id-ID");
  $("i-shares").textContent=Math.floor(tl*0.08).toLocaleString("id-ID");
  var top=vids
    ? vids.slice().sort(function(a,b){return b.likes-a.likes}).slice(0,5).map(function(v){return{v:v,s:{likes:v.likes,comments:v.comments}}})
    : pub.map(function(v){var s=statsFor(v);return{v:v,s:s}}).sort(function(a,b){return b.s.likes-a.s.likes}).slice(0,5);
  var tt=$("top-tbody");tt.innerHTML="";
  top.forEach(function(r){
    var tr=document.createElement("tr");
    tr.innerHTML="<td>"+esc(r.v.title.slice(0,42))+"</td><td>"+r.s.likes.toLocaleString("id-ID")+"</td><td>"+r.s.comments+"</td>";
    tt.appendChild(tr);
  });
  if(!top.length)tt.innerHTML='<tr><td colspan="3" class="dim">Belum ada data</td></tr>';
  /* audiens */
  var auSubs=LIVE?LIVE.channel.subs:(pub.length?(12+pub.length*7):0);
  $("au-subs").textContent="+"+auSubs;
  $("au-uniq").textContent=Math.floor(tv*0.72).toLocaleString("id-ID");
  $("au-id").textContent="87%";
  drawAnaMain();
}
function drawAnaMain(){
  var cv=$("chart-ana-main");if(!cv||$("ana-ringkas").hidden)return;
  var ctx=setup(cv,200),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  var pub=state.queue.filter(function(x){return x.status==="published"});
  var agg=Array(14).fill(0),aggl=Array(14).fill(0);
  pub.forEach(function(v){var s=statsFor(v);s.series.forEach(function(p,i){agg[i]+=p});s.likesSeries.forEach(function(p,i){aggl[i]+=p})});
  if(!pub.length){agg=agg.map(function(_,i){return 20+15*Math.abs(Math.sin(i*1.3))});aggl=aggl.map(function(){return 3})}
  line(ctx,agg,"#8b7cf6",true,W,H);line(ctx,aggl.map(function(a){return a*20}),"#3ea6ff",false,W,H);
}
function drawAge(){
  var cv=$("chart-age");if(!cv||$("ana-audiens").hidden)return;
  var ctx=setup(cv,200),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  var ages=[["13–17",18],["18–24",34],["25–34",26],["35–44",14],["45+",8]];
  var bw=W/(ages.length*2);
  ages.forEach(function(a,i){
    var h=(a[1]/40)*(H-70),x=i*2*bw+bw/2;
    ctx.fillStyle="#8b7cf6";
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,H-50-h,bw,h,8);ctx.fill()}
    else ctx.fillRect(x,H-50-h,bw,h);
    ctx.fillStyle="#aaa";ctx.font="20px sans-serif";ctx.fillText(a[1]+"%",x+bw/2-16,H-28);ctx.fillText(a[0],x+bw/2-30,H-6);
  });
}

/* ---------- komentar (demo) ---------- */
var cmtFilter="all";
var CMT_TEXT=["Merinding liatnya 😱","Ini beneran ketangkep cctv?","Kucingnya lucu banget","Auto replay berkali-kali","Kok bisa masuk ya?","Ngeri tapi penasaran","Besok upload lagi dong","Kualitas cctv-nya dapet banget"];
document.querySelectorAll("#cmt-filters .ftab").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll("#cmt-filters .ftab").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");cmtFilter=b.dataset.f;renderComments();
  });
});
function demoComments(){
  var pub=state.queue.filter(function(x){return x.status==="published"});
  var out=[],names=["Budi S","Siti","Rizky","Dewi","Andi","Maya","Putri","Joko"];
  pub.forEach(function(v,vi){
    var s=0;for(var k=0;k<v.id.length;k++)s+=v.id.charCodeAt(k);
    var n=2+(s%4);
    for(var i=0;i<n;i++){
      var held=((s+i*3)%9===0);
      out.push({id:v.id+i,video:v.title,name:names[(s+i)%names.length],
        text:CMT_TEXT[(s+i*2)%CMT_TEXT.length],held:held,
        time:(1+((s+i)%20))+" jam lalu",likes:(s+i*7)%48});
    }
  });
  return out;
}
function renderComments(){
  var box=$("comments-list");box.innerHTML="";
  var liveCmts=(LIVE&&LIVE.comments&&LIVE.comments.length)?LIVE.comments.map(function(c){
    return{name:c.name,text:c.text,video:c.video,time:c.time,likes:c.likes,held:false,live:true};
  }):null;
  var all=(liveCmts||demoComments()).filter(function(c){return cmtFilter==="all"||(cmtFilter==="held"?c.held:!c.held)});
  if(!all.length){box.innerHTML='<div class="empty"><div class="empty-ico">💬</div><p>Belum ada komentar.</p></div>';return}
  all.forEach(function(c){
    var el=document.createElement("div");el.className="cmt"+(c.held?" held":"");
    el.innerHTML='<div class="cmt-ava">👤</div><div class="cmt-body">'+
      '<div class="cmt-head"><b>'+esc(c.name)+'</b><span class="cmt-time">'+esc(c.time)+'</span>'+(c.held?'<span class="held-tag">● ditahan untuk ditinjau</span>':"")+"</div>"+
      '<div class="cmt-text">'+esc(c.text)+'</div>'+
      '<div class="cmt-video">di "'+esc(String(c.video).slice(0,40))+'..."</div>'+
      '<div class="cmt-actions"><button>👍 '+c.likes+'</button>'+(c.live?"":'<button>👎</button><button>↩️ Balas</button>')+
      (c.held?'<button data-a="ok">✓ Setujui</button>':"")+(c.live?"":'<button data-a="del">🗑</button>')+'</div></div>';
    el.querySelectorAll(".cmt-actions button").forEach(function(btn){
      btn.addEventListener("click",function(){
        if(btn.dataset.a==="del"&&confirm("Hapus komentar ini?"))el.remove();
        else if(btn.dataset.a==="ok"){el.classList.remove("held");var t=el.querySelector(".held-tag");if(t)t.remove();btn.remove()}
      });
    });
    box.appendChild(el);
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

/* ---------- YouTube connect (Fase 2) ---------- */
var YT_CLIENT_ID="255111005069-d6cd0of1heps3qsjt1ok0ogvongnsr40.apps.googleusercontent.com";
var YT_REDIRECT="http://127.0.0.1:8080";
var YT_SCOPES=["https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/youtube.force-ssl","https://www.googleapis.com/auth/yt-analytics.readonly"].join(" ");
$("btn-yt-connect").addEventListener("click",function(){
  var u="https://accounts.google.com/o/oauth2/v2/auth?"+
    "client_id="+encodeURIComponent(YT_CLIENT_ID)+
    "&redirect_uri="+encodeURIComponent(YT_REDIRECT)+
    "&response_type=code&scope="+encodeURIComponent(YT_SCOPES)+
    "&access_type=offline&prompt=consent";
  window.open(u,"_blank");
});
/* ---------- video berikutnya (ide generate) ---------- */
var NEXT_LS="ytstudio_next";
function renderNext(){
  var d=null;try{d=JSON.parse(localStorage.getItem(NEXT_LS))}catch(e){}
  if(d&&d.idea){$("next-idea").value=d.idea;$("next-theme").value=d.theme||"acak"}
  fetch("next-video.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(j){
    if(j&&j.idea)$("next-active-text").textContent=j.idea+" ("+j.theme+")";
  }).catch(function(){});
}
$("btn-next-save").addEventListener("click",function(){
  var idea=$("next-idea").value.trim();
  if(!idea){alert("Isi dulu ide videonya");return}
  localStorage.setItem(NEXT_LS,JSON.stringify({idea:idea,theme:$("next-theme").value}));
  alert("Tersimpan di HP ✓ — salin & kirim ke Dante biar diaktifin");
});
$("btn-next-copy").addEventListener("click",function(){
  var idea=$("next-idea").value.trim();
  if(!idea){alert("Isi dulu ide videonya");return}
  var t="🎬 Generate video besok: "+idea+" (tema: "+$("next-theme").value+")";
  if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){alert("Tersalin! Paste di chat ke Dante 📋")});
  else{prompt("Copy manual:",t)}
});
renderNext();

/* status koneksi dari live.json (ditulis backend tiap sinkronisasi) */
loadLive();

/* ================= CERITA (Video AI) — modul terpisah, data & pipeline sendiri ================= */
var STO_LS="bsw_projects_v1";
function stoLoad(){try{return JSON.parse(localStorage.getItem(STO_LS))||[]}catch(e){return[]}}
function stoSave(p){try{localStorage.setItem(STO_LS,JSON.stringify(p))}catch(e){}}
var stoRoute={name:"home"};
var stoDraft=null;
function sic(p){return '<svg class="st-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'}
var IC={
book:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
spark:'<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>',
film:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>',
clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
back:'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>'};
function stoToast(m){var e=$("st-toast");if(!e){e=document.createElement("div");e.id="st-toast";e.className="st-toast";document.body.appendChild(e)}e.textContent=m;e.classList.add("show");clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove("show")},2600)}
function stoDoneCount(p){var d=0;p.scenes.forEach(function(s){if(s.st&&s.st.img==="done"&&s.st.anim==="done"&&s.st.nar==="done")d++});return d}
function stoMins(n){return Math.round(n/6*10)/10}
function renderStory(){
  var v=$("view-story");if(!v)return;
  if(stoRoute.name==="detail")return stoDetail(v,stoRoute.id);
  if(stoRoute.name==="wizard")return stoWizard(v);
  return stoHome(v);
}
function stStat(icn,label,val){
  return '<div class="st-stat"><div class="st-sic">'+sic(icn)+'</div><div><small>'+label+'</small><b>'+val+'</b></div></div>';
}
function stoHome(v){
  var ps=stoLoad().slice().sort(function(a,b){return(b.updatedAt||"")<(a.updatedAt||"")?-1:1});
  var done=0,scenes=0;
  ps.forEach(function(p){scenes+=p.scenes.length;done+=stoDoneCount(p)});
  var h='<div class="st-head"><div><h1>'+sic(IC.book)+' Cerita — Video AI</h1><p>Ubah ide cerita jadi video panjang. Modul terpisah — pipeline CCTV tidak terganggu.</p></div>'
    +'<button class="btn-red" data-st="new">'+sic(IC.plus)+' Proyek Baru</button></div>';
  h+='<div class="st-stats">'+stStat(IC.spark,"Total proyek cerita",ps.length)+stStat(IC.film,"Adegan selesai",done)+stStat(IC.clock,"Menit video jadi",stoMins(scenes))+'</div>';
  h+='<div class="panel"><h3 style="font-size:16px;margin-bottom:14px">Proyek Terbaru</h3>';
  if(!ps.length){
    h+='<div class="st-empty">'+sic(IC.book)+'<h3>Belum ada proyek cerita</h3><p>Tulis ide ceritamu, atur adegan per adegan, kirim ke Dante — jadi video.</p><button class="btn-red" data-st="new">'+sic(IC.plus)+' Buat Proyek Pertama</button></div>';
  }else{
    ps.forEach(function(p,i){
      var t=p.scenes.length,d=stoDoneCount(p),pct=t?Math.round(d/t*100):0;
      var cls=pct===100?"done":(pct===0?"draft":""),lbl=pct===100?"Selesai":(pct===0?"Draf":"Diproses");
      h+='<div class="st-proj" data-st="open" data-id="'+p.id+'"><div class="st-thumb stg'+((i%5)+1)+'"><span class="st-fmt">'+esc(p.format)+'</span></div>'
        +'<div class="st-pb"><h3>'+esc(p.title||"(tanpa judul)")+'</h3><div class="m">'+sic(IC.clock)+' '+t+' adegan • ±'+stoMins(t)+' menit • '+esc(p.style)+'</div>'
        +'<div class="st-bar"><i class="'+(pct===100?"done":"")+'" style="width:'+pct+'%"></i></div></div>'
        +'<span class="st-st '+cls+'">'+pct+'% • '+lbl+'</span></div>';
    });
  }
  h+='</div><div class="st-tips" style="text-align:center">Data proyek tersimpan di browser ini. "Salin &amp; kirim ke Dante" di dalam proyek untuk mulai generasi.</div>';
  v.innerHTML=h;
  v.querySelectorAll('[data-st="new"]').forEach(function(b){b.addEventListener("click",function(){stoDraft={id:null,step:1,title:"",idea:"",format:"9:16",style:"Storybook",minutes:3,narrator:"ID · Pria",scenes:[]};stoRoute={name:"wizard"};renderStory()})});
  v.querySelectorAll('[data-st="open"]').forEach(function(b){b.addEventListener("click",function(){stoRoute={name:"detail",id:b.dataset.id};renderStory()})});
}
function stBadge(pid,i,k,label){
  var ps=stoLoad(),p=null;ps.forEach(function(x){if(x.id===pid)p=x});
  var s=p?p.scenes[i]:null,v=(s&&s.st&&s.st[k])||"todo";
  var icn=v==="done"?"✓ ":v==="run"?"◌ ":"○ ";
  return '<button class="st-badge '+v+'" data-pid="'+pid+'" data-i="'+i+'" data-k="'+k+'">'+icn+esc(label)+'</button>';
}
function stoDetail(v,id){
  var ps=stoLoad(),p=null;ps.forEach(function(x){if(x.id===id)p=x});
  if(!p){stoRoute={name:"home"};return stoHome(v)}
  var t=p.scenes.length,d=stoDoneCount(p),pct=t?Math.round(d/t*100):0;
  var h='<button class="st-back" id="st-back">'+sic(IC.back)+' Kembali ke daftar</button>';
  h+='<div class="st-head"><div><h1>'+esc(p.title||"(tanpa judul)")+'</h1>'
    +'<div class="st-chips"><span class="st-chip">'+esc(p.format)+'</span><span class="st-chip">'+esc(p.style)+'</span><span class="st-chip">'+esc(p.narrator)+'</span><span class="st-chip">'+t+' adegan</span><span class="st-chip">±'+stoMins(t)+' menit</span></div></div></div>';
  if(p.idea)h+='<p style="color:var(--text2);font-size:13.5px;margin:-6px 0 16px;max-width:720px">'+esc(p.idea)+'</p>';
  h+='<div class="st-prog"><div class="lbl"><span>Progres generasi</span><b>'+pct+'% • '+d+' dari '+t+' adegan selesai</b></div><div class="st-bar"><i class="'+(pct===100?"done":"")+'" style="width:'+pct+'%"></i></div></div>';
  h+='<div class="panel"><h3 style="font-size:16px;margin-bottom:14px">Daftar Adegan</h3>';
  p.scenes.forEach(function(s,i){
    h+='<div class="st-scene"><div class="st-sth stg'+((i%5)+1)+'"></div><div class="st-sb"><div class="n">ADEGAN '+(i+1)+'</div><h3>'+esc(s.title||("Adegan "+(i+1)))+'</h3><p>'+esc(s.narration||"—")+'</p></div>'
      +'<div class="st-badges">'+stBadge(p.id,i,"img","Gambar")+stBadge(p.id,i,"anim","Animasi")+stBadge(p.id,i,"nar","Narasi")+'</div></div>';
  });
  h+='</div><div class="st-actions"><button class="btn-red" id="st-copy">'+sic(IC.copy)+' Salin &amp; kirim ke Dante</button>'
    +'<button class="pill-btn" id="st-edit">Edit proyek</button><button class="pill-btn" id="st-del" style="color:#ff8080">Hapus</button></div>'
    +'<div class="st-tips">Klik badge status untuk mengubah: menunggu → diproses → selesai. Tombol "Salin &amp; kirim ke Dante", lalu paste di chat.</div>';
  v.innerHTML=h;
  $("st-back").addEventListener("click",function(){stoRoute={name:"home"};renderStory()});
  v.querySelectorAll(".st-badge").forEach(function(b){
    b.addEventListener("click",function(ev){
      ev.stopPropagation();
      var ps2=stoLoad(),ord=["todo","run","done"],p2=null;
      ps2.forEach(function(x){if(x.id===b.dataset.pid)p2=x});
      var s=p2.scenes[+b.dataset.i],k=b.dataset.k,cur=(s.st&&s.st[k])||"todo";
      s.st=s.st||{img:"todo",anim:"todo",nar:"todo"};
      s.st[k]=ord[(ord.indexOf(cur)+1)%3];
      p2.updatedAt=new Date().toISOString();stoSave(ps2);stoDetail(v,p2.id);
    });
  });
  $("st-copy").addEventListener("click",function(){
    var payload={app:"bang-story-web",project:p.title,idea:p.idea,format:p.format,style:p.style,narrator:p.narrator,
      scenes:p.scenes.map(function(s,i){return{n:i+1,title:s.title,narration:s.narration,img:s.img||""}})};
    var t=JSON.stringify(payload);
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(function(){stoToast("Tersalin! Paste di chat ke Dante")},function(){prompt("Copy manual:",t)});
    else prompt("Copy manual:",t);
  });
  $("st-edit").addEventListener("click",function(){
    stoDraft={id:p.id,step:1,title:p.title,idea:p.idea,format:p.format,style:p.style,minutes:Math.max(1,Math.round(p.scenes.length/6)),narrator:p.narrator,scenes:p.scenes.map(function(s){return{title:s.title,narration:s.narration,img:s.img||"",st:s.st||{img:"todo",anim:"todo",nar:"todo"}}})};
    stoRoute={name:"wizard"};renderStory();
  });
  $("st-del").addEventListener("click",function(){
    if(!confirm("Hapus proyek \""+(p.title||"")+"\"?"))return;
    stoSave(stoLoad().filter(function(x){return x.id!==p.id}));
    stoRoute={name:"home"};renderStory();stoToast("Proyek dihapus");
  });
}
var STO_STYLES=["Realistis","Kartun","Storybook","Anime","Sinematik"];
var STO_NARR=["ID · Pria","ID · Wanita","EN · Male","EN · Female"];
function stoSyncScenes(d){
  var n=Math.max(1,d.minutes*6),arr=[];
  for(var i=0;i<n;i++)arr.push(d.scenes[i]||{title:"",narration:"",img:"",st:{img:"todo",anim:"todo",nar:"todo"}});
  d.scenes=arr;
}
function stoWizard(v){
  var d=stoDraft;
  if(d.step===1)return wizStep1(v,d);
  if(d.step===2)return wizStep2(v,d);
  return wizStep3(v,d);
}
function wizHead(step){
  function s(n,t){return '<div class="st-ws'+(step===n?" on":"")+'"><span class="wn">'+n+'</span>'+t+'</div>'}
  return '<div class="st-wsteps">'+s(1,"Ide Cerita")+'<div class="st-wline"></div>'+s(2,"Adegan")+'<div class="st-wline"></div>'+s(3,"Selesai")+'</div>';
}
function wizStep1(v,d){
  var h=wizHead(1);
  h+='<div class="st-card"><h2>'+sic(IC.spark)+' Langkah 1: Ide Cerita</h2><p class="desc">Mulai dengan mendeskripsikan cerita yang ingin kamu buat menjadi video AI</p>';
  h+='<label class="st-flabel">Judul cerita</label><input class="st-input" id="w-title" value="'+esc(d.title)+'" placeholder="Masukkan judul cerita…">';
  h+='<label class="st-flabel">Ide / sinopsis</label><textarea class="st-area" id="w-idea" placeholder="Jelaskan ide cerita kamu secara detail…">'+esc(d.idea)+'</textarea>';
  h+='<div class="st-hint">Contoh: Seorang petualang muda menemukan peta harta kuno di hutan Jawa dan harus memecahkan teka-teki untuk menyelamatkan desanya.</div>';
  h+='<label class="st-flabel">Format video</label><div class="st-fmtrow">'
    +'<div class="st-fcard'+(d.format==="9:16"?" on":"")+'" data-fmt="9:16"><span class="st-radio">'+(d.format==="9:16"?"✓":"")+'</span><div><b>9:16</b><small>Vertikal — Shorts / Reels</small></div></div>'
    +'<div class="st-fcard'+(d.format==="16:9"?" on":"")+'" data-fmt="16:9"><span class="st-radio">'+(d.format==="16:9"?"✓":"")+'</span><div><b>16:9</b><small>Horizontal — YouTube</small></div></div></div>';
  h+='<label class="st-flabel">Gaya visual</label><div class="st-chipsel">'+STO_STYLES.map(function(s){return '<button class="st-opt'+(d.style===s?" on":"")+'" data-style="'+s+'">'+s+'</button>'}).join("")+'</div>';
  h+='<label class="st-flabel">Target durasi</label><div class="st-sliderow"><input type="range" id="w-min" min="1" max="10" value="'+d.minutes+'"><div class="st-slval"><b>'+d.minutes+'</b> menit ≈ <b>'+(d.minutes*6)+'</b> adegan</div></div><div class="st-hint">1 adegan = 1 gambar → 1 klip ±10 detik + narasi.</div>';
  h+='<label class="st-flabel">Suara narator</label><select class="st-select" id="w-narr">'+STO_NARR.map(function(n){return '<option'+(d.narrator===n?" selected":"")+'>'+n+'</option>'}).join("")+'</select>';
  h+='<div class="st-wnav"><button class="pill-btn" id="w-cancel">Batal</button><button class="btn-red" id="w-next1">Lanjut ke Adegan →</button></div></div>';
  v.innerHTML=h;
  v.querySelectorAll("[data-fmt]").forEach(function(b){b.addEventListener("click",function(){d.format=b.dataset.fmt;wizStep1(v,d)})});
  v.querySelectorAll("[data-style]").forEach(function(b){b.addEventListener("click",function(){d.style=b.dataset.style;wizStep1(v,d)})});
  $("w-min").addEventListener("input",function(){d.minutes=+$("w-min").value;v.querySelector(".st-slval").innerHTML="<b>"+d.minutes+"</b> menit ≈ <b>"+(d.minutes*6)+"</b> adegan"});
  $("w-cancel").addEventListener("click",function(){stoRoute={name:"home"};renderStory()});
  $("w-next1").addEventListener("click",function(){
    d.title=$("w-title").value.trim();d.idea=$("w-idea").value.trim();d.narrator=$("w-narr").value;
    if(!d.title){alert("Isi dulu judul ceritanya");return}
    stoSyncScenes(d);d.step=2;renderStory();
  });
}
function wizStep2(v,d){
  var h=wizHead(2);
  h+='<div class="st-card" style="max-width:860px"><h2>'+sic(IC.film)+' Langkah 2: Adegan <span style="color:var(--text2);font-size:13px;font-weight:400">('+d.scenes.length+' adegan · ±'+stoMins(d.scenes.length)+' menit)</span></h2><p class="desc">Isi narasi tiap adegan. Prompt gambar boleh dikosongkan — Dante yang bikinkan.</p>';
  d.scenes.forEach(function(s,i){
    h+='<div class="st-scene-edit"><div class="sh"><b>Adegan '+(i+1)+'</b><button class="st-x" data-rm="'+i+'">✕</button></div>'
      +'<label class="st-flabel" style="margin-top:0">Judul adegan</label><input class="st-input" data-s="title" data-i="'+i+'" value="'+esc(s.title)+'" placeholder="misal: Tepi Hutan Gelap">'
      +'<label class="st-flabel">Narasi (±10 detik dibaca)</label><textarea class="st-area" data-s="narration" data-i="'+i+'" placeholder="Tulis narasi yang dibacakan…">'+esc(s.narration)+'</textarea>'
      +'<label class="st-flabel">Prompt gambar (opsional)</label><input class="st-input" data-s="img" data-i="'+i+'" value="'+esc(s.img)+'" placeholder="Kosongkan = Dante yang bikinkan"></div>';
  });
  h+='<button class="pill-btn" id="w-addsc" style="margin-bottom:6px">+ Tambah adegan</button>';
  h+='<div class="st-wnav"><button class="pill-btn" id="w-back1">← Kembali</button><button class="btn-red" id="w-next2">Lanjut →</button></div></div>';
  v.innerHTML=h;
  function collect(){v.querySelectorAll("[data-s]").forEach(function(el){var s=d.scenes[+el.dataset.i];if(s)s[el.dataset.s]=el.value})}
  v.querySelectorAll("[data-rm]").forEach(function(b){b.addEventListener("click",function(){collect();d.scenes.splice(+b.dataset.rm,1);renderStory()})});
  $("w-addsc").addEventListener("click",function(){collect();d.scenes.push({title:"",narration:"",img:"",st:{img:"todo",anim:"todo",nar:"todo"}});renderStory()});
  $("w-back1").addEventListener("click",function(){collect();d.step=1;renderStory()});
  $("w-next2").addEventListener("click",function(){collect();d.step=3;renderStory()});
}
function wizStep3(v,d){
  var h=wizHead(3);
  h+='<div class="st-card"><h2>'+sic('<polyline points="20 6 9 17 4 12"/>')+' Langkah 3: Siap!</h2><p class="desc">Periksa ringkasan proyek sebelum disimpan.</p>';
  h+='<div class="st-chips"><span class="st-chip">'+esc(d.format)+'</span><span class="st-chip">'+esc(d.style)+'</span><span class="st-chip">'+esc(d.narrator)+'</span><span class="st-chip">'+d.scenes.length+' adegan</span><span class="st-chip">±'+stoMins(d.scenes.length)+' menit</span></div>';
  h+='<p style="font-size:14px;margin-bottom:6px"><b>'+esc(d.title)+'</b></p><p style="color:var(--text2);font-size:13px;margin-bottom:14px">'+esc(d.idea||"—")+'</p>';
  h+='<div class="st-tips">Setelah disimpan, buka proyek → "Salin &amp; kirim ke Dante", paste di chat, dan Dante mulai generate per adegan.</div>';
  h+='<div class="st-wnav"><button class="pill-btn" id="w-back2">← Kembali</button><button class="btn-red" id="w-save">Simpan Proyek</button></div></div>';
  v.innerHTML=h;
  $("w-back2").addEventListener("click",function(){d.step=2;renderStory()});
  $("w-save").addEventListener("click",function(){
    var ps=stoLoad(),now=new Date().toISOString();
    var rec={id:d.id||uid(),title:d.title,idea:d.idea,format:d.format,style:d.style,narrator:d.narrator,scenes:d.scenes,updatedAt:now,createdAt:now};
    if(d.id){var found=false;ps=ps.map(function(x){if(x.id===d.id){found=true;rec.createdAt=x.createdAt;return rec}return x});if(!found)ps.push(rec)}
    else ps.push(rec);
    stoSave(ps);stoDraft=null;stoRoute={name:"detail",id:rec.id};renderStory();stoToast("Proyek tersimpan");
  });
}

try{renderDash()}catch(e){if(window.console)console.log("dash skip:",e)}
/* ---------- DanteChannel (dante.json, ditulis video_log.py) ---------- */
var DANTE=null;
function danteDate(s){if(!s)return"—";var p=s.split("-");var d=new Date(+p[0],+p[1]-1,+p[2]);return d.toLocaleDateString("id-ID",{day:"numeric",month:"short"})}
function renderDante(){
  var v=$("view-dante");if(!v)return;
  v.innerHTML='<div class="st-head"><div><h1>'+sic(IC.spark)+' DanteChannel</h1><p>Channel dongeng anak — 2 video/hari, jam 7 pagi &amp; 7 malam.</p></div></div><div class="panel"><p style="color:var(--text2)">Memuat data…</p></div>';
  fetch("dante.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){
    DANTE=d;
    if(!d||!d.channel){v.innerHTML='<div class="st-head"><div><h1>'+sic(IC.spark)+' DanteChannel</h1><p>Channel dongeng anak — 2 video/hari, jam 7 pagi &amp; 7 malam.</p></div></div><div class="st-empty">'+sic(IC.film)+'<h3>Belum ada data</h3><p>Data channel akan muncul setelah sinkronisasi pertama.</p></div>';return}
    var c=d.channel,st=d.stats||{total:0,tayang:0,terjadwal:0};
    var csline=d.channel_stats?'<br>'+fmtN(d.channel_stats.subs||0)+' subscriber · '+fmtN(d.channel_stats.views_7d||0)+' views (7 hari)':"";
    var h='<div class="st-head"><div><h1>'+sic(IC.spark)+' '+esc(c.name||"DanteChannel")+'</h1><p>'+esc(c.handle||"")+' · <a href="'+esc(c.url||"#")+'" target="_blank" rel="noopener" style="color:var(--acc)">Buka channel</a>'+csline+'</p></div></div>';
    h+='<div class="st-stats">'+stStat(IC.film,"Total video",st.total)+stStat(IC.spark,"Tayang",st.tayang)+stStat(IC.clock,"Terjadwal",st.terjadwal)+'</div>';
    h+='<div class="panel"><h3 style="font-size:16px;margin-bottom:14px">Video</h3>';
    var vs=d.videos||[];
    if(!vs.length){h+='<div class="st-empty">'+sic(IC.film)+'<h3>Belum ada video</h3><p>Video pertama dijadwalkan jam 7 pagi.</p></div>'}
    vs.forEach(function(x,i){
      var tayang=x.status==="tayang";
      var isShort=x.slot.indexOf("shorts")===0;
      var slot=x.slot==="malam"?"🌙 Malam · 19:00":isShort?"⚡ Shorts":"☀️ Pagi · 07:00";
      var tlbl=x.slot==="malam"?"19:00":isShort?"SHORT":"07:00";
      var badge=tayang?'<span class="st-st done">Tayang</span>':'<span class="st-st">Terjadwal</span>';
      var link=x.youtube_url?'<a class="pill-btn" href="'+esc(x.youtube_url)+'" target="_blank" rel="noopener" style="text-decoration:none">Tonton</a>':"";
      h+='<div class="st-proj"><div class="st-thumb stg'+((i%5)+1)+'"><span class="st-fmt">'+tlbl+'</span></div>'
        +'<div class="st-pb"><h3>'+esc(x.title||"(tanpa judul)")+'</h3><div class="m">'+danteDate(x.date)+' · '+slot+'</div></div>'
        +badge+link+'</div>';
    });
    h+='</div><div class="st-tips" style="text-align:center">Sinkron terakhir: '+esc(d.updated_at||"—")+'</div>';
    v.innerHTML=h;
  }).catch(function(){v.innerHTML='<div class="st-empty">'+sic(IC.film)+'<h3>Gagal memuat data</h3><p>Tidak bisa membaca dante.json.</p></div>'});
}
/* ---------- Channel baru: DanteStory / DanteJr / DanteKids ---------- */
var CHANVIEWS={
  dantestory:{view:"view-dantestory",json:"dantestory.json",icon:"📜",title:"DanteStory",sub:"Cerita AI Indonesia — 1 video/hari, jam 10:00.",empty:"Video pertama tayang 5 Okt 2026 jam 10:00."},
  dantejr:{view:"view-dantejr",json:"dantejr.json",icon:"🔬",title:"DanteJr",sub:"Fakta seru & eksperimen anak — 1 video/hari, jam 13:00.",empty:"Video pertama tayang 5 Okt 2026 jam 13:00."},
  dantekids:{view:"view-dantekids",json:"dantekids.json",icon:"🎵",title:"DanteKids",sub:"Lagu anak karaoke — 1 video/hari, jam 16:00.",empty:"Video pertama tayang 5 Okt 2026 jam 16:00."}
};
function renderChanView(cfg){
  var v=$(cfg.view);if(!v)return;
  v.innerHTML='<div class="st-head"><div><h1>'+cfg.icon+' '+cfg.title+'</h1><p>'+cfg.sub+'</p></div></div><div class="panel"><p style="color:var(--text2)">Memuat data…</p></div>';
  fetch(cfg.json,{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){
    if(!d||!d.channel){v.innerHTML='<div class="st-head"><div><h1>'+cfg.icon+' '+cfg.title+'</h1><p>'+cfg.sub+'</p></div></div><div class="st-empty">'+sic(IC.film)+'<h3>Belum ada data</h3><p>'+cfg.empty+'</p></div>';return}
    var c=d.channel,st=d.stats||{total:0,tayang:0,terjadwal:0};
    var h='<div class="st-head"><div><h1>'+cfg.icon+' '+esc(c.name||cfg.title)+'</h1><p>'+esc(c.handle||"")+' · <a href="'+esc(c.url||"#")+'" target="_blank" rel="noopener" style="color:var(--acc)">Buka channel</a></p></div></div>';
    h+='<div class="st-stats">'+stStat(IC.film,"Total video",st.total)+stStat(IC.spark,"Tayang",st.tayang)+stStat(IC.clock,"Terjadwal",st.terjadwal)+'</div>';
    h+='<div class="panel"><h3 style="font-size:16px;margin-bottom:14px">Video</h3>';
    var vs=d.videos||[];
    if(!vs.length){h+='<div class="st-empty">'+sic(IC.film)+'<h3>Belum ada video</h3><p>'+cfg.empty+'</p></div>'}
    vs.forEach(function(x,i){
      var tayang=x.status==="tayang";
      var badge=tayang?'<span class="st-st done">Tayang</span>':'<span class="st-st">Terjadwal</span>';
      var link=x.youtube_url?'<a class="pill-btn" href="'+esc(x.youtube_url)+'" target="_blank" rel="noopener" style="text-decoration:none">Tonton</a>':"";
      h+='<div class="st-proj"><div class="st-thumb stg'+((i%5)+1)+'"><span class="st-fmt">📅</span></div>'
        +'<div class="st-pb"><h3>'+esc(x.title||"(tanpa judul)")+'</h3><div class="m">'+danteDate(x.date)+' · Video harian</div></div>'
        +badge+link+'</div>';
    });
    h+='</div><div class="st-tips" style="text-align:center">Sinkron terakhir: '+esc(d.updated_at||"—")+'</div>';
    v.innerHTML=h;
  }).catch(function(){v.innerHTML='<div class="st-empty">'+sic(IC.film)+'<h3>Gagal memuat data</h3><p>Tidak bisa membaca '+cfg.json+'.</p></div>'});
}
/* ================= MONITOR (multi-channel monetization tracker) ================= */
var PF=null;
var PF_LS="ytmonitor_local_v1";
var monFilter="all",monQ="",monCat="all",monSort="near";
var caChanId=null,caRange="28";
var MON_MAX=100;

function pfLocal(){try{return JSON.parse(localStorage.getItem(PF_LS))||{channels:[],hours:{}}}catch(e){return{channels:[],hours:{}}}}
function pfLocalSave(d){try{localStorage.setItem(PF_LS,JSON.stringify(d))}catch(e){}}
function allChannels(){
  var base=PF&&PF.channels?PF.channels.map(function(c){var n={};for(var k in c)n[k]=c[k];return n}):[];
  var loc=pfLocal();
  (loc.channels||[]).forEach(function(c){base.push(c)});
  base.forEach(function(c){if(loc.hours&&loc.hours[c.id]!=null){c.watch_hours_365=+loc.hours[c.id];c.watch_hours_manual=true}});
  return base;
}
var YPP_HOURS=8000;/* syarat YPP baru efektif 1 Feb 2027: 8.000 jam/365d atau 20 jt views Shorts/90d (subs tetap 1.000) */
function chStatus(c){
  if(c.ypp)return"monet";
  var h=+c.watch_hours_365||0,s=+c.subs||0;
  if(h>=YPP_HOURS&&s>=1000)return"ready";
  if(h/YPP_HOURS>=0.7)return"otw";
  return"growth";
}
var ST_LABEL={ready:["⭐ SIAP PENGAJUAN","ready"],monet:["💰 SUDAH MONET","monet"],otw:["📈 OTW MONET","otw"],growth:["🌱 PERTUMBUHAN","growth"]};
function fmtJam(h){return(+h||0).toLocaleString("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1})}
function fmtPct(h){return((+h||0)/YPP_HOURS*100).toLocaleString("id-ID",{minimumFractionDigits:1,maximumFractionDigits:1})+"%"}
function fmtDateID(s){if(!s)return"—";var p=String(s).slice(0,10).split("-");if(p.length<3)return s;var d=new Date(+p[0],+p[1]-1,+p[2]);return d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}

function loadPortfolio(cb){
  fetch("portfolio.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){
    if(d&&d.channels)PF=d;
    if(cb)cb();
  }).catch(function(){if(cb)cb()});
}

function renderMonitor(){
  var grid=$("chan-grid");if(!grid)return;
  var chs=allChannels();
  var counts={all:chs.length,ready:0,monet:0,otw:0,growth:0},totalH=0;
  chs.forEach(function(c){counts[chStatus(c)]++;totalH+=+c.watch_hours_365||0});
  $("m-total").textContent=counts.all;
  $("m-ready").textContent=counts.ready;
  $("m-monet").textContent=counts.monet;
  $("m-otw").textContent=counts.otw;
  $("c-all").textContent=counts.all;$("c-ready").textContent=counts.ready;
  $("c-monet").textContent=counts.monet;$("c-otw").textContent=counts.otw;$("c-growth").textContent=counts.growth;
  $("m-hours").textContent=fmtJam(totalH)+" Jam";
  $("top-chan-label").textContent=counts.all+"/"+MON_MAX+" Channel";
  $("top-chan-bar").style.width=Math.min(100,counts.all/MON_MAX*100)+"%";
  $("mon-synced").textContent=PF&&PF.updated_at?("Sinkron terakhir: "+PF.updated_at+" · jam tayang manual bisa diupdate via tombol \"Update Jam\""):"";
  /* spotlight: channel non-monet terdekat */
  var cands=chs.filter(function(c){return chStatus(c)!=="monet"}).sort(function(a,b){return(+b.watch_hours_365||0)-(+a.watch_hours_365||0)});
  var sp=$("spotlight");
  if(cands.length){
    var c=cands[0],h=+c.watch_hours_365||0,kurang=Math.max(0,YPP_HOURS-h),laju=+c.laju_per_hari||0;
    var est=laju>0?("Estimasi tercapai dalam ~"+Math.ceil(kurang/laju)+" hari"):"Isi laju/hari untuk estimasi";
    $("sp-title").innerHTML="🏆 "+esc(c.name)+" — <b>Tinggal "+fmtJam(kurang)+" Jam Lagi!</b>";
    $("sp-sub").textContent=fmtJam(h)+" / "+fmtJam(YPP_HOURS)+" Jam Tayang (365d: "+fmtPct(h)+") • "+(+c.subs||0).toLocaleString("id-ID")+" Subs • "+est;
    sp.hidden=false;
    sp.dataset.cid=c.id;
  }else sp.hidden=true;
  /* kategori dropdown */
  var cats={};chs.forEach(function(c){if(c.category)cats[c.category]=1});
  var sel=$("mon-cat"),cur=sel.value||"all";
  sel.innerHTML='<option value="all">Semua Kategori</option>'+Object.keys(cats).sort().map(function(k){return'<option value="'+esc(k)+'"'+(k===cur?" selected":"")+'>'+esc(k)+"</option>"}).join("");
  if(cur!=="all"&&!cats[cur])cur="all";
  sel.value=cur;monCat=cur;
  /* filter + search + sort */
  var q=(monQ||"").toLowerCase();
  var list=chs.filter(function(c){
    if(monFilter!=="all"&&chStatus(c)!==monFilter)return false;
    if(monCat!=="all"&&c.category!==monCat)return false;
    if(q){var hay=((c.name||"")+" "+(c.handle||"")+" "+(c.notes||"")).toLowerCase();if(hay.indexOf(q)<0)return false}
    return true;
  });
  list.sort(function(a,b){
    if(monSort==="subs")return(+b.subs||0)-(+a.subs||0);
    if(monSort==="views")return(+b.views||0)-(+a.views||0);
    if(monSort==="hours")return(+b.watch_hours_365||0)-(+a.watch_hours_365||0);
    if(monSort==="name")return String(a.name).localeCompare(String(b.name));
    return(+b.watch_hours_365||0)-(+a.watch_hours_365||0);
  });
  $("chan-empty").hidden=list.length>0;
  grid.innerHTML="";
  list.forEach(function(c){
    var st=chStatus(c),lbl=ST_LABEL[st],h=+c.watch_hours_365||0,pct=Math.min(100,h/YPP_HOURS*100);
    var spct=Math.min(100,(+c.subs||0)/1000*100);
    var kurang=Math.max(0,YPP_HOURS-h);
    var el=document.createElement("div");
    el.className="chan-card st-"+st;
    el.innerHTML=
      '<div class="ch-head"><div><div class="ch-name">'+esc(c.name)+'</div><div class="ch-handle">'+esc(c.handle||"")+(c.id?' · <span style="font-size:11px">'+esc(c.id.slice(0,8))+"…</span>":"")+'</div></div><span class="ch-badge '+lbl[1]+'">'+lbl[0]+'</span></div>'
      +'<div class="ch-tags">'+(c.category?'<span class="ch-tag">'+esc(c.category)+"</span>":"")+(c.oauth?'<span class="oauth-tag">🟢 OAuth 365h</span>':'<span class="ch-tag">✋ Manual</span>')+(c.watch_hours_manual?'<span class="ch-tag">⌨️ jam manual</span>':"")+'</div>'
      +'<div class="ch-stats"><div class="ch-stat"><div class="v">'+(+c.videos||0)+'</div><div class="l">VIDEO</div></div>'
      +'<div class="ch-stat"><div class="v">'+fmtN(+c.views||0)+'</div><div class="l">VIEWS</div></div>'
      +'<div class="ch-stat"><div class="v">+'+(+c.laju_per_hari||0)+'j</div><div class="l">LAJU/HARI</div></div></div>'
      +'<div class="prog-row"><div class="prog-label"><span>🕐 Jam Tayang (365 Hari)</span><b>'+fmtJam(h)+' / '+fmtJam(YPP_HOURS)+' Jam</b></div>'
      +'<div class="prog-bar"><i class="prog-fill" style="width:'+pct+'%"></i></div>'
      +'<div class="prog-note"><span>'+(kurang>0?("Kurang "+fmtJam(kurang)+" jam lagi"):("Target "+fmtJam(YPP_HOURS)+" Jam Tercapai"))+'</span><span>'+fmtPct(h)+'</span></div></div>'
      +'<div class="prog-row"><div class="prog-label"><span>👤 Subscribers</span><b>'+(+c.subs||0).toLocaleString("id-ID")+' / 1.000 Subs</b></div>'
      +'<div class="prog-bar"><i class="prog-fill blue" style="width:'+spct+'%"></i></div></div>'
      +'<div class="ch-actions"><button class="btn-ghost" data-act="ana">📈 Analytics</button><button class="btn-ghost" data-act="jam">🕐 Update Jam</button></div>';
    el.querySelector('[data-act="ana"]').addEventListener("click",function(){caChanId=c.id;switchView("chanalytics")});
    el.querySelector('[data-act="jam"]').addEventListener("click",function(){updateJam(c)});
    grid.appendChild(el);
  });
}
function switchView(vw){
  document.querySelectorAll(".nav-item").forEach(function(x){x.classList.toggle("active",x.dataset.view===vw)});
  document.querySelectorAll(".view").forEach(function(v){v.classList.remove("active")});
  $("view-"+vw).classList.add("active");
  if(vw==="monitor")renderMonitor();
  if(vw==="chanalytics")renderChAnalytics();
}
function updateJam(c){
  var cur=+c.watch_hours_365||0;
  var v=prompt("Jam tayang 365 hari untuk \""+c.name+"\" (saat ini "+fmtJam(cur)+"):\n(lihat di YouTube Studio → Analytics → 365 hari)",String(cur));
  if(v==null)return;
  v=parseFloat(String(v).replace(",","."));
  if(isNaN(v)||v<0){alert("Angka tidak valid");return}
  var loc=pfLocal();loc.hours[c.id]=v;pfLocalSave(loc);
  renderMonitor();stoToast("Jam tayang "+c.name+" diupdate: "+fmtJam(v));
}
function addChannelModal(){
  $("chan-modal-back").hidden=false;
  $("cm-id").value="";$("cm-name").value="";$("cm-handle").value="";$("cm-cat").value="";$("cm-notes").value="";$("cm-ypp").checked=false;
}
function initMonitor(){
  document.querySelectorAll("#mon-tabs .ftab").forEach(function(b){
    b.addEventListener("click",function(){
      document.querySelectorAll("#mon-tabs .ftab").forEach(function(x){x.classList.remove("active")});
      b.classList.add("active");monFilter=b.dataset.f;renderMonitor();
    });
  });
  $("mon-q").addEventListener("input",function(e){monQ=e.target.value;renderMonitor()});
  $("mon-cat").addEventListener("change",function(e){monCat=e.target.value;renderMonitor()});
  $("mon-sort").addEventListener("change",function(e){monSort=e.target.value;renderMonitor()});
  $("vt-grid").addEventListener("click",function(){$("chan-grid").classList.remove("list");$("vt-grid").classList.add("active");$("vt-list").classList.remove("active")});
  $("vt-list").addEventListener("click",function(){$("chan-grid").classList.add("list");$("vt-list").classList.add("active");$("vt-grid").classList.remove("active")});
  ["btn-add-channel","btn-add-channel2"].forEach(function(id){var b=$(id);if(b)b.addEventListener("click",addChannelModal)});
  $("chan-modal-cancel").addEventListener("click",function(){$("chan-modal-back").hidden=true});
  $("chan-modal-back").addEventListener("click",function(e){if(e.target.id==="chan-modal-back")e.target.hidden=true});
  $("chan-modal-save").addEventListener("click",function(){
    var id=$("cm-id").value.trim(),name=$("cm-name").value.trim();
    if(!name){alert("Nama channel wajib diisi");return}
    var loc=pfLocal();
    loc.channels.push({id:id||("manual-"+Date.now()),name:name,handle:$("cm-handle").value.trim(),category:$("cm-cat").value.trim()||"Lainnya",
      notes:$("cm-notes").value.trim(),oauth:false,ypp:$("cm-ypp").checked,subs:0,videos:0,views:0,
      watch_hours_365:0,watch_hours_manual:true,laju_per_hari:0,last_publish:"",avg_view_duration:"—",ctr:null,scheduled:0,drafts:0,ranges:{},videos_detail:[]});
    pfLocalSave(loc);$("chan-modal-back").hidden=true;renderMonitor();stoToast("Channel "+name+" ditambahkan");
  });
  $("btn-update-jam").addEventListener("click",function(){
    var cid=$("spotlight").dataset.cid;if(!cid)return;
    var c=null;allChannels().forEach(function(x){if(x.id===cid)c=x});
    if(c)updateJam(c);
  });
  $("btn-lihat-syarat").addEventListener("click",function(){
    alert("Syarat monetisasi YouTube (YPP, aturan baru efektif 1 Feb 2027):\n\n1. 1.000 subscriber\n2. Salah satu:\n   • 8.000 jam tayang publik valid dalam 365 hari, ATAU\n   • 20 juta views Shorts valid dalam 90 hari\n3. Patuhi kebijakan monetisasi & tidak ada teguran aktif\n4. Akun AdSense terhubung\n\n(Tier fan-funding 500 subs tidak berubah: 3.000 jam / 3 jt views Shorts)");
  });
  $("btn-sync-all").addEventListener("click",function(){
    stoToast(PF&&PF.updated_at?("Terakhir sinkron: "+PF.updated_at+" — sync otomatis tiap jam 08:16"):"Sync otomatis tiap jam 08:16 via cron");
  });
  $("btn-api-oauth").addEventListener("click",function(){
    alert("API & OAuth:\n\n• Data API v3: subs, views, jumlah video (aktif)\n• Analytics API (yt-analytics.readonly): jam tayang 365 hari & analitik per rentang — BUTUH otorisasi ulang.\n\nCara: Setelan → Hubungkan YouTube → setujui scope baru di tab Google.");
  });
}

/* ================= CHANNEL ANALYTICS (per channel, per rentang) ================= */
var RANGE_LABEL={"7":"Data Analisa 7 Hari Terakhir","28":"Data Analisa 28 Hari Terakhir","90":"Data Analisa 90 Hari Terakhir","365":"Data Analisa 365 Hari Terakhir","life":"Data Analisa Lifetime"};
function renderChAnalytics(){
  var sel=$("ca-select");if(!sel)return;
  var chs=allChannels();
  if(!chs.length){sel.innerHTML='<option value="">— belum ada channel —</option>';return}
  if(!caChanId||!chs.some(function(c){return c.id===caChanId}))caChanId=chs[0].id;
  sel.innerHTML=chs.map(function(c){return'<option value="'+esc(c.id)+'"'+(c.id===caChanId?" selected":"")+'>'+esc(c.name)+"</option>"}).join("");
  var c=null;chs.forEach(function(x){if(x.id===caChanId)c=x});
  if(!c)return;
  $("ca-chan-sub").innerHTML=esc(c.handle||"")+' · <span style="color:#4ade80">Aktif</span>'+(c.notes?(" · "+esc(c.notes)):"");
  document.querySelectorAll("#ca-ranges button").forEach(function(b){b.classList.toggle("active",b.dataset.r===caRange)});
  $("ca-range-label").textContent=RANGE_LABEL[caRange]||"";
  var r=(c.ranges&&c.ranges[caRange])||null;
  var views,wh,subs;
  if(caRange==="life"){views=+c.views||0;wh=+c.watch_hours_365||0;subs=+c.subs||0}
  else if(r){views=r.views;wh=r.watch_hours;subs=r.subs_gained}
  else{views=null;wh=null;subs=null}
  $("ca-views").textContent=views==null?"—":fmtN(views);
  $("ca-hours").textContent=wh==null?"—":fmtJam(wh)+" Jam";
  $("ca-subs").textContent=subs==null?"—":(subs>0?"+":"")+subs;
  $("ca-ctr").textContent=c.ctr!=null?(+c.ctr).toFixed(1)+"%":"—";
  $("ca-avg").textContent=c.avg_view_duration||"—";
  $("ca-lastpub").textContent=fmtDateID(c.last_publish);
  $("ca-sched").textContent=c.scheduled||0;
  $("ca-draft").textContent=c.drafts||0;
  var tb=$("ca-tbody");tb.innerHTML="";
  var vids=c.videos_detail&&c.videos_detail.length?c.videos_detail:[];
  if(!vids.length)tb.innerHTML='<tr><td colspan="6" class="dim">Belum ada data video — sinkronisasi berikutnya akan mengisi otomatis.</td></tr>';
  vids.forEach(function(v){
    var tr=document.createElement("tr");
    tr.innerHTML='<td><div style="font-weight:600;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(v.title)+'</div><div class="dim" style="font-size:11px">ID: '+esc(v.id)+'</div></td>'
      +'<td><span class="dim">'+esc(v.notices||"Tidak ada")+'</span></td>'
      +'<td><span class="vis-badge'+(v.visibility==="Pribadi"?" priv":"")+'">'+esc(v.visibility||"Publik")+'</span></td>'
      +'<td>'+fmtDateID(v.published)+'<div class="dim" style="font-size:11px">Dipublikasikan</div></td>'
      +'<td style="font-weight:700">'+fmtN(v.views)+'</td>'
      +'<td>'+(v.comments||0)+'</td>';
    tb.appendChild(tr);
  });
}
function initChAnalytics(){
  $("ca-select").addEventListener("change",function(e){caChanId=e.target.value;renderChAnalytics()});
  document.querySelectorAll("#ca-ranges button").forEach(function(b){
    b.addEventListener("click",function(){caRange=b.dataset.r;renderChAnalytics()});
  });
}

initMonitor();
initChAnalytics();
loadPortfolio(function(){renderMonitor()});
})();
