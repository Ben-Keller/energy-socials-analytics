import {fittedAxis} from './axes.js';
const number=n=>n==null?'—':n.toLocaleString();
export function layout(posts,width,state){
 const q=state.query.toLowerCase();let rows=posts.filter(p=>(!state.kind||state.kind==='all'||state.kind==='original'&&p.original||state.kind==='repost'&&['repost','instant repost'].includes(p.type))&&(state.year==='all'||state.year==='recent'&&p.year>='2023'||state.year==='earlier'&&p.year<'2023'||p.year===state.year)&&(state.topic==='all'||p.topic===state.topic)&&(!q||`${p.title} ${p.searchText||p.caption||p.sharedText||''}`.toLowerCase().includes(q)));
 const missing=[],w=width,mobile=w<600,labels=[],positions=new Map();let h=0,axes=null;
 if(['response','words'].includes(state.mode)){
 const xkey=state.mode==='words'?'words':'reactions',ykey=state.mode==='words'?'reactions':'comments';const known=rows.filter(p=>typeof p[xkey]==='number'&&typeof p[ykey]==='number');missing.push(...rows.filter(p=>!known.includes(p)));const left=48,right=w-25,top=50,bottom=Math.max(200,Math.min(mobile?500:560,(state.viewportHeight||625)-65)),size=mobile?24:32;
 const fitted=state.mode==='words';
 const axisFor=key=>{if(fitted)return fittedAxis(known.map(p=>p[key]),mobile?4:6);const max=Math.max(1,...known.map(p=>p[key]));return {scale:v=>Math.log1p(v)/Math.log1p(max),ticks:[0,1,5,10,25,50,100,250,500,1000,2500,5000].filter(v=>v<=max)}};
 const xAxis=axisFor(xkey),yAxis=axisFor(ykey),x=v=>left+xAxis.scale(v)*(right-left),y=v=>bottom-yAxis.scale(v)*(bottom-top);
 known.forEach(p=>positions.set(p.id,{x:x(p[xkey])-size/2,y:y(p[ykey])-size/2,w:size,h:size}));
 axes={x:xAxis.ticks.map(v=>({v,pos:x(v)})),y:yAxis.ticks.map(v=>({v,pos:y(v)})),left,right,top,bottom,xkey,ykey,fitted};h=bottom+65;
 }else if(state.mode==='rank'){
 const known=rows.filter(p=>typeof p[state.metric]==='number').sort((a,b)=>b[state.metric]-a[state.metric]||a.index-b.index);missing.push(...rows.filter(p=>!known.includes(p)));const max=Math.max(1,...known.map(p=>p[state.metric]));known.forEach((p,i)=>{positions.set(p.id,{x:14,y:20+i*68,w:48,h:48,bar:(w-100)*p[state.metric]/max});labels.push({x:76,y:39+i*68,text:`${number(p[state.metric])} ${state.metric}`,sub:p.title.slice(0,mobile?25:80),rank:i+1})});h=known.length*68+35;
 }else{
 const key=state.mode==='timeline'?'month':state.mode==='topics'?'topic':state.mode==='palette'?'palette':'shape';const groups=new Map();[...rows].sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index).forEach(p=>{const k=key==='shape'?!p.image?'No visual':p.width/p.height<.9?'Portrait':p.width/p.height>1.1?'Landscape':'Near square':p[key];if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)});
 const list=[...groups].sort((a,b)=>state.mode==='timeline'?a[0].localeCompare(b[0]):b[1].length-a[1].length);const cols=Math.max(3,Math.floor((w-24)/(mobile?65:78))),gap=8,size=Math.floor((w-24-(cols-1)*gap)/cols);let y=18;
 list.forEach(([name,posts])=>{const title=key==='month'?new Date(name+'-02').toLocaleDateString('en',{month:'long',year:'numeric'}):name;labels.push({x:12,y:y+16,text:title,sub:`${posts.length} posts`});y+=49;posts.forEach((p,i)=>positions.set(p.id,{x:12+(i%cols)*(size+gap),y:y+Math.floor(i/cols)*(size+gap),w:size,h:size}));y+=Math.ceil(posts.length/cols)*(size+gap)+30});h=y;
 }
 // Keep a destination for every selected record across all seven views.
 if(missing.length){
  const gap=8,size=mobile?48:60,cols=Math.max(3,Math.floor((w-24)/(size+gap))),start=h+64;
  labels.push({x:12,y:h+22,text:'Without the counters needed above',sub:`${missing.length} posts`,missing:true});
  missing.forEach((p,i)=>positions.set(p.id,{x:12+(i%cols)*(size+gap),y:start+Math.floor(i/cols)*(size+gap),w:size,h:size,missing:true}));
  h=start+Math.ceil(missing.length/cols)*(size+gap)+24;
 }
 const value={rows:rows.filter(p=>positions.has(p.id)),labels,positions,h:Math.max(220,h),axes,missing};return value;
}
