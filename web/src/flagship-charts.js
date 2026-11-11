import * as d3 from 'd3';
import {median,statistic,captionRows,lengthBand,formatRows,tagRows,topicNames,approaches,tags} from './report-math.js';
// SDG palette; colour is editorial grouping, not a claim that posts were SDG-coded.
import {SDG,TOPIC_COLORS,YEAR_COLORS} from './report-palette.js';
import evidence from './report-evidence.json';
import {formatEvidence,cameraEvidence} from './report-format-math.js';
export function createFlagshipCharts({posts:P,asset,openRows}){
 const $=s=>document.querySelector(s),E=captionRows(P),C=E.filter(p=>p.classified),R=P.filter(p=>Number.isFinite(p.reactions)&&Number.isFinite(p.comments));
 const palette=topicNames.map(name=>TOPIC_COLORS[name]);
 const topicColor=new Map(topicNames.map((t,i)=>[t,palette[i]])),fmt=v=>v==null?'—':Number.isInteger(v)?String(v):d3.format('.1f')(v),pct=v=>Math.round(v*100)+'%',pct1=v=>d3.format('.1f')(v*100)+'%';
 const examples={hydrogen:P.find(p=>p.date==='2026-01-19'&&p.reactions===200),jobs:P.find(p=>p.date==='2026-04-21'&&p.reactions===193),cooking:P.find(p=>p.date==='2026-03-17'&&p.reactions===140),finance:P.find(p=>p.date==='2025-01-12'&&p.reactions===295)};
 const yearColor=YEAR_COLORS;let selected=examples.cooking;
 const tip=$('#chart-tooltip');function hideTip(){tip.hidden=true}function showTip(e,label){tip.textContent=label;tip.hidden=false;const r=tip.getBoundingClientRect();tip.style.left=Math.max(10,Math.min(innerWidth-r.width-10,e.clientX+12))+'px';tip.style.top=Math.max(10,Math.min(innerHeight-r.height-10,e.clientY-r.height-12))+'px'}
 function frame(id){const host=$(id);host.classList.add('chart-canvas');const w=Math.max(260,host.clientWidth),h=host.clientHeight;host.replaceChildren();const s=d3.select(host).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('width',w).attr('height',h).attr('role','group').attr('aria-label',host.dataset.label||'Interactive chart');return {s,w,h,small:w<600}}
 function text(s,x,y,t,cls='flagship-label',anchor='start',fill=null){const a=s.append('text').attr('x',x).attr('y',y).attr('text-anchor',anchor).attr('class',cls).text(t);if(fill)a.style('fill',fill);return a}
 function mark(sel,rows,label,preferred=null){sel.attr('tabindex',0).attr('role','button').attr('aria-label',label).classed('chart-mark',true).on('pointermove',(e,d)=>showTip(e,label(d))).on('pointerleave',hideTip).on('click',(e,d)=>{hideTip();openRows(rows(d),label(d),preferred?.(d))}).on('keydown',(e,d)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openRows(rows(d),label(d),preferred?.(d))}});return sel}
 const key=p=>p.year+' Q'+Math.ceil(Number(p.month.slice(-2))/3),quarters=d3.range(15).map(i=>{const name=(2023+Math.floor(i/4))+' Q'+(i%4+1),all=P.filter(p=>key(p)===name),rows=captionRows(all);return {name,year:name.slice(0,4),all,rows,words:median(rows.map(p=>p.words)),reactions:statistic(rows,'reactions'),share:statistic(rows,'share')}});
 function drawOverview(){
  const {s,w,h,small}=frame('#overview-chart'),left=45,right=small?19:180,top=small?100:40,bottom=h-42;
  const x=d3.scalePoint(quarters.map(g=>g.name),[left,w-right]);
  const series=[{key:'words',name:'Median caption length',unit:'words',color:SDG.blue},{key:'share',name:'Posts with 3+ comments',unit:'of posts',color:SDG.green},{key:'reactions',name:'Median reactions',unit:'reactions',color:SDG.burgundy}];
  const baseline=quarters[0],index=(g,spec)=>100*g[spec.key]/baseline[spec.key];
  const y=d3.scaleLinear([0,d3.max(series,spec=>d3.max(quarters,g=>index(g,spec)))],[bottom,top]).nice();
  s.append('g').attr('class','chart-axis').attr('transform',`translate(${left},0)`).call(d3.axisLeft(y).tickValues(d3.range(0,y.domain()[1]+1,200)).tickSize(-(w-left-right)).tickPadding(9));
  text(s,0,16,'Q1 2023 = 100','flagship-series');
  if(small)series.forEach((spec,i)=>{s.append('line').attr('x1',0).attr('x2',16).attr('y1',37+i*20).attr('y2',37+i*20).attr('stroke',spec.color).attr('stroke-width',3);text(s,23,41+i*20,spec.name,'flagship-label','start',spec.color)});
  const ticks=quarters.filter(g=>g.name.endsWith('Q1')).map(g=>g.name);
  s.append('g').attr('class','chart-axis').attr('transform',`translate(0,${bottom})`).call(d3.axisBottom(x).tickValues(ticks).tickFormat(g=>g.slice(0,4)).tickSize(0).tickPadding(16));
  s.append('line').attr('x1',left).attr('x2',w-right).attr('y1',y(100)).attr('y2',y(100)).attr('stroke',SDG.navy).attr('stroke-dasharray','3 5').attr('opacity',.3);
  const cursor=s.append('line').attr('class','flagship-hover').attr('y1',top).attr('y2',bottom).attr('stroke',SDG.navy).attr('stroke-dasharray','3 4').attr('opacity',0);
  const endpointLabels=s.append('g').attr('class','trend-endpoints');
  const readout=s.append('g').attr('class','trend-readout').attr('display','none');
  const quarterLabel=text(readout,w-4,16,'','flagship-series','end').attr('class','flagship-series trend-quarter');
  let activeQuarter=null;
  function select(g){
   if(activeQuarter===g)return;activeQuarter=g;hideTip();
   const px=x(g.name),toRight=px+124<=w-8,lx=px+(toRight?12:-12),anchor=toRight?'start':'end';
   cursor.attr('x1',px).attr('x2',px).attr('opacity',.35);
   endpointLabels.attr('opacity',0);readout.attr('display',null).attr('data-quarter',g.name).raise();quarterLabel.text(g.name);
   const labels=series.map(spec=>({...spec,pointY:y(index(g,spec)),value:spec.key==='share'?pct(g.share)+' · 3+ comments':fmt(g[spec.key])+' '+spec.unit})).sort((a,b)=>a.pointY-b.pointY);
   labels.forEach((d,i)=>d.labelY=Math.max(top+12,d.pointY-10,i?labels[i-1].labelY+22:0));
   const overflow=Math.max(0,labels.at(-1).labelY-(bottom-8));labels.forEach(d=>d.labelY-=overflow);
   const groups=readout.selectAll('.trend-hover-value').data(labels,d=>d.key).join(enter=>{const g=enter.append('g').attr('class','trend-hover-value');g.append('line');g.append('circle');g.append('text').attr('class','trend-value');return g}).attr('data-series',d=>d.key);
   groups.select('line').attr('x1',px).attr('y1',d=>d.pointY).attr('x2',lx+(toRight?-4:4)).attr('y2',d=>d.labelY-4).attr('stroke',d=>d.color).attr('opacity',.5);
   groups.select('circle').attr('cx',px).attr('cy',d=>d.pointY).attr('r',small?5:6).attr('fill','#fff').attr('stroke',d=>d.color).attr('stroke-width',2);
   groups.select('text').attr('x',lx).attr('y',d=>d.labelY).attr('text-anchor',anchor).attr('fill',d=>d.color).text(d=>d.value);
  }
  function reset(){activeQuarter=null;readout.attr('display','none');endpointLabels.attr('opacity',1);const px=x(quarters.at(-1).name);cursor.attr('x1',px).attr('x2',px).attr('opacity',.35)}
  for(const spec of series){
   s.append('path').datum(quarters).attr('class','indexed-trend').attr('data-series',spec.key).attr('d',d3.line().x(g=>x(g.name)).y(g=>y(index(g,spec)))).attr('fill','none').attr('stroke',spec.color).attr('stroke-width',3);
   mark(s.selectAll('.indexed-'+spec.key).data(quarters).join('circle').attr('data-series',spec.key).attr('data-index',g=>index(g,spec)).attr('cx',g=>x(g.name)).attr('cy',g=>y(index(g,spec))).attr('r',small?4:5).attr('fill',spec.color).attr('stroke','var(--paper)').attr('stroke-width',1.5),g=>g.rows,g=>`${g.name}: ${spec.key==='share'?pct(g.share):fmt(g[spec.key])} ${spec.unit}; index ${fmt(index(g,spec))}. ${g.rows.length} captions.`).on('pointermove',null).on('pointerleave',null).on('pointerenter',(_,g)=>select(g)).on('focus',(_,g)=>select(g));
   const last=quarters.at(-1),actual=spec.key==='share'?pct(last.share)+' of posts':fmt(last[spec.key])+' '+spec.unit;
   if(!small){text(endpointLabels,w-right+15,y(index(last,spec))-4,spec.name,'flagship-series','start',spec.color);text(endpointLabels,w-right+15,y(index(last,spec))+20,actual,'flagship-title','start',spec.color)}
  }
  function inspectColumn(event){const [mx,my]=d3.pointer(event,s.node());if(mx<left||mx>w-right||my<top||my>bottom)return;select(quarters.reduce((a,b)=>Math.abs(x(a.name)-mx)<Math.abs(x(b.name)-mx)?a:b));}
  s.on('pointermove.index',inspectColumn).on('pointerdown.index',inspectColumn).on('pointerleave.index',event=>{if(event.pointerType!=='touch'&&!s.node().contains(document.activeElement))reset()}).on('focusout.index',event=>{if(!s.node().contains(event.relatedTarget))reset()});
  reset();
 }
 function drawFormat(){
  const {s,w,h,small}=frame('#format-chart'),left=small?100:190,gap=small?26:65,right=small?14:35,col=(w-left-right-gap)/2,top=108,row=(h-top-18)/8;
  const colors=[SDG.blue,SDG.burgundy],names=['Arguments','Event reports'],kinds=approaches.slice(0,2);
  const order=['All topics','Finance','Technology and grids','Islands','AI and digital','Energy access','Transition policy','People and opportunity'];
  const short={'Technology and grids':'Grids & tech','AI and digital':'AI & digital','Energy access':'Energy access','Transition policy':'Transition','People and opportunity':'People & jobs'};
  const groups=order.map(topic=>({topic,groups:kinds.map((kind,i)=>({name:names[i],color:colors[i],rows:C.filter(p=>p.approach===kind&&(topic==='All topics'||p.topic===topic))}))}));
  names.forEach((name,i)=>{s.append('circle').attr('cx',8+i*140).attr('cy',17).attr('r',5).attr('fill',colors[i]);text(s,20+i*140,21,name,'flagship-label')});
  const metrics=[{key:'comments',name:small?'Comments':'Median comments',max:8,ticks:[0,2,4,6,8]},{key:'reactions',name:small?'Reactions':'Median reactions',max:120,ticks:small?[0,60,120]:[0,30,60,90,120]}];
  metrics.forEach((metric,j)=>{const start=left+j*(col+gap),x=d3.scaleLinear([0,metric.max],[start,start+col]);text(s,start+col/2,53,metric.name,'flagship-series','middle');s.append('g').attr('class','chart-axis').attr('transform',`translate(0,83)`).call(d3.axisTop(x).tickValues(metric.ticks).tickSize(0).tickPadding(7));
   groups.forEach((d,i)=>{const yy=top+row*(i+.5),values=d.groups.map(g=>({...g,value:statistic(g.rows,metric.key)}));if(j===0){text(s,0,yy-5,small?(short[d.topic]||d.topic):d.topic,'flagship-label');text(s,0,yy+12,'n='+d.groups.map(g=>g.rows.length).join(' / '),'flagship-small');}
    s.append('line').attr('x1',start).attr('x2',start+col).attr('y1',yy).attr('y2',yy).attr('class','flagship-grid').attr('opacity',.55);
    s.append('line').attr('x1',x(values[0].value)).attr('x2',x(values[1].value)).attr('y1',yy).attr('y2',yy).attr('stroke',SDG.navy).attr('stroke-opacity',.35).attr('stroke-width',2);
    values.forEach((g,k)=>{const cy=yy+(k?4:-4);mark(s.append('circle').datum(g).attr('cx',x(g.value)).attr('cy',cy).attr('r',small?5:6).attr('fill',g.color).attr('stroke','white').attr('stroke-width',1),v=>v.rows,v=>`${d.topic} — ${v.name}: median ${fmt(v.value)} ${metric.key}; ${v.rows.length} posts.`);text(s,x(g.value),yy+(k?23:-15),fmt(g.value),'flagship-series','middle',g.color)});
   });
  });
  s.append('line').attr('x1',0).attr('x2',w).attr('y1',top+row).attr('y2',top+row).attr('class','flagship-grid');
 }
 function drawAI(){
  const {s,w,h,small}=frame('#ai-chart'),left=small?43:100,right=small?25:55,x=d3.scaleLinear([0,125],[left,w-right]);
  text(s,0,23,'Median reactions to posts','flagship-title');
  const legend=[['Arguments',SDG.blue],['Event reports',SDG.burgundy]];
  legend.forEach(([name,color],i)=>{s.append('circle').attr('cx',8+i*145).attr('cy',50).attr('r',5).attr('fill',color);text(s,20+i*145,54,name,'flagship-label')});
  const top=85,bottom=h-44,row=(bottom-top)/4;
  s.append('g').attr('class','chart-axis').attr('transform',`translate(0,${bottom+17})`).call(d3.axisBottom(x).tickValues([0,25,50,75,100,125]).tickSize(0).tickPadding(9));
  for(const [i,year] of ['2023','2024','2025','2026'].entries()){
   const y=top+(i+.5)*row,groups=approaches.slice(0,2).map((a,j)=>({rows:formatRows(P,'AI and digital',a,year),color:legend[j][1],name:legend[j][0]})).map(g=>({...g,value:statistic(g.rows,'reactions')}));
   text(s,0,y+5,year,'flagship-series');s.append('line').attr('x1',x(0)).attr('x2',x(125)).attr('y1',y).attr('y2',y).attr('class','flagship-grid');
   const available=groups.filter(g=>g.value!=null);
   if(!available.length){text(s,x(0)+8,y-9,'No classified AI posts','flagship-label');continue;}
   if(available.length===1)text(s,x(0)+8,y-9,'No classified arguments','flagship-small');
   if(available.length===2)s.append('line').attr('x1',x(groups[0].value)).attr('x2',x(groups[1].value)).attr('y1',y).attr('y2',y).attr('stroke',SDG.burgundy).attr('stroke-width',3).attr('opacity',.5);
   for(const g of available){mark(s.append('circle').datum(g).attr('cx',x(g.value)).attr('cy',y).attr('r',7).attr('fill',g.color).attr('stroke','white').attr('stroke-width',1),d=>d.rows,d=>`${year} AI ${d.name.toLowerCase()}: median ${fmt(d.value)} reactions. ${d.rows.length} posts.`);text(s,x(g.value)+(small?(g.name==='Arguments'?-2:2):0),y-16,fmt(g.value),'flagship-title',small?(g.name==='Arguments'?'end':'start'):'middle',g.color);text(s,x(g.value),y+25,'n='+g.rows.length,'flagship-small','middle');}
  }
 }
 function drawNetwork(){const {s,w,h,small}=frame('#network-chart'),cx=w/2,cy=h/2-8,rx=w*.33,ry=h*.30,rscale=d3.scaleSqrt([0,125],[0,small?37:49]),nodes=tags.map(([tag,name],i)=>({tag,name,i,rows:tagRows(P,[tag]),x:cx+rx*Math.cos(-Math.PI/2+i*Math.PI/3),y:cy+ry*Math.sin(-Math.PI/2+i*Math.PI/3)})),pairs=[];nodes.forEach((a,i)=>nodes.slice(i+1).forEach(b=>pairs.push({a,b,rows:tagRows(P,[a.tag,b.tag])})));pairs.sort((a,b)=>b.rows.length-a.rows.length);const top=pairs.slice(0,10);top.forEach((g,i)=>{const mx=(g.a.x+g.b.x)/2,my=(g.a.y+g.b.y)/2,control={x:mx+(cx-mx)*.12,y:my+(cy-my)*.12},path=`M${g.a.x},${g.a.y} Q${control.x},${control.y} ${g.b.x},${g.b.y}`;mark(s.append('path').datum(g).attr('class','network-edge').attr('d',path).attr('fill','none').attr('stroke',palette[g.a.i]).attr('stroke-width',1+Math.sqrt(g.rows.length)*1.1),d=>d.rows,d=>`${d.a.name} + ${d.b.name}: ${d.rows.length} co-mentions.`);if(i<3){const lx=.25*g.a.x+.5*control.x+.25*g.b.x,ly=.25*g.a.y+.5*control.y+.25*g.b.y;text(s,lx,ly+4,g.rows.length,'flagship-series','middle').attr('paint-order','stroke').attr('stroke','var(--paper)').attr('stroke-width',6)}});for(const d of nodes){mark(s.append('circle').datum(d).attr('cx',d.x).attr('cy',d.y).attr('r',rscale(d.rows.length)).attr('fill',palette[d.i]).attr('stroke','var(--paper)').attr('stroke-width',3),d=>d.rows,d=>`${d.name}: ${d.rows.length} tagged captions.`);const col=d3.lab(palette[d.i]).l>58?SDG.navy:'white';text(s,d.x,d.y+7,d.rows.length,'flagship-value','middle',col).attr('pointer-events','none');const label=d.name.replace('Technology & grids','Grids & technology').replace('People & opportunity','People');text(s,d.x,d.y+rscale(d.rows.length)+19,label,'flagship-label','middle')}
 }

 // Same-quarter baselines reduce calendar effects without implying a causal format effect.
 const FORMAT_COLORS={'To-camera video':SDG.green,'Link preview':SDG.red};
 const formats=formatEvidence(P,evidence),camera=cameraEvidence(P,evidence);
 const sized=(t,px)=>t.style('font-size',px+'px');
 const halo=t=>t.classed('halo-label',true).attr('paint-order','stroke').attr('stroke','#fff').attr('stroke-width',4).attr('stroke-linejoin','round');
 function drawFormats(){
  const {s,w,small}=frame('#formats-chart'),groups=formats.groups,ref=groups.find(g=>g.name==='Photo or graphic'),labelW=small?134:210,gap=small?0:64,panelW=small?w-labelW-48:(w-labelW-gap-52)/2,rowH=small?34:46,block=groups.length*rowH,first=small?50:70;
  const panels=[{title:'Median reactions vs other image posts',max:Math.max(200,Math.ceil(d3.max(groups,g=>g.index)/50)*50),ref:100,refLabel:'Image-post median',rows:g=>g.rxRows,value:g=>g.index,show:v=>d3.format('.1f')(v/100)+'×',ticks:[0,100,200],tick:v=>v/100+'×'},{title:'Posts above the image-post comment median',max:1,ref:ref.above,refLabel:'Image posts: '+pct(ref.above),rows:g=>g.cmRows,value:g=>g.above,show:pct,ticks:[0,.5,1],tick:pct}];
  panels.forEach((panel,j)=>{
   const x0=small?labelW:labelW+j*(panelW+gap),y0=small?first+j*(block+96):first,x=d3.scaleLinear([0,panel.max],[x0,x0+panelW]),rowY=i=>y0+i*rowH+rowH/2;
   const titleLines=!small&&panelW<290?(j===0?['Median reactions','vs other image posts']:['Posts above the','image-post comment median']):[panel.title];
   titleLines.forEach((line,i)=>sized(text(s,small?0:x0,y0-34-(titleLines.length-1-i)*14,line,'flagship-series'),12));
   s.append('g').attr('class','chart-axis').attr('transform',`translate(0,${y0+block+2})`).call(d3.axisBottom(x).tickValues(panel.ticks).tickFormat(panel.tick).tickSize(0).tickPadding(8));
   groups.forEach((g,i)=>{const yy=rowY(i),color=FORMAT_COLORS[g.name]||SDG.navy,faded=!FORMAT_COLORS[g.name],v=panel.value(g);
    if(j===0||small){sized(text(s,0,yy+(small?0:-1),g.name,'flagship-series','start',faded?null:color),small?11.5:13);sized(text(s,0,yy+14,(j===0?g.rxRows:g.cmRows).length+' posts','flagship-small'),10);}
    s.append('rect').attr('x',x(0)).attr('y',yy-3).attr('width',panelW).attr('height',6).attr('rx',3).attr('fill','var(--line)').attr('opacity',.55);
    s.append('rect').attr('x',x(0)).attr('y',yy-3).attr('width',Math.max(0,x(v)-x(0))).attr('height',6).attr('rx',3).attr('fill',color).attr('opacity',faded?.42:1);
   });
   s.append('line').attr('x1',x(panel.ref)).attr('x2',x(panel.ref)).attr('y1',y0-10).attr('y2',y0+block).attr('stroke',SDG.navy).attr('stroke-dasharray','2 4').attr('opacity',.6);
   sized(text(s,x(panel.ref),y0-15,panel.refLabel,'flagship-small','middle'),10);
   groups.forEach((g,i)=>{const yy=rowY(i),color=FORMAT_COLORS[g.name]||SDG.navy,faded=!FORMAT_COLORS[g.name],v=panel.value(g);
    mark(s.append('circle').datum(g).attr('cx',x(v)).attr('cy',yy).attr('r',small?6.5:8).attr('fill',faded?'#7d97a8':color).attr('stroke','#fff').attr('stroke-width',2),panel.rows,d=>`${d.name}: median ${d3.format('.1f')(d.index/100)}× the same-quarter image-post reaction baseline; ${pct(d.above)} exceed the comment baseline. ${panel.rows(d).length} posts with known counts.`);
    sized(halo(text(s,x(v)+(small?12:15),yy+5,panel.show(v),'flagship-title','start',faded?null:color)),small?15:17);
   });
  });
  const noteY=(small?first+block+96:first)+block+(small?44:39),notes=['Compared with other image posts from the same quarter.','Formats identified from saved previews · 2023–2026'];
  notes.forEach((t,i)=>sized(text(s,0,noteY+i*13,t,'flagship-small'),10));
 }
 function drawCamera(){
  const {s,w,h,small}=frame('#camera-chart'),{rows,camera:camRows,others,start,end}=camera;
  if(!camRows.length)return;
  const left=small?34:48,right=small?14:158,y0=64,bottom=h-58;
  const day=d=>new Date(d+'T00:00:00Z'),x=d3.scaleUtc([day(start+'-01'),d3.utcMonth.offset(day(end+'-01'),1)],[left,w-right]);
  const y=d3.scaleLinear([0,Math.max(200,d3.max(rows,p=>p.reactions))],[bottom,y0+26]).nice();
  s.append('g').attr('class','chart-axis').attr('transform',`translate(${left},0)`).call(d3.axisLeft(y).tickValues([0,50,100,150,200]).tickSize(-(w-left-right)).tickPadding(8));
  s.append('g').attr('class','chart-axis').attr('transform',`translate(0,${bottom})`).call(d3.axisBottom(x).ticks(d3.utcMonth.every(1)).tickFormat(d3.utcFormat('%b')).tickSize(0).tickPadding(12));
  sized(text(s,0,y0-10,'Reactions per post','flagship-small'),10);
  [[SDG.green,'Identified to-camera videos',7,1],['#7d97a8','Other posts',4.5,.75]].forEach(([c,name,r,o],i)=>{const lx=8+i*(small?192:235);s.append('circle').attr('cx',lx).attr('cy',16).attr('r',r).attr('fill',c).attr('opacity',o);sized(text(s,lx+13,20,name,'flagship-label'),small?10:12)});
  const label=p=>`${p.date}: ${p.reactions} reactions, ${p.comments} comments. ${p.title.length>90?p.title.slice(0,90)+'…':p.title}`;
  mark(s.append('g').selectAll('circle').data(others).join('circle').attr('cx',p=>x(day(p.date))).attr('cy',p=>y(p.reactions)).attr('r',small?3.2:4.5).attr('fill',SDG.navy).attr('opacity',.28),p=>[p],label,p=>p.id);
  for(const [group,color,name,dash] of [[camRows,SDG.green,'To-camera videos',''],[others,SDG.navy,'Other posts','1 6']]){
   const m=median(group.map(p=>p.reactions)),x1=left,x2=w-right;
   s.append('line').attr('x1',x1).attr('x2',x2).attr('y1',y(m)).attr('y2',y(m)).attr('stroke',color).attr('stroke-width',2.5).attr('stroke-dasharray',dash);
   mark(s.append('rect').datum({rows:group}).attr('x',x1).attr('y',y(m)-6).attr('width',x2-x1).attr('height',12).attr('fill','transparent'),d=>d.rows,()=>`${name}: median ${fmt(m)} reactions across ${group.length} posts in the same months.`);
   if(small)sized(halo(text(s,x2-4,y(m)-10,`${name}: ${fmt(m)}`,'flagship-series','end',color)),11);
   else{sized(text(s,x2+12,y(m)-6,name,'flagship-label','start',color),11.5);sized(text(s,x2+12,y(m)+15,'median '+fmt(m),'flagship-title','start',color),17);}
  }
  s.append('g').attr('pointer-events','none').selectAll('circle').data(camRows).join('circle').attr('cx',p=>x(day(p.date))).attr('cy',p=>y(p.reactions)).attr('r',small?11:14).attr('fill',SDG.green).attr('opacity',.16);
  mark(s.append('g').selectAll('circle').data(camRows).join('circle').attr('cx',p=>x(day(p.date))).attr('cy',p=>y(p.reactions)).attr('r',small?6:8).attr('fill',SDG.green).attr('stroke','#fff').attr('stroke-width',2),p=>[p],label,p=>p.id);
  const best=camRows.reduce((a,b)=>b.reactions>a.reactions?b:a);sized(halo(text(s,x(day(best.date)),y(best.reactions)-(small?16:20),fmt(best.reactions),'flagship-title','middle',SDG.green)),small?15:17);
  s.selectAll('.halo-label').raise();
  const notes=['Videos identified from saved previews · March–June 2026'];
  notes.forEach((t,i)=>sized(text(s,0,h-9+i*13,t,'flagship-small'),small?9:10));
 }
 // Hidden comparison panels are drawn on first use, then only when resized.
 const draws=[['#overview-chart',drawOverview],['#network-chart',drawNetwork],['#formats-chart',drawFormats],['#camera-chart',drawCamera]].map(([id,draw])=>{
  let lastSize='';return ()=>{const host=$(id);if(!host||host.closest('[hidden]'))return;const size=host.clientWidth+':'+host.clientHeight;if(size===lastSize)return;draw();lastSize=size};
 });
 return {draws,hideTip};
}
