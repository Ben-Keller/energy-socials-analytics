export function median(values){const a=values.filter(v=>v!==null&&Number.isFinite(v)).sort((a,b)=>a-b);return a.length?a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2:null}
export function statistic(rows,metric){if(metric==='share'){const known=rows.filter(p=>Number.isFinite(p.comments));return known.length?known.filter(p=>p.comments>=3).length/known.length:null}return median(rows.map(p=>p[metric]))}
export function captionRows(posts){return posts.filter(p=>p.words>0)}
export function comparableRows(posts,year){return captionRows(posts).filter(p=>p.year===year&&Number(p.month.slice(-2))<=9)}
export function lengthBand(p){return p.words<100?'Under 100':p.words<250?'100–249':'250 or more'}
export function formatRows(posts,topic,approach,year='all'){return captionRows(posts).filter(p=>p.classified&&p.topic===topic&&p.approach===approach&&(year==='all'||p.year===year))}
export function tagRows(posts,tags){return captionRows(posts).filter(p=>tags.every(t=>(p.tags||[]).includes(t)))}
export const topicNames=['AI and digital','Finance','Energy access','Technology and grids','Islands','People and opportunity','Transition policy','Other'];
export const approaches=['Insight or argument','Event reporting','Event invitation','Resource sharing','Opportunity','Personal voice'];
export const tags=[['AI and digital','AI & digital'],['Finance and investment','Finance'],['Access and useful energy','Energy access'],['Technology and grids','Technology & grids'],['Islands and resilience','Islands'],['People and opportunity','People & opportunity']];
