import {calculateKelly,requiredWinProbability} from './kelly.mjs?v=20261126-7';
import {installFinance} from './finance.mjs?v=20261126-7';
const $ = id => document.getElementById(id);
const fields = ['p','a','b'];
let model, mode='geometric';
const finance={update,percent:v=>percent(v),chartMode:()=>mode,setChartMode:value=>{mode=value;for(const id of ['arithmetic','geometric'])$(id).setAttribute('aria-pressed',String(id===value));}};
const percent = v => new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1,minimumFractionDigits:1}).format(Math.abs(v)<1e-12?0:v*100)+'%';
try {
  const query=new URLSearchParams(location.search);
  const saved=query.get('mode')==='finance'?null:JSON.parse(localStorage.getItem('kelly-inputs-v2')||'null');
  for(const key of fields) if(query.has(key)) $(key).value=query.get(key); else if(saved?.[key]!=null) $(key).value=saved[key];
} catch {}
function update(reset=true) {
  try {
    finance.beforeUpdate?.();
    if(fields.some(id=>$(id).value.trim()==='')) throw Error('세 가지 값을 모두 입력해라.');
    model=calculateKelly(finance.probability?.()??Number($('p').value)/100,Number($('a').value)/100,Number($('b').value)/100);
    $('error').hidden=true;$('results').hidden=false;
    $('edge').textContent=percent(model.edge);$('kelly').textContent=Number.isFinite(model.kelly)?percent(model.kelly):'상한 없음';
    $('f').max=Math.min(150,Math.floor(model.maxFraction*100/5)*5);$('f').disabled=false;$('invert').disabled=false;
    document.querySelector('.metrics').style.setProperty('--expectation-color',model.edge<0?'#c23838':model.edge>0?'#12804f':'#536d5f');
    const fixedTarget=finance.targetFraction?.();
    if(fixedTarget!=null){$('f').max=Math.max(Number($('f').max),fixedTarget*100);$('f').value=fixedTarget*100;}
    else if(reset) $('f').value=Math.min(model.kelly*100,Number($('f').max));
    for(const id of fields){if(document.activeElement!==$(id))$(id).value=String(Number(Number($(id).value).toFixed(1)));const slider=$(id+'-slider');slider.value=$(id).value;}
    try {if(new URLSearchParams(location.search).get('mode')!=='finance')localStorage.setItem('kelly-inputs-v2',JSON.stringify(Object.fromEntries(fields.map(id=>[id,$(id).value]))));} catch {}
    draw();finance.afterUpdate?.(true);
  } catch(error) {$('error').textContent=error.message;$('error').hidden=false;$('results').hidden=true;$('f').disabled=true;$('invert').disabled=true;model=null;finance.afterUpdate?.(false);}
}
function draw(){
  if(!model)return;
  const f=Number($('f').value)/100, fn=model[mode];
  $('f-value').textContent=percent(f);

  const geo=mode==='geometric';
  $('chart-title').textContent=`투자비중에 따른 ${geo?'기하 성장률':'산술적 기댓값'}`;
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
  const W=mobile?390:800,H=mobile?260:350,L=mobile?56:76,R=22,T=12,B=30;
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
for(const id of fields){
  const input=$(id);let previous=input.value;
  input.addEventListener('focus',()=>{previous=input.value;input.value='';});
  input.addEventListener('input',()=>{if(input.value.trim()!=='')update();});
  input.addEventListener('blur',()=>{if(input.value.trim()==='')input.value=previous;update();});
}
for(const id of fields)$(id+'-slider').addEventListener('input',()=>{$(id).value=$(id+'-slider').value;update();});
$('f').addEventListener('input',()=>{if(!model)return;const max=Number($('f').max),step=5,raw=Number($('f').value);const snapped=raw>=max-step/2?max:Math.round(raw/step)*step;$('f').value=snapped;const f=Math.min(snapped/100,model.maxFraction);finance.changeTarget?.(f);$('p').value=Number((requiredWinProbability(f,model.a,model.b)*100).toFixed(6));update(false);});
for(const id of ['arithmetic','geometric']) $(id).addEventListener('click',()=>{mode=id;for(const tab of ['arithmetic','geometric'])$(tab).setAttribute('aria-pressed',String(tab===id));draw();});
$('invert').addEventListener('click',()=>{
  if(!model)return;
  const a=$('a').value,b=$('b').value;
  $('p').value=Number((100-Number($('p').value)).toFixed(10));
  $('a').value=b;$('b').value=a;update();
});
window.addEventListener('resize',draw);
installFinance(finance);
update();
