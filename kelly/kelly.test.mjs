import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateKelly} from './kelly.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('known even-money case',()=>{const m=calculateKelly(.6,1,1);near(m.kelly,.2);near(m.edge,.2);near(m.arithmetic(.2),.04);near(m.geometric(1),-1);});
test('partial losses general formula',()=>{const m=calculateKelly(.55,.8,.5);near(m.rawKelly,.5375);near(m.edge,.215);});
test('boundary probabilities and constrained solution',()=>{near(calculateKelly(0,1,1).kelly,0);near(calculateKelly(1,1,1).geometric(1),1);near(calculateKelly(1,.3,.5).kelly,1);near(calculateKelly(.3,.5,1).kelly,0);near(calculateKelly(.9,1,.1).kelly,1);});
test('invalid inputs rejected',()=>{for(const args of [[NaN,1,1],[.5,0,1],[.5,1,0],[.5,1,1.1],[-.1,1,1],[1.1,1,1],[.5,Infinity,1]])assert.throws(()=>calculateKelly(...args),RangeError);});
test('analytic maximum agrees with exhaustive grid',()=>{for(const p of [0,.01,.25,.5,.6,.9,1])for(const a of [.01,.3,1,3])for(const b of [.01,.3,1]){const m=calculateKelly(p,a,b);const max=m.logGrowth(m.kelly);for(let i=0;i<=1000;i++)assert.ok(m.logGrowth(i/1000)<=max+1e-12);}});
