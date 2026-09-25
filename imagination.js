(async()=>{
 const host=document.querySelector('#imagination');if(!host)return;
 try{
 const data=await fetch('assets/imagination.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
 const decisions=data.decisions,colors=['#7350c6','#dc7837','#168e9f'];let di=0,ci=decisions[0].selected,t=0,playing=false,last=0;
 const $=s=>host.querySelector(s),slider=$('[data-decision]'),phase=$('[data-horizon]'),play=$('[data-play]');slider.max=decisions.length-1;
 const canvases=[...host.querySelectorAll('canvas[data-view]')];
 const coords=decisions.flatMap(d=>[...d.current,...d.landmarks,...d.predicted.flat(2),...d.actual.flat(2)]);
 const bound=Math.max(1.1,...coords.flat().map(Math.abs))*1.1;
 function draw(canvas,paths,landmarks,progress){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fbfafc';ctx.fillRect(0,0,w,h);
  const pad=30,scale=(Math.min(w,h)-2*pad)/(2*bound),xy=p=>[w/2+p[0]*scale,h/2-p[1]*scale];
  ctx.strokeStyle='#e6e1ec';ctx.lineWidth=1;ctx.strokeRect(pad,pad,w-2*pad,h-2*pad);
  landmarks.forEach((p,i)=>{const[x,y]=xy(p);ctx.fillStyle='#e4ddec';ctx.strokeStyle='#a897b9';ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#6e617e';ctx.font='12px sans-serif';ctx.fillText('L'+(i+1),x+14,y+4)});
  const n=paths.length-1,q=Math.min(progress,n),k=Math.floor(q),alpha=q-k;
  for(let a=0;a<3;a++){
   ctx.strokeStyle=colors[a];ctx.lineWidth=2.5;ctx.globalAlpha=.3;ctx.setLineDash([5,5]);ctx.beginPath();paths.forEach((frame,j)=>{const p=xy(frame[a]);j?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
   ctx.beginPath();for(let j=0;j<=k;j++){const p=xy(paths[j][a]);j?ctx.lineTo(...p):ctx.moveTo(...p)}
   const next=paths[Math.min(k+1,n)][a],now=paths[k][a],p=xy(now.map((v,i)=>v+(next[i]-v)*alpha));ctx.lineTo(...p);ctx.stroke();ctx.fillStyle=colors[a];ctx.beginPath();ctx.arc(...p,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(a+1,p[0],p[1]+3);ctx.textAlign='left';
  }
 }
 const cards=$('[data-candidates]');
 function buildCards(){cards.innerHTML='';const d=decisions[di];d.scores.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.className='candidate'+(i===ci?' active':'');b.setAttribute('aria-pressed',String(i===ci));b.innerHTML='<span>Candidate '+(i+1)+(i===d.selected?' · selected':'')+'</span><strong>'+s.toFixed(2)+'</strong>';b.addEventListener('click',()=>{ci=i;buildCards();render()});cards.appendChild(b)})}
 function render(){const d=decisions[di];slider.value=di;phase.value=Math.min(t,8);$('[data-step]').textContent='Decision '+(di+1)+' / '+decisions.length;$('[data-phase]').textContent='Predicted step '+Math.min(t,8).toFixed(1)+' / '+data.horizon;
 draw(canvases[0],[d.current,d.executed],d.landmarks,Math.min(t/8,1));draw(canvases[1],d.predicted[ci],d.landmarks,t);draw(canvases[2],d.actual[ci],d.landmarks,t);
 $('[data-scores]').textContent='Candidate '+(ci+1)+' · predicted return '+d.scores[ci].toFixed(2)+' · simulator return '+d.actual_returns[ci].toFixed(2)+'. Planner selects candidate '+(d.selected+1)+' using predicted return only.';
 }
 function decision(value){di=Number(value);ci=decisions[di].selected;t=0;buildCards();render()}
 slider.addEventListener('input',()=>decision(slider.value));phase.addEventListener('input',()=>{t=Number(phase.value);render()});
 play.addEventListener('click',()=>{playing=!playing;play.textContent=playing?'Pause':'Play';last=0});
 $('[data-next]').addEventListener('click',()=>decision((di+1)%decisions.length));
 function tick(now){if(playing&&last){t+=(now-last)/850;if(t>10){decision((di+1)%decisions.length)}else render()}last=now;requestAnimationFrame(tick)}
 new IntersectionObserver(entries=>{playing=entries[0].isIntersecting;play.textContent=playing?'Pause':'Play';last=0},{threshold:.25}).observe(host);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;play.textContent='Play'}});
 buildCards();render();requestAnimationFrame(tick);$('[data-load]').hidden=true;
 }catch(e){$fallback(host,e)}
 function $fallback(h,e){h.querySelector('[data-load]').textContent='Could not load the recorded rollout. Please refresh to retry.';console.error(e)}
})();
