import {calculateKelly,requiredWinProbability} from './kelly.mjs';
const $ = id => document.getElementById(id);
const fields = ['p','a','b'];
let model, mode='geometric';
const percent = v => new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2,minimumFractionDigits:1}).format(Math.abs(v)<1e-12?0:v*100)+'%';
try {
  const query=new URLSearchParams(location.search);
  const saved=JSON.parse(localStorage.getItem('kelly-inputs-v2')||'null');
  for(const key of fields) if(query.has(key)) $(key).value=query.get(key); else if(saved?.[key]!=null) $(key).value=saved[key];
} catch {}
function update(reset=true) {
  try {
    if(fields.some(id=>$(id).value.trim()==='')) throw Error('세 가지 값을 모두 입력해라.');
    model=calculateKelly(...fields.map(id=>Number($(id).value)/100));
    $('error').hidden=true;$('results').hidden=false;
    $('edge').textContent=percent(model.edge);$('kelly').textContent=Number.isFinite(model.kelly)?percent(model.kelly):'상한 없음';
    $('boundary').hidden=model.rawKelly>=0 && model.p<1;
    $('boundary').textContent=model.p===1?'승률 100%에서는 차입비용이 없는 이 모형의 성장률이 계속 증가하므로 유한한 최적 비중이 없다. 그래프는 1/b까지만 표시한다.':`공식의 계산값은 ${percent(model.rawKelly)}다. 공매도를 제외하므로 투자비중은 0%로 표시한다.`;
    $('f').max=model.maxFraction*100;
    if(reset) $('f').value=Math.min(model.kelly,model.maxFraction)*100;
    for(const id of fields){const slider=$(id+'-slider');if(id==='a')slider.max=Math.max(200,Number($(id).value));slider.value=$(id).value;}
    $('domain-note').textContent=`그래프 범위: 0~${percent(model.maxFraction)}. 손실률 ${percent(model.b)}에서 투자비중 ${percent(model.maxFraction)}는 한 번 패배하면 전체 자산을 잃는 경계다. 차입금리·비용은 제외한다.`;
    try {localStorage.setItem('kelly-inputs-v2',JSON.stringify(Object.fromEntries(fields.map(id=>[id,$(id).value]))));} catch {}
    draw();
  } catch(error) {$('error').textContent=error.message;$('error').hidden=false;$('results').hidden=true;model=null;}
}
function draw(){
  if(!model)return;
  const f=Number($('f').value)/100, fn=model[mode];
  $('f-value').textContent=percent(f);
  $('point').textContent=model.p===1?'필요 승률 100%. 이 끝점에서는 유한한 켈리 최적값이 없다.':model.kelly===0?`현재 승률 ${percent(model.p)}. 0% 비중의 경계 승률은 ${percent(requiredWinProbability(0,model.a,model.b))}다.`:`필요 승률 ${percent(model.p)} · 드래그하면 위의 승률과 그래프가 함께 바뀐다.`;
  const geo=mode==='geometric';
  $('chart-title').textContent=`투자비중에 따른 ${geo?'기하 성장률':'산술적 기댓값'}`;
  $('chart-note').textContent=geo?'기하 성장률 = exp(g(f)) − 1. 곡선의 최댓값이 켈리 최적 비중이다.':'산술적 기댓값 = f × (pa − qb). 직선 위의 파란 표시는 로그 성장률을 최대로 만드는 켈리 비중이다.';
  const limit=model.maxFraction;
  const optimum=Math.min(model.kelly,limit);
  const points=Array.from({length:401},(_,i)=>({f:i/400*limit,y:fn(i/400*limit)}));
  points.push({f:optimum,y:fn(optimum)});points.sort((a,b)=>a.f-b.f);
  const low=Math.min(0,...points.map(d=>d.y));const high=Math.max(0,...points.map(d=>d.y));
  const span=Math.max(high-low,.02), rough=span/4;
  const base=10**Math.floor(Math.log10(rough));
  const tick=[1,2,2.5,5,10].map(v=>v*base).find(v=>v>=rough);
  const min=Math.floor(low/tick)*tick,max=Math.max(min+tick,Math.ceil(high/tick)*tick);
  const mobile=matchMedia('(max-width:650px)').matches;
  const W=mobile?440:800,H=mobile?300:350,L=mobile?68:76,R=20,T=25,B=45;
  const x=f=>L+f/limit*(W-L-R), y=v=>T+(max-v)/(max-min)*(H-T-B);
  let out=`<desc id="chart-desc">투자비중 0~${percent(limit)}에 따른 ${geo?'기하 성장률':'산술적 기댓값'}. 켈리 최적 비중 ${$('kelly').textContent}.</desc>`;
  for(let t=min;t<=max+tick/10;t+=tick) {out+=`<line x1="${L}" y1="${y(t)}" x2="${W-R}" y2="${y(t)}" stroke="#e5ece7"/><text x="${L-10}" y="${y(t)+5}" text-anchor="end" fill="#6b7e71" font-size="13">${percent(t)}</text>`;}
  for(let i=0;i<=4;i++){const f=limit*i/4;out+=`<line x1="${x(f)}" y1="${T}" x2="${x(f)}" y2="${H-B}" stroke="#e5ece7"/><text x="${x(f)}" y="${H-15}" text-anchor="middle" fill="#6b7e71" font-size="13">${percent(f)}</text>`;}
  out+=`<line x1="${L}" y1="${y(0)}" x2="${W-R}" y2="${y(0)}" stroke="#9aaba0" stroke-width="1.3"/>`;
  const d=points.map((p,i)=>`${i?'L':'M'}${x(p.f).toFixed(2)},${y(p.y).toFixed(2)}`).join(' ');
  out+=`<path d="${d} L${x(limit)},${y(0)} L${x(0)},${y(0)} Z" fill="#16965f" fill-opacity=".05"/><path d="${d}" fill="none" stroke="#16965f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(Number.isFinite(model.kelly))out+=`<line x1="${x(optimum)}" y1="${T}" x2="${x(optimum)}" y2="${H-B}" stroke="#4285ec" stroke-dasharray="6 5" stroke-width="1.5"/><circle cx="${x(optimum)}" cy="${y(fn(optimum))}" r="6" fill="#4285ec" stroke="white" stroke-width="2"/>`;
  $('chart').setAttribute('viewBox',`0 0 ${W} ${H}`);$('chart').innerHTML=out;
}
for(const id of fields)$(id).addEventListener('input',()=>update());
for(const id of fields)$(id+'-slider').addEventListener('input',()=>{$(id).value=$(id+'-slider').value;update();});
$('f').addEventListener('input',()=>{if(!model)return;const f=Math.min(Number($('f').value)/100,model.maxFraction);$('p').value=Number((requiredWinProbability(f,model.a,model.b)*100).toFixed(6));update(false);});
for(const id of ['arithmetic','geometric']) $(id).addEventListener('click',()=>{mode=id;for(const tab of ['arithmetic','geometric'])$(tab).setAttribute('aria-pressed',String(tab===id));draw();});
window.addEventListener('resize',draw);
$('share').addEventListener('click',async()=>{
  if(!model){$('status').textContent='입력값을 먼저 확인해라.';setTimeout(()=>$('status').textContent='',3000);return;}
  const url=new URL(location.href);url.search=new URLSearchParams(Object.fromEntries(fields.map(id=>[id,$(id).value]))).toString();
  try{await navigator.clipboard.writeText(url.href);$('status').textContent='현재 조건의 링크를 복사했다.';}catch{prompt('아래 링크를 복사해라.',url.href);}
  setTimeout(()=>$('status').textContent='',3000);
});
update();
