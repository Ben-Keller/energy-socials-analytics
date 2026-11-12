import {setImageAttributes} from './responsive-images.js';
import {captionRows,tagRows} from './report-math.js';
import {createFlagshipCharts} from './flagship-charts.js';
import {createAnalysis} from './analysis.js';
import explorerMeta from './report-explorer-meta.json';
import {TOPIC_COLORS} from './report-palette.js';
import {revealCharts} from './chart-reveals.js';
document.querySelectorAll('[data-algorithm-reveal]').forEach(host=>revealCharts(host,host.dataset.algorithmReveal));
const $=s=>document.querySelector(s),D=JSON.parse($('#report-data').textContent),P=D.posts,C=captionRows(P).filter(p=>p.classified),byId=new Map(P.map(p=>[p.id,p]));
const base=D.base;
const fmt=n=>n===null||n===undefined?'Unknown':Number.isInteger(n)?n.toLocaleString('en-GB'):n.toLocaleString('en-GB',{maximumFractionDigits:1});
const date=p=>new Date(p.date+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const asset=src=>!src?'':D.media?.[src]||(/^(data:|https?:)/.test(src)?src:base+src);
function el(tag,text,cls){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node}
function title(p){return (p.caption?.split(/\r?\n/).find(Boolean)||p.title||'Original post').slice(0,180)}
function imageFor(p,large=false){const src=large?(p.image||p.thumbnail):p.thumbnail;if(!src)return null;const im=el('img');if(D.media)im.src=asset(src);else setImageAttributes(im,p,base,{height:280,mobileHeight:220,cap:large?1280:320});im.alt='Visual accompanying the post';im.decoding='async';return im}
function hideTip(){$('#chart-tooltip').hidden=true}
// A single accessible post browser serves every chart and preserves its selected cohort.
const dialog=$('#records-dialog');let recordRows=[],filteredRows=[],selectedId=null;
function showRecord(p){selectedId=p.id;const host=$('#record-detail'),im=imageFor(p,true),meta=el('p',`${date(p)} · ${p.classified?p.topic:p.original===false?'Shared post':'Original post'} · ${p.words||0} words`,'record-meta'),heading=el('h3',title(p)),counts=el('p',`${fmt(p.reactions)} reactions · ${fmt(p.comments)} comments`,'record-meta'),caption=el('p',p.caption||'No caption recovered for this record.','full-caption'),link=el('a','Open original on LinkedIn ↗','source-link');link.href=p.source;link.target='_blank';link.rel='noopener noreferrer';host.replaceChildren(...[im,meta,heading,counts,caption,link].filter(Boolean));host.scrollTop=0;$('#records-list').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.post===p.id));$('#records-status').textContent=`Selected ${date(p)}: ${title(p)}`}
function renderRecords(preferred){const query=$('#records-search').value.trim().toLocaleLowerCase(),order=$('#records-sort').value;filteredRows=recordRows.filter(p=>!query||(p.caption+' '+p.title+' '+p.topic).toLocaleLowerCase().includes(query)).sort(order==='newest'?(a,b)=>b.date.localeCompare(a.date):(a,b)=>(b[order]??-1)-(a[order]??-1)||b.date.localeCompare(a.date));$('#records-scope').textContent=`${filteredRows.length} of ${recordRows.length} posts in this selection`;const frag=document.createDocumentFragment();for(const p of filteredRows){const b=el('button',null,'record-row');b.dataset.post=p.id;b.append(el('small',date(p)+' · '+(p.classified?p.topic:'Original')),el('strong',title(p)),el('span',`${fmt(p.reactions)} reactions · ${fmt(p.comments)} comments`));b.addEventListener('click',()=>showRecord(p));frag.append(b)}$('#records-list').replaceChildren(frag);if(filteredRows.length)showRecord(filteredRows.find(p=>p.id===(preferred||selectedId))||filteredRows[0]);else{$('#record-detail').replaceChildren(el('p','No posts match this search. Try another term.','empty-selection'));$('#records-list').replaceChildren(el('p','No matching posts.','empty-selection'))}}
function openRows(rows,label,preferred){recordRows=[...rows];dialog.classList.toggle('single-post',recordRows.length===1);$('#records-title').textContent=recordRows.length===1?'LinkedIn post':label.replace(/\. Open (source )?posts\.$/,'');$('#records-search').value='';$('#records-sort').value='reactions';renderRecords(preferred);if(!dialog.open)dialog.showModal();$('#records-list').scrollTop=0;hideTip()}
$('#records-search').addEventListener('input',()=>renderRecords());$('#records-sort').addEventListener('change',()=>renderRecords());$('.dialog-close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
// Keep post dialogs in the page viewport, including when the archive is very tall.
document.addEventListener('atlas-open-post',event=>{
 const source=event.detail;if(!source?.id)return;
 event.preventDefault();
 const known=P.find(post=>post.index===source.index);
 const record=known||{...source,caption:source.caption||source.sharedText||source.title,words:source.words||0};
 openRows([record],'LinkedIn post',record.id);
 if(!known&&source.detail)fetch(base+source.detail).then(response=>{if(!response.ok)throw Error('Caption unavailable');return response.json()}).then(rows=>{
  const detail=rows[source.id];if(!detail)return;
  record.caption=detail.caption||detail.sharedText||record.caption;
  if(dialog.open&&selectedId===record.id)showRecord(record);
 }).catch(()=>{/* The preview and original LinkedIn link remain available. */});
});
function saveFile(blob,name){const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
$('#records-csv').onclick=()=>{const cols=['date','topic','approach','words','reactions','comments','caption','source'];const escape=value=>'"'+String(value??'').replace(/^[=+\-@]/,"'$&").replaceAll('"','""')+'"';saveFile(new Blob(['\uFEFF'+[cols,...filteredRows.map(p=>cols.map(k=>p[k]))].map(row=>row.map(escape).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'Selected_LinkedIn_Posts.csv')};
document.querySelectorAll('[data-post]').forEach(b=>b.onclick=()=>openRows([byId.get(b.dataset.post)],'Selected original post',b.dataset.post));
document.querySelectorAll('[data-pair]').forEach(b=>b.onclick=()=>openRows(tagRows(P,b.dataset.pair.split('|')),b.querySelector('strong').textContent));

const nativeData={posts:P,colors:TOPIC_COLORS,originalAnalysis:explorerMeta,originalRecords:P.map(p=>({activity_id:p.id,caption_eligible:p.words>0,ranking_eligible:Number.isFinite(p.reactions)&&Number.isFinite(p.comments)}))};
const setupEmbedded=createAnalysis(nativeData,p=>openRows([byId.get(p.id)],'Selected original post',p.id),p=>Promise.resolve(byId.get(p.id)),{openRows});
const mountedCharts=new WeakSet();
function mountVisibleCharts(){document.querySelectorAll('.embedded-analysis').forEach(host=>{if(!host.closest('[hidden]')&&!mountedCharts.has(host)){setupEmbedded(host);mountedCharts.add(host)}})}
mountVisibleCharts();
const reportFrame=$('#report-explorer');let atlasObserver;
function sizeReportAtlas(){const atlas=reportFrame.contentDocument?.querySelector('#atlas');if(!atlas)return;atlasObserver?.disconnect();atlasObserver=new ResizeObserver(()=>{const box=atlas.getBoundingClientRect();if(box.width>0)reportFrame.style.height=Math.ceil(box.height)+2+'px'});atlasObserver.observe(atlas)}
reportFrame.addEventListener('load',sizeReportAtlas);if(reportFrame.contentDocument?.readyState==='complete')sizeReportAtlas();
const {draws}=createFlagshipCharts({posts:P,asset,openRows});draws.forEach(f=>f());let resizeFrame;let lastWidth=innerWidth;new ResizeObserver(()=>{if(Math.abs(innerWidth-lastWidth)<2)return;lastWidth=innerWidth;cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>draws.forEach(f=>f()))}).observe(document.body);
addEventListener('scroll',hideTip,{passive:true});
if(location.protocol==='file:'||document.documentElement.classList.contains('standalone'))document.documentElement.classList.add('standalone');


let reportScroll=0;
function setView(view,target='atlas',updateHash=true){const explore=view==='explore'&&!document.documentElement.classList.contains('standalone');if(explore&&!document.body.classList.contains('exploring'))reportScroll=scrollY;$('#report-panel').hidden=explore;$('#explorer-panel').hidden=!explore;document.body.classList.toggle('exploring',explore);document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===(explore?'explore':'report');b.setAttribute('aria-selected',active);b.tabIndex=active?0:-1});if(explore){const frame=$('#full-explorer');if(!frame.hasAttribute('src'))frame.src=frame.dataset.src.replace('#atlas','#'+target);scrollTo(0,0)}else{requestAnimationFrame(()=>{draws.forEach(f=>f());scrollTo(0,reportScroll)})}if(updateHash)history.replaceState(null,'',explore?'#explore':'#top');}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-open-explorer]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setView('explore')}));
$('.view-switch').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const view=e.key==='Home'?'report':e.key==='End'?'explore':document.body.classList.contains('exploring')?'report':'explore';setView(view);$(`[data-view="${view}"]`).focus()});
$('.wordmark').addEventListener('click',e=>{e.preventDefault();reportScroll=0;setView('report')});
function routeView(){const h=location.hash;if(h.startsWith('#explore'))setView('explore',h.split('/')[1]||'atlas',false);else if(h==='#atlas'||/^#f\d/.test(h))setView('explore',h.slice(1));else if(document.body.classList.contains('exploring'))setView('report','atlas',false)}
addEventListener('hashchange',routeView);routeView();
