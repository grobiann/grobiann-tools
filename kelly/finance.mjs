import {calculateKelly} from './kelly.mjs?v=20261126-2';

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
  let parentOrigin=null,inputMode='rates',records=[];
  const bar=document.createElement('div');bar.className='finance-toolbar';bar.hidden=true;
  bar.innerHTML='<div class="tabs" role="group" aria-label="입력 방식"><button id="rates-mode" aria-pressed="true">수익률 입력</button><button id="prices-mode" aria-pressed="false">가격 입력</button></div>';
  document.querySelector('.calculator').prepend(bar);
  const prices=document.createElement('div');prices.className='inputs price-inputs';prices.hidden=true;
  prices.innerHTML='<label>현재가격<div class="field"><input id="current" type="number" min="0" step="any" value="100"></div></label><label>이익 시 가격<div class="field"><input id="profit" type="number" min="0" step="any" value="120"></div></label><label>손실 시 가격<div class="field"><input id="loss" type="number" min="0" step="any" value="80"></div></label><p id="price-rates"></p>';
  document.querySelector('.inspect').before(prices);
  const aside=document.createElement('aside');aside.className='saved-calculations';aside.hidden=true;
  aside.innerHTML='<h2>저장한 계산</h2><form id="save-calculation"><label for="calculation-title">제목</label><input id="calculation-title" maxlength="100" required placeholder="예: 엔비디아 목표가 검토"><button id="save-button" type="button">현재 계산 저장</button></form><p id="save-status" role="status"></p><div id="saved-list"></div>';
  document.querySelector('main').append(aside);
  const status=text=>{$('save-status').textContent=text;};
  function setMode(next){
    inputMode=next;prices.hidden=next!=='prices';
    for(const id of ['a','b'])$(id).closest('.input-control').hidden=next==='prices';
    $('invert').hidden=next==='prices';
    document.querySelector('.calculator>.inputs').classList.toggle('price-probability',next==='prices');
    for(const mode of ['rates','prices'])$(mode+'-mode').setAttribute('aria-pressed',String(next===mode));
    api.update();
  }
  api.beforeUpdate=()=>{
    if(inputMode!=='prices')return;
    const rates=priceReturns($('current').value,$('profit').value,$('loss').value);
    $('a').value=String(rates.a*100);$('b').value=String(rates.b*100);
    $('price-rates').textContent=`승리 시 +${api.percent(rates.a)} · 패배 시 −${api.percent(rates.b)}`;
  };
  api.afterUpdate=valid=>{$('save-button').disabled=!valid; if(!valid)$('price-rates').textContent='';};
  for(const id of ['current','profit','loss'])$(id).addEventListener('input',()=>api.update());
  for(const mode of ['rates','prices'])$(mode+'-mode').addEventListener('click',()=>setMode(mode));
  function render(){
    const list=$('saved-list');list.replaceChildren();
    if(!records.length){list.textContent='저장한 계산이 없습니다.';return;}
    for(const record of records){
      const button=document.createElement('button');button.className='saved-item';
      const title=document.createElement('strong');title.textContent=record.title;
      const detail=document.createElement('span');
      try{const {model}=validateSnapshot(record.snapshot);detail.textContent=`켈리 ${Number.isFinite(model.kelly)?api.percent(model.kelly):'상한 없음'} · 승률 ${record.snapshot.p}%`;}catch{detail.textContent='불러올 수 없는 계산';button.disabled=true;}
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
  window.parent.postMessage({type:'kelly:ready',version:1},'*');
}
