document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{if(a.hash==='#method')document.querySelector('#method').open=true}));
if(/^#f\d{2}$/.test(location.hash)){requestAnimationFrame(()=>document.querySelector(location.hash)?.scrollIntoView({behavior:'auto'}));}
// Discrete sliders keep every short-list choice visible, with no popup menu.
function revealChoices(select){
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
 const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=select.options.length-1;slider.step=1;slider.setAttribute('aria-label',name);group.append(slider);
 const buttons=[...select.options].map((option,i)=>{const b=document.createElement('button');b.type='button';b.tabIndex=-1;b.textContent=option.textContent;b.title=option.textContent;b.addEventListener('click',()=>{slider.value=i;choose()});labels.append(b);return b});
 function sync(){const i=Math.max(0,select.selectedIndex);slider.value=i;slider.setAttribute('aria-valuetext',select.options[i].textContent);buttons.forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',String(i===j))});group.style.setProperty('--position',i/(select.options.length-1));}
 function choose(){select.selectedIndex=Number(slider.value);sync();select.dispatchEvent(new Event('change',{bubbles:true}));}
 slider.addEventListener('input',choose);select.addEventListener('change',sync);
 select.hidden=true;select.tabIndex=-1;select.after(group);sync();
}
document.querySelectorAll('select').forEach(revealChoices);
