document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{if(a.hash==='#method')document.querySelector('#method').open=true}));
if(/^#f\d{2}$/.test(location.hash)){requestAnimationFrame(()=>document.querySelector(location.hash)?.scrollIntoView({behavior:'auto'}));}
// Visible segmented choices with one sliding selection highlight.
function revealChoices(select){
 if(select.dataset.control==='sort'||select.id==='sort')return;
 if(select.options.length===1){select.hidden=true;const value=document.createElement('span');value.className='fixed-choice';value.textContent=select.options[0].textContent;select.after(value);return;}
 if(select.options.length<2||select.options.length>5)return;
 const name=select.getAttribute('aria-label')||select.id;
 let parent=select.parentElement;
 if(parent.matches('.data-controls label')){
  const field=document.createElement('div');field.className='control-field';field.hidden=parent.hidden;
  while(parent.firstChild)field.append(parent.firstChild);
  parent.replaceWith(field);parent=field;
 }
 const group=document.createElement('div');group.className='choice-slider';
 group.style.setProperty('--choices',select.options.length);group.setAttribute('role','group');group.setAttribute('aria-label',name);
 if(select.id==='year'||select.id==='sort'){
  const title=document.createElement('span');title.className='choice-heading';title.textContent=select.id==='year'?'Library year':'Order posts';group.append(title);
 }
 const labels=document.createElement('div');labels.className='choice-options';labels.style.setProperty('--choices',select.options.length);group.append(labels);
 const indicator=document.createElement('span');indicator.className='choice-indicator';indicator.setAttribute('aria-hidden','true');labels.append(indicator);
 group.setAttribute('role','radiogroup');
 const buttons=[...select.options].map((option,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=option.textContent;b.title=option.textContent;b.addEventListener('click',()=>choose(i));b.addEventListener('keydown',event=>{let next=i;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(i+1)%select.options.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(i-1+select.options.length)%select.options.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=select.options.length-1;else return;event.preventDefault();choose(next);buttons[next].focus()});labels.append(b);return b});
 function sync(){const i=Math.max(0,select.selectedIndex);buttons.forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-checked',String(i===j));b.tabIndex=i===j?0:-1});labels.style.setProperty('--selected',i);}
 function choose(i){select.selectedIndex=i;sync();select.dispatchEvent(new Event('change',{bubbles:true}));}
 select.addEventListener('change',sync);
 select.hidden=true;select.tabIndex=-1;select.after(group);sync();
}
document.querySelectorAll('select').forEach(revealChoices);
