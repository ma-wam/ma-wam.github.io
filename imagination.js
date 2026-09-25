(async()=>{
 const host=document.querySelector('#imagination');if(!host)return;
 const $=s=>host.querySelector(s),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 let lang='zh',di=0,time=0,last=0,running=true,visible=false,inspect=null,data,small=[];
 const words={zh:{title:'先想象，再行动。',intro:'三个智能体要协作覆盖三个目标。先在模型里试走 8 种方案，选出预测得分最高的一种，只执行第一步。',steps:['观察当前位置','想象 8 种未来','选出最高分','执行一步，再规划'],story:['现在还没有行动。所有候选从同一个状态出发。','虚线是世界模型预测的未来，不是真实移动。','紫色卡片是模型预测得分最高的方案。','实心圆只按选中方案移动一步，然后重新规划。'],live:'真实环境',goal:'空心圈：目标',agents:'彩色圆：3 个智能体',futures:'8 个候选未来',pause:'暂停',play:'播放',next:'下一次决策 →',replay:'重播这一步',candidate:'方案',selected:'已选中',predicted:'预测得分',decision:'决策',details:'展开：预测与仿真有多大差别？',compare:'虚线：预测 · 实线：同一方案的仿真轨迹',protocol:'真实模型输出 · 16 次连续决策 · 每次 8 个候选 · 预测未来 8 步。动画只在记录点之间插值，仿真对照不参与选择。',pick:'点击卡片查看该方案的预测与仿真对照',loading:'正在载入真实模型轨迹…',actual:'仿真回报',error:'数据加载失败，请刷新重试。'},en:{title:'Imagine first. Act one step.',intro:'Three agents cooperate to cover three targets. Imagine 8 options, pick the highest predicted return, and execute just the first action.',steps:['Observe','Imagine 8 futures','Choose the best score','Act once, then replan'],story:['No action yet. Every candidate starts from this same state.','Dashed paths are model predictions, not real movement.','The purple card has the highest predicted return.','Solid agents move just one real step. Then planning starts again.'],live:'Real environment',goal:'Rings: targets',agents:'Colored dots: 3 agents',futures:'8 candidate futures',pause:'Pause',play:'Play',next:'Next decision →',replay:'Replay this decision',candidate:'Candidate',selected:'Selected',predicted:'Predicted return',decision:'Decision',details:'Inspect prediction versus simulation',compare:'Dashed: prediction · Solid: simulator trajectory',protocol:'Actual model outputs · 16 continuous decisions · 8 candidates per decision · 8-step prediction. Playback interpolates recorded points. Simulator checks do not select the candidate.',pick:'Click a card to compare its prediction and simulation',loading:'Loading recorded model trajectories…',actual:'Simulator return',error:'Could not load the data. Please refresh to retry.'}};
 const colors=['#8762e9','#e98b42','#20aaa3'];
 function phase(){return time<1.4?0:time<4.9?1:time<6.7?2:3}
 function future(){return clamp((time-1.4)/3.5,0,1)*8}
 function point(path,t,a){const k=Math.floor(clamp(t,0,path.length-1)),n=Math.min(k+1,path.length-1),f=clamp(t-k,0,1);return path[k][a].map((v,i)=>v+(path[n][a][i]-v)*f)}
 function scene(canvas,d){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,pad=w>400?48:20;
  const all=[...d.current,...d.landmarks,...d.predicted.flat(2),...d.actual.flat(2)];
  const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),1)*1.2,scale=(Math.min(w,h)-pad*2)/span;
  const xy=p=>[w/2+(p[0]-cx)*scale,h/2-(p[1]-cy)*scale];
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#f9f8fd';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#e8e3f2';for(let x=20;x<w;x+=24)for(let y=20;y<h;y+=24){ctx.beginPath();ctx.arc(x,y,.9,0,Math.PI*2);ctx.fill()}
  d.landmarks.forEach(p=>{ctx.beginPath();ctx.arc(...xy(p),w>400?17:7,0,Math.PI*2);ctx.strokeStyle='#aaa0be';ctx.lineWidth=2;ctx.stroke()});
  return {ctx,xy,w};
 }
 function trail(v,path,t,dash,alpha,width){for(let a=0;a<3;a++){v.ctx.strokeStyle=colors[a];v.ctx.lineWidth=width;v.ctx.globalAlpha=alpha;v.ctx.setLineDash(dash?[5,4]:[]);v.ctx.beginPath();for(let k=0;k<=Math.floor(t);k++){const p=v.xy(path[Math.min(k,path.length-1)][a]);k?v.ctx.lineTo(...p):v.ctx.moveTo(...p)}v.ctx.lineTo(...v.xy(point(path,t,a)));v.ctx.stroke()}v.ctx.setLineDash([]);v.ctx.globalAlpha=1}
 function dots(v,positions,ghost=false){positions.forEach((p,a)=>{v.ctx.globalAlpha=ghost?.55:1;v.ctx.fillStyle=colors[a];v.ctx.beginPath();v.ctx.arc(...v.xy(p),v.w>400?10:4.5,0,Math.PI*2);v.ctx.fill();v.ctx.strokeStyle='white';v.ctx.lineWidth=2;v.ctx.stroke()});v.ctx.globalAlpha=1}
 function labels(){const w=words[lang];for(const el of host.querySelectorAll('[data-i18n]'))el.textContent=w[el.dataset.i18n];$('[data-language]').textContent=lang==='zh'?'English':'中文';$('[data-play]').textContent=running?w.pause:w.play;host.querySelectorAll('[data-stage]').forEach((el,i)=>el.querySelector('span').textContent=w.steps[i])}
 function render(){if(!data)return;const d=data.decisions[di],ph=phase(),w=words[lang];labels();$('[data-story]').textContent=w.story[ph];$('[data-count]').textContent=w.decision+' '+(di+1)+' / '+data.decisions.length;$('[data-decision]').value=di;
 host.querySelectorAll('[data-stage]').forEach((el,i)=>{el.classList.toggle('active',i===ph);el.classList.toggle('done',i<ph)});$('[data-progress]').style.width=clamp(time/8.8,0,1)*100+'%';
 const v=scene($('[data-world]'),d);if(ph===1){d.predicted.forEach(p=>trail(v,p,future(),true,.12,2))}if(ph>=2)trail(v,d.predicted[d.selected],8,true,.65,3);
 const actual=ph===3?d.current.map((p,a)=>p.map((x,k)=>x+(d.executed[a][k]-x)*clamp((time-6.7)/1.3,0,1))):d.current;dots(v,actual);
 const lo=Math.min(...d.scores),hi=Math.max(...d.scores);
 small.forEach((o,i)=>{const reveal=ph>=2,selected=i===d.selected&&reveal;o.button.classList.toggle('winner',selected);o.button.classList.toggle('dimmed',reveal&&!selected);o.label.textContent=w.candidate+' '+(i+1);o.badge.textContent=selected?'✓ '+w.selected:'';o.score.textContent=reveal?w.predicted+' '+d.scores[i].toFixed(1):' ';o.bar.style.width=reveal?(15+85*(d.scores[i]-lo)/(hi-lo||1))+'%':'0%';const c=scene(o.canvas,d);trail(c,d.predicted[i],ph===0?0:future(),true,.8,2);dots(c,[0,1,2].map(a=>point(d.predicted[i],ph===0?0:future(),a)),true)});
 const ci=inspect===null?d.selected:inspect,cv=scene($('[data-compare]'),d);trail(cv,d.predicted[ci],8,true,.65,3);trail(cv,d.actual[ci],8,false,1,2);dots(cv,d.actual[ci][8]);$('[data-comparison]').textContent=w.candidate+' '+(ci+1)+' · '+w.predicted+' '+d.scores[ci].toFixed(2)+' · '+w.actual+' '+d.actual_returns[ci].toFixed(2);
 }
 function reset(n){di=n;time=0;inspect=null;render()}
 try{
  data=await fetch('assets/imagination.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()});$('[data-decision]').max=data.decisions.length-1;
  for(let i=0;i<8;i++){const b=document.createElement('button');b.type='button';b.className='future-card';b.innerHTML='<div class="future-head"><span></span><b></b></div><canvas width="240" height="190"></canvas><div class="future-score"></div><div class="future-track"><i></i></div>';b.setAttribute('aria-label','Inspect candidate '+(i+1));$('[data-futures]').appendChild(b);const o={button:b,label:b.querySelector('span'),badge:b.querySelector('b'),canvas:b.querySelector('canvas'),score:b.querySelector('.future-score'),bar:b.querySelector('i')};small.push(o);b.addEventListener('click',()=>{inspect=i;running=false;$('[data-details]').open=true;render()})}
  $('[data-load]').hidden=true;render();
  $('[data-language]').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';render()});$('[data-play]').addEventListener('click',()=>{running=!running;last=0;render()});$('[data-next]').addEventListener('click',()=>reset((di+1)%data.decisions.length));$('[data-replay]').addEventListener('click',()=>{running=true;last=0;reset(di)});$('[data-decision]').addEventListener('input',e=>reset(Number(e.target.value)));
  new IntersectionObserver(e=>{visible=e[0].isIntersecting;last=0},{threshold:.15}).observe(host);
  function tick(now){if(last&&running&&visible&&!document.hidden){time+=Math.min((now-last)/1000,.1);if(time>8.8)reset((di+1)%data.decisions.length);else render()}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);
 }catch(e){$('[data-load]').textContent=words[lang].error;console.error(e)}
})();
