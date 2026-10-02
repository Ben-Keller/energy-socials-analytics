import {layout} from './layout.js';
import analysisStyles from './analysis.css?url';
performance.mark('app-start');
const $=s=>document.querySelector(s),data=JSON.parse($('#atlas-data').textContent),posts=data.posts,byId=new Map(posts.map(p=>[p.id,p]));
const root=$('#post-atlas'),stage=$('#atlas-stage'),windowEl=$('.atlas-window'),lowImage=stage.style.getPropertyValue('--atlas-image');
const icons=new Map([...stage.querySelectorAll('.post-icon')].map(el=>[el.dataset.id,el]));
const state={mode:'topics',query:'',year:'all',topic:'all',metric:'reactions'};
const fmt=n=>n==null?'—':n.toLocaleString();
const descriptions={timeline:'Follow the recovered record month by month.',topics:'See the visual balance across named topics.',response:'Reactions horizontally; comments vertically. Logarithmic spacing keeps low and high values visible.',words:'Caption length horizontally; reactions vertically. Both linear axes fit the selected posts.',rank:'Compare individual posts by public response.',palette:'Explore the dominant colour families.',format:'Group the saved images by their proportions.'};
let current={rows:posts,missing:[],positions:new Map(posts.map(p=>[p.id,{}]))},interactiveLayout=false,focused=null,selected=null,searchTimer,warmTimer,lastWidth=0,viewportWidth=0;
const NS='http://www.w3.org/2000/svg';
function svgNode(tag,attrs,text){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el}
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b}
const guides=svgNode('svg',{class:'atlas-guides','aria-hidden':'true'});
function draw(){
 const nextWidth=viewportWidth||Math.floor(windowEl.clientWidth);
 if(!interactiveLayout){stage.querySelectorAll('.static-group').forEach(el=>el.remove());stage.prepend(guides);stage.classList.remove('static-atlas');interactiveLayout=true}
 const start=performance.now();lastWidth=nextWidth;const measured=performance.now();current=layout(posts,lastWidth,state);const calculated=performance.now();
 stage.style.height=current.h+'px';guides.setAttribute('width',lastWidth);guides.setAttribute('height',current.h);const marks=document.createDocumentFragment(),a=current.axes;
 if(a){for(const t of a.x){marks.append(svgNode('line',{x1:t.pos,x2:t.pos,y1:a.top,y2:a.bottom}),svgNode('text',{x:t.pos,y:a.bottom+25,'text-anchor':'middle'},t.v))}for(const t of a.y){marks.append(svgNode('line',{x1:a.left,x2:a.right,y1:t.pos,y2:t.pos}),svgNode('text',{x:a.left-8,y:t.pos+4,'text-anchor':'end'},t.v))}marks.append(svgNode('text',{x:a.left,y:20},a.ykey==='comments'?'Comments':'Reactions'),svgNode('text',{x:(a.left+a.right)/2,y:a.bottom+52,'text-anchor':'middle'},(a.xkey==='words'?'Caption words':'Reactions')+(a.fitted?'':' · log(1 + value)')))}
 for(const t of current.labels)marks.append(svgNode('text',{class:'group-label',x:t.x,y:t.y},t.text),svgNode('text',{class:'group-sub',x:state.mode==='rank'?t.x:lastWidth-12,y:state.mode==='rank'?t.y+19:t.y,'text-anchor':state.mode==='rank'?'start':'end'},t.sub));guides.replaceChildren(marks);const axesDone=performance.now();
 for(const [id,el] of icons){const pos=current.positions.get(id);el.hidden=!pos;if(!pos)continue;el.style.transform=`translate(${pos.x}px,${pos.y}px)`;el.style.width=pos.w+'px';el.style.height=pos.h+'px';el.classList.toggle('scatter-icon',!!a);el.querySelector('.post-index').hidden=!!a||state.mode==='rank';let bar=el.querySelector('.rank-bar');if(state.mode==='rank'){if(!bar){bar=document.createElement('span');bar.className='rank-bar';el.append(bar)}bar.style.width=pos.bar+'px'}else bar?.remove();}
 const iconsDone=performance.now();$('#view-description').textContent=descriptions[state.mode];$('#atlas-count').textContent=`${current.positions.size} of ${posts.length} posts`;
 root.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.mode===state.mode));root.querySelectorAll('[data-year]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.year===state.year));$('#rank-control').hidden=state.mode!=='rank';$('#reset').hidden=!state.query&&state.year==='all'&&state.topic==='all';
 const missing=$('#missing');missing.hidden=!current.missing.length;missing.querySelector('summary').textContent=`${current.missing.length} posts lack the counters needed for this view`;if(missing.open)renderText(missing.querySelector('div'),current.missing);
 $('#text-index summary').textContent=`Browse this selection as an accessible text list (${current.rows.length})`;if($('#text-index').open)renderText($('#text-index>div'),current.rows);
 let empty=$('#no-results');if(!current.positions.size){if(!empty){empty=document.createElement('p');empty.id='no-results';empty.className='no-results';empty.textContent='No matching posts. Try another search or clear the filters.';stage.append(empty)}}else empty?.remove();
 performance.measure('atlas-width',{start,end:measured});performance.measure('atlas-calculation',{start:measured,end:calculated});performance.measure('atlas-axes',{start:calculated,end:axesDone});performance.measure('atlas-icons',{start:axesDone,end:iconsDone});performance.measure('atlas-layout',{start,end:performance.now()});
}
function renderText(container,rows){container.replaceChildren(...rows.map(p=>button(`#${p.index} · ${p.date} · ${p.title} · ${fmt(p.reactions)} reactions · ${fmt(p.comments)} comments`,()=>openPost(p))))}
const tileAnimations=new Map();
function change(update){
 // FLIP only on view changes: read current positions together, then animate transforms.
 const tween=update.mode&&update.mode!==state.mode&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const before=tween?new Map([...icons].filter(([,el])=>!el.hidden).map(([id,el])=>[id,el.getBoundingClientRect()])):null;
 for(const animation of tileAnimations.values())animation.cancel();tileAnimations.clear();
 Object.assign(state,update);windowEl.scrollTop=0;draw();
 if(!before)return;
 const origin=stage.getBoundingClientRect(),viewport=windowEl.getBoundingClientRect();
 for(const [id,pos] of current.positions){
  const previous=before.get(id);if(!previous)continue;
  const top=origin.top+pos.y;
  // Offscreen tiles need no compositor layers; they are already at their new positions.
  if((previous.bottom<viewport.top||previous.top>viewport.bottom)&&(top+pos.h<viewport.top||top>viewport.bottom))continue;
  const el=icons.get(id),animation=el.animate([
   {transform:`translate(${previous.left-origin.left}px,${previous.top-origin.top}px) scale(${previous.width/pos.w},${previous.height/pos.h})`},
   {transform:`translate(${pos.x}px,${pos.y}px) scale(1,1)`}
  ],{duration:460,easing:'cubic-bezier(.22,.68,0,1)'});
  tileAnimations.set(id,animation);animation.onfinish=()=>{if(tileAnimations.get(id)===animation)tileAnimations.delete(id)};
 }
}
$('#atlas-controls').addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;if(target.dataset.mode)change({mode:target.dataset.mode});if(target.dataset.year)change({year:target.dataset.year});if(target.id==='reset'){clearTimeout(searchTimer);$('#search').value='';$('#topic').value='all';change({query:'',year:'all',topic:'all'})}});
$('#search').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>change({query:e.target.value}),100)});$('#topic').onchange=e=>change({topic:e.target.value});$('#metric').onchange=e=>change({metric:e.target.value});
$('#text-index').ontoggle=()=>{if($('#text-index').open)renderText($('#text-index>div'),current.rows)};$('#missing').ontoggle=()=>{if($('#missing').open)renderText($('#missing>div'),current.missing)};
let resizeFrame;new ResizeObserver(entries=>{viewportWidth=Math.floor(entries[0].contentRect.width);if(interactiveLayout&&Math.abs(lastWidth-viewportWidth)>2){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(draw)}}).observe(windowEl);
// Sharpen only visible image packs. Two requests at a time; no full-sheet download.
const packCache=new Map(),packQueue=[];let activePacks=0;
function packStyle(p,node){node.style.backgroundImage=`url("${new URL(p.tile.src,document.baseURI).href}")`;node.style.backgroundSize='800% 400%';node.style.backgroundPosition=`${p.tile.x/7*100}% ${p.tile.y/3*100}%`;node.dataset.sharp='true'}
function pumpPacks(){while(activePacks<2&&packQueue.length){const [src,resolve,reject]=packQueue.shift();activePacks++;const image=new Image();image.decoding='async';image.fetchPriority='low';image.onload=async()=>{try{await image.decode()}catch{}for(const p of posts)if(p.tile?.src===src)packStyle(p,icons.get(p.id).querySelector('.post-thumb'));resolve(image);activePacks--;pumpPacks()};image.onerror=()=>{packCache.delete(src);reject();activePacks--;pumpPacks()};image.src=src}}
function requestPack(src){if(!packCache.has(src)){packCache.set(src,new Promise((resolve,reject)=>{packQueue.push([src,resolve,reject])}));pumpPacks()}return packCache.get(src)}
const tileObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const p=byId.get(e.target.dataset.id);if(p.tile)requestPack(p.tile.src).catch(()=>{});tileObserver.unobserve(e.target)}},{root:windowEl,rootMargin:'80px'});
const atlasObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){for(const icon of icons.values())tileObserver.observe(icon);atlasObserver.disconnect()}},{rootMargin:'100px'});atlasObserver.observe(windowEl);
const previewCache=new Map();
function preview(p){if(!p.preview)return Promise.resolve(null);if(!previewCache.has(p.id)){const job=new Promise((resolve,reject)=>{const image=new Image();image.className='detail-preview';image.alt='';image.decoding='async';image.onload=async()=>{try{await image.decode()}catch{}resolve(image)};image.onerror=()=>reject(new Error('Preview unavailable'));image.src=p.preview});previewCache.set(p.id,job);job.catch(()=>previewCache.delete(p.id));if(previewCache.size>24)previewCache.delete(previewCache.keys().next().value)}return previewCache.get(p.id)}
function focusPost(p){focused=p;$('#inspector-index').textContent='#'+p.index;$('#inspector-title').textContent=p.title;$('#inspector-meta').textContent=`${p.date} · ${fmt(p.reactions)} reactions · ${fmt(p.comments)} comments`;$('#inspect-post').hidden=false;clearTimeout(warmTimer);warmTimer=setTimeout(()=>preview(p).catch(()=>{}),120)}
stage.addEventListener('pointerover',e=>{const el=e.target.closest('.post-icon');if(el&&!el.contains(e.relatedTarget))focusPost(byId.get(el.dataset.id))});stage.addEventListener('pointerout',e=>{if(e.target.closest('.post-icon')&&!e.target.closest('.post-icon').contains(e.relatedTarget))clearTimeout(warmTimer)});stage.addEventListener('focusin',e=>{const el=e.target.closest('.post-icon');if(el)focusPost(byId.get(el.dataset.id))});stage.addEventListener('click',e=>{const el=e.target.closest('.post-icon');if(el)openPost(byId.get(el.dataset.id))});$('#inspect-post').onclick=()=>focused&&openPost(focused);
function openPost(record){const p=byId.get(record.id)||record;selected=p.id;const dialog=$('#post-dialog');$('#post-meta').textContent=`POST ${p.index} · ${p.date}`;$('#post-title').textContent=p.title;$('#post-topic').textContent=p.topic;$('#post-caption').textContent=p.caption||p.sharedText||'No author caption recovered.';$('#post-check').textContent=`Package counters above. Browser check: ${fmt(p.liveReactions)} reactions / ${fmt(p.liveComments)} comments.`;
 const counters=$('#post-counters');counters.replaceChildren();for(const key of ['reactions','comments']){const span=document.createElement('span'),strong=document.createElement('strong');strong.textContent=fmt(p[key]);span.append(strong,key);counters.append(span)}const links=$('#post-links');links.replaceChildren();for(const [href,label] of [[p.source,'LinkedIn source ↗'],[p.image,'Original image ↗']])if(href){const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener';links.append(a)}
 const host=$('#dialog-image');host.replaceChildren();if(p.image){const visual=document.createElement('div');visual.className='dialog-visual';visual.setAttribute('role','img');visual.setAttribute('aria-label',p.title);visual.style.setProperty('--atlas-image',lowImage);visual.style.setProperty('--atlas-size','1600% 1800%');const thumb=icons.get(p.id).querySelector('.post-thumb').cloneNode();thumb.classList.add('instant-preview');visual.append(thumb);host.append(visual);preview(p).then(image=>{if(selected===p.id&&image){visual.append(image);performance.mark('post-sharp')}}).catch(()=>{if(selected===p.id)host.append(button('Retry sharper preview',()=>{previewCache.delete(p.id);openPost(p)}))})}else host.textContent='No standalone visual.';
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;performance.mark('post-open');}
$('#post-dialog .close').onclick=()=>$('#post-dialog').close();$('#post-dialog').addEventListener('click',e=>{if(e.target===$('#post-dialog'))$('#post-dialog').close()});
// Only the analysis island loads D3. Its small data subset is already in memory.
let analysisPromise,stylesPromise;const jobs=new Map();const loadStyles=()=>stylesPromise??=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=analysisStyles;link.onload=resolve;link.onerror=()=>{stylesPromise=null;link.remove();reject(new Error('Chart styles unavailable'))};document.head.append(link)});const loadAnalysis=()=>analysisPromise??=Promise.all([import('./analysis.js'),loadStyles()]).then(([m])=>m.createAnalysis(data,openPost));
function mount(el){if(!jobs.has(el.id))jobs.set(el.id,loadAnalysis().then(setup=>{el.querySelector('.chart-placeholder')?.remove();setup(el);el.dataset.ready='true'}).catch(error=>{console.error(error);const p=el.querySelector('.chart-placeholder');if(p){p.textContent='This chart could not load. ';p.append(button('Retry',()=>{analysisPromise=null;jobs.delete(el.id);mount(el)}))}}));return jobs.get(el.id)}
const chartsObserver=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){chartsObserver.unobserve(e.target);mount(e.target)}},{rootMargin:'100px'});document.querySelectorAll('article.figure').forEach(el=>chartsObserver.observe(el));
async function goTo(id){const aliases={f06:'rank',f19:'timeline',f20:'topics',f21:'palette',f22:'rank',f30:'format',library:'timeline'};if(aliases[id]){change({mode:aliases[id]});$('#atlas').scrollIntoView();return}const target=document.getElementById(id);if(!target)return;if(target.matches('article.figure')){const figures=[...document.querySelectorAll('article.figure')];await Promise.all(figures.slice(0,figures.indexOf(target)+1).map(mount))}requestAnimationFrame(()=>target.scrollIntoView())}
$('#analysis-jump').onchange=e=>{if(e.target.value){history.replaceState(null,'','#'+e.target.value);goTo(e.target.value);e.target.value=''}};document.querySelector('a[href="#report"]').addEventListener('pointerenter',()=>loadAnalysis().catch(()=>{}),{once:true});addEventListener('hashchange',()=>goTo(location.hash.slice(1)));
performance.mark('atlas-ready');performance.measure('app-init','app-start');if(location.hash)goTo(location.hash.slice(1));
