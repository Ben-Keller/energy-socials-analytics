import {captionRows,median} from './report-math.js';

export function formatEvidence(posts,evidence){
 const media=new Map(Object.entries(evidence.media).flatMap(([kind,ids])=>ids.map(id=>[id,kind])));
 const camera=new Set(evidence.onCameraVideos),charts=new Set(evidence.chartPosts),cards=new Set(evidence.figureCardPosts);
 const formatOf=p=>camera.has(p.id)?'To-camera video':charts.has(p.id)?'Chart, map or table':cards.has(p.id)?'Headline-figure card':({video:'Other video',link:'Link preview',none:'Text only'})[media.get(p.id)]||'Photo or graphic';
 const rows=captionRows(posts),quarter=p=>p.year+' Q'+Math.ceil(Number(p.month.slice(-2))/3);
 const baselines=new Map([...new Set(rows.map(quarter))].map(q=>{
  const images=rows.filter(p=>formatOf(p)==='Photo or graphic'&&quarter(p)===q);
  return [q,{rx:median(images.map(p=>p.reactions)),cm:median(images.map(p=>p.comments))}];
 }));
 const groups=[...new Set(rows.map(formatOf))].map(name=>{
  const group=rows.filter(p=>formatOf(p)===name);
  const rxRows=group.filter(p=>Number.isFinite(p.reactions)&&baselines.get(quarter(p))?.rx>0);
  const cmRows=group.filter(p=>Number.isFinite(p.comments)&&Number.isFinite(baselines.get(quarter(p))?.cm));
  return {name,rows:group,rxRows,cmRows,index:median(rxRows.map(p=>100*p.reactions/baselines.get(quarter(p)).rx)),above:cmRows.length?cmRows.filter(p=>p.comments>baselines.get(quarter(p)).cm).length/cmRows.length:null,rx:median(rxRows.map(p=>p.reactions)),cm:median(cmRows.map(p=>p.comments))};
 }).sort((a,b)=>b.index-a.index);
 return {groups,formatOf};
}

export function cameraEvidence(posts,evidence){
 const identified=new Set(evidence.onCameraVideos);
 const camera=captionRows(posts).filter(p=>identified.has(p.id)&&Number.isFinite(p.reactions)).sort((a,b)=>a.date.localeCompare(b.date));
 if(!camera.length)return {camera:[],others:[],rows:[],start:null,end:null};
 const start=camera[0].month,end=camera.at(-1).month;
 const rows=captionRows(posts).filter(p=>p.month>=start&&p.month<=end&&Number.isFinite(p.reactions));
 return {camera,others:rows.filter(p=>!identified.has(p.id)),rows,start,end};
}
