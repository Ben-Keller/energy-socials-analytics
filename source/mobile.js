document.querySelectorAll('.mobile-nav a').forEach(a=>a.addEventListener('click',()=>{if(a.hash==='#method')document.querySelector('#method').open=true}));
if(/^#f\d{2}$/.test(location.hash)){jumpToFigure(location.hash.slice(1));}
