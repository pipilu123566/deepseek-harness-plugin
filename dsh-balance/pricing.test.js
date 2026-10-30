import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePrice } from './pricing.js';
import { usageProjection, publicUsage } from './usage.js';
test('synthetic four-tier CNY tariff computes exact price without double-counting reasoning', () => {
 const key='generic-provider/example-model', price=validatePrice(key,{currency:'CNY',input:'2',output:'4',cacheRead:'0.25',cacheWrite:'1.5'});
 const p=usageProjection({[key]:price});
 const state=p.apply(p.init({},0),{seq:0,time:Date.now(),type:'assistant/message',surfaceOp:'append',data:{turn:0,message:{source:{provider:'generic-provider',model:'example-model'}},usage:{inputTokens:1000000,cacheReadTokens:1000000,cacheWriteTokens:1000000,outputTokens:1000000,reasoningTokens:100000}}});
 assert.equal(publicUsage(state.turns[0]).costs[0].amount,'7.75');
});
test('prices reject blanks, negative, nonnumeric, infinite, excessive precision and invalid model keys',()=>{
 for(const raw of ['', '-1','NaN','Infinity','1e3','0.000000001','1000001',true])assert.throws(()=>validatePrice('api/model',{currency:'CNY',input:raw,output:'4'}));
 for(const key of ['model','/model','api/','api/bad model'])assert.throws(()=>validatePrice(key,null));
 assert.deepEqual(validatePrice('api/model',{currency:'USD',input:'0',output:'2'}),{currency:'USD',input:0,output:2});
 assert.equal(validatePrice('api/model',null),null);
});
test('omitted cache prices never silently turn cache tokens into free usage',()=>{
 const p=usageProjection({'api/model':validatePrice('api/model',{currency:'CNY',input:'2',output:'4'})});
 const state=p.apply(p.init({},0),{seq:0,time:Date.now(),type:'assistant/message',surfaceOp:'append',data:{turn:0,message:{source:{provider:'api',model:'model'}},usage:{inputTokens:1,cacheReadTokens:1,outputTokens:1}}});
 assert.equal(state.turns[0].unpriced,1);assert.deepEqual(state.turns[0].costs,{});
});
