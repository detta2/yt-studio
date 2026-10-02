/* Content Studio — Fase 1: dashboard + localStorage (tanpa backend) */
(function(){
"use strict";
var LS="ytstudio_v1";
var state=load()||{queue:[],settings:{time:"19:00",auto:true,themes:["hewan","misteri"]}};
function load(){try{return JSON.parse(localStorage.getItem(LS))}catch(e){return null}}
function save(){localStorage.setItem(LS,JSON.stringify(state))}
function uid(){return "q"+Date.now().toString(36)+Math.floor(Math.random()*999)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmtDT(s){if(!s)return"—";var d=new Date(s);return d.toLocaleDateString("id-ID",{day:"numeric",month:"short"})+" "+d.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}
function fmtD(s){return new Date(s).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"})}

/* seed demo sekali */
if(!localStorage.getItem(LS+"_seed")){
  var t=new Date();t.setDate(t.getDate()+1);t.setHours(19,0,0,0);
  state.queue=[
    {id:uid(),title:"KETANGKEP CCTV! Kucing Nyelinap Masuk Pekarangan Jam 2 Pagi",theme:"hewan",hashtags:"#shorts #cctv #kucing",scheduled_at:t.toISOString().slice(0,16),status:"scheduled",created_at:new Date().toISOString(),youtube_id:null},
    {id:uid(),title:"KETANGKEP CCTV! Musang Masuk Pekarangan Tengah Malam",theme:"hewan",hashtags:"#shorts #cctv #musang",scheduled_at:"",status:"draft",created_at:new Date().toISOString(),youtube_id:null}
  ];
  save();localStorage.setItem(LS+"_seed","1");
}

/* ---------- tabs ---------- */
var titles={queue:"Antrian Konten",calendar:"Kalender",stats:"Statistik",settings:"Pengaturan"};
document.querySelectorAll(".nav-item").forEach(function(b){
  b.addEventListener("click",function(){
    document.querySelectorAll(".nav-item").forEach(function(x){x.classList.remove("active")});
    b.classList.add("active");
    document.querySelectorAll(".tab").forEach(function(t){t.classList.remove("active")});
    document.getElementById("tab-"+b.dataset.tab).classList.add("active");
    document.getElementById("page-title").textContent=titles[b.dataset.tab];
    document.getElementById("btn-add").style.display=b.dataset.tab==="queue"?"":"none";
    if(b.dataset.tab==="calendar")renderCal();
    if(b.dataset.tab==="stats")renderStats();
  });
});
document.getElementById("today").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
document.getElementById("btn-add").style.display="";

/* ---------- queue ---------- */
var themeIco={hewan:"🐾",misteri:"👻"};
function renderQueue(){
  var list=document.getElementById("queue-list");list.innerHTML="";
  var q=state.queue.slice().sort(function(a,b){return (a.scheduled_at||"9999")<(b.scheduled_at||"9999")?-1:1});
  document.getElementById("queue-empty").hidden=q.length>0;
  var d=0,s=0,p=0;
  q.forEach(function(it){
    if(it.status==="draft")d++;else if(it.status==="scheduled")s++;else if(it.status==="published")p++;
    var el=document.createElement("div");el.className="qcard";
    el.innerHTML=
      '<div class="qthumb '+it.theme+'">'+themeIco[it.theme]+"</div>"+
      '<div class="qbody"><div class="qtitle">'+esc(it.title)+"</div>"+
      '<div class="qmeta"><span class="badge '+it.theme+'">'+themeIco[it.theme]+" "+it.theme+"</span>"+
      '<span class="badge '+it.status+'">'+({draft:"draft",scheduled:"terjadwal",published:"terbit"})[it.status]+"</span>"+
      '<span class="qsched">📅 '+fmtDT(it.scheduled_at)+"</span></div>"+
      (it.hashtags?'<div class="dim">'+esc(it.hashtags)+"</div>":"")+"</div>"+
      '<div class="qactions">'+
      (it.status!=="published"?'<button class="qbtn go" data-a="pub">✓ Terbit</button>':"")+
      '<button class="qbtn" data-a="edit">✏️ Edit</button>'+
      '<button class="qbtn del" data-a="del">🗑</button></div>';
    el.querySelectorAll(".qbtn").forEach(function(btn){
      btn.addEventListener("click",function(){
        var a=btn.dataset.a;
        if(a==="del"&&confirm("Hapus dari antrian?")){state.queue=state.queue.filter(function(x){return x.id!==it.id});save();renderQueue()}
        else if(a==="pub"){it.status="published";it.youtube_id="demo_"+it.id;save();renderQueue()}
        else if(a==="edit")openModal(it);
      });
    });
    list.appendChild(el);
  });
  document.getElementById("kpi-draft").textContent=d;
  document.getElementById("kpi-sched").textContent=s;
  document.getElementById("kpi-pub").textContent=p;
}

/* ---------- modal ---------- */
var editing=null;
function openModal(it){
  editing=it||null;
  document.getElementById("modal-title").textContent=it?"Edit Konten":"Tambah Konten";
  document.getElementById("f-title").value=it?it.title:"";
  document.getElementById("f-theme").value=it?it.theme:"hewan";
  document.getElementById("f-tags").value=it?it.hashtags||"":"";
  document.getElementById("f-sched").value=it?(it.scheduled_at||""):"";
  document.getElementById("modal-back").hidden=false;
}
document.getElementById("btn-add").addEventListener("click",function(){openModal(null)});
document.getElementById("modal-cancel").addEventListener("click",function(){document.getElementById("modal-back").hidden=true});
document.getElementById("modal-back").addEventListener("click",function(e){if(e.target.id==="modal-back")e.target.hidden=true});
document.getElementById("modal-save").addEventListener("click",function(){
  var title=document.getElementById("f-title").value.trim();
  if(!title){alert("Judul wajib diisi");return}
  var sched=document.getElementById("f-sched").value;
  var data={title:title,theme:document.getElementById("f-theme").value,
    hashtags:document.getElementById("f-tags").value.trim(),scheduled_at:sched,
    status:sched?"scheduled":"draft"};
  if(editing){Object.assign(editing,data)}else{
    state.queue.push(Object.assign({id:uid(),created_at:new Date().toISOString(),youtube_id:null},data));
  }
  save();renderQueue();document.getElementById("modal-back").hidden=true;
});

/* ---------- calendar ---------- */
var calCursor=new Date();calCursor.setDate(1);
function renderCal(){
  var y=calCursor.getFullYear(),m=calCursor.getMonth();
  document.getElementById("cal-title").textContent=calCursor.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  var grid=document.getElementById("cal-grid");grid.innerHTML="";
  ["Min","Sen","Sel","Rab","Kam","Jum","Sab"].forEach(function(d){var e=document.createElement("div");e.className="cal-dow";e.textContent=d;grid.appendChild(e)});
  var first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  var today=new Date();today.setHours(0,0,0,0);
  for(var i=0;i<first;i++){var p=document.createElement("div");p.className="cal-day other";grid.appendChild(p)}
  for(var dnum=1;dnum<=days;dnum++){
    (function(dn){
      var cell=document.createElement("div");cell.className="cal-day";
      var dt=new Date(y,m,dn);
      if(dt.getTime()===today.getTime())cell.classList.add("today");
      cell.innerHTML='<div class="cal-num">'+dn+"</div>";
      state.queue.forEach(function(it){
        if(!it.scheduled_at)return;
        var sd=new Date(it.scheduled_at);
        if(sd.getFullYear()===y&&sd.getMonth()===m&&sd.getDate()===dn){
          var c=document.createElement("span");c.className="cal-chip "+it.status;
          c.textContent=themeIco[it.theme]+" "+it.title.slice(0,22);
          c.title=it.title+" — "+fmtDT(it.scheduled_at);
          cell.appendChild(c);
        }
      });
      grid.appendChild(cell);
    })(dnum);
  }
}
document.getElementById("cal-prev").addEventListener("click",function(){calCursor.setMonth(calCursor.getMonth()-1);renderCal()});
document.getElementById("cal-next").addEventListener("click",function(){calCursor.setMonth(calCursor.getMonth()+1);renderCal()});

/* ---------- stats (demo) ---------- */
function demoStats(){
  var pub=state.queue.filter(function(x){return x.status==="published"});
  if(!pub.length)return[];
  return pub.map(function(v,i){
    var seed=0;for(var k=0;k<v.id.length;k++)seed+=v.id.charCodeAt(k);
    var views=800+((seed*7919)%9000),likes=Math.floor(views*(0.04+((seed%7)/200))),comments=Math.floor(likes*0.12);
    return{title:v.title,views:views,likes:likes,comments:comments,date:v.scheduled_at||v.created_at};
  });
}
function renderStats(){
  var rows=demoStats();
  var tv=0,tl=0,tc=0;
  rows.forEach(function(r){tv+=r.views;tl+=r.likes;tc+=r.comments});
  document.getElementById("st-views").textContent=tv.toLocaleString("id-ID");
  document.getElementById("st-likes").textContent=tl.toLocaleString("id-ID");
  document.getElementById("st-comments").textContent=tc.toLocaleString("id-ID");
  document.getElementById("st-videos").textContent=rows.length;
  var tb=document.querySelector("#stats-table tbody");tb.innerHTML="";
  rows.forEach(function(r){
    var tr=document.createElement("tr");
    tr.innerHTML="<td>"+esc(r.title.slice(0,40))+"</td><td>"+r.views.toLocaleString("id-ID")+"</td><td>"+r.likes.toLocaleString("id-ID")+"</td><td>"+r.comments+"</td><td>"+fmtD(r.date)+"</td>";
    tb.appendChild(tr);
  });
  drawChart(rows);
}
function drawChart(rows){
  var cv=document.getElementById("chart-views"),ctx=cv.getContext("2d");
  var W=cv.width=cv.offsetWidth*2,H=cv.height=440;
  ctx.clearRect(0,0,W,H);
  if(!rows.length){ctx.fillStyle="#a8a8a8";ctx.font="28px sans-serif";ctx.fillText("Belum ada data",40,80);return}
  var max=Math.max.apply(null,rows.map(function(r){return r.views}));
  var bw=W/(rows.length*2);
  rows.forEach(function(r,i){
    var h=(r.views/max)*(H-80),x=i*2*bw+bw/2,y=H-40-h;
    var g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,"#ff0033");g.addColorStop(1,"#7a0018");
    ctx.fillStyle=g;
    ctx.beginPath();ctx.roundRect(x,y,bw,H-40-y,8);ctx.fill();
    ctx.fillStyle="#a8a8a8";ctx.font="22px sans-serif";
    ctx.fillText(r.views.toLocaleString("id-ID"),x,y-12);
  });
}

/* ---------- settings ---------- */
document.getElementById("set-time").value=state.settings.time;
document.getElementById("set-auto").checked=state.settings.auto;
document.getElementById("theme-hewan").checked=state.settings.themes.indexOf("hewan")>=0;
document.getElementById("theme-misteri").checked=state.settings.themes.indexOf("misteri")>=0;
document.getElementById("set-time").addEventListener("change",function(e){state.settings.time=e.target.value;save()});
document.getElementById("set-auto").addEventListener("change",function(e){state.settings.auto=e.target.checked;save()});
["hewan","misteri"].forEach(function(t){
  document.getElementById("theme-"+t).addEventListener("change",function(e){
    var th=state.settings.themes;
    if(e.target.checked&&th.indexOf(t)<0)th.push(t);
    if(!e.target.checked)th=th.filter(function(x){return x!==t});
    state.settings.themes=th.length?th:["hewan"];save();
  });
});
document.getElementById("btn-wipe").addEventListener("click",function(){
  if(confirm("Hapus SEMUA data lokal?")){localStorage.removeItem(LS);localStorage.removeItem(LS+"_seed");location.reload()}
});

renderQueue();
})();
