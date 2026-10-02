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
    if(!$("view-analytics").hidden)renderAnalytics();
    if(!$("view-comments").hidden)renderComments();
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
    if(vw==="dash")renderDash();
    if(vw==="content")renderQueue();
    if(vw==="calendar")renderCal();
    if(vw==="analytics")renderAnalytics();
    if(vw==="comments")renderComments();
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
    ctx.fillStyle="#8b7cf6";ctx.beginPath();ctx.roundRect(x,H-30-h,bw,h,8);ctx.fill();
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
    ctx.fillStyle="#8b7cf6";ctx.beginPath();ctx.roundRect(x,H-50-h,bw,h,8);ctx.fill();
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
var YT_SCOPES=["https://www.googleapis.com/auth/youtube.upload","https://www.googleapis.com/auth/youtube.readonly","https://www.googleapis.com/auth/youtube.force-ssl"].join(" ");
$("btn-yt-connect").addEventListener("click",function(){
  var u="https://accounts.google.com/o/oauth2/v2/auth?"+
    "client_id="+encodeURIComponent(YT_CLIENT_ID)+
    "&redirect_uri="+encodeURIComponent(YT_REDIRECT)+
    "&response_type=code&scope="+encodeURIComponent(YT_SCOPES)+
    "&access_type=offline&prompt=consent";
  window.open(u,"_blank");
});
/* status koneksi dari live.json (ditulis backend tiap sinkronisasi) */
loadLive();

renderDash();
})();
