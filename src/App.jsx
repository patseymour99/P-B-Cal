import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { eventsRef, savedRef, discoverRef, wishlistRef, birthdaysRef, goalsRef, chatRef, tennisRef, runningRef, notesRef, onValue, set } from "./firebase";
import L from "leaflet";

/* ═══ DATA ═══ */
const CATS=[{id:"datenight",label:"Date Night",color:"#d4447a"},{id:"friends",label:"Friends",color:"#e8854a"},{id:"family",label:"Family",color:"#9563d4"},{id:"guests",label:"Guests",color:"#2da4b8"},{id:"work",label:"Work",color:"#5c6bd6"},{id:"fitness",label:"Fitness",color:"#3aaf6a"},{id:"culture",label:"Culture",color:"#d05a90"},{id:"dining",label:"Dining",color:"#d4952a"},{id:"nightout",label:"Night Out",color:"#7a5cd6"},{id:"chill",label:"Chill",color:"#7a8a9a"},{id:"travel",label:"Travel",color:"#2a96d4"},{id:"other",label:"Other",color:"#94a3b8"}];
const FOOD=["Italian","Japanese","British","French","Indian","Mexican","Greek","Thai","Chinese","Korean","Mediterranean","Seafood","Steak","Vegan","Brunch","Other"];
const PRICE=["£","££","£££","££££"];
const MOODS=[{e:"🔥",l:"Amazing"},{e:"😊",l:"Good"},{e:"😐",l:"Meh"},{e:"😤",l:"Bad"}];
const REC=["None","Daily","Weekly","Fortnightly","Monthly"];
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MO=["January","February","March","April","May","June","July","August","September","October","November","December"];
const TSKILLS=["Serve","Forehand","Backhand","Volley","Footwork","Consistency","Strategy"];
const HM=[{w:1,d:"Base building",e:3,te:0,lo:5,t:12},{w:2,d:"Base building",e:3,te:0,lo:6,t:14},{w:3,d:"Building volume",e:4,te:3,lo:7,t:18},{w:4,d:"Recovery",e:3,te:0,lo:5,t:13},{w:5,d:"Building speed",e:4,te:4,lo:8,t:20},{w:6,d:"Building speed",e:4,te:4,lo:10,t:22},{w:7,d:"Endurance",e:5,te:5,lo:11,t:26},{w:8,d:"Recovery",e:3,te:3,lo:8,t:18},{w:9,d:"Peak training",e:5,te:5,lo:13,t:28},{w:10,d:"Peak training",e:5,te:6,lo:14,t:30},{w:11,d:"Peak training",e:5,te:6,lo:16,t:32},{w:12,d:"Recovery",e:4,te:3,lo:10,t:21},{w:13,d:"Sharpening",e:5,te:6,lo:18,t:34},{w:14,d:"Peak week",e:5,te:5,lo:19,t:34},{w:15,d:"Taper",e:4,te:3,lo:10,t:21},{w:16,d:"Race week",e:3,te:0,lo:0,t:7}];
const MANTRAS=["This is our season.","26, London, thriving.","Good energy only.","The city is ours.","Abundance is our default.","Two people, one vision."];
const QUICK_ADD=[{label:"Tennis",tags:["fitness"],duration:"1 hour"},{label:"Run",tags:["fitness"],duration:"45 min"},{label:"Date Night",tags:["datenight"],duration:"3 hours"},{label:"Dinner",tags:["dining"],duration:"2 hours"},{label:"Friends",tags:["friends"],duration:"3 hours"},{label:"Work",tags:["work"],duration:"Full day"}];

/* ═══ HELPERS ═══ */
const gmd=(y,m)=>{const f=new Date(y,m,1),l=new Date(y,m+1,0).getDate();let s=f.getDay()-1;if(s<0)s=6;const d=[];for(let i=0;i<s;i++)d.push(null);for(let i=1;i<=l;i++)d.push(i);return d;};
const dk=(y,m,d)=>`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const gwk=()=>{const d=new Date(),day=d.getDay(),diff=day===0?6:day-1,mon=new Date(d);mon.setDate(d.getDate()-diff);return Array.from({length:7},(_,i)=>{const dd=new Date(mon);dd.setDate(mon.getDate()+i);return dd;});};
const gc=id=>CATS.find(c=>c.id===id)||CATS[11];
const gt=ev=>ev.tags||(ev.category?[ev.category]:["other"]);
const st=n=>"★".repeat(n)+"☆".repeat(5-n);
const ci=(file,w=400)=>new Promise(r=>{const rd=new FileReader();rd.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");let iw=img.width,ih=img.height;if(iw>w){ih=ih*(w/iw);iw=w;}c.width=iw;c.height=ih;c.getContext("2d").drawImage(img,0,0,iw,ih);r(c.toDataURL("image/jpeg",0.5));};img.src=e.target.result;};rd.readAsDataURL(file);});
const alink=ev=>{const n=encodeURIComponent((ev.restaurantName||ev.title||"")+" London");if((ev.tags||[]).includes("dining"))return{book:`https://www.opentable.co.uk/s?term=${n}`,web:`https://www.google.com/search?q=${n}+restaurant`};return{web:`https://www.google.com/search?q=${n}`};};
const dud=(m,d)=>{const n=new Date(),ty=new Date(n.getFullYear(),m-1,d),ny=new Date(n.getFullYear()+1,m-1,d);return Math.ceil(((ty>=new Date(n.getFullYear(),n.getMonth(),n.getDate())?ty:ny)-n)/86400000);};
const fmtD=(ds,o)=>new Date(ds+"T00:00:00").toLocaleDateString("en-GB",o||{weekday:"short",day:"numeric",month:"short"});
const fmtL=ds=>new Date(ds+"T00:00:00").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
const pace=(d,m)=>{if(!d||!m)return"";const dd=parseFloat(d),mm=parseFloat(m);if(!dd||!mm)return"";const p=mm/dd;return`${Math.floor(p)}:${String(Math.round((p%1)*60)).padStart(2,"0")} /km`;};
const me=(events,s,e)=>{const inst={};Object.entries(events).forEach(([k,evs])=>evs.forEach(ev=>{if(!ev.recurrence||ev.recurrence==="None")return;const st=new Date(k+"T00:00:00");let iv=ev.recurrence==="Daily"?1:ev.recurrence==="Weekly"?7:ev.recurrence==="Fortnightly"?14:30;const d=new Date(st);for(let i=0;i<90;i++){d.setDate(d.getDate()+iv);if(d<s)continue;if(d>e)break;const key=dk(d.getFullYear(),d.getMonth(),d.getDate());if(!inst[key])inst[key]=[];inst[key].push({...ev,isRecurring:true});}}));const m={...events};Object.entries(inst).forEach(([k,evs])=>{if(!m[k])m[k]=[];m[k]=[...m[k],...evs];});return m;};

/* ═══ THEMES ═══ */
const TH={
  pink:{bg:"#faf2f5",card:"rgba(255,255,255,0.88)",cardS:"#f9f0f4",bd:"rgba(200,100,140,0.08)",acc:"#c94478",acc2:"#e07aa0",soft:"rgba(200,68,120,0.04)",med:"rgba(200,68,120,0.08)",tx:"#2e1a24",sub:"#9a7888",mute:"#c4a8b4",tBg:"#c94478",tTx:"#fff",inBg:"rgba(255,255,255,0.95)",ov:"rgba(250,242,245,0.94)",chipA:"#c94478",bar:"rgba(200,68,120,0.08)",tagBg:"rgba(200,68,120,0.06)",tagTx:"#c94478",sh:"0 1px 3px rgba(0,0,0,0.03),0 4px 20px rgba(200,68,120,0.05)",hf:"'Cormorant Garamond',serif"},
  blue:{bg:"#f0f4f8",card:"rgba(255,255,255,0.88)",cardS:"#edf2f7",bd:"rgba(70,100,140,0.08)",acc:"#3d6a96",acc2:"#6a94bc",soft:"rgba(61,106,150,0.04)",med:"rgba(61,106,150,0.08)",tx:"#1a2433",sub:"#6e8399",mute:"#a4b4c4",tBg:"#3d6a96",tTx:"#fff",inBg:"rgba(255,255,255,0.95)",ov:"rgba(240,244,248,0.94)",chipA:"#3d6a96",bar:"rgba(61,106,150,0.08)",tagBg:"rgba(61,106,150,0.06)",tagTx:"#3d6a96",sh:"0 1px 3px rgba(0,0,0,0.03),0 4px 20px rgba(61,106,150,0.05)",hf:"'Cormorant Garamond',serif"}
};

/* ═══ SWIPEABLE ROW ═══ */
function SwipeRow({children,onDelete,t}){
  const ref=useRef(null);const sx=useRef(0);const cx=useRef(0);const swiping=useRef(false);
  const onTS=e=>{sx.current=e.touches[0].clientX;cx.current=0;swiping.current=false;};
  const onTM=e=>{const dx=e.touches[0].clientX-sx.current;if(Math.abs(dx)>10)swiping.current=true;cx.current=Math.min(0,Math.max(-80,dx));if(swiping.current&&ref.current)ref.current.style.transform=`translateX(${cx.current}px)`;};
  const onTE=()=>{if(!ref.current)return;if(cx.current<-50){ref.current.style.transform="translateX(-80px)";}else{ref.current.style.transform="translateX(0)";}};
  return<div style={{position:"relative",overflow:"hidden",borderRadius:14,marginBottom:5}}>
    <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,background:"#e05555",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"0 14px 14px 0"}}>
      <button onClick={onDelete} style={{background:"none",border:"none",color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",padding:"0 10px"}}>Delete</button>
    </div>
    <div ref={ref} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} style={{position:"relative",zIndex:1,transition:"transform 0.2s ease",background:t.card,borderRadius:14,boxShadow:t.sh}}>{children}</div>
  </div>;
}

/* ═══ TOAST ═══ */
function useToast(){const[msg,setMsg]=useState(null);const show=useCallback(m=>{setMsg(m);setTimeout(()=>setMsg(null),2200);},[]);return{msg,show};}
function Toast({msg,t}){if(!msg)return null;return<div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:t.tx,color:"#fff",padding:"10px 24px",borderRadius:20,fontSize:12,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",animation:"up .3s ease",pointerEvents:"none"}}>{msg}</div>;}

/* ═══ SKELETON ═══ */
function Skel({t,n=3}){return<>{Array.from({length:n}).map((_,i)=><div key={i} style={{background:t.card,borderRadius:14,padding:16,marginBottom:7,boxShadow:t.sh}}>
  <div style={{height:14,width:"60%",borderRadius:4,background:t.bar,marginBottom:8,animation:"pulse 1.5s ease infinite"}}/>
  <div style={{height:10,width:"40%",borderRadius:4,background:t.bar,animation:"pulse 1.5s ease infinite"}}/>
</div>)}</>;}

/* ═══ MAP ═══ */
function MapView({events,t}){const ref=useRef(null),inst=useRef(null);const pins=useMemo(()=>{const p=[];Object.entries(events).forEach(([d,evs])=>evs.forEach(ev=>{if(ev.lat&&ev.lng)p.push({...ev,date:d});}));return p;},[events]);useEffect(()=>{if(!ref.current)return;if(inst.current)inst.current.remove();const m=L.map(ref.current).setView([51.5203,-0.1052],13);L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{attribution:'©CartoDB'}).addTo(m);pins.forEach(p=>{L.circleMarker([p.lat,p.lng],{radius:7,fillColor:gc((p.tags||[])[0]||"other").color,color:"#fff",weight:2,fillOpacity:0.85}).addTo(m).bindPopup(`<b>${p.title}</b><br><span style="color:#888">${p.address||p.date}</span>`);});if(pins.length>0)m.fitBounds(L.latLngBounds(pins.map(p=>[p.lat,p.lng])),{padding:[30,30]});inst.current=m;return()=>{if(inst.current){inst.current.remove();inst.current=null;}};},[pins]);if(!pins.length)return<Empty t={t} msg="Add locations to events to see them here."/>;return<div ref={ref} style={{height:300,borderRadius:12,overflow:"hidden"}}/>;}
function Empty({t,msg,icon}){return<div style={{padding:40,textAlign:"center"}}>{icon&&<div style={{fontSize:28,marginBottom:8,opacity:.4}}>{icon}</div>}<p style={{fontSize:12,color:t.mute,lineHeight:1.6}}>{msg}</p></div>;}

/* ═══════════════════════ MAIN ═══════════════════════ */
export default function App(){
  const[user,setUser]=useState(null); // "P" or "B"
  const NAMES={P:"Patrick",B:"Blanka"};
  const OTHER=u=>u==="P"?"B":"P";
  const[theme,setTheme]=useState("pink");const[events,setEvents]=useState({});const[tab,setTab]=useState("home");const[prevTab,setPrevTab]=useState("home");const[modal,setModal]=useState(null);
  const[cMonth,setCMonth]=useState(new Date().getMonth());const[cYear,setCYear]=useState(new Date().getFullYear());
  const ef={title:"",tags:[],people:"",notes:"",time:"",duration:"",images:[],rating:0,foodType:"",priceRange:"",restaurantName:"",bestDish:"",link:"",address:"",lat:null,lng:null,recurrence:"None",mood:""};
  const[form,setForm]=useState({...ef});const[editIdx,setEditIdx]=useState(null);const[selDate,setSelDate]=useState(null);const[viewEv,setViewEv]=useState(null);
  const[discFilter,setDiscFilter]=useState("all");const[loaded,setLoaded]=useState(false);const[saved,setSaved]=useState([]);
  const[searchQ,setSearchQ]=useState("");const[searchOpen,setSearchOpen]=useState(false);
  const[liveDisc,setLiveDisc]=useState(null);const[discAt,setDiscAt]=useState(null);const[refreshing,setRefreshing]=useState(false);
  const[wishlist,setWishlist]=useState([]);const[showForm,setShowForm]=useState(null);
  const[wf,setWf]=useState({name:"",type:"",area:"",link:""});
  const[bdays,setBdays]=useState([]);const[bf,setBf]=useState({name:"",month:1,day:1,type:"Birthday"});
  const[goals,setGoals]=useState([]);const[gf,setGf]=useState({text:"",target:5,current:0,emoji:"🎯"});
  const[chat,setChat]=useState([]);const[chatIn,setChatIn]=useState("");const[chatBusy,setChatBusy]=useState(false);
  const[moreView,setMoreView]=useState(null);
  const[weather,setWeather]=useState(null);const[wrap,setWrap]=useState("");const[wrapBusy,setWrapBusy]=useState(false);
  const[fitTab,setFitTab]=useState("tennis");const[confirmDel,setConfirmDel]=useState(false);
  const[tSessions,setTSessions]=useState([]);const[showTF,setShowTF]=useState(false);
  const[tf,setTf]=useState({date:"",duration:"1 hour",partner:"",location:"",drills:"",notes:"",skills:{},mood:""});
  const[runs,setRuns]=useState([]);const[showRF,setShowRF]=useState(false);
  const[rf,setRf]=useState({date:"",distance:"",time:"",type:"Easy",feel:"",notes:""});
  const[quickAdd,setQuickAdd]=useState(null); // date key for quick-add popup
  const[notes,setNotes]=useState([]);
  const[noteModal,setNoteModal]=useState(null); // "write"|"read"
  const[activeNote,setActiveNote]=useState(null);
  const[noteText,setNoteText]=useState("");
  const longPress=useRef(null);
  const toast=useToast();
  const[transDir,setTransDir]=useState(0); // -1 left, 1 right, 0 none

  const t=TH[theme];const now=new Date();const today=dk(now.getFullYear(),now.getMonth(),now.getDate());
  const tabOrder=["home","calendar","fitness","discover","more"];
  const changeTab=k=>{const ci=tabOrder.indexOf(tab),ni=tabOrder.indexOf(k);setTransDir(ni>ci?1:ni<ci?-1:0);setPrevTab(tab);setTab(k);if(k==="more")setMoreView(null);};

  // ── Sync ──
  useEffect(()=>{
    const u=[];
    u.push(onValue(eventsRef,s=>{setEvents(s.val()||{});setLoaded(true);},()=>{try{setEvents(JSON.parse(localStorage.getItem("v5e"))||{});}catch{}setLoaded(true);}));
    u.push(onValue(savedRef,s=>{if(s.val())setSaved(s.val());}));
    u.push(onValue(discoverRef,s=>{const d=s.val();if(d?.events){setLiveDisc(d.events);setDiscAt(d.updatedAt);}}));
    u.push(onValue(wishlistRef,s=>{if(s.val())setWishlist(s.val());}));
    u.push(onValue(birthdaysRef,s=>{if(s.val())setBdays(s.val());}));
    u.push(onValue(goalsRef,s=>{if(s.val())setGoals(s.val());}));
    u.push(onValue(chatRef,s=>{if(s.val())setChat(s.val());}));
    u.push(onValue(tennisRef,s=>{if(s.val())setTSessions(s.val());}));
    u.push(onValue(runningRef,s=>{if(s.val())setRuns(s.val());}));
    u.push(onValue(notesRef,s=>{const d=s.val();if(d){const arr=Array.isArray(d)?d:Object.values(d);setNotes(arr.filter(Boolean));}else{setNotes([]);}}));
    try{const r=localStorage.getItem("v5t");if(r)setTheme(r);}catch{}
    try{const u=localStorage.getItem("v5user");if(u)setUser(u);}catch{}
    return()=>u.forEach(x=>x());},[]);
  const sy=(r,d)=>{try{set(r,d);}catch{}};
  const sEv=ev=>{setEvents(ev);sy(eventsRef,ev);try{localStorage.setItem("v5e",JSON.stringify(ev));}catch{}};
  useEffect(()=>{if(loaded)try{localStorage.setItem("v5t",theme);}catch{}},[theme,loaded]);

  // ── Weather ──
  useEffect(()=>{fetch("https://api.open-meteo.com/v1/forecast?latitude=51.52&longitude=-0.11&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/London&forecast_days=7").then(r=>r.json()).then(d=>{if(d.daily)setWeather(d.daily);}).catch(()=>{});},[]);
  const wIcon=c=>c<=1?"☀️":c<=3?"⛅":c<=49?"☁️":c<=69?"🌧️":"⛈️";

  // ── Notifications ──
  const prevEvRef=useRef(null);
  const prevNotesRef=useRef(null);
  useEffect(()=>{if(!loaded||!("Notification"in window))return;
    // Ask permission
    if(Notification.permission==="default")Notification.requestPermission();
    // Daily reminder (once on load)
    const tm=setTimeout(()=>{if(Notification.permission==="granted"){const e=events[today]||[];if(e.length)new Notification("Our Calendar",{body:`${e.length} event${e.length>1?"s":""} today: ${e.map(x=>x.title).join(", ")}`,icon:"/apple-touch-icon.png"});}},2000);
    return()=>clearTimeout(tm);},[loaded,today]);
  // Cross-user notification: detect when partner adds/changes events
  useEffect(()=>{if(!user||!loaded||Notification.permission!=="granted")return;
    const evStr=JSON.stringify(events);
    if(prevEvRef.current&&prevEvRef.current!==evStr){
      // Find new events created by the other person
      try{const prev=JSON.parse(prevEvRef.current);
        Object.entries(events).forEach(([k,evs])=>{const oldEvs=prev[k]||[];
          evs.forEach(ev=>{if(ev.createdBy&&ev.createdBy!==user&&!oldEvs.some(o=>o.title===ev.title&&o.time===ev.time)){
            new Notification(`${NAMES[ev.createdBy]} added an event`,{body:`${ev.title}${ev.time?" at "+ev.time:""} — ${fmtD(k)}`,icon:"/apple-touch-icon.png"});
          }});});}catch{}}
    prevEvRef.current=evStr;},[events,user,loaded]);
  // Note notification: fire when partner sends a new note
  useEffect(()=>{if(!user||!loaded||Notification.permission!=="granted")return;
    const str=JSON.stringify(notes);
    if(prevNotesRef.current&&prevNotesRef.current!==str){
      try{const prev=JSON.parse(prevNotesRef.current);const prevIds=new Set(prev.map(n=>n.id));
        notes.forEach(n=>{if(n.to===user&&!prevIds.has(n.id)){
          new Notification(`${NAMES[n.from]} left you a note 💌`,{body:"Open the app to unfold your daily note",icon:"/apple-touch-icon.png"});}});}catch{}}
    prevNotesRef.current=str;},[notes,user,loaded]);

  // ── Computed ──
  const wk=useMemo(()=>gwk(),[today]);const md=useMemo(()=>gmd(cYear,cMonth),[cYear,cMonth]);
  const vs=new Date(now);vs.setDate(vs.getDate()-1);const ve=new Date(now);ve.setDate(ve.getDate()+90);
  const am=useMemo(()=>me(events,vs,ve),[events,today]);

  // ── Week score ──
  const weekScore=useMemo(()=>{
    const wKeys=wk.map(d=>dk(d.getFullYear(),d.getMonth(),d.getDate()));
    const wEvs=wKeys.flatMap(k=>(am[k]||[]).map(e=>({...e,tags:gt(e)})));
    const social=wEvs.filter(e=>e.tags.some(x=>["datenight","friends","dining","nightout","culture","guests"].includes(x))).length;
    const fitness=wEvs.filter(e=>e.tags.includes("fitness")).length+tSessions.filter(s=>{const d=new Date(s.date+"T00:00:00");return(now-d)/86400000<7&&(now-d)/86400000>=0;}).length+runs.filter(r=>{const d=new Date(r.date+"T00:00:00");return(now-d)/86400000<7&&(now-d)/86400000>=0;}).length;
    const total=social+fitness;
    if(total>=8)return{grade:"A+",msg:"Unstoppable week",color:"#3aaf6a"};
    if(total>=6)return{grade:"A",msg:"Brilliant week",color:"#3aaf6a"};
    if(total>=4)return{grade:"B+",msg:"Solid week",color:t.acc};
    if(total>=2)return{grade:"B",msg:"Good going",color:t.acc};
    if(total>=1)return{grade:"C",msg:"Quiet one — recharge mode",color:t.mute};
    return{grade:"—",msg:"Week's just starting",color:t.mute};
  },[am,wk,tSessions,runs,today]);

  // ── Event CRUD ──
  const oAdd=ds=>{setSelDate(ds);setForm({...ef});setEditIdx(null);setModal("add");};
  const oQuickAdd=(ds,preset)=>{setSelDate(ds);setForm({...ef,title:preset.label,tags:preset.tags,duration:preset.duration});setEditIdx(null);setModal("add");setQuickAdd(null);};
  const oView=(ds,i)=>{const ev=(am[ds]||events[ds]||[])[i];if(!ev)return;setSelDate(ds);setEditIdx(i);setViewEv({...ev,date:ds,idx:i});setConfirmDel(false);setModal("view");};
  const oEdit=()=>{const v=viewEv;setForm({title:v.title,tags:gt(v),people:v.people||"",notes:v.notes||"",time:v.time||"",duration:v.duration||"",images:v.images||[],rating:v.rating||0,foodType:v.foodType||"",priceRange:v.priceRange||"",restaurantName:v.restaurantName||"",bestDish:v.bestDish||"",link:v.link||"",address:v.address||"",lat:v.lat||null,lng:v.lng||null,recurrence:v.recurrence||"None",mood:v.mood||""});setModal("edit");};
  const save=()=>{if(!form.title.trim())return;const c={...events};const k=selDate;if(!c[k])c[k]=[];else c[k]=[...c[k]];const evData={...form,createdBy:user||"P"};if(editIdx!==null&&!viewEv?.isRecurring)c[k][editIdx]=evData;else c[k].push(evData);sEv(c);setModal(null);toast.show("Saved ✓");};
  const del=()=>{if(!confirmDel){setConfirmDel(true);return;}if(viewEv?.isRecurring)return;const c={...events};c[selDate]=c[selDate].filter((_,i)=>i!==editIdx);if(!c[selDate].length)delete c[selDate];sEv(c);setModal(null);setConfirmDel(false);toast.show("Deleted");};
  const tTag=id=>setForm(f=>({...f,tags:f.tags.includes(id)?f.tags.filter(x=>x!==id):[...f.tags,id]}));
  const tSave=id=>{const s=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];setSaved(s);sy(savedRef,s);toast.show(s.includes(id)?"Saved ♥":"Removed");};
  const nav=d=>{d===1?cMonth===11?(setCMonth(0),setCYear(y=>y+1)):setCMonth(m=>m+1):cMonth===0?(setCMonth(11),setCYear(y=>y-1)):setCMonth(m=>m-1);};
  const aImg=async e=>{const f=Array.from(e.target.files);const c=await Promise.all(f.slice(0,6-form.images.length).map(x=>ci(x)));setForm(p=>({...p,images:[...p.images,...c]}));};
  const aLoc=()=>navigator.geolocation?.getCurrentPosition(p=>{setForm(f=>({...f,lat:p.coords.latitude,lng:p.coords.longitude,address:f.address||"Current location"}));toast.show("Location saved ✓");});
  const sAddr=async()=>{if(!form.address.trim())return;try{const r=await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.address+", London")}&format=json&limit=1`);const d=await r.json();if(d[0]){setForm(f=>({...f,lat:+d[0].lat,lng:+d[0].lon}));toast.show("Location found ✓");}}catch{}};

  // ── CRUD helpers ──
  const addWish=()=>{if(!wf.name.trim())return;const w=[...wishlist,{...wf,id:"w"+Date.now()}];setWishlist(w);sy(wishlistRef,w);setWf({name:"",type:"",area:"",link:""});setShowForm(null);toast.show("Added to wishlist ✓");};
  const addBday=()=>{const b=[...bdays,{...bf,id:"b"+Date.now()}];setBdays(b);sy(birthdaysRef,b);setBf({name:"",month:1,day:1,type:"Birthday"});setShowForm(null);toast.show("Saved ✓");};
  const addGoal=()=>{if(!gf.text.trim())return;const g=[...goals,{...gf,id:"g"+Date.now()}];setGoals(g);sy(goalsRef,g);setGf({text:"",target:5,current:0,emoji:"🎯"});setShowForm(null);toast.show("Goal added ✓");};
  const updGoal=(id,d)=>{const g=goals.map(x=>x.id===id?{...x,current:Math.max(0,Math.min(x.target,(x.current||0)+d))}:x);setGoals(g);sy(goalsRef,g);const goal=g.find(x=>x.id===id);if(goal&&(goal.current||0)>=goal.target)toast.show("Goal achieved! 🎉");};
  const rm=(arr,set,ref,id)=>{const n=arr.filter(x=>x.id!==id);set(n);sy(ref,n);toast.show("Deleted");};

  // ── Tennis ──
  const saveTennis=()=>{if(!tf.date)return;const s=[...tSessions,{...tf,id:"t"+Date.now(),createdBy:user||"P"}];setTSessions(s);sy(tennisRef,s);setTf({date:today,duration:"1 hour",partner:"",location:"",drills:"",notes:"",skills:{},mood:""});setShowTF(false);toast.show("Session logged ✓");};
  const tStats=useMemo(()=>{
    const mo=tSessions.filter(s=>s.date?.startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`));
    const wkS=tSessions.filter(s=>{const d=new Date(s.date+"T00:00:00");return(now-d)/86400000>=0&&(now-d)/86400000<7;});
    const st={},sc={};tSessions.forEach(s=>{if(s.skills)Object.entries(s.skills).forEach(([k,v])=>{st[k]=(st[k]||0)+v;sc[k]=(sc[k]||0)+1;});});
    const avg=Object.entries(st).map(([k,v])=>({skill:k,avg:Math.round((v/sc[k])*10)/10})).sort((a,b)=>a.avg-b.avg);
    let streak=0;const ws=new Set();tSessions.forEach(s=>{const d=new Date(s.date+"T00:00:00");ws.add(`${d.getFullYear()}-${Math.floor((d-new Date(d.getFullYear(),0,1))/604800000)}`);});
    const tw=Math.floor((now-new Date(now.getFullYear(),0,1))/604800000);
    for(let i=0;i<52;i++){if(ws.has(`${now.getFullYear()}-${tw-i}`))streak++;else break;}
    return{total:tSessions.length,mo:mo.length,wk:wkS.length,avg,streak,weak:avg[0],strong:avg[avg.length-1]};
  },[tSessions,today]);

  // ── Running ──
  const saveRun=()=>{if(!rf.distance)return;const r=[...runs,{...rf,id:"r"+Date.now(),pace:pace(rf.distance,rf.time),createdBy:user||"P"}];setRuns(r);sy(runningRef,r);setRf({date:today,distance:"",time:"",type:"Easy",feel:"",notes:""});setShowRF(false);toast.show("Run logged ✓");};
  const rStats=useMemo(()=>{
    const tkm=runs.reduce((a,r)=>a+(parseFloat(r.distance)||0),0);
    const wkR=runs.filter(r=>{const d=new Date(r.date+"T00:00:00");return(now-d)/86400000<7&&(now-d)/86400000>=0;});
    const wkm=wkR.reduce((a,r)=>a+(parseFloat(r.distance)||0),0);
    const dtr=Math.ceil((new Date("2026-11-01T00:00:00")-now)/86400000);
    const wtr=Math.ceil(dtr/7);const cpw=Math.min(Math.max(1,17-wtr),16);
    const lr=runs.reduce((m,r)=>Math.max(m,parseFloat(r.distance)||0),0);
    return{tkm:Math.round(tkm*10)/10,wkm:Math.round(wkm*10)/10,total:runs.length,dtr,wtr,cpw,lr};
  },[runs,today]);

  // ── AI ──
  const aiSend=async(msg,mode="chat")=>{if(!msg?.trim())return;const msgs=[...chat,{role:"user",text:msg,time:Date.now()}];setChat(msgs);setChatIn("");setChatBusy(true);
    try{const r=await fetch("/api/concierge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:msg,mode,context:""})});const d=await r.json();
      const reply=[...msgs,{role:"assistant",text:d.reply||d.error||"Error.",time:Date.now()}];setChat(reply);sy(chatRef,reply);
    }catch{setChat([...msgs,{role:"assistant",text:"Connection error.",time:Date.now()}]);}setChatBusy(false);};
  const genWrap=()=>{setWrapBusy(true);const mk=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;const mevs=Object.entries(events).filter(([k])=>k.startsWith(mk)).flatMap(([k,evs])=>evs.map(e=>({title:e.title,date:k})));
    fetch("/api/concierge",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Monthly wrap for ${MO[now.getMonth()]}.`,mode:"wrap",context:JSON.stringify({events:mevs,total:mevs.length})})}).then(r=>r.json()).then(d=>setWrap(d.reply||"Error.")).catch(()=>setWrap("Error.")).finally(()=>setWrapBusy(false));};

  // ── Analytics ──
  const an=useMemo(()=>{
    const all=Object.entries(events).flatMap(([d,evs])=>evs.map(e=>({...e,date:d,tags:gt(e)})));
    const cc={},pc={};all.forEach(e=>{e.tags.forEach(t=>{cc[t]=(cc[t]||0)+1;});if(e.people)e.people.split(",").map(p=>p.trim()).filter(Boolean).forEach(p=>{pc[p]=(pc[p]||0)+1;});});
    const topC=Object.entries(cc).sort((a,b)=>b[1]-a[1]),topP=Object.entries(pc).sort((a,b)=>b[1]-a[1]);
    const wKeys=wk.map(d=>dk(d.getFullYear(),d.getMonth(),d.getDate()));
    const wEvs=wKeys.flatMap(k=>(am[k]||[]).map(e=>({...e,date:k,tags:gt(e)})));
    const wOut=wEvs.filter(e=>e.tags.some(t=>["datenight","friends","dining","nightout","culture","guests","travel"].includes(t))).length;
    const ranked=all.filter(e=>e.rating>0).map(e=>({...e,displayName:e.restaurantName||e.title})).sort((a,b)=>b.rating-a.rating);
    const imgs=all.filter(e=>e.images?.length).flatMap(e=>e.images.map(img=>({img,title:e.title,date:e.date})));
    const moods={};all.filter(e=>e.mood).forEach(e=>{moods[e.mood]=(moods[e.mood]||0)+1;});
    return{topC,topP,mxC:topC[0]?.[1]||1,mxP:topP[0]?.[1]||1,total:all.length,wEvs,wOut,ranked,imgs,moods};
  },[events,today,am]);
  const AD=useMemo(()=>liveDisc||[],[liveDisc]);
  const fDisc=useMemo(()=>{if(discFilter==="all")return AD;if(discFilter==="saved")return AD.filter(e=>saved.includes(e.id));return AD.filter(e=>e.cat===discFilter);},[discFilter,saved,AD]);
  const bdCd=useMemo(()=>bdays.map(b=>({...b,days:dud(b.month,b.day)})).sort((a,b)=>a.days-b.days),[bdays]);

  // ── Notes ──
  const saveNt=arr=>{if(!arr.length){sy(notesRef,null);return;}const obj={};arr.forEach(n=>{if(n?.id)obj[n.id]=n;});sy(notesRef,obj);};
  const unreadNote=useMemo(()=>[...notes].filter(n=>n.to===user&&!n.openedAt).sort((a,b)=>a.createdAt-b.createdAt)[0]||null,[notes,user]);
  const canWriteToday=useMemo(()=>!notes.find(n=>n.from===user&&n.date===today),[notes,user,today]);
  const sentToday=useMemo(()=>notes.find(n=>n.from===user&&n.date===today)||null,[notes,user,today]);
  const pastNotes=useMemo(()=>[...notes].sort((a,b)=>b.createdAt-a.createdAt),[notes]);
  const noteEmoji=u=>u==="P"?"💙":"💗";
  const sendNote=()=>{if(!noteText.trim())return;const n={id:"n"+Date.now(),from:user,to:OTHER(user),text:noteText.trim(),date:today,createdAt:Date.now(),openedAt:null};const arr=[...notes,n];setNotes(arr);saveNt(arr);setNoteText("");setNoteModal(null);toast.show("Note sent ✉️");};
  const openNote=note=>{setActiveNote(note);setNoteModal("read");if(!note.openedAt){const arr=notes.map(n=>n.id===note.id?{...n,openedAt:Date.now()}:n);setNotes(arr);saveNt(arr);}};

  // ── Styles ──
  const Pill=({children,s})=><span style={{fontSize:10,fontWeight:500,padding:"3px 8px",borderRadius:20,background:t.tagBg,color:t.tagTx,...s}}>{children}</span>;
  const Lb=({children})=><label style={{fontSize:10,fontWeight:500,color:t.mute,marginBottom:4,display:"block",letterSpacing:".05em",textTransform:"uppercase"}}>{children}</label>;
  const b0={background:"none",border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans',sans-serif"};
  const cd={background:t.card,borderRadius:14,padding:16,boxShadow:t.sh};
  const Btn=({children,primary,onClick,style:s,...p})=><button onClick={onClick} style={{...b0,padding:"11px 0",borderRadius:10,fontSize:13,fontWeight:600,width:"100%",...(primary?{background:t.acc,color:"#fff"}:{border:`1px solid ${t.bd}`,color:t.tx}),...s}} {...p}>{children}</button>;
  const Head=({children})=><p style={{fontSize:9,fontWeight:500,color:t.mute,letterSpacing:".06em",marginBottom:8}}>{children}</p>;
  const Back=({onClick})=><button onClick={onClick} style={{...b0,display:"flex",alignItems:"center",gap:4,fontSize:12,color:t.acc,fontWeight:500,marginBottom:10}}>← Back</button>;

  // Long press handler for quick-add
  const onDayDown=(ds)=>{longPress.current=setTimeout(()=>setQuickAdd(ds),500);};
  const onDayUp=()=>{if(longPress.current)clearTimeout(longPress.current);};

  if(!loaded)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:t.bg}}><p style={{color:t.mute,fontSize:12,letterSpacing:".1em"}}>LOADING</p></div>;

  // Profile picker — shown once on first launch
  if(!user)return<div style={{minHeight:"100vh",background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif",padding:20}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
    <div style={{textAlign:"center",maxWidth:320}}>
      <h1 style={{fontFamily:t.hf,fontSize:28,fontWeight:500,fontStyle:"italic",color:t.tx,marginBottom:8}}>Our Calendar</h1>
      <p style={{fontSize:13,color:t.sub,marginBottom:32,lineHeight:1.5}}>Who's using this phone?</p>
      <div style={{display:"flex",gap:12}}>
        <button onClick={()=>{setUser("P");localStorage.setItem("v5user","P");}} style={{flex:1,padding:"28px 16px",borderRadius:16,border:"none",cursor:"pointer",background:t.card,boxShadow:t.sh,fontFamily:"'Plus Jakarta Sans'"}}>
          <div style={{fontSize:32,marginBottom:8}}>💙</div>
          <div style={{fontSize:16,fontWeight:700,color:t.tx}}>Patrick</div>
        </button>
        <button onClick={()=>{setUser("B");localStorage.setItem("v5user","B");}} style={{flex:1,padding:"28px 16px",borderRadius:16,border:"none",cursor:"pointer",background:t.card,boxShadow:t.sh,fontFamily:"'Plus Jakarta Sans'"}}>
          <div style={{fontSize:32,marginBottom:8}}>💗</div>
          <div style={{fontSize:16,fontWeight:700,color:t.tx}}>Blanka</div>
        </button>
      </div>
      <p style={{fontSize:10,color:t.mute,marginTop:16}}>This only sets up this phone. You can change it later in More.</p>
    </div>
  </div>;

  return(
    <div style={{minHeight:"100vh",background:t.bg,color:t.tx,fontFamily:"'Plus Jakarta Sans',sans-serif",paddingBottom:70}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        @keyframes up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes in{from{opacity:0}to{opacity:1}}
        @keyframes si{from{opacity:0;transform:scale(.96) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes sp{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.15}}
        @keyframes slideL{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideR{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes uncrumple{0%{transform:perspective(600px) scale(0.15) rotate(-17deg) rotateX(12deg);border-radius:48% 32% 52% 28%/36% 50% 26% 48%;filter:brightness(0.68) contrast(1.16) drop-shadow(0 2px 8px rgba(0,0,0,0.55))}10%{transform:perspective(600px) scale(0.12) rotate(-24deg) rotateX(16deg);border-radius:54% 26% 58% 22%/30% 56% 20% 54%;filter:brightness(0.63) contrast(1.18) drop-shadow(0 2px 10px rgba(0,0,0,0.6))}27%{transform:perspective(600px) scale(0.28) rotate(-15deg) rotateX(8deg);border-radius:32% 20% 38% 16%/20% 34% 13% 32%;filter:brightness(0.78) contrast(1.1) drop-shadow(0 4px 14px rgba(0,0,0,0.42))}47%{transform:perspective(600px) scale(0.54) rotate(-7deg) rotateX(3deg);border-radius:20% 13% 24% 10%/12% 20% 8% 17%;filter:brightness(0.88) contrast(1.05) drop-shadow(0 7px 20px rgba(0,0,0,0.28))}64%{transform:perspective(600px) scale(0.76) rotate(-2.5deg) rotateX(0.5deg);border-radius:10% 7% 12% 6%;filter:brightness(0.95) drop-shadow(0 10px 28px rgba(0,0,0,0.2))}79%{transform:perspective(600px) scale(0.92) rotate(0.9deg);border-radius:5% 3% 6% 3%;filter:brightness(0.98) drop-shadow(0 12px 34px rgba(0,0,0,0.16))}90%{transform:perspective(600px) scale(1.035) rotate(-0.5deg);border-radius:2%;filter:brightness(1) drop-shadow(0 14px 40px rgba(0,0,0,0.13))}96%{transform:perspective(600px) scale(0.99) rotate(0.1deg);border-radius:1%}100%{transform:perspective(600px) scale(1) rotate(0deg) rotateX(0deg);border-radius:14px;filter:brightness(1) contrast(1) drop-shadow(0 12px 44px rgba(0,0,0,0.12))}}
        @keyframes noteIn{0%,60%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes noteGlow{0%{box-shadow:0 0 0 0 rgba(200,68,120,0.55)}65%{box-shadow:0 0 0 16px rgba(200,68,120,0)}100%{box-shadow:0 0 0 0 rgba(200,68,120,0)}}
        @keyframes noteGlowBlue{0%{box-shadow:0 0 0 0 rgba(61,106,150,0.55)}65%{box-shadow:0 0 0 16px rgba(61,106,150,0)}100%{box-shadow:0 0 0 0 rgba(61,106,150,0)}}
        @keyframes noteBounce{0%,100%{transform:rotate(-8deg) translateY(0) scale(1)}45%{transform:rotate(-5.5deg) translateY(-5px) scale(1.04)}}
        .a{animation:up .35s ease both}
        .sl{animation:slideL .25s ease both}
        .sr{animation:slideR .25s ease both}
        input,textarea,select{font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;border:1px solid ${t.bd};background:${t.inBg};color:${t.tx};border-radius:10px;padding:10px 12px;outline:none;width:100%;transition:all .2s}
        input:focus,textarea:focus,select:focus{border-color:${t.acc};box-shadow:0 0 0 3px ${t.soft}}
        textarea{resize:vertical;min-height:40px}select{cursor:pointer;appearance:none}
        ::-webkit-scrollbar{width:2px;height:2px}::-webkit-scrollbar-thumb{background:${t.med};border-radius:2px}
        .hs::-webkit-scrollbar{display:none}.leaflet-container{font-family:'Plus Jakarta Sans',sans-serif;font-size:12px}
      `}</style>

      <Toast msg={toast.msg} t={t}/>

      {/* Quick-add popup */}
      {quickAdd&&<div onClick={()=>setQuickAdd(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",backdropFilter:"blur(4px)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",animation:"in .15s"}}>
        <div onClick={e=>e.stopPropagation()} style={{background:t.bg,borderRadius:16,padding:20,width:280,boxShadow:"0 8px 40px rgba(0,0,0,0.12)",animation:"si .2s"}}>
          <p style={{fontSize:12,fontWeight:600,marginBottom:12}}>Quick add — {fmtD(quickAdd)}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {QUICK_ADD.map(q=><button key={q.label} onClick={()=>oQuickAdd(quickAdd,q)} style={{...b0,...cd,padding:12,textAlign:"center"}}><div style={{fontSize:12,fontWeight:600,color:t.acc}}>{q.label}</div></button>)}
            <button onClick={()=>{setQuickAdd(null);oAdd(quickAdd);}} style={{...b0,...cd,padding:12,textAlign:"center",gridColumn:"1 / -1"}}><div style={{fontSize:12,fontWeight:600,color:t.sub}}>Custom event...</div></button>
          </div>
        </div>
      </div>}

      {/* HEADER */}
      <div style={{padding:"20px 20px 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h1 style={{fontFamily:t.hf,fontSize:26,fontWeight:500,fontStyle:"italic"}}>Our Calendar</h1>
            <p style={{fontSize:11,color:t.mute,marginTop:2}}>{NAMES[user]||"You"} · {an.total} events · Farringdon</p></div>
          <button onClick={()=>setTheme(theme==="pink"?"blue":"pink")} style={{...b0,width:44,height:24,borderRadius:12,position:"relative",background:theme==="pink"?"linear-gradient(135deg,#c94478,#e07aa0)":"linear-gradient(135deg,#3d6a96,#6a94bc)"}}>
            <div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:3,left:theme==="pink"?3:23,transition:"left .3s cubic-bezier(.4,0,.2,1)"}}/>
          </button>
        </div>
        {weather&&<div className="hs" style={{display:"flex",gap:10,marginTop:12,overflowX:"auto"}}>
          {weather.time.slice(0,7).map((d,i)=><div key={i} style={{textAlign:"center",minWidth:42}}>
            <div style={{fontSize:8,fontWeight:500,color:t.mute,letterSpacing:".04em"}}>{i===0?"TODAY":new Date(d).toLocaleDateString("en-GB",{weekday:"short"}).toUpperCase()}</div>
            <div style={{fontSize:15,margin:"2px 0"}}>{wIcon(weather.weathercode[i])}</div>
            <div style={{fontSize:11,fontWeight:600}}>{Math.round(weather.temperature_2m_max[i])}°</div>
          </div>)}
        </div>}
      </div>

      {/* SEARCH */}
      <div style={{padding:"8px 20px 0",position:"relative",zIndex:800}}>
        <div style={{display:"flex",alignItems:"center",gap:8,background:t.card,border:`1px solid ${searchOpen?t.acc:t.bd}`,borderRadius:10,padding:"0 12px",boxShadow:searchOpen?`0 0 0 3px ${t.soft}`:"none"}}>
          <span style={{fontSize:13,color:t.mute}}>⌕</span>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onFocus={()=>setSearchOpen(true)} placeholder="Search..." style={{border:"none",background:"transparent",padding:"10px 0",fontSize:13}}/>
          {(searchQ||searchOpen)&&<button onClick={()=>{setSearchQ("");setSearchOpen(false);}} style={{...b0,fontSize:12,color:t.mute}}>✕</button>}
        </div>
        {searchOpen&&<div onClick={()=>{setSearchOpen(false);setSearchQ("");}} style={{position:"fixed",inset:0,zIndex:799}}/>}
        {searchOpen&&searchQ.trim()&&<div style={{position:"absolute",top:"calc(100% + 4px)",left:20,right:20,background:t.cardS,border:`1px solid ${t.bd}`,borderRadius:12,maxHeight:260,overflowY:"auto",zIndex:810,animation:"up .2s",padding:8,boxShadow:t.sh}}>
          {(()=>{const res=[];Object.entries(events).forEach(([k,evs])=>evs.forEach((ev,i)=>{if(`${ev.title} ${(ev.tags||[]).join(" ")} ${ev.people||""}`.toLowerCase().includes(searchQ.toLowerCase()))res.push({...ev,date:k,idx:i});}));
            return!res.length?<p style={{color:t.mute,fontSize:12,textAlign:"center",padding:12}}>No results</p>
            :res.slice(0,6).map((ev,i)=><button key={i} onClick={()=>{setSearchQ("");setSearchOpen(false);oView(ev.date,ev.idx);}} style={{...b0,display:"flex",alignItems:"center",gap:8,width:"100%",textAlign:"left",padding:"8px 4px",borderRadius:8,color:t.tx}}>
              <div style={{width:4,height:16,borderRadius:2,background:gc(gt(ev)[0]).color}}/>
              <div><div style={{fontWeight:600,fontSize:12}}>{ev.title}</div><div style={{fontSize:10,color:t.sub}}>{fmtD(ev.date)}</div></div></button>);})()}
        </div>}
      </div>

      {/* TABS */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:900,background:t.cardS,borderTop:`1px solid ${t.bd}`,display:"flex",padding:"6px 4px env(safe-area-inset-bottom,6px)"}}>
        {tabOrder.map((k,i)=>{const labels=["Home","Calendar","Fitness","Discover","More"];
          return<button key={k} onClick={()=>changeTab(k)} style={{...b0,flex:1,padding:"7px 0",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:tab===k?t.acc:t.mute,transition:"color .2s"}}>
            <span style={{fontSize:10,fontWeight:tab===k?600:400,letterSpacing:".04em"}}>{labels[i].toUpperCase()}</span>
            {tab===k&&<div style={{width:16,height:2,borderRadius:1,background:t.acc}}/>}
          </button>;})}
      </div>

      {/* ═══ TAB CONTENT with transitions ═══ */}
      <div className={transDir>0?"sl":transDir<0?"sr":"a"} key={tab}>

      {/* ═══ HOME ═══ */}
      {tab==="home"&&<div style={{padding:"12px 20px"}}>
        {/* Today */}
        <div className="a" style={{...cd,marginBottom:12,padding:14}}>
          <Head>TODAY · {fmtL(today)}</Head>
          {(am[today]||[]).length===0?<p style={{fontSize:12,color:t.sub}}>Nothing scheduled. <button onClick={()=>oAdd(today)} style={{...b0,color:t.acc,fontSize:12,fontWeight:600}}>Add something →</button></p>
          :(am[today]||[]).map((ev,j)=><button key={j} onClick={()=>oView(today,j)} style={{...b0,...cd,display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",marginBottom:3,padding:"10px 14px"}}>
            <div style={{width:4,height:28,borderRadius:2,background:gc(gt(ev)[0]).color,flexShrink:0}}/>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{ev.title}</div><div style={{fontSize:10,color:t.sub}}>{ev.time||"All day"}{ev.people?` · ${ev.people}`:""}</div></div>
            {ev.mood&&<span style={{fontSize:14}}>{ev.mood}</span>}
          </button>)}
        </div>

        {/* Birthdays */}
        {bdCd.filter(b=>b.days<=14).length>0&&<div className="a" style={{...cd,marginBottom:12,padding:"12px 14px"}}>
          {bdCd.filter(b=>b.days<=14).map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
            <div style={{width:28,height:28,borderRadius:7,background:t.acc,color:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:700,lineHeight:1}}>{b.days}<span style={{fontSize:6}}>d</span></div>
            <span style={{fontSize:12}}><strong>{b.name}</strong> · {b.type}</span>
          </div>)}
        </div>}

        {/* Week strip with long-press for quick-add */}
        <div className="a" style={{...cd,marginBottom:12,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <Head>THIS WEEK</Head>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:14,fontWeight:700,fontFamily:t.hf,color:weekScore.color}}>{weekScore.grade}</span>
              <span style={{fontSize:10,color:t.sub}}>{weekScore.msg}</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {wk.map((d,i)=>{const k=dk(d.getFullYear(),d.getMonth(),d.getDate()),isT=k===today,evs=am[k]||[];
              return<button key={i} onClick={()=>oAdd(k)} onTouchStart={()=>onDayDown(k)} onTouchEnd={onDayUp} onMouseDown={()=>onDayDown(k)} onMouseUp={onDayUp} onMouseLeave={onDayUp} style={{...b0,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"5px 0",borderRadius:10,background:isT?t.tBg:evs.length?t.soft:"transparent",color:isT?t.tTx:t.tx}}>
                <span style={{fontSize:8,fontWeight:500,opacity:.5}}>{DAYS[i]}</span>
                <span style={{fontSize:14,fontWeight:isT?700:500}}>{d.getDate()}</span>
                <div style={{display:"flex",gap:2}}>{evs.slice(0,3).map((e,j)=><div key={j} style={{width:3,height:3,borderRadius:2,background:isT?"#fff":gc(gt(e)[0]).color}}/>)}</div>
              </button>;})}
          </div>
          <p style={{fontSize:9,color:t.mute,textAlign:"center",marginTop:6}}>Hold a day for quick-add</p>
        </div>

        {/* Mantra */}
        <div style={{...cd,marginBottom:12,padding:16,textAlign:"center",background:t.soft}}>
          <p style={{fontFamily:t.hf,fontSize:16,fontWeight:500,fontStyle:"italic",lineHeight:1.6,opacity:.85}}>"{MANTRAS[Math.floor(Date.now()/86400000)%MANTRAS.length]}"</p>
        </div>

        {/* Daily Notes */}
        <div className="a" style={{...cd,marginBottom:12,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:unreadNote||canWriteToday||sentToday?10:0}}>
            <Head>DAILY NOTES</Head>
            <button onClick={()=>{changeTab("more");setMoreView("notes");}} style={{...b0,fontSize:9,color:t.mute,letterSpacing:".04em",fontWeight:500}}>PAST NOTES ›</button>
          </div>
          {unreadNote&&<button onClick={()=>openNote(unreadNote)} style={{...b0,display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 14px",borderRadius:14,background:t.soft,marginBottom:canWriteToday?8:0,border:`1px solid ${t.acc}20`}}>
            <div style={{position:"relative",flexShrink:0,padding:4}}>
              {/* Ping glow ring */}
              <div style={{position:"absolute",inset:-2,borderRadius:"46% 40% 50% 38%/44% 50% 38% 48%",animation:`${theme==="pink"?"noteGlow":"noteGlowBlue"} 2.2s ease-out infinite`}}/>
              {/* Crumpled ball */}
              <div style={{width:72,height:68,background:`radial-gradient(ellipse at 28% 28%,rgba(255,255,255,0.5) 0%,transparent 40%),radial-gradient(ellipse at 68% 38%,rgba(255,255,255,0.18) 0%,transparent 30%),radial-gradient(ellipse at 75% 70%,rgba(0,0,0,0.16) 0%,transparent 42%),radial-gradient(ellipse at 16% 74%,rgba(0,0,0,0.11) 0%,transparent 34%),radial-gradient(ellipse at 52% 52%,rgba(0,0,0,0.06) 0%,transparent 55%),#d6cba8`,borderRadius:"44% 36% 48% 34%/40% 46% 36% 46%",boxShadow:"inset -4px -5px 12px rgba(0,0,0,0.22),inset 3px 4px 9px rgba(255,255,255,0.38),inset 1px -2px 6px rgba(0,0,0,0.1),0 8px 28px rgba(0,0,0,0.22),0 3px 8px rgba(0,0,0,0.12)",animation:"noteBounce 2.6s ease-in-out infinite",position:"relative"}}/>
              <div style={{position:"absolute",top:-1,right:1,width:14,height:14,borderRadius:7,background:t.acc,border:"2.5px solid #fff",boxShadow:`0 2px 6px ${t.acc}80`,zIndex:2}}/>
            </div>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:3}}>From {NAMES[unreadNote.from]} {noteEmoji(unreadNote.from)}</div>
              <div style={{fontSize:10,color:t.sub}}>Tap to unfold · {fmtD(unreadNote.date)}</div>
            </div>
            <span style={{fontSize:18,color:t.acc,opacity:.7}}>›</span>
          </button>}
          {canWriteToday
            ?<button onClick={()=>setNoteModal("write")} style={{...b0,display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:10,border:`1px dashed ${t.bd}`}}>
              <span style={{fontSize:15,opacity:.6}}>✏️</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:600,color:t.acc}}>Write to {NAMES[OTHER(user)]}</div>
                <div style={{fontSize:10,color:t.sub}}>One note per day</div>
              </div>
            </button>
            :sentToday&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 2px",opacity:.45}}>
              <span style={{fontSize:13}}>✉️</span>
              <span style={{fontSize:11,color:t.sub}}>Note sent to {NAMES[OTHER(user)]} today</span>
            </div>}
        </div>

        {/* Fitness glance */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <button onClick={()=>{changeTab("fitness");setFitTab("tennis");}} style={{...b0,...cd,padding:14,textAlign:"left"}}>
            <Head>TENNIS</Head>
            <div style={{fontSize:20,fontWeight:700,fontFamily:t.hf,color:t.acc}}>{tStats.wk} <span style={{fontSize:12,fontWeight:400,color:t.sub}}>this wk</span></div>
            <div style={{fontSize:10,color:t.sub,marginTop:2}}>{tStats.streak}w streak</div>
          </button>
          <button onClick={()=>{changeTab("fitness");setFitTab("running");}} style={{...b0,...cd,padding:14,textAlign:"left"}}>
            <Head>RACE DAY</Head>
            <div style={{fontSize:20,fontWeight:700,fontFamily:t.hf,color:t.acc}}>{rStats.dtr} <span style={{fontSize:12,fontWeight:400,color:t.sub}}>days</span></div>
            <div style={{fontSize:10,color:t.sub,marginTop:2}}>{rStats.wkm}km this wk</div>
          </button>
        </div>

        {/* Quick actions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <button onClick={()=>aiSend("Plan a perfect date night this weekend.","plandate")} style={{...cd,...b0,padding:12,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:t.acc}}>Plan Date</div></button>
          <button onClick={()=>{changeTab("more");setMoreView("ai");}} style={{...cd,...b0,padding:12,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:t.acc}}>Ask AI</div></button>
          <button onClick={()=>{changeTab("more");setMoreView("goals");}} style={{...cd,...b0,padding:12,textAlign:"center"}}><div style={{fontSize:11,fontWeight:600,color:t.acc}}>Goals</div></button>
        </div>
      </div>}

      {/* ═══ CALENDAR ═══ */}
      {tab==="calendar"&&<div style={{padding:"12px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <button onClick={()=>nav(-1)} style={{...b0,width:32,height:32,borderRadius:8,border:`1px solid ${t.bd}`,fontSize:14,color:t.sub,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{textAlign:"center"}}><div style={{fontFamily:t.hf,fontSize:20,fontWeight:500}}>{MO[cMonth]}</div><div style={{fontSize:10,color:t.mute}}>{cYear}</div></div>
          <button onClick={()=>nav(1)} style={{...b0,width:32,height:32,borderRadius:8,border:`1px solid ${t.bd}`,fontSize:14,color:t.sub,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>{DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:9,fontWeight:500,color:t.mute}}>{d}</div>)}</div>
        <div className="a" style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {md.map((day,i)=>{if(!day)return<div key={`e${i}`}/>;const k=dk(cYear,cMonth,day),isT=k===today,evs=am[k]||[];
            return<button key={i} onClick={()=>oAdd(k)} onTouchStart={()=>onDayDown(k)} onTouchEnd={onDayUp} onMouseDown={()=>onDayDown(k)} onMouseUp={onDayUp} onMouseLeave={onDayUp} style={{...b0,aspectRatio:"1",borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,background:isT?t.tBg:evs.length?t.soft:"transparent",color:isT?t.tTx:t.tx,border:isT?`2px solid ${t.acc}`:"none"}}>
              <span style={{fontSize:12,fontWeight:isT?700:evs.length?600:400}}>{day}</span>
              {evs.length>0&&<div style={{display:"flex",gap:2}}>{evs.slice(0,3).map((e,j)=><div key={j} style={{width:3,height:3,borderRadius:2,background:isT?"#fff":gc(gt(e)[0]).color}}/>)}</div>}
            </button>;})}
        </div>
        <div style={{marginTop:14}}>
          {(()=>{const mE=Object.entries(am).filter(([k])=>k.startsWith(`${cYear}-${String(cMonth+1).padStart(2,"0")}`)).sort((a,b)=>a[0].localeCompare(b[0]));
            if(!mE.length)return<Empty t={t} msg="No events this month — tap or hold a day to add."/>;
            return mE.map(([k,evs])=>evs.map((ev,j)=><button key={`${k}-${j}`} onClick={()=>oView(k,j)} style={{...b0,...cd,display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",marginBottom:3,padding:"10px 14px"}}>
              <div style={{minWidth:26,textAlign:"center"}}><div style={{fontSize:14,fontWeight:700,lineHeight:1}}>{new Date(k+"T00:00:00").getDate()}</div><div style={{fontSize:8,color:t.mute}}>{DAYS[(new Date(k+"T00:00:00").getDay()+6)%7]}</div></div>
              <div style={{width:3,height:22,borderRadius:2,background:gc(gt(ev)[0]).color}}/>
              <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:12}}>{ev.title}{ev.isRecurring?" ↻":""}</div><div style={{fontSize:10,color:t.sub}}>{gt(ev).map(x=>gc(x).label).join(" · ")}{ev.time?` · ${ev.time}`:""}</div></div>
              {ev.mood&&<span style={{fontSize:13}}>{ev.mood}</span>}
            </button>));})()}
        </div>
      </div>}

      {/* ═══ FITNESS ═══ */}
      {tab==="fitness"&&<div style={{padding:"12px 20px"}}>
        <div style={{display:"flex",gap:4,marginBottom:14}}>
          {[["tennis","Tennis"],["running","Half Marathon"]].map(([k,l])=>
            <button key={k} onClick={()=>setFitTab(k)} style={{...b0,flex:1,padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:fitTab===k?600:400,color:fitTab===k?t.acc:t.mute,background:fitTab===k?t.soft:"transparent"}}>{l}</button>)}
        </div>

        {fitTab==="tennis"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            {[{v:tStats.total,l:"Total"},{v:tStats.mo,l:"Month"},{v:`${tStats.streak}w`,l:"Streak"}].map((s,i)=>
              <div key={i} style={{...cd,padding:12,textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,fontFamily:t.hf,color:t.acc}}>{s.v}</div><div style={{fontSize:9,color:t.mute,marginTop:2}}>{s.l.toUpperCase()}</div></div>)}
          </div>
          {tStats.avg.length>0&&<div style={{...cd,marginBottom:12}}>
            <Head>SKILL RATINGS</Head>
            {tStats.avg.map(s=><div key={s.skill} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:500,width:80,color:s===tStats.weak?t.acc:t.tx}}>{s.skill}</span>
              <div style={{flex:1,height:8,borderRadius:4,background:t.bar,overflow:"hidden"}}><div style={{height:"100%",borderRadius:4,background:s.avg<3?"#d07a7a":s.avg<4?t.acc2:"#3aaf6a",width:`${(s.avg/5)*100}%`,transition:"width .4s"}}/></div>
              <span style={{fontSize:12,fontWeight:600,color:s.avg<3?"#d07a7a":s.avg<4?t.acc:"#3aaf6a",width:28,textAlign:"right"}}>{s.avg}</span>
            </div>)}
            {tStats.weak&&<p style={{fontSize:11,color:t.sub,marginTop:6,borderTop:`1px solid ${t.bd}`,paddingTop:8}}>Focus on <strong style={{color:t.acc}}>{tStats.weak.skill}</strong> ({tStats.weak.avg}/5)</p>}
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Head>SESSIONS</Head>
            <button onClick={()=>{setShowTF(!showTF);if(!showTF)setTf(f=>({...f,date:today}));}} style={{...b0,padding:"5px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>{showTF?"Cancel":"+ Log"}</button>
          </div>
          {showTF&&<div style={{...cd,marginBottom:12,border:`1px solid ${t.acc}22`}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Date</Lb><input type="date" value={tf.date} onChange={e=>setTf(f=>({...f,date:e.target.value}))}/></div><div style={{flex:1}}><Lb>Duration</Lb><input value={tf.duration} onChange={e=>setTf(f=>({...f,duration:e.target.value}))} placeholder="1 hour"/></div></div>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Playing with</Lb><input value={tf.partner} onChange={e=>setTf(f=>({...f,partner:e.target.value}))} placeholder={user==="P"?"Blanka, coach...":"Patrick, coach..."}/></div><div style={{flex:1}}><Lb>Court</Lb><input value={tf.location} onChange={e=>setTf(f=>({...f,location:e.target.value}))} placeholder="Location"/></div></div>
            <div style={{marginBottom:6}}><Lb>Drills</Lb><input value={tf.drills} onChange={e=>setTf(f=>({...f,drills:e.target.value}))} placeholder="Serve practice, rallies..."/></div>
            <div style={{marginBottom:6}}><Lb>Rate Skills</Lb>
              {TSKILLS.map(sk=><div key={sk} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <span style={{fontSize:11,width:80,fontWeight:500}}>{sk}</span>
                <div style={{flex:1,display:"flex",gap:3}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setTf(f=>({...f,skills:{...f.skills,[sk]:n}}))} style={{...b0,flex:1,height:28,borderRadius:6,background:((tf.skills||{})[sk]||0)>=n?(n<=2?"#d07a7a":n<=3?t.acc2:"#3aaf6a"):t.bar,color:((tf.skills||{})[sk]||0)>=n?"#fff":"transparent",fontSize:11,fontWeight:600,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}>{((tf.skills||{})[sk]||0)>=n?n:""}</button>)}</div>
              </div>)}
            </div>
            <div style={{marginBottom:6}}><Lb>Mood</Lb><div style={{display:"flex",gap:8}}>{MOODS.map(m=><button key={m.e} onClick={()=>setTf(f=>({...f,mood:f.mood===m.e?"":m.e}))} style={{...b0,fontSize:20,padding:"4px 6px",borderRadius:8,background:tf.mood===m.e?t.soft:"transparent",border:tf.mood===m.e?`1px solid ${t.acc}`:"1px solid transparent"}}>{m.e}</button>)}</div></div>
            <div style={{marginBottom:8}}><Lb>Notes</Lb><input value={tf.notes} onChange={e=>setTf(f=>({...f,notes:e.target.value}))} placeholder="What went well? What to improve?"/></div>
            <Btn primary onClick={saveTennis}>Save Session</Btn>
          </div>}
          {tSessions.length===0&&!showTF&&<Empty t={t} icon="🎾" msg="Log your first session to start tracking."/>}
          {tSessions.slice().reverse().slice(0,10).map(s=><SwipeRow key={s.id} onDelete={()=>rm(tSessions,setTSessions,tennisRef,s.id)} t={t}>
            <div style={{padding:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontWeight:600,fontSize:12}}>{fmtD(s.date)}</div><div style={{fontSize:10,color:t.sub}}>{s.duration}{s.partner?` · ${s.partner}`:""}</div></div>
                {s.mood&&<span style={{fontSize:14}}>{s.mood}</span>}</div>
              {s.drills&&<p style={{fontSize:10,color:t.sub,marginTop:3}}>{s.drills}</p>}
              {s.notes&&<p style={{fontSize:10,color:t.sub,marginTop:2,fontStyle:"italic"}}>{s.notes}</p>}
            </div>
          </SwipeRow>)}
        </>}

        {fitTab==="running"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[{v:rStats.dtr,l:"Days to Race"},{v:`${rStats.wkm}km`,l:"This Week"},{v:`${rStats.tkm}km`,l:"Total"},{v:`${rStats.lr}km`,l:"Longest"}].map((s,i)=>
              <div key={i} style={{...cd,padding:12,textAlign:"center"}}><div style={{fontSize:22,fontWeight:700,fontFamily:t.hf,color:t.acc}}>{s.v}</div><div style={{fontSize:9,color:t.mute,marginTop:2}}>{s.l.toUpperCase()}</div></div>)}
          </div>
          <div style={{...cd,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><Head>TRAINING PLAN</Head><Pill>Week {rStats.cpw}/16</Pill></div>
            <div style={{height:6,borderRadius:3,background:t.bar,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",borderRadius:3,background:t.acc,width:`${(rStats.cpw/16)*100}%`}}/></div>
            {HM.map(w=>{const cur=w.w===rStats.cpw,past=w.w<rStats.cpw;
              return<div key={w.w} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${t.bd}`,opacity:past?.5:1}}>
                <div style={{width:26,height:26,borderRadius:7,background:cur?t.acc:past?"#3aaf6a":t.soft,color:cur||past?"#fff":t.tx,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0}}>{past?"✓":w.w}</div>
                <div style={{flex:1}}><div style={{fontWeight:cur?600:400,fontSize:12}}>{w.d}{cur?" — current":""}</div><div style={{fontSize:10,color:t.sub}}>Easy {w.e} · Tempo {w.te} · Long {w.lo} = {w.t}km</div></div>
              </div>;})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Head>RUNS</Head>
            <button onClick={()=>{setShowRF(!showRF);if(!showRF)setRf(f=>({...f,date:today}));}} style={{...b0,padding:"5px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>{showRF?"Cancel":"+ Log"}</button>
          </div>
          {showRF&&<div style={{...cd,marginBottom:12,border:`1px solid ${t.acc}22`}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Date</Lb><input type="date" value={rf.date} onChange={e=>setRf(f=>({...f,date:e.target.value}))}/></div><div style={{flex:1}}><Lb>Distance (km)</Lb><input type="number" step="0.1" value={rf.distance} onChange={e=>setRf(f=>({...f,distance:e.target.value}))} placeholder="5.0"/></div></div>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Time (min)</Lb><input type="number" value={rf.time} onChange={e=>setRf(f=>({...f,time:e.target.value}))} placeholder="30"/></div><div style={{flex:1}}><Lb>Type</Lb><select value={rf.type} onChange={e=>setRf(f=>({...f,type:e.target.value}))}>{["Easy","Tempo","Long Run","Interval","Recovery","Race"].map(x=><option key={x}>{x}</option>)}</select></div></div>
            {rf.distance&&rf.time&&<p style={{fontSize:11,color:t.acc,fontWeight:600,marginBottom:6}}>Pace: {pace(rf.distance,rf.time)}</p>}
            <div style={{marginBottom:6}}><Lb>Feel</Lb><div style={{display:"flex",gap:8}}>{MOODS.map(m=><button key={m.e} onClick={()=>setRf(f=>({...f,feel:f.feel===m.e?"":m.e}))} style={{...b0,fontSize:20,padding:"4px 6px",borderRadius:8,background:rf.feel===m.e?t.soft:"transparent",border:rf.feel===m.e?`1px solid ${t.acc}`:"1px solid transparent"}}>{m.e}</button>)}</div></div>
            <div style={{marginBottom:8}}><Lb>Notes</Lb><input value={rf.notes} onChange={e=>setRf(f=>({...f,notes:e.target.value}))} placeholder="Route, conditions..."/></div>
            <Btn primary onClick={saveRun}>Save Run</Btn>
          </div>}
          {runs.length===0&&!showRF&&<Empty t={t} icon="🏃" msg="Log your first run to start tracking."/>}
          {runs.slice().reverse().slice(0,10).map(r=><SwipeRow key={r.id} onDelete={()=>rm(runs,setRuns,runningRef,r.id)} t={t}>
            <div style={{padding:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:4,height:28,borderRadius:2,background:r.type==="Long Run"?"#d4447a":r.type==="Tempo"?"#d4952a":r.type==="Interval"?"#7a5cd6":"#3aaf6a",flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{r.distance}km · {r.type}{r.pace?` · ${r.pace}`:""}</div><div style={{fontSize:10,color:t.sub}}>{fmtD(r.date)}{r.time?` · ${r.time}min`:""}</div>
                {r.notes&&<div style={{fontSize:10,color:t.sub,marginTop:1,fontStyle:"italic"}}>{r.notes}</div>}</div>
              {r.feel&&<span style={{fontSize:14}}>{r.feel}</span>}
            </div>
          </SwipeRow>)}
        </>}
      </div>}

      {/* ═══ DISCOVER ═══ */}
      {tab==="discover"&&<div style={{padding:"12px 20px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div><Head>DISCOVER</Head><h2 style={{fontFamily:t.hf,fontSize:20,fontWeight:500}}>What's On</h2>
            {discAt&&<p style={{fontSize:10,color:t.sub,marginTop:2}}>Updated {fmtD(discAt.split("T")[0])}</p>}</div>
          <button onClick={()=>{setRefreshing(true);fetch("/api/update-events").then(()=>toast.show("Refreshed ✓")).finally(()=>setRefreshing(false));}} style={{...b0,padding:"6px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>
            <span style={{display:"inline-block",animation:refreshing?"sp 1s linear infinite":"none"}}>↻</span> Refresh</button>
        </div>
        <div className="hs" style={{display:"flex",gap:4,overflowX:"auto",marginBottom:12}}>
          {[{id:"all",l:"All"},{id:"saved",l:"Saved"},{id:"dining",l:"Dining"},{id:"nightout",l:"Music"},{id:"culture",l:"Culture"},{id:"fitness",l:"Wellness"},{id:"sport",l:"Sport"},{id:"work",l:"Networking"}].map(f=>
            <button key={f.id} onClick={()=>setDiscFilter(f.id)} style={{...b0,padding:"6px 12px",borderRadius:8,border:`1px solid ${discFilter===f.id?t.acc:t.bd}`,background:discFilter===f.id?t.acc:"transparent",color:discFilter===f.id?"#fff":t.tx,fontSize:10,fontWeight:500}}>{f.l}</button>)}
        </div>
        {refreshing?<Skel t={t}/>
        :AD.length===0?<div style={{...cd,textAlign:"center",padding:30}}>
          <p style={{fontSize:13,fontWeight:600,marginBottom:6}}>No events loaded yet</p>
          <p style={{fontSize:11,color:t.sub,lineHeight:1.5,marginBottom:14}}>Tap Refresh to fetch this week's events, tailored to your taste.</p>
          <button onClick={()=>{setRefreshing(true);fetch("/api/update-events").then(()=>toast.show("Refreshed ✓")).finally(()=>setRefreshing(false));}} style={{...b0,padding:"10px 20px",borderRadius:10,background:t.acc,color:"#fff",fontSize:12,fontWeight:600}}>Refresh Now</button>
        </div>
        :fDisc.length===0?<Empty t={t} msg="No events match this filter."/>
        :fDisc.map(ev=><div key={ev.id} style={{...cd,marginBottom:7}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <div><div style={{fontWeight:600,fontSize:13}}>{ev.title}</div><div style={{fontSize:10,color:t.sub,marginTop:1}}>{ev.venue} · {ev.area}</div></div>
            <button onClick={()=>tSave(ev.id)} style={{...b0,fontSize:14,opacity:saved.includes(ev.id)?1:.2}}>♥</button>
          </div>
          <p style={{fontSize:11,color:t.sub,lineHeight:1.5,marginBottom:6}}>{ev.desc}</p>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><Pill>{ev.tag}</Pill><Pill s={{background:"transparent",color:t.mute,border:`1px solid ${t.bd}`}}>{ev.date}</Pill>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(ev.title+" London")}`} target="_blank" rel="noopener noreferrer" style={{marginLeft:"auto",fontSize:10,color:t.acc,textDecoration:"none"}}>Search ↗</a>
          </div>
        </div>)}
      </div>}

      {/* ═══ MORE ═══ */}
      {tab==="more"&&<div style={{padding:"12px 20px"}}>
        {!moreView&&<><Head>MORE</Head><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["ai","AI Concierge","Restaurants, plans, London tips"],["insights","Insights","Stats, moods, people"],["notes","Daily Notes",unreadNote?"New note waiting ✉️":"Notes to each other"],["rankings","Rankings","Restaurant leaderboard"],["goals","Goals","Couple goals tracker"],["dates","Dates","Birthdays & anniversaries"],["wishlist","Wishlist","Places to try"],["wrap","Monthly Wrap","AI month summary"],["map","Map","Places visited"],["gallery","Gallery","Event photos"],["guest","Guest Mode","Visitor itinerary"]].map(([k,l,d])=>
            <button key={k} onClick={()=>setMoreView(k)} style={{...b0,...cd,padding:14,textAlign:"left"}}>
              <div style={{fontWeight:600,fontSize:12,color:t.tx}}>{l}</div>
              <div style={{fontSize:10,color:t.sub,marginTop:2,lineHeight:1.4}}>{d}</div>
            </button>)}</div>
          <div style={{marginTop:12,...cd,display:"flex",alignItems:"center",justifyContent:"space-between",padding:14}}>
            <div><div style={{fontWeight:600,fontSize:12}}>Logged in as {NAMES[user]}</div><div style={{fontSize:10,color:t.sub}}>Tap to switch profile</div></div>
            <button onClick={()=>{const next=OTHER(user);setUser(next);localStorage.setItem("v5user",next);toast.show(`Switched to ${NAMES[next]}`);}} style={{...b0,padding:"8px 16px",borderRadius:8,background:t.acc,color:"#fff",fontSize:11,fontWeight:600}}>Switch to {NAMES[OTHER(user)]}</button>
          </div></>}

        {moreView==="ai"&&<><Back onClick={()=>setMoreView(null)}/>
          <div className="hs" style={{display:"flex",gap:6,marginBottom:10,overflowX:"auto"}}>
            {[["Plan Date","plandate"],["Guest Plan","guestplan"],["Restaurants","chat"]].map(([l,m])=>
              <button key={l} onClick={()=>m==="plandate"?aiSend("Plan a date night this weekend.","plandate"):m==="guestplan"?aiSend("Plan a 3-day London itinerary for guests.","guestplan"):aiSend("Best new restaurants in London?","chat")} style={{...b0,...cd,padding:"8px 14px",whiteSpace:"nowrap",fontSize:11,fontWeight:600,color:t.acc}}>{l}</button>)}
          </div>
          <div style={{minHeight:260,maxHeight:"48vh",overflowY:"auto",marginBottom:10}}>
            {chat.length===0&&<Empty t={t} msg="Ask about restaurants, date ideas, events, guest itineraries..."/>}
            {chat.map((m,i)=><div key={i} style={{marginBottom:8,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
              <div style={{maxWidth:"85%",padding:"10px 14px",borderRadius:12,background:m.role==="user"?t.acc:t.card,color:m.role==="user"?"#fff":t.tx,fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap",boxShadow:m.role==="user"?"none":t.sh}}>{m.text}</div>
            </div>)}
            {chatBusy&&<div style={{...cd,fontSize:12,color:t.mute,display:"inline-block",padding:"8px 14px"}}>Thinking...</div>}
          </div>
          <div style={{display:"flex",gap:6}}><input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();aiSend(chatIn);}}} placeholder="Ask anything..." style={{flex:1}}/><button onClick={()=>aiSend(chatIn)} style={{...b0,padding:"10px 16px",borderRadius:10,background:t.acc,color:"#fff",fontWeight:700,fontSize:13}}>→</button></div>
        </>}

        {moreView==="insights"&&<><Back onClick={()=>setMoreView(null)}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[{v:an.total,l:"Events"},{v:an.wOut,l:"This Week"},{v:an.topP.length,l:"People"},{v:an.ranked.length,l:"Rated"}].map((s,i)=>
              <div key={i} style={{...cd,padding:12}}><div style={{fontSize:22,fontWeight:700,fontFamily:t.hf,color:t.acc}}>{s.v}</div><div style={{fontSize:9,color:t.mute,marginTop:2}}>{s.l.toUpperCase()}</div></div>)}
          </div>
          {Object.keys(an.moods).length>0&&<div style={{...cd,marginBottom:10}}><Head>MOODS</Head><div style={{display:"flex",gap:14}}>{Object.entries(an.moods).sort((a,b)=>b[1]-a[1]).map(([m,c])=><div key={m} style={{textAlign:"center"}}><div style={{fontSize:20}}>{m}</div><div style={{fontSize:12,fontWeight:700,color:t.acc}}>{c}</div></div>)}</div></div>}
          {an.topC.length>0&&<div style={{...cd,marginBottom:10}}><Head>ACTIVITIES</Head>{an.topC.slice(0,6).map(([id,cnt])=>{const c=gc(id);return<div key={id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:3,height:14,borderRadius:2,background:c.color}}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11}}>{c.label}</span><span style={{fontSize:10,color:t.mute}}>{cnt}</span></div><div style={{height:3,borderRadius:2,background:t.bar,overflow:"hidden",marginTop:2}}><div style={{height:"100%",borderRadius:2,background:c.color,width:`${(cnt/an.mxC)*100}%`}}/></div></div></div>;})}</div>}
          {an.topP.length>0&&<div style={{...cd}}><Head>PEOPLE</Head>{an.topP.slice(0,6).map(([n,c])=><div key={n} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:20,height:20,borderRadius:5,background:t.soft,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:t.acc}}>{n[0].toUpperCase()}</div><span style={{fontSize:11,flex:1}}>{n}</span><span style={{fontSize:10,color:t.mute}}>{c}×</span></div>)}</div>}
        </>}

        {moreView==="rankings"&&<><Back onClick={()=>setMoreView(null)}/><Head>RANKINGS</Head>
          {an.ranked.length===0?<Empty t={t} icon="🏆" msg="Rate dining events to build rankings."/>
          :an.ranked.map((ev,i)=><div key={i} style={{...cd,marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:26,height:26,borderRadius:7,background:t.acc,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{ev.displayName}</div><div style={{fontSize:10,color:t.acc,marginTop:1}}>{st(ev.rating)}</div></div>
              {ev.images?.[0]&&<img src={ev.images[0]} style={{width:36,height:36,borderRadius:7,objectFit:"cover"}}/>}</div>
            <div style={{display:"flex",gap:4,marginTop:5}}>{ev.foodType&&<Pill>{ev.foodType}</Pill>}{ev.priceRange&&<Pill s={{background:"transparent",color:t.mute,border:`1px solid ${t.bd}`}}>{ev.priceRange}</Pill>}</div>
            {ev.bestDish&&<p style={{marginTop:3,fontSize:10,color:t.sub}}>Best: {ev.bestDish}</p>}
          </div>)}</>}

        {moreView==="goals"&&<><Back onClick={()=>setMoreView(null)}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Head>GOALS</Head><button onClick={()=>setShowForm(showForm==="goal"?null:"goal")} style={{...b0,padding:"5px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>{showForm==="goal"?"Cancel":"+ Add"}</button></div>
          {showForm==="goal"&&<div style={{...cd,marginBottom:10,border:`1px solid ${t.acc}22`}}>
            <div style={{marginBottom:6}}><Lb>Goal</Lb><input value={gf.text} onChange={e=>setGf(f=>({...f,text:e.target.value}))} placeholder="Try 5 new restaurants"/></div>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Target</Lb><input type="number" value={gf.target} onChange={e=>setGf(f=>({...f,target:+e.target.value||1}))} min={1}/></div>
              <div style={{flex:1}}><Lb>Icon</Lb><div style={{display:"flex",gap:3}}>{["🎯","🍽️","🏋️","💕","🌍","💰","🎾","🏃"].map(e=><button key={e} onClick={()=>setGf(f=>({...f,emoji:e}))} style={{...b0,fontSize:16,padding:2,borderRadius:4,background:gf.emoji===e?t.soft:"transparent"}}>{e}</button>)}</div></div></div>
            <Btn primary onClick={addGoal}>Add Goal</Btn>
          </div>}
          {goals.length===0&&showForm!=="goal"&&<Empty t={t} icon="🎯" msg="Set goals together."/>}
          {goals.map(g=><div key={g.id} style={{...cd,marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:16}}>{g.emoji}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{g.text}</div><div style={{fontSize:10,color:t.mute}}>{g.current||0} / {g.target}</div></div>
              <button onClick={()=>rm(goals,setGoals,goalsRef,g.id)} style={{...b0,color:t.mute,opacity:.3,fontSize:10}}>✕</button></div>
            <div style={{height:6,borderRadius:3,background:t.bar,overflow:"hidden",marginBottom:5}}><div style={{height:"100%",borderRadius:3,background:(g.current||0)>=g.target?"#3aaf6a":t.acc,width:`${Math.min(100,((g.current||0)/g.target)*100)}%`,transition:"width .4s"}}/></div>
            <div style={{display:"flex",gap:6}}><button onClick={()=>updGoal(g.id,-1)} style={{...b0,flex:1,padding:7,borderRadius:7,border:`1px solid ${t.bd}`,fontSize:12,fontWeight:600}}>−</button><button onClick={()=>updGoal(g.id,1)} style={{...b0,flex:1,padding:7,borderRadius:7,background:t.acc,color:"#fff",fontSize:12,fontWeight:600}}>+</button></div>
            {(g.current||0)>=g.target&&<p style={{textAlign:"center",marginTop:5,fontSize:11,color:"#3aaf6a",fontWeight:600}}>Achieved ✓</p>}
          </div>)}
        </>}

        {moreView==="dates"&&<><Back onClick={()=>setMoreView(null)}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Head>DATES</Head><button onClick={()=>setShowForm(showForm==="bday"?null:"bday")} style={{...b0,padding:"5px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>{showForm==="bday"?"Cancel":"+ Add"}</button></div>
          {showForm==="bday"&&<div style={{...cd,marginBottom:10,border:`1px solid ${t.acc}22`}}>
            <div style={{marginBottom:6}}><Lb>Name</Lb><input value={bf.name} onChange={e=>setBf(f=>({...f,name:e.target.value}))} placeholder="Mum, Anniversary..." autoFocus/></div>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Day</Lb><input type="number" value={bf.day} onChange={e=>setBf(f=>({...f,day:+e.target.value||1}))} min={1} max={31}/></div>
              <div style={{flex:1}}><Lb>Month</Lb><select value={bf.month} onChange={e=>setBf(f=>({...f,month:+e.target.value}))}>{MO.map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select></div>
              <div style={{flex:1}}><Lb>Type</Lb><select value={bf.type} onChange={e=>setBf(f=>({...f,type:e.target.value}))}>{["Birthday","Anniversary","Other"].map(x=><option key={x}>{x}</option>)}</select></div></div>
            <Btn primary onClick={addBday}>Add</Btn>
          </div>}
          {bdays.length===0&&showForm!=="bday"&&<Empty t={t} icon="🎂" msg="Track important dates."/>}
          {bdCd.map(b=><SwipeRow key={b.id} onDelete={()=>rm(bdays,setBdays,birthdaysRef,b.id)} t={t}>
            <div style={{padding:12,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,borderRadius:8,background:b.days<=7?t.acc:t.soft,color:b.days<=7?"#fff":t.tx,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,lineHeight:1}}>{b.days}</span><span style={{fontSize:6}}>days</span></div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{b.name}</div><div style={{fontSize:10,color:t.sub}}>{b.day} {MO[b.month-1]} · {b.type}</div></div>
            </div>
          </SwipeRow>)}
        </>}

        {moreView==="wishlist"&&<><Back onClick={()=>setMoreView(null)}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><Head>WISHLIST</Head><button onClick={()=>setShowForm(showForm==="wish"?null:"wish")} style={{...b0,padding:"5px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>{showForm==="wish"?"Cancel":"+ Add"}</button></div>
          {showForm==="wish"&&<div style={{...cd,marginBottom:10,border:`1px solid ${t.acc}22`}}>
            <div style={{marginBottom:6}}><Lb>Place</Lb><input value={wf.name} onChange={e=>setWf(f=>({...f,name:e.target.value}))} placeholder="Name" autoFocus/></div>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Type</Lb><select value={wf.type} onChange={e=>setWf(f=>({...f,type:e.target.value}))}><option value="">Select</option>{["Restaurant","Bar","Jazz Club","Event","Experience","Other"].map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}}><Lb>Area</Lb><input value={wf.area} onChange={e=>setWf(f=>({...f,area:e.target.value}))} placeholder="Area"/></div></div>
            <div style={{marginBottom:6}}><Lb>Link</Lb><input value={wf.link} onChange={e=>setWf(f=>({...f,link:e.target.value}))} placeholder="https://..." type="url"/></div>
            <Btn primary onClick={addWish}>Add</Btn>
          </div>}
          {wishlist.length===0&&showForm!=="wish"&&<Empty t={t} icon="📝" msg="Build your bucket list."/>}
          {wishlist.map(w=><SwipeRow key={w.id} onDelete={()=>rm(wishlist,setWishlist,wishlistRef,w.id)} t={t}>
            <div style={{padding:12,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:18,borderRadius:2,background:t.acc,flexShrink:0}}/>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>{w.name}</div><div style={{fontSize:10,color:t.sub}}>{[w.type,w.area].filter(Boolean).join(" · ")}</div>
                <a href={w.link||`https://www.google.com/search?q=${encodeURIComponent(w.name+" London")}`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:t.acc,textDecoration:"none"}}>{w.link?"Open ↗":"Search ↗"}</a></div>
            </div>
          </SwipeRow>)}
        </>}

        {moreView==="notes"&&<><Back onClick={()=>setMoreView(null)}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div><Head>DAILY NOTES</Head><p style={{fontSize:14,fontWeight:600}}>Notes between you two</p></div>
            {canWriteToday&&<button onClick={()=>setNoteModal("write")} style={{...b0,padding:"6px 14px",borderRadius:8,background:t.acc,color:"#fff",fontSize:11,fontWeight:600}}>Write</button>}
          </div>
          {pastNotes.length===0&&<Empty t={t} icon="✉️" msg="Write a note for each other — one a day. They appear as little crumpled paper balls."/>}
          {pastNotes.map(n=>{const isMine=n.from===user;return<div key={n.id} style={{...cd,marginBottom:8,padding:14,borderLeft:`3px solid ${isMine?t.acc:"#888"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:9,fontWeight:600,letterSpacing:".06em",color:isMine?t.acc:t.sub}}>{isMine?`TO ${NAMES[n.to].toUpperCase()}`:`FROM ${NAMES[n.from].toUpperCase()}`}</span>
              <span style={{fontSize:9,color:t.mute}}>{fmtD(n.date)}</span>
            </div>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontStyle:"italic",lineHeight:1.75,color:t.tx}}>{n.text}</p>
            <div style={{marginTop:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12}}>{noteEmoji(n.from)}</span>
              {!isMine&&!n.openedAt&&<button onClick={()=>openNote(n)} style={{...b0,fontSize:10,color:t.acc,fontWeight:500}}>Unfold ›</button>}
            </div>
          </div>;})}
        </>}

        {moreView==="wrap"&&<><Back onClick={()=>setMoreView(null)}/>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div><Head>MONTHLY WRAP</Head><p style={{fontSize:14,fontWeight:600}}>{MO[now.getMonth()]}</p></div>
            <button onClick={genWrap} disabled={wrapBusy} style={{...b0,padding:"6px 12px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:10,color:t.acc}}>{wrapBusy?"...":"Generate"}</button>
          </div>
          {wrap?<div style={{...cd,whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7}}>{wrap}</div>:<Empty t={t} msg="Tap Generate for your AI summary."/>}
        </>}

        {moreView==="map"&&<><Back onClick={()=>setMoreView(null)}/><Head>PLACES VISITED</Head><MapView events={events} t={t}/></>}
        {moreView==="gallery"&&<><Back onClick={()=>setMoreView(null)}/><Head>GALLERY</Head>{an.imgs.length===0?<Empty t={t} icon="📸" msg="Add photos to events."/>
          :<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3}}>{an.imgs.map((x,i)=><div key={i} style={{position:"relative",borderRadius:8,overflow:"hidden",aspectRatio:"1"}}><img src={x.img} style={{width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 4px 2px",background:"linear-gradient(transparent,rgba(0,0,0,.4))",color:"#fff",fontSize:8}}>{x.title}</div></div>)}</div>}</>}

        {moreView==="guest"&&<><Back onClick={()=>setMoreView(null)}/><Head>GUEST ITINERARY</Head>
          <p style={{fontSize:12,color:t.sub,marginBottom:14}}>AI plans a London itinerary for visitors.</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {["Weekend","3 days","1 week","Foodie trip","Culture-focused"].map(o=>
              <button key={o} onClick={()=>aiSend(`Plan a ${o} London itinerary for guests.`,"guestplan")} style={{...b0,...cd,padding:"10px 14px",fontSize:11,fontWeight:600,color:t.acc}}>{o}</button>)}</div>
          {chatBusy&&<Skel t={t} n={2}/>}
          {!chatBusy&&chat.filter(m=>m.role==="assistant").slice(-1).map((m,i)=><div key={i} style={{...cd,whiteSpace:"pre-wrap",fontSize:12,lineHeight:1.6}}>{m.text}</div>)}
        </>}
      </div>}

      </div>{/* end tab content wrapper */}

      {/* ═══ VIEW MODAL ═══ */}
      {modal==="view"&&viewEv&&<div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:t.ov,backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999,animation:"in .2s"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",background:t.bg,borderRadius:"20px 20px 0 0",animation:"si .3s",boxShadow:"0 -4px 40px rgba(0,0,0,.06)"}}>
          {/* Photo header — bleed edge */}
          {viewEv.images?.length>0&&<div style={{position:"relative",height:200,overflow:"hidden",borderRadius:"20px 20px 0 0"}}>
            <img src={viewEv.images[0]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 40%,rgba(0,0,0,0.4))"}}/>
            {viewEv.images.length>1&&<div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.5)",color:"#fff",padding:"3px 8px",borderRadius:10,fontSize:10}}>+{viewEv.images.length-1} more</div>}
          </div>}
          <div style={{padding:"16px 20px 28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <h2 style={{fontFamily:t.hf,fontSize:22,fontWeight:500,flex:1}}>{viewEv.title}</h2>
              {viewEv.mood&&<span style={{fontSize:18}}>{viewEv.mood}</span>}
            </div>
            {viewEv.rating>0&&<div style={{fontSize:12,color:t.acc,marginBottom:4}}>{st(viewEv.rating)}</div>}
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
              {gt(viewEv).map(x=><Pill key={x}>{gc(x).label}</Pill>)}
              {viewEv.recurrence&&viewEv.recurrence!=="None"&&<Pill s={{background:"transparent",color:t.mute,border:`1px solid ${t.bd}`}}>Repeats {viewEv.recurrence.toLowerCase()}</Pill>}
            </div>
            <div style={{fontSize:12,color:t.sub,lineHeight:1.8,marginBottom:12}}>
              {fmtL(viewEv.date)}{viewEv.time?` · ${viewEv.time}`:""}{viewEv.duration?` · ${viewEv.duration}`:""}
              {(()=>{const creator=viewEv.createdBy?NAMES[viewEv.createdBy]:"";const others=viewEv.people?viewEv.people:"";const allPeople=[creator,others].filter(Boolean).join(", ");return allPeople?<div>With {allPeople}</div>:null;})()}
              {viewEv.createdBy&&viewEv.createdBy!==user&&<div style={{fontSize:10,color:t.acc}}>Added by {NAMES[viewEv.createdBy]}</div>}
              {viewEv.address&&<div>{viewEv.address}</div>}
              {viewEv.foodType&&<div>{viewEv.restaurantName||viewEv.title} · {viewEv.foodType}{viewEv.priceRange?` · ${viewEv.priceRange}`:""}</div>}
              {viewEv.bestDish&&<div>Best dish: {viewEv.bestDish}</div>}
              {viewEv.notes&&<div style={{marginTop:4,fontStyle:"italic",opacity:.6}}>"{viewEv.notes}"</div>}
            </div>
            {/* Extra photos thumbnails */}
            {viewEv.images?.length>1&&<div className="hs" style={{display:"flex",gap:4,overflowX:"auto",marginBottom:12}}>{viewEv.images.slice(1).map((img,i)=><img key={i} src={img} style={{height:64,borderRadius:8,objectFit:"cover",flexShrink:0}}/>)}</div>}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
              {viewEv.link&&<a href={viewEv.link} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",borderRadius:8,background:t.acc,color:"#fff",fontSize:10,fontWeight:500,textDecoration:"none"}}>Open ↗</a>}
              {(()=>{const a=alink(viewEv);return<><a href={a.web} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",borderRadius:8,background:t.soft,color:t.acc,fontSize:10,fontWeight:500,textDecoration:"none"}}>Search ↗</a>
                {a.book&&<a href={a.book} target="_blank" rel="noopener noreferrer" style={{padding:"6px 12px",borderRadius:8,background:t.soft,color:t.acc,fontSize:10,fontWeight:500,textDecoration:"none"}}>OpenTable ↗</a>}</>;})()}
            </div>
            <div style={{display:"flex",gap:6}}>
              {!viewEv.isRecurring&&<button onClick={del} style={{...b0,padding:"12px 0",borderRadius:10,flex:1,border:confirmDel?"1.5px solid #c83c3c":"1px solid rgba(200,60,60,.15)",background:confirmDel?"rgba(200,60,60,.08)":"transparent",color:"#c83c3c",fontSize:13,fontWeight:600}}>{confirmDel?"Confirm Delete":"Delete"}</button>}
              <button onClick={oEdit} style={{...b0,padding:"12px 0",borderRadius:10,flex:2,background:t.acc,color:"#fff",fontSize:13,fontWeight:600}}>Edit</button>
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ NOTE READ MODAL ═══ */}
      {noteModal==="read"&&activeNote&&<div onClick={()=>{setNoteModal(null);setActiveNote(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(18px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,animation:"in .2s",padding:"0 22px"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:348,position:"relative",animation:"uncrumple 1.5s cubic-bezier(0.22,1,0.36,1) both",transformOrigin:"center center",willChange:"transform"}}>
          {/* Paper card */}
          <div style={{borderRadius:16,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,0.35),0 6px 24px rgba(0,0,0,0.18),inset 0 1px 0 rgba(255,255,255,0.7)"}}>
            {/* Header strip */}
            <div style={{background:"linear-gradient(160deg,#e8dcc4 0%,#dfd3b0 100%)",padding:"14px 20px 12px",borderBottom:"1px solid rgba(180,155,110,0.25)",display:"flex",justifyContent:"space-between",alignItems:"center",animation:"noteIn 1.5s ease both"}}>
              <div>
                <p style={{fontFamily:t.hf,fontSize:13,fontStyle:"italic",color:"#7a6a4a",letterSpacing:".02em",marginBottom:1}}>{fmtL(activeNote.date)}</p>
                <p style={{fontSize:10,color:"#a08c6a",fontWeight:500,letterSpacing:".03em"}}>from {NAMES[activeNote.from].toUpperCase()} → {NAMES[activeNote.to].toUpperCase()}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22,lineHeight:1}}>{noteEmoji(activeNote.from)}</span>
                <button onClick={()=>{setNoteModal(null);setActiveNote(null);}} style={{...b0,width:26,height:26,borderRadius:13,background:"rgba(0,0,0,0.08)",color:"#8a7a5a",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:300,lineHeight:1}}>×</button>
              </div>
            </div>
            {/* Paper body with lines */}
            <div style={{background:"linear-gradient(175deg,#fdf8ee 0%,#faf3e2 100%)",backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,rgba(130,148,200,0.16) 27px,rgba(130,148,200,0.16) 28.5px)",backgroundSize:"100% 28px",backgroundPosition:"0 18px",position:"relative",padding:"22px 26px 26px 54px",minHeight:180}}>
              {/* Red margin line */}
              <div style={{position:"absolute",left:44,top:0,bottom:0,width:1.5,background:"rgba(220,75,75,0.22)",pointerEvents:"none"}}/>
              {/* Horizontal fold crease */}
              <div style={{position:"absolute",left:0,right:0,top:"46%",height:1,background:"linear-gradient(90deg,transparent,rgba(160,140,100,0.2) 20%,rgba(160,140,100,0.2) 80%,transparent)",pointerEvents:"none"}}/>
              {/* Corner curl shadow */}
              <div style={{position:"absolute",bottom:0,right:0,width:32,height:32,background:"linear-gradient(225deg,rgba(160,140,100,0.22) 0%,transparent 55%)",borderRadius:"0 0 0 0",pointerEvents:"none"}}/>
              {/* Paper ambient texture */}
              <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 90% 5%,rgba(220,200,160,0.12) 0%,transparent 45%),radial-gradient(ellipse at 8% 92%,rgba(190,170,130,0.09) 0%,transparent 40%)",pointerEvents:"none"}}/>
              {/* Note text */}
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:21,lineHeight:1.85,color:"#28200e",fontStyle:"italic",animation:"noteIn 1.5s ease both",position:"relative",zIndex:1,marginBottom:22,wordBreak:"break-word"}}>{activeNote.text}</p>
              {/* Signature */}
              <div style={{textAlign:"right",animation:"noteIn 1.5s ease both",position:"relative",zIndex:1,borderTop:"1px solid rgba(160,140,100,0.15)",paddingTop:10}}>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontStyle:"italic",color:"#9a8a62",letterSpacing:".02em"}}>— {NAMES[activeNote.from]}</span>
              </div>
            </div>
            {/* Bottom edge shadow — simulates paper thickness */}
            <div style={{height:5,background:"linear-gradient(to bottom,rgba(150,130,90,0.12),rgba(150,130,90,0.24))"}}/>
          </div>
        </div>
      </div>}

      {/* ═══ NOTE WRITE MODAL ═══ */}
      {noteModal==="write"&&<div onClick={()=>{setNoteModal(null);setNoteText("");}} style={{position:"fixed",inset:0,background:t.ov,backdropFilter:"blur(18px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1001,animation:"in .2s"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,background:t.bg,borderRadius:"20px 20px 0 0",padding:"16px 20px 32px",animation:"si .3s",boxShadow:"0 -6px 48px rgba(0,0,0,.1)"}}>
          <div style={{width:28,height:3,borderRadius:2,background:t.mute,opacity:.3,margin:"0 auto 16px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:22}}>{noteEmoji(OTHER(user))}</span>
            <div>
              <h2 style={{fontFamily:t.hf,fontSize:20,fontWeight:500,fontStyle:"italic",lineHeight:1.1}}>For {NAMES[OTHER(user)]}</h2>
              <p style={{fontSize:10,color:t.mute,marginTop:2,letterSpacing:".03em"}}>{fmtD(today)} · one note per day</p>
            </div>
          </div>
          {/* Lined paper textarea */}
          <div style={{position:"relative",marginBottom:14,borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.6)"}}>
            <div style={{position:"absolute",left:42,top:0,bottom:0,width:1.5,background:"rgba(220,75,75,0.2)",pointerEvents:"none",zIndex:1}}/>
            <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Write something from the heart..." rows={6} maxLength={300} autoFocus style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontStyle:"italic",lineHeight:"28px",background:"linear-gradient(175deg,#fdf8ee,#faf3e2)",backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,rgba(130,148,200,0.15) 27px,rgba(130,148,200,0.15) 28.5px)",backgroundSize:"100% 28px",backgroundPosition:"0 18px",border:"none",borderRadius:12,padding:"16px 18px 16px 56px",color:"#28200e",resize:"none",width:"100%",outline:"none",display:"block"}}/>
            <span style={{position:"absolute",bottom:10,right:14,fontSize:9,color:"#b0a880",fontFamily:"'Plus Jakarta Sans'",zIndex:1}}>{noteText.length}/300</span>
          </div>
          <Btn primary onClick={sendNote} style={{opacity:noteText.trim()?1:0.42,transition:"opacity .2s"}}>Send Note ✉️</Btn>
        </div>
      </div>}

      {/* ═══ ADD/EDIT MODAL ═══ */}
      {(modal==="add"||modal==="edit")&&<div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:t.ov,backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999,animation:"in .2s"}}>
        <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto",background:t.bg,borderRadius:"20px 20px 0 0",padding:"16px 20px 28px",animation:"si .3s",boxShadow:"0 -4px 40px rgba(0,0,0,.06)"}}>
          <div style={{width:28,height:3,borderRadius:2,background:t.mute,opacity:.3,margin:"0 auto 12px"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{fontFamily:t.hf,fontSize:18,fontWeight:500}}>{modal==="edit"?"Edit":"New Event"}</h2>
            {selDate&&<Pill>{fmtD(selDate)}</Pill>}
          </div>
          <div style={{marginBottom:7}}><Lb>What's happening?</Lb><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Dinner at Moro, Tennis..." autoFocus/></div>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <div style={{flex:1}}><Lb>Time</Lb><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/></div>
            <div style={{flex:1}}><Lb>Duration</Lb><input value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))} placeholder="2 hours..."/>
              <div style={{display:"flex",gap:2,marginTop:3,flexWrap:"wrap"}}>{["1h","2h","Half day","Full day","Weekend","1 week","2 weeks"].map(d=><button key={d} onClick={()=>setForm(f=>({...f,duration:d}))} style={{...b0,padding:"2px 5px",borderRadius:4,border:`1px solid ${form.duration===d?t.acc:t.bd}`,fontSize:8,color:form.duration===d?t.acc:t.mute}}>{d}</button>)}</div></div>
          </div>
          <div style={{marginBottom:7}}><Lb>Tags</Lb><div style={{display:"flex",flexWrap:"wrap",gap:3}}>{CATS.map(c=><button key={c.id} onClick={()=>tTag(c.id)} style={{...b0,padding:"4px 8px",borderRadius:6,border:`1px solid ${form.tags.includes(c.id)?t.acc:t.bd}`,background:form.tags.includes(c.id)?t.acc:"transparent",color:form.tags.includes(c.id)?"#fff":t.tx,fontSize:10}}>{c.label}</button>)}</div></div>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <div style={{flex:1}}><Lb>Who else? <span style={{textTransform:"none",fontWeight:400,color:t.sub}}>(you're auto-included)</span></Lb><input value={form.people} onChange={e=>setForm(f=>({...f,people:e.target.value}))} placeholder={user==="P"?"Blanka, friends...":"Patrick, friends..."}/></div>
            <div style={{flex:1}}><Lb>Repeat</Lb><select value={form.recurrence} onChange={e=>setForm(f=>({...f,recurrence:e.target.value}))}>{REC.map(r=><option key={r}>{r}</option>)}</select></div>
          </div>
          <div style={{marginBottom:7}}><Lb>Mood</Lb><div style={{display:"flex",gap:8}}>{MOODS.map(m=><button key={m.e} onClick={()=>setForm(f=>({...f,mood:f.mood===m.e?"":m.e}))} style={{...b0,fontSize:20,padding:"4px 6px",borderRadius:8,background:form.mood===m.e?t.soft:"transparent",border:form.mood===m.e?`1px solid ${t.acc}`:"1px solid transparent"}}>{m.e}</button>)}</div></div>
          {form.tags.includes("dining")&&<div style={{background:t.soft,borderRadius:12,padding:12,marginBottom:7}}>
            <Lb>Restaurant Details</Lb>
            <div style={{marginBottom:6}}><input value={form.restaurantName} onChange={e=>setForm(f=>({...f,restaurantName:e.target.value}))} placeholder="Restaurant name"/></div>
            <div style={{marginBottom:6}}><Lb>Rating</Lb><div style={{display:"flex",gap:3}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setForm(f=>({...f,rating:f.rating===n?0:n}))} style={{...b0,fontSize:18,color:n<=form.rating?t.acc:t.mute}}>{n<=form.rating?"★":"☆"}</button>)}</div></div>
            <div style={{display:"flex",gap:6,marginBottom:6}}><div style={{flex:1}}><Lb>Cuisine</Lb><select value={form.foodType} onChange={e=>setForm(f=>({...f,foodType:e.target.value}))}><option value="">Select</option>{FOOD.map(f=><option key={f}>{f}</option>)}</select></div>
              <div style={{flex:1}}><Lb>Price</Lb><div style={{display:"flex",gap:2}}>{PRICE.map(p=><button key={p} onClick={()=>setForm(f=>({...f,priceRange:f.priceRange===p?"":p}))} style={{...b0,flex:1,padding:8,borderRadius:6,border:`1px solid ${form.priceRange===p?t.acc:t.bd}`,background:form.priceRange===p?t.acc:"transparent",color:form.priceRange===p?"#fff":t.tx,fontSize:11,fontWeight:600}}>{p}</button>)}</div></div></div>
            <input value={form.bestDish} onChange={e=>setForm(f=>({...f,bestDish:e.target.value}))} placeholder="Best dish?"/>
          </div>}
          <div style={{marginBottom:7}}><Lb>Link</Lb><input value={form.link} onChange={e=>setForm(f=>({...f,link:e.target.value}))} placeholder="https://..." type="url"/></div>
          <div style={{marginBottom:7}}><Lb>Location</Lb><div style={{display:"flex",gap:4}}><input value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} placeholder="Address" style={{flex:1}} onBlur={sAddr}/><button onClick={aLoc} style={{...b0,padding:"8px 10px",borderRadius:8,border:`1px solid ${t.bd}`,fontSize:12}}>📍</button></div>
            {form.lat&&<p style={{fontSize:9,color:t.mute,marginTop:2}}>✓ Location saved</p>}</div>
          <div style={{marginBottom:7}}><Lb>Photos</Lb><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {form.images.map((img,i)=><div key={i} style={{position:"relative",width:44,height:44,borderRadius:7,overflow:"hidden"}}><img src={img} style={{width:"100%",height:"100%",objectFit:"cover"}}/><button onClick={()=>setForm(f=>({...f,images:f.images.filter((_,j)=>j!==i)}))} style={{...b0,position:"absolute",top:1,right:1,width:14,height:14,borderRadius:7,background:"rgba(0,0,0,.5)",color:"#fff",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button></div>)}
            {form.images.length<6&&<label style={{width:44,height:44,borderRadius:7,border:`1.5px dashed ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,color:t.mute}}>+<input type="file" accept="image/*" multiple onChange={aImg} style={{display:"none"}}/></label>}
          </div></div>
          <div style={{marginBottom:12}}><Lb>Notes</Lb><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Booking ref..." rows={2}/></div>
          <div style={{display:"flex",gap:6}}>
            {modal==="edit"&&!viewEv?.isRecurring&&<button onClick={del} style={{...b0,padding:"12px 0",borderRadius:10,flex:1,border:confirmDel?"1.5px solid #c83c3c":"1px solid rgba(200,60,60,.15)",background:confirmDel?"rgba(200,60,60,.08)":"transparent",color:"#c83c3c",fontSize:13,fontWeight:600}}>{confirmDel?"Confirm":"Delete"}</button>}
            <Btn primary onClick={save} style={{flex:2}}>{modal==="edit"?"Save":"Add Event"}</Btn>
          </div>
        </div>
      </div>}
    </div>);
}
