import fs from 'node:fs';
import assert from 'node:assert/strict';
import {median,statistic,captionRows,comparableRows,lengthBand,formatRows,tagRows,tags} from '../src/report-math.js';
import {formatEvidence,cameraEvidence} from '../src/report-format-math.js';
const data=JSON.parse(fs.readFileSync(new URL('../src/report-data.json',import.meta.url)));
const verified=JSON.parse(fs.readFileSync(new URL('./fixtures/strategy_metrics.json',import.meta.url)));
const p=data.posts;let checks=0;function eq(actual,expected,label){assert.deepEqual(actual,expected,label);checks++}
eq(p.length,660,'originals');eq(captionRows(p).length,643,'captions');eq(p.filter(x=>Number.isFinite(x.reactions)&&Number.isFinite(x.comments)).length,656,'paired counters');eq(p.filter(x=>x.classified&&x.words>0).length,243,'classified captions');eq(p.filter(x=>x.tags.length&&x.words>0).length,221,'tagged captions');
function cohort(rows,expected,label){eq(rows.length,expected.n,label+' sample');eq(statistic(rows,'reactions'),expected.rx,label+' reactions');eq(statistic(rows,'comments'),expected.cm,label+' comments');eq(statistic(rows,'share'),expected.share,label+' threshold share')}
for(const v of verified.annual)cohort(comparableRows(p,v.year),v,'annual '+v.year);
for(const v of verified.length)cohort(captionRows(p).filter(x=>x.year===v.year&&lengthBand(x)===(v.band==='100 to 249'?'100–249':v.band)),v,'length '+v.year+' '+v.band);
for(const v of verified.cells)cohort(formatRows(p,v.topic,v.approach,v.year==='All'?'all':v.year),v,'format '+v.topic+' '+v.year+' '+v.approach);
for(const [i,n] of [121,115,70,98,32,47].entries())eq(tagRows(p,[tags[i][0]]).length,n,'topic '+tags[i][0]);
for(const [a,b,n] of [[0,1,61],[0,3,57],[1,3,45]])eq(tagRows(p,[tags[a][0],tags[b][0]]).length,n,'co-mention '+a+' '+b);
eq(data.recommendations.map(r=>r.title),[
'Make each post about one idea people can understand and directly engage with',
'Make simple data visualization the account’s strongest asset',
'Be provocative. Give readers a clear argument to engage with',
'Give readers a front-row seat to events. Never make it feel like promotion',
'Readers look for personal opportunity above all',
'Let more of the person and the uncertainty into the writing'],'agreed messages');
eq(data.snapshot,'6 October 2026','snapshot');eq(p.map(x=>x.date).sort().at(-1),'2026-09-25','latest original');const archive=JSON.parse(fs.readFileSync(new URL('../data/source.json',import.meta.url)));eq(archive.posts.map(x=>x.date).filter(Boolean).sort().at(-1),'2026-10-02','latest archive record');
// Verify the report’s embedded topic and approach charts against source records.
const classified=captionRows(p).filter(x=>x.classified);
for(const [approach,n,rx,cm] of [['Insight or argument',98,66,4],['Event reporting',79,74,4]]){
 const rows=classified.filter(x=>x.approach===approach);eq([rows.length,statistic(rows,'reactions'),statistic(rows,'comments')],[n,rx,cm],approach+' overall');
}
eq(classified.reduce((s,x)=>s+x.reactions,0),18170,'classified reactions total');
eq(classified.reduce((s,x)=>s+x.comments,0),889,'classified comments total');
for(const [topic,n,rx,cm] of [['AI and digital',54,60,3],['Finance',35,72,3],['Technology and grids',27,75,4],['People and opportunity',33,72,2],['Energy access',33,51,3],['Islands',27,65,3],['Transition policy',28,75,3],['Other',6,42.5,1]]){
 const rows=classified.filter(x=>x.topic===topic);eq([rows.length,statistic(rows,'reactions'),statistic(rows,'comments')],[n,rx,cm],topic+' ranking');
}
for(const [year,na,ne,ra,re] of [['2023',0,0,null,null],['2024',0,3,null,113],['2025',14,6,48.5,63],['2026',14,8,46,74]]){
 const args=formatRows(p,'AI and digital','Insight or argument',year),events=formatRows(p,'AI and digital','Event reporting',year);
 eq([args.length,events.length,statistic(args,'reactions'),statistic(events,'reactions')],[na,ne,ra,re],'AI '+year);
}
const cases=JSON.parse(fs.readFileSync(new URL('../src/report-cases.json',import.meta.url)));
eq(cases.length,6,'six featured posts');
for(const c of cases){const post=p.find(x=>x.date===c.date&&x.reactions===c.reactions);eq(!!post,true,c.key+' source post');eq(post.caption.includes(c.excerpt),true,c.key+' exact excerpt');eq(c.takeaways.length,3,c.key+' takeaways');}
const quarter=(year,q)=>captionRows(p).filter(x=>x.year===year&&Math.ceil(Number(x.month.slice(-2))/3)===q);
const start=quarter('2023',1),early=quarter('2025',1),last=quarter('2026',3);
eq([statistic(start,'words'),statistic(start,'reactions'),statistic(start,'share')],[39,49,2/19],'shared index baseline');
eq([statistic(last,'words'),statistic(last,'reactions'),statistic(last,'share')],[277,40,25/52],'latest quarter');
eq(statistic(last,'words')>statistic(early,'words'),true,'longer captions since early 2025');
eq(statistic(last,'reactions')<statistic(early,'reactions'),true,'fewer reactions since early 2025');
eq(statistic(last,'share')<statistic(early,'share'),true,'less discussion since early 2025');
for(const [approach,n,rx,cm] of [['Event invitation',21,53,1],['Resource sharing',28,57.5,1],['Opportunity',13,71,1],['Personal voice',4,60.5,3.5]]){const rows=classified.filter(x=>x.approach===approach);eq([rows.length,statistic(rows,'reactions'),statistic(rows,'comments')],[n,rx,cm],approach+' chart and narrative');}
const narratives=JSON.parse(fs.readFileSync(new URL('../src/report-narratives.json',import.meta.url)));
eq(narratives.length,6,'six recommendation paragraphs');
for(const [i,narrative] of narratives.entries())eq(narrative.filter(part=>typeof part==='object'&&part.href).length,1,'integrated research citation '+i);
// Verify the new evidence against the reviewed cohorts, rather than testing prose strings.
const ev=JSON.parse(fs.readFileSync(new URL('../src/report-evidence.json',import.meta.url)));
const E=captionRows(p),y26=E.filter(x=>x.year==='2026');
eq([statistic(y26.filter(x=>x.words>=250),'reactions'),statistic(y26.filter(x=>x.words<100),'reactions')],[55.5,27],'2026 length comparison');
const opensQuestion=x=>(x.caption.trim().match(/^[\s\S]+?[.!?](?=\s|$)/)?.[0]||x.caption.trim()).trim().endsWith('?');
const question=y26.filter(opensQuestion),other=y26.filter(x=>!opensQuestion(x));
eq([question.length,other.length],[40,107],'question opening cohorts');
eq([question.filter(x=>x.comments>=3).length,other.filter(x=>x.comments>=3).length],[29,45],'question opening discussion counts');
eq([question,other].map(rows=>Math.round(100*statistic(rows.filter(x=>x.words>=250),'share'))),[71,60],'question opening comparison among long captions');
const taggedPeople=tagRows(p,['People and opportunity']);
eq([taggedPeople.length,statistic(taggedPeople,'reactions'),statistic(taggedPeople,'comments')],[47,74,4],'overlapping people tag, not exclusive topic');
const taggedOther=tags.filter(([t])=>t!=='People and opportunity').map(([t])=>tagRows(p,[t]));
eq(taggedOther.every(rows=>statistic(rows,'reactions')>=64.5&&statistic(rows,'reactions')<=67&&statistic(rows,'comments')===3),true,'other overlapping tag medians');
const knownIds=new Set(p.map(x=>x.id));
for(const [name,ids] of [...Object.entries(ev.media),...['onCameraVideos','chartPosts','figureCardPosts'].map(k=>[k,ev[k]])]){
 eq(ids.every(id=>knownIds.has(id)),true,name+' IDs exist');eq(new Set(ids).size,ids.length,name+' IDs unique');
}
eq(new Set([...ev.chartPosts,...ev.figureCardPosts,...ev.onCameraVideos]).size,48,'visual classifications do not overlap');
const {groups}=formatEvidence(p,ev);
for(const [name,n,rxN,cmN,index,above] of [
 ['To-camera video',9,9,9,1.7,56],['Headline-figure card',28,28,28,1.1,68],
 ['Photo or graphic',359,359,358,1,41],['Text only',28,28,28,1,50],
 ['Chart, map or table',11,11,11,.9,45],['Other video',150,150,150,.7,28],['Link preview',58,58,58,.5,10]
]){
 const g=groups.find(x=>x.name===name);
 eq([g.rows.length,g.rxRows.length,g.cmRows.length,Math.round(g.index/10)/10,Math.round(g.above*100)],[n,rxN,cmN,index,above],name+' format comparison');
}
eq(groups.reduce((n,g)=>n+g.rows.length,0),643,'format groups cover captioned posts');
eq(groups.flatMap(g=>g.cmRows).every(x=>Number.isFinite(x.comments)),true,'unknown comment counts excluded');
const camera=cameraEvidence(p,ev);
eq([camera.start,camera.end,camera.camera.length,camera.others.length,camera.rows.length],['2026-03','2026-06',9,52,61],'same-month video comparison');
eq([statistic(camera.camera,'reactions'),statistic(camera.others,'reactions')],[114,48],'same-month video medians');
eq(camera.rows.every(x=>x.date>='2026-03-01'&&x.date<'2026-07-01'),true,'video chart excludes the later quarter');
const samples=classified.filter(x=>x.topic!=='Other'),topics=[...new Set(samples.map(x=>x.topic))];
const medians=topics.map(t=>statistic(samples.filter(x=>x.topic===t),'reactions')),gap=Math.max(...medians)-Math.min(...medians);
const quantile=(a,q)=>{const i=(a.length-1)*q,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l)};
eq(topics.every(t=>{const a=samples.filter(x=>x.topic===t).map(x=>x.reactions).sort((a,b)=>a-b);return quantile(a,.75)-quantile(a,.25)>gap}),true,'middle-half reaction ranges exceed between-topic median gap');
eq(medians.filter(v=>v>=60&&v<=75).length,6,'six main topics have median reactions from 60 to 75');
eq([['Insight or argument','Event reporting'],['Opportunity','Personal voice']].map(a=>Math.round(classified.filter(x=>a.includes(x.approach)).length/243*100)),[73,7],'writing approach shares');
eq(topics.filter(t=>statistic(formatRows(p,t,'Event reporting'),'reactions')>statistic(formatRows(p,t,'Insight or argument'),'reactions')).length,5,'event reaction lead on five topics');
const report={passed:checks,originals:p.length,captionRecords:643,classifiedCaptions:243,snapshot:data.snapshot};console.log(JSON.stringify(report));
