import {layout} from './layout.js';
import analysisStyles from './analysis.css?url';
performance.mark('app-start');
const $=s=>document.querySelector(s),data=JSON.parse($('#atlas-data').textContent),posts=data.posts,byId=new Map(posts.map(p=>[p.id,p]));
const root=$('#post-atlas'),stage=$('#atlas-stage'),windowEl=$('.atlas-window'),lowImage=stage.style.getPropertyValue('--atlas-image');
const icons=new Map([...stage.querySelectorAll('.post-icon')].map(el=>[el.dataset.id,el]));
const state={mode:'timeline',query:'',year:'recent',topic:'all',metric:'reactions',kind:'all'};
const fmt=n=>n==null?'—':n.toLocaleString();
const descriptions={timeline:'Follow the recovered record month by month.',topics:'See the visual balance across named topics.',response:'Reactions horizontally; comments vertically. Logarithmic spacing keeps low and high values visible.',words:'Caption length horizontally; reactions vertically. Both linear axes fit the selected posts.',rank:'Compare individual posts by public response.',palette:'Explore the dominant colour families.',format:'Group the saved images by their proportions.'};
let current={rows:posts,missing:[],positions:new Map(posts.map(p=>[p.id,{}]))},interactiveLayout=false,focused=null,selected=null,searchTimer,warmTimer,lastWidth=0,viewportWidth=0;
const NS='http://www.w3.org/2000/svg';
function svgNode(tag,attrs,text){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!=null)el.textContent=text;return el}
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b}
const guides=svgNode('svg',{class:'atlas-guides','aria-hidden':'true'});
function draw(retain=new Set()){
 const nextWidth=viewportWidth||Math.floor(windowEl.clientWidth);
 if(!interactiveLayout){stage.querySelectorAll('.static-group').forEach(el=>el.remove());stage.prepend(guides);stage.classList.remove('static-atlas');interactiveLayout=true}
 const start=performance.now();lastWidth=nextWidth;const measured=performance.now();current=layout(posts,lastWidth,state);const calculated=performance.now();
 stage.style.height=current.h+'px';guides.setAttribute('width',lastWidth);guides.setAttribute('height',current.h);const marks=document.createDocumentFragment(),a=current.axes;
 if(a){for(const t of a.x){marks.append(svgNode('line',{x1:t.pos,x2:t.pos,y1:a.top,y2:a.bottom}),svgNode('text',{x:t.pos,y:a.bottom+25,'text-anchor':'middle'},t.v))}for(const t of a.y){marks.append(svgNode('line',{x1:a.left,x2:a.right,y1:t.pos,y2:t.pos}),svgNode('text',{x:a.left-8,y:t.pos+4,'text-anchor':'end'},t.v))}marks.append(svgNode('text',{x:a.left,y:20},a.ykey==='comments'?'Comments':'Reactions'),svgNode('text',{x:(a.left+a.right)/2,y:a.bottom+52,'text-anchor':'middle'},(a.xkey==='words'?'Caption words':'Reactions')+(a.fitted?'':' · log(1 + value)')))}
 for(const t of current.labels)marks.append(svgNode('text',{class:'group-label',x:t.x,y:t.y},t.text),svgNode('text',{class:'group-sub',x:state.mode==='rank'||t.missing?t.x:lastWidth-12,y:state.mode==='rank'||t.missing?t.y+19:t.y,'text-anchor':state.mode==='rank'||t.missing?'start':'end'},t.sub));guides.replaceChildren(marks);const axesDone=performance.now();
 syncVisible(retain);
 const iconsDone=performance.now();$('#view-description').textContent=descriptions[state.mode];$('#atlas-count').textContent=`${current.positions.size} of ${posts.length} posts`;
 root.querySelectorAll('[data-mode]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.mode===state.mode));root.querySelectorAll('[data-kind]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.kind===state.kind));root.querySelectorAll('[data-year]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.year===state.year));$('#rank-control').hidden=state.mode!=='rank';$('#reset').hidden=!state.query&&state.year==='recent'&&state.topic==='all'&&state.kind==='all';
 const missing=$('#missing');missing.hidden=!current.missing.length;missing.querySelector('summary').textContent=`${current.missing.length} posts lack the counters needed for this view`;if(missing.open)renderText(missing.querySelector('div'),current.missing);
 $('#text-index summary').textContent=`Browse this selection as an accessible text list (${current.rows.length})`;if($('#text-index').open)renderText($('#text-index>div'),current.rows);
 let empty=$('#no-results');if(!current.positions.size){if(!empty){empty=document.createElement('p');empty.id='no-results';empty.className='no-results';empty.textContent='No matching posts. Try another search or clear the filters.';stage.append(empty)}}else empty?.remove();
 performance.measure('atlas-width',{start,end:measured});performance.measure('atlas-calculation',{start:measured,end:calculated});performance.measure('atlas-axes',{start:calculated,end:axesDone});performance.measure('atlas-icons',{start:axesDone,end:iconsDone});performance.measure('atlas-layout',{start,end:performance.now()});
}

function syncVisible(retain=new Set()){
 if(!interactiveLayout)return;
 const top=windowEl.scrollTop-160,bottom=top+windowEl.clientHeight+320,visible=new Set(),a=current.axes;
 for(const [id,pos] of current.positions){if((pos.y+pos.h<top||pos.y>bottom)&&!retain.has(id))continue;visible.add(id);let el=icons.get(id);const p=byId.get(id);if(!el){el=document.createElement('button');el.className='post-icon';el.dataset.id=id;el.setAttribute('aria-label',`${p.date}: ${p.title}`);el.style.setProperty('--topic',data.colors[p.topic]||'#84919a');const visual=document.createElement('span');visual.className=p.image?'post-thumb':'no-image';if(p.image){visual.style.backgroundPosition=`${p.sprite[0]/(data.sprite.cols-1)*100}% ${p.sprite[1]/(data.sprite.rows-1)*100}%`;}else visual.textContent='No visual';const index=document.createElement('span');index.className='post-index';index.textContent=p.index;el.append(visual,index);stage.append(el);icons.set(id,el);}el.hidden=false;el.style.transform=`translate(${pos.x}px,${pos.y}px)`;el.style.width=pos.w+'px';el.style.height=pos.h+'px';el.classList.toggle('scatter-icon',!!a&&!pos.missing);el.querySelector('.post-index').hidden=!!a||state.mode==='rank';let bar=el.querySelector('.rank-bar');if(state.mode==='rank'&&!pos.missing){if(!bar){bar=document.createElement('span');bar.className='rank-bar';el.append(bar)}bar.style.width=pos.bar+'px'}else bar?.remove();if(p.tile){if(loadedPacks.has(p.tile.src))packStyle(p,el.querySelector('.post-thumb'));else requestPack(p.tile.src).catch(()=>{});}}

 for(const [id,el] of icons)if(!visible.has(id)&&!tileAnimations.has(id)){el.remove();icons.delete(id);}
}
let scrollFrame;windowEl.addEventListener('scroll',()=>{cancelAnimationFrame(scrollFrame);scrollFrame=requestAnimationFrame(()=>syncVisible())},{passive:true});

function renderText(container,rows){container.replaceChildren(...rows.map(p=>button(`#${p.index} · ${p.date} · ${p.title} · ${fmt(p.reactions)} reactions · ${fmt(p.comments)} comments`,()=>openPost(p))))}
const tileAnimations=new Map();
const motionDuration=1400,motionEasing='cubic-bezier(.4,0,.2,1)';
function change(update){
 const tween=update.mode&&update.mode!==state.mode&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 // Read rendered geometry before cancelling so interrupted transitions remain continuous.
 const previousLayout=current,previousScroll=windowEl.scrollTop,oldOrigin=stage.getBoundingClientRect();
 const before=tween?new Map([...icons].map(([id,el])=>{const r=el.getBoundingClientRect();return [id,{x:r.left-oldOrigin.left,y:r.top-oldOrigin.top-previousScroll,w:r.width,h:r.height}]})):null;
 for(const animation of tileAnimations.values())animation.cancel();tileAnimations.clear();
 Object.assign(state,update);windowEl.scrollTop=0;
 draw(before?new Set(before.keys()):new Set());
 if(!before)return;
 const height=windowEl.clientHeight;
 for(const [id,el] of icons){
  const pos=current.positions.get(id);if(!pos)continue;
  const old=previousLayout.positions.get(id),previous=before.get(id)||(old?{...old,y:old.y-previousScroll}:null);
  if(!previous)continue;
  // Long offscreen journeys start/end just outside the viewport, preserving direction.
  const clampY=(y,h)=>Math.max(-h-80,Math.min(height+80,y));
  const from={...previous,y:before.has(id)?previous.y:clampY(previous.y,previous.h)},to={...pos,y:clampY(pos.y,pos.h)};
  const animation=el.animate([
   {transform:`translate(${from.x}px,${from.y}px) scale(${from.w/pos.w},${from.h/pos.h})`},
   {transform:`translate(${to.x}px,${to.y}px) scale(1,1)`}
  ],{duration:motionDuration,easing:motionEasing});
  tileAnimations.set(id,animation);
  animation.onfinish=()=>{if(tileAnimations.get(id)===animation){tileAnimations.delete(id);if(!tileAnimations.size)syncVisible();}};
 }
 guides.getAnimations().forEach(animation=>animation.cancel());
 guides.animate([{opacity:.15},{opacity:1}],{duration:motionDuration,easing:motionEasing});
}
$('#atlas-controls').addEventListener('click',e=>{const target=e.target.closest('button');if(!target)return;if(target.dataset.kind)change({kind:target.dataset.kind});if(target.dataset.mode)change({mode:target.dataset.mode});if(target.dataset.year)change({year:target.dataset.year});if(target.id==='reset'){clearTimeout(searchTimer);$('#search').value='';$('#topic').value='all';change({query:'',year:'recent',topic:'all',kind:'all'})}});
let searchData;$('#search').addEventListener('input',e=>{clearTimeout(searchTimer);const query=e.target.value;searchTimer=setTimeout(async()=>{if(query&&!searchData){$('#atlas-count').textContent='Loading full-text search…';try{searchData=await fetch('data/search-text.json').then(r=>{if(!r.ok)throw Error();return r.json()});for(const p of posts)p.searchText=searchData[p.id]||'';}catch{$('#atlas-count').textContent='Full-text search unavailable; searching titles.';}}if($('#search').value===query)change({query});},160)});$('#topic').onchange=e=>change({topic:e.target.value});$('#metric').onchange=e=>change({metric:e.target.value});
$('#text-index').ontoggle=()=>{if($('#text-index').open)renderText($('#text-index>div'),current.rows)};$('#missing').ontoggle=()=>{if($('#missing').open)renderText($('#missing>div'),current.missing)};
let resizeFrame;new ResizeObserver(entries=>{viewportWidth=Math.floor(entries[0].contentRect.width);if(interactiveLayout&&Math.abs(lastWidth-viewportWidth)>2){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{for(const animation of tileAnimations.values())animation.cancel();tileAnimations.clear();draw()})}}).observe(windowEl);
// Sharpen only visible image packs. Two requests at a time; no full-sheet download.
const packCache=new Map(),packQueue=[],loadedPacks=new Set(),packMembers=new Map();for(const p of posts)if(p.tile){if(!packMembers.has(p.tile.src))packMembers.set(p.tile.src,[]);packMembers.get(p.tile.src).push(p);}let activePacks=0;
function packStyle(p,node){node.style.backgroundImage=`url("${new URL(p.tile.src,document.baseURI).href}")`;node.style.backgroundSize='800% 400%';node.style.backgroundPosition=`${p.tile.x/7*100}% ${p.tile.y/3*100}%`;node.dataset.sharp='true'}
function pumpPacks(){while(activePacks<2&&packQueue.length){const [src,resolve,reject]=packQueue.shift();activePacks++;const image=new Image();image.decoding='async';image.fetchPriority='low';image.onload=async()=>{try{await image.decode()}catch{}loadedPacks.add(src);for(const p of packMembers.get(src)||[])if(icons.has(p.id))packStyle(p,icons.get(p.id).querySelector('.post-thumb'));resolve(image);activePacks--;pumpPacks()};image.onerror=()=>{packCache.delete(src);reject();activePacks--;pumpPacks()};image.src=src}}
function requestPack(src){if(!packCache.has(src)){packCache.set(src,new Promise((resolve,reject)=>{packQueue.push([src,resolve,reject])}));pumpPacks()}return packCache.get(src)}
const tileObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){const p=byId.get(e.target.dataset.id);if(p.tile)requestPack(p.tile.src).catch(()=>{});tileObserver.unobserve(e.target)}},{root:windowEl,rootMargin:'80px'});
const atlasObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){for(const icon of icons.values())tileObserver.observe(icon);atlasObserver.disconnect()}},{rootMargin:'100px'});atlasObserver.observe(windowEl);
const previewCache=new Map();
function preview(p){if(!p.preview)return Promise.resolve(null);if(!previewCache.has(p.id)){const job=new Promise((resolve,reject)=>{const image=new Image();image.className='detail-preview';image.alt='';image.decoding='async';image.onload=async()=>{try{await image.decode()}catch{}resolve(image)};image.onerror=()=>reject(new Error('Preview unavailable'));image.src=p.preview});previewCache.set(p.id,job);job.catch(()=>previewCache.delete(p.id));if(previewCache.size>24)previewCache.delete(previewCache.keys().next().value)}return previewCache.get(p.id)}
function focusPost(p){focused=p;$('#inspector-index').textContent='#'+p.index;$('#inspector-title').textContent=p.title;$('#inspector-meta').textContent=`${p.date} · ${fmt(p.reactions)} reactions · ${fmt(p.comments)} comments`;$('#inspect-post').hidden=false;clearTimeout(warmTimer);warmTimer=setTimeout(()=>preview(p).catch(()=>{}),120)}
stage.addEventListener('pointerover',e=>{const el=e.target.closest('.post-icon');if(el&&!el.contains(e.relatedTarget))focusPost(byId.get(el.dataset.id))});stage.addEventListener('pointerout',e=>{if(e.target.closest('.post-icon')&&!e.target.closest('.post-icon').contains(e.relatedTarget))clearTimeout(warmTimer)});stage.addEventListener('focusin',e=>{const el=e.target.closest('.post-icon');if(el)focusPost(byId.get(el.dataset.id))});stage.addEventListener('click',e=>{const el=e.target.closest('.post-icon');if(el)openPost(byId.get(el.dataset.id))});$('#inspect-post').onclick=()=>focused&&openPost(focused);
const detailCache=new Map();
function loadDetail(p){if(!detailCache.has(p.detail))detailCache.set(p.detail,fetch(p.detail).then(r=>{if(!r.ok)throw Error('Text unavailable');return r.json()}).catch(e=>{detailCache.delete(p.detail);throw e}));return detailCache.get(p.detail).then(rows=>rows[p.id]);}
function openPost(record){const p=byId.get(record.id)||record;selected=p.id;const dialog=$('#post-dialog');$('#post-meta').textContent=`POST ${p.index} · ${p.date}`;$('#post-title').textContent=p.title;$('#post-topic').textContent=p.topic;$('#post-caption').textContent=p.caption||p.sharedText||'No author caption recovered.';$('#post-check').textContent=`${p.type}. ${p.status}. ${p.original?'Counters belong to this original post.':'Shared-content counters are excluded from this account’s response totals.'} ${p.checked?'Checked '+p.checked.slice(0,10)+'.':''}`;$('#post-caption').textContent='Loading full text…';loadDetail(p).then(text=>{if(selected===p.id)$('#post-caption').textContent=text.caption||text.sharedText||'No caption recovered.'}).catch(()=>{if(selected===p.id)$('#post-caption').textContent='Text could not load. Open the LinkedIn source or try again.'});
 const counters=$('#post-counters');counters.replaceChildren();for(const key of ['reactions','comments']){const span=document.createElement('span'),strong=document.createElement('strong');strong.textContent=fmt(p[key]);span.append(strong,key);counters.append(span)}const links=$('#post-links');links.replaceChildren();for(const [href,label] of [[p.source,'LinkedIn source ↗'],[p.image,'Original image ↗']])if(href){const a=document.createElement('a');a.href=href;a.textContent=label;a.target='_blank';a.rel='noopener';links.append(a)}
 const host=$('#dialog-image');host.replaceChildren();if(p.image){const visual=document.createElement('div');visual.className='dialog-visual';visual.setAttribute('role','img');visual.setAttribute('aria-label',p.title);visual.style.setProperty('--atlas-image',lowImage);visual.style.setProperty('--atlas-size',`${data.sprite.cols*100}% ${data.sprite.rows*100}%`);const thumb=document.createElement('span');thumb.className='post-thumb';thumb.style.backgroundPosition=`${p.sprite[0]/(data.sprite.cols-1)*100}% ${p.sprite[1]/(data.sprite.rows-1)*100}%`;if(p.tile&&packCache.has(p.tile.src))packStyle(p,thumb);thumb.classList.add('instant-preview');visual.append(thumb);host.append(visual);preview(p).then(image=>{if(selected===p.id&&image){visual.append(image);performance.mark('post-sharp')}}).catch(()=>{if(selected===p.id)host.append(button('Retry sharper preview',()=>{previewCache.delete(p.id);openPost(p)}))})}else host.textContent='No standalone visual.';
 if(!dialog.open)dialog.showModal();dialog.scrollTop=0;performance.mark('post-open');}
$('#post-dialog .close').onclick=()=>$('#post-dialog').close();$('#post-dialog').addEventListener('click',e=>{if(e.target===$('#post-dialog'))$('#post-dialog').close()});
// Only the analysis island loads D3. Its small data subset is already in memory.
let analysisPromise,stylesPromise;const jobs=new Map();const loadStyles=()=>stylesPromise??=new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=analysisStyles;link.onload=resolve;link.onerror=()=>{stylesPromise=null;link.remove();reject(new Error('Chart styles unavailable'))};document.head.append(link)});const loadAnalysis=()=>analysisPromise??=Promise.all([import('./analysis.js'),loadStyles()]).then(([m])=>m.createAnalysis(data,openPost,loadDetail));
function mount(el){if(!jobs.has(el.id))jobs.set(el.id,loadAnalysis().then(setup=>{el.querySelector('.chart-placeholder')?.remove();setup(el);el.dataset.ready='true'}).catch(error=>{console.error(error);const p=el.querySelector('.chart-placeholder');if(p){p.textContent='This chart could not load. ';p.append(button('Retry',()=>{analysisPromise=null;jobs.delete(el.id);mount(el)}))}}));return jobs.get(el.id)}
const chartsObserver=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting){chartsObserver.unobserve(e.target);mount(e.target)}},{rootMargin:'100px'});document.querySelectorAll('article.figure').forEach(el=>chartsObserver.observe(el));
async function goTo(id){const aliases={f06:'rank',f19:'timeline',f20:'topics',f21:'palette',f22:'rank',f30:'format',library:'timeline'};if(aliases[id]){change({mode:aliases[id]});$('#atlas').scrollIntoView();return}const target=document.getElementById(id);if(!target)return;if(target.matches('article.figure')){const figures=[...document.querySelectorAll('article.figure')];await Promise.all(figures.slice(0,figures.indexOf(target)+1).map(mount))}requestAnimationFrame(()=>target.scrollIntoView())}
$('#analysis-jump').onchange=e=>{if(e.target.value){history.replaceState(null,'','#'+e.target.value);goTo(e.target.value);e.target.value=''}};document.querySelector('a[href="#report"]').addEventListener('pointerenter',()=>loadAnalysis().catch(()=>{}),{once:true});addEventListener('hashchange',()=>goTo(location.hash.slice(1)));
draw();performance.mark('atlas-ready');performance.measure('app-init','app-start');if(location.hash)goTo(location.hash.slice(1));
