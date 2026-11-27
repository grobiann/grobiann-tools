import {calculateKelly,requiredWinProbability} from './kelly.mjs?v=20261127-1';

export function winProbabilityForPrices(target,current,profit,loss){
  const {a,b}=priceReturns(current,profit,loss);
  if(!Number.isFinite(target)||target<0||target*b>=1)throw Error('이 가격에서는 목표 투자비중을 유지할 수 없습니다. 가격을 조정하거나 고정을 해제하세요.');
  return requiredWinProbability(target,a,b);
}

export function priceReturns(current, profit, loss) {
  const values=[current,profit,loss];
  if(values.some(v=>String(v).trim()==='' || !Number.isFinite(Number(v))))throw Error('가격 세 가지를 모두 입력하세요.');
  const [c,w,l]=values.map(Number);
  if(c<=0 || w<=c || l<0 || l>=c)throw Error('이익 시 가격 > 현재가격 > 손실 시 가격 ≥ 0으로 입력하세요.');
  const a=(w-c)/c,b=(c-l)/c;
  if(!Number.isFinite(a)||a<=0||b<=0)throw Error('가격 차이를 확인하세요.');
  return {a,b};
}

export function validateSnapshot(value) {
  if(!value || !['rates','prices'].includes(value.inputMode) || !['arithmetic','geometric'].includes(value.chartMode))throw Error('저장된 계산 형식을 확인하세요.');
  const keys=['p','a','b','current','profit','loss'];
  if(keys.some(k=>typeof value[k]!=='string'||value[k].length>80))throw Error('저장된 입력값을 확인하세요.');
  if(!value.p.trim()||!value.a.trim()||!value.b.trim())throw Error('입력값을 모두 채우세요.');
  const rates=value.inputMode==='prices'?priceReturns(value.current,value.profit,value.loss):{a:Number(value.a)/100,b:Number(value.b)/100};
  const model=calculateKelly(Number(value.p)/100,rates.a,rates.b);
  return {snapshot:Object.fromEntries(['inputMode','chartMode',...keys].map(k=>[k,value[k]])),model};
}

export function installFinance(api) {
  if(new URLSearchParams(location.search).get('mode')!=='finance'||window.parent===window)return;
  const $=id=>document.getElementById(id);
  let parentOrigin=null,inputMode='rates',records=[],lockedTarget=null,exactProbability=null,lockedPrices=null;
  const bar=document.createElement('div');bar.className='finance-toolbar';bar.hidden=true;
  bar.innerHTML='<div class="tabs" role="group" aria-label="입력 방식"><button id="prices-mode" aria-pressed="true">가격 입력</button><button id="rates-mode" aria-pressed="false">수익률 입력</button></div>';
  document.querySelector('.calculator').prepend(bar);
  const prices=document.createElement('div');prices.className='inputs price-inputs';prices.hidden=true;
  prices.innerHTML='<label for="current">현재가격<div class="field"><input id="current" type="number" min="0" step="any" value="100"></div></label><label for="profit">이익 시 가격<div class="field"><input id="profit" aria-label="이익 시 가격" aria-describedby="profit-rate" type="number" min="0" step="any" value="120"><span id="profit-rate" class="price-rate profit-rate"></span></div></label><label for="loss">손실 시 가격<div class="field"><input id="loss" aria-label="손실 시 가격" aria-describedby="loss-rate" type="number" min="0" step="any" value="80"><span id="loss-rate" class="price-rate loss-rate"></span></div></label>';
  document.querySelector('.inspect').before(prices);
  for(const id of ['current','profit','loss']){
    const label=$(id).closest('label'),control=document.createElement('div');control.className='price-control';
    label.before(control);control.append(label);
    const slider=document.createElement('input');slider.type='range';slider.id=id+'-slider';slider.min=id==='loss'?'0':'0.5';slider.max='240';slider.step='0.5';slider.value=$(id).value;
    slider.setAttribute('aria-label',({current:'현재가격',profit:'이익 시 가격',loss:'손실 시 가격'})[id]+' 슬라이더');control.append(slider);
  }
  const lock=document.createElement('label');lock.className='target-lock';lock.hidden=true;
  lock.innerHTML='<input id="lock-target" type="checkbox">목표 투자비중 고정';document.querySelector('.inspect').append(lock);
  function releaseLock(){lockedTarget=null;lockedPrices=null;exactProbability=null;$('lock-target').checked=false;$('p').disabled=$('p-slider').disabled=false;}
  $('lock-target').addEventListener('change',()=>{
    if($('lock-target').checked){lockedTarget=Number($('f').value)/100;exactProbability=Number($('p').value)/100;lockedPrices=['current','profit','loss'].map(id=>$(id).value).join('|');$('p').disabled=$('p-slider').disabled=true;}else releaseLock();
    api.update(false);
  });
  api.changeTarget=f=>{if(lockedTarget!==null){lockedTarget=f;lockedPrices=null;}};
  const aside=document.createElement('aside');aside.className='saved-calculations';aside.hidden=true;
  aside.innerHTML='<h2>저장한 계산</h2><form id="save-calculation"><label for="calculation-title">제목</label><input id="calculation-title" maxlength="100" required placeholder="예: 엔비디아 목표가 검토"><button id="save-button" type="button">현재 계산 저장</button></form><p id="save-status" role="status"></p><div id="saved-list"></div>';
  document.querySelector('main').append(aside);
  const status=text=>{$('save-status').textContent=text;};
  function setMode(next){
    releaseLock();inputMode=next;prices.hidden=lock.hidden=next!=='prices';
    for(const id of ['a','b'])$(id).closest('.input-control').hidden=next==='prices';
    $('invert').hidden=next==='prices';
    document.querySelector('.calculator>.inputs').classList.toggle('price-probability',next==='prices');
    for(const mode of ['rates','prices'])$(mode+'-mode').setAttribute('aria-pressed',String(next===mode));
    api.update();
  }
  api.beforeUpdate=()=>{
    if(inputMode!=='prices')return;
    for(const id of ['current','profit','loss']){
      const slider=$(id+'-slider'),value=Number($(id).value);
      if(id==='current'){
        const lower=$('loss').value,upper=$('profit').value;
        const valid=lower.trim()!==''&&upper.trim()!==''&&Number.isFinite(Number(lower))&&Number.isFinite(Number(upper))&&Number(lower)>=0&&Number(upper)>Number(lower);
        slider.disabled=!valid;
        if(valid){slider.min=lower;slider.max=upper;}
      }else if(Number.isFinite(value)&&value>Number(slider.max))slider.max=String(Math.ceil(value*2));
      slider.value=$(id).value;
    }
    const rates=priceReturns($('current').value,$('profit').value,$('loss').value);
    if(lockedTarget!==null){
      const key=['current','profit','loss'].map(id=>$(id).value).join('|');
      if(key!==lockedPrices){exactProbability=winProbabilityForPrices(lockedTarget,$('current').value,$('profit').value,$('loss').value);lockedPrices=key;}
      $('p').value=String(Number((exactProbability*100).toFixed(1)));
    }
    $('a').value=String(rates.a*100);$('b').value=String(rates.b*100);
    $('profit-rate').textContent=`+${api.percent(rates.a)}`;$('loss-rate').textContent=`−${api.percent(rates.b)}`;
  };
  api.afterUpdate=valid=>{$('save-button').disabled=!valid; if(!valid){$('profit-rate').textContent='';$('loss-rate').textContent='';}};
  api.probability=()=>lockedTarget!==null?exactProbability:null;
  api.targetFraction=()=>inputMode==='prices'?lockedTarget:null;
  for(const id of ['current','profit','loss']){
    $(id).addEventListener('input',()=>api.update());
    $(id+'-slider').addEventListener('input',()=>{$(id).value=$(id+'-slider').value;api.update();});
  }
  for(const mode of ['rates','prices'])$(mode+'-mode').addEventListener('click',()=>setMode(mode));
  function render(){
    const list=$('saved-list');list.replaceChildren();
    if(!records.length){list.textContent='저장한 계산이 없습니다.';return;}
    for(const record of records){
      const button=document.createElement('button');button.className='saved-item';
      const title=document.createElement('strong');title.textContent=record.title;
      const detail=document.createElement('span');
      try{const {model}=validateSnapshot(record.snapshot);detail.textContent=`켈리 ${Number.isFinite(model.kelly)?api.percent(model.kelly):'상한 없음'} · 승률 ${api.percent(Number(record.snapshot.p)/100)}`;}catch{detail.textContent='불러올 수 없는 계산';button.disabled=true;}
      const date=document.createElement('time');date.textContent=new Date(record.createdAt).toLocaleString('ko-KR');
      button.append(title,detail,date);
      button.addEventListener('click',()=>{
        try{const {snapshot}=validateSnapshot(record.snapshot);for(const key of ['p','a','b','current','profit','loss'])$(key).value=snapshot[key];api.setChartMode(snapshot.chartMode);setMode(snapshot.inputMode);$('calculation-title').value=record.title;status('불러왔습니다.');}catch(error){status(error.message);}
      });list.append(button);
    }
  }
  $('calculation-title').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('save-button').click();}});
  $('save-button').addEventListener('click',event=>{
    event.preventDefault();if(!parentOrigin)return;
    try{
      const title=$('calculation-title').value.trim();if(!title)throw Error('제목을 입력하세요.');
      api.update();const raw={inputMode,chartMode:api.chartMode(),...Object.fromEntries(['p','a','b','current','profit','loss'].map(k=>[k,$(k).value]))};
      if(lockedTarget!==null)raw.p=String(exactProbability*100);
      const {snapshot,model}=validateSnapshot(raw);
      window.parent.postMessage({type:'kelly:save',version:1,title,snapshot,result:{kelly:Number.isFinite(model.kelly)?model.kelly:null,edge:model.edge}},parentOrigin);
      status('저장 중…');
    }catch(error){status(error.message);}
  });
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||!/^http:\/\/(127\.0\.0\.1|localhost):8765$/.test(event.origin)||event.data?.version!==1)return;
    if(event.data.type==='kelly:records'&&Array.isArray(event.data.records)){
      parentOrigin=event.origin;records=event.data.records;bar.hidden=aside.hidden=false;document.body.classList.add('finance-mode');render();status(event.data.saved?'저장했습니다.':'');api.update();
    }else if(event.data.type==='kelly:error'){parentOrigin=event.origin;bar.hidden=aside.hidden=false;document.body.classList.add('finance-mode');status(event.data.message||'저장하지 못했습니다.');}
  });
  setMode('prices');
  window.parent.postMessage({type:'kelly:ready',version:1},'*');
}
