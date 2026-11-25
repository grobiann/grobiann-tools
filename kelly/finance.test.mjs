import test from 'node:test';
import assert from 'node:assert/strict';
import {priceReturns,validateSnapshot} from './finance.mjs';
test('price inputs convert relative to current price',()=>{
  assert.deepEqual(priceReturns('100','120','80'),{a:.2,b:.2});
  assert.deepEqual(priceReturns('200','300','0'),{a:.5,b:1});
  for(const values of [['','120','80'],[0,120,80],[100,99,80],[100,120,100],[100,120,-1],[100,Infinity,80]])assert.throws(()=>priceReturns(...values));
});
test('stored prices survive precision and produce matching Kelly result',()=>{
  const raw={inputMode:'prices',chartMode:'geometric',p:'60',a:'20',b:'20',current:'0.001',profit:'0.0012',loss:'0.0008'};
  const {snapshot,model}=validateSnapshot(JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(snapshot,raw);assert.ok(Math.abs(model.kelly-1)<1e-12);
  assert.equal(validateSnapshot({...raw,p:'100'}).model.kelly,Infinity);
  assert.throws(()=>validateSnapshot({...raw,current:''}));assert.throws(()=>validateSnapshot({...raw,p:'101'}));
  assert.throws(()=>validateSnapshot({...raw,inputMode:'bad'}));
});
