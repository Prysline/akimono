import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDragonPurchase as project} from '../src/original-r4-dragon-purchase.mjs';
const ranch=(no,town,owner)=>[no,999999,'Ranch name',town,owner,'','','','',''].join(',')+'\n';
const fixture=(over={})=>({street:'alpha',shops:[{id:1,money:500000},{id:2,money:500000}],actorId:1,now:1000000,ranchText:ranch(1,'alpha',1),dragonText:'',payoutText:'',command:{kind:'dragon-new',name:'競技龍名稱測試',fm:1,dist:2},draws:Array(10).fill(0),ngNames:['管理','支','11','12','aa','http','?'],...over});
const fields='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const row=text=>Object.fromEntries(text.split('\n')[0].split(',').map((v,i)=>[fields[i],v]));
test('purchase candidate retains exact initial attributes, sparse fields, deferred cost and RNG bounds',()=>{
  const input=fixture(),before=structuredClone(input),r=project(input),d=row(r.dragonText);
  assert.deepEqual(d,{no:'1',birth:'568000',fm:'1',color:'0',name:input.command.name,town:'alpha',owner:'1',stable:'',race:'',apt:'2600',sp:'10',spp:'',sr:'5',srp:'',ag:'20',agp:'',pw:'10',pwp:'',hl:'10',hlp:'',fl:'10',flp:'',con:'70',wt:'49',gr:'',prize:'',sdwin:'',g3win:'',g2win:'',g1win:''});
  assert.deepEqual(r.drawBounds,[5,3,20,20,20,20,40,20,20,3]);assert.equal(r.payoutText,'1\t-500000\n');assert.equal(r.actor.money,500000);assert.equal(r.committable,false);assert.equal(r.worldStateWritten,false);assert.deepEqual(input,before);
  const hi=project(fixture({draws:[.99,.99,.99,.99,0,.99,.99,.99,.99,.99]})),h=row(hi.dragonText);
  assert.deepEqual([h.color,h.apt,h.sp,h.sr,h.ag,h.pw,h.hl,h.fl,h.con,h.wt],['4','2800','29','39','5','29','49','29','89','51']);
});
test('purchase candidate stable street identity, source cap and identical payments',()=>{
  const a=project(fixture()),b=project(fixture({dragonText:a.dragonText,payoutText:a.payoutText})),c=project(fixture({dragonText:b.dragonText,payoutText:b.payoutText}));
  assert.equal(c.payment.dragonNo,3);assert.equal(c.payoutText,'1\t-500000\n'.repeat(3));assert.throws(()=>project(fixture({dragonText:c.dragonText})),/capacity/);
  const remote=project(fixture({street:'beta',ranchText:ranch(3,'beta',1),dragonText:c.dragonText}));assert.equal(remote.payment.dragonNo,4);assert.equal(row(remote.dragonText).town,'beta');
  assert.throws(()=>project(fixture({ranchText:ranch(2,'beta',1)})),/ranch/);
  assert.throws(()=>project(fixture({dragonText:a.dragonText.replace(/^1,/, '1,')+b.dragonText.split('\n')[0]+'\n'})),/collision/);
});
test('purchase candidate refusals leave supplied state unchanged',()=>{
  for(const input of [fixture({shops:[{id:1,money:499999}]}),fixture({command:{kind:'dragon-new',name:'管理測試名稱',fm:0,dist:0}}),fixture({command:{kind:'dragon-new',name:'abcdef',fm:2,dist:0}}),fixture({draws:[]}),fixture({payoutText:'invalid\n'}),fixture({command:{kind:'dragon-new',name:'abcdef',fm:0,dist:0,amount:1}})]){const before=structuredClone(input);assert.throws(()=>project(input),/R4 dragon purchase:/);assert.deepEqual(input,before);}
});
