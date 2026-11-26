import test from 'node:test';
import assert from 'node:assert/strict';
import {projectDragonTraining as project} from '../src/original-r4-dragon-training.mjs';
const DF='no birth fm color name town owner stable race apt sp spp sr srp ag agp pw pwp hl hlp fl flp con wt gr prize sdwin g3win g2win g1win'.split(' ');
const SF='no birth name town owner emp tr con wt sp sr ag pw hl fl sdwin g3win g2win g1win'.split(' ');
const now=6000000,day=86400;
const row=(keys,r)=>keys.map(k=>r[k]??'').join(',')+'\n';
const dragon=(over={})=>row(DF,{no:1,birth:now-5*day,fm:0,color:0,name:'Dragon name',town:'alpha',owner:1,stable:7,race:0,apt:1400,sp:10,sr:10,ag:10,pw:10,hl:20,fl:10,con:99,wt:49,gr:75,...over});
const stable=(over={})=>row(SF,{no:7,birth:now-3*day,name:'Stable name',town:'beta',owner:1,emp:0,tr:20,con:25,wt:0,sp:1,sr:1,ag:0,pw:0,hl:0,fl:0,...over});
const fixture=(over={})=>({street:'alpha',activeShopIds:[1],now,drTime:[now-1,now+100,now+200],dragonText:dragon(),stableText:stable(),ranchText:'',payoutByStreet:{alpha:'1\t-100000\n'},draws:[.5,.5,0,0,.99,0,.99,.99,.99,.99,.99,.99],...over});
const parsed=(keys,s)=>Object.fromEntries(s.split('\n')[0].split(',').map((v,i)=>[keys[i],v]));
test('training candidate preserves source sequential weight, post-boarding health and exact growth draws',()=>{
  const input=fixture(),before=structuredClone(input),r=project(input),d=parsed(DF,r.dragonText);
  assert.deepEqual([d.wt,d.con,d.gr,d.sp,d.spp,d.sr,d.srp],['49','102','0','14','4','10','']);
  assert.deepEqual(r.drawBounds,[3,3,200,7,4,200,4,200,200,200,200,200]);
  assert.deepEqual(r.payments.map(x=>[x.sourceAction,x.street,x.shopId,x.amount]),[['boarding-expense','alpha',1,-100000],['boarding-income','beta',1,100000],['stable-maintenance','beta',1,-200000]]);
  assert.deepEqual(r.payoutByStreet,{alpha:'1\t-100000\n1\t-100000\n',beta:'1\t100000\n1\t-200000\n'});assert.equal(r.stableChanged,false);assert.equal(r.drTime[0],now+day-((now+21600)%day));assert.equal(r.committable,false);assert.deepEqual(input,before);
});
test('training candidate retirement, race skip/reset and stable closure after boarding',()=>{
  const a=project(fixture({dragonText:dragon({no:4,birth:now-41*day})+dragon({no:3,race:2})+dragon({no:2,race:1,birth:now-40*day})+dragon({no:1,gr:0}),stableText:stable({birth:now-51*day}),draws:[.5,.5,0,0]}));
  assert.deepEqual(a.dragonText.trimEnd().split('\n').map(s=>s.split(',')[0]),['3','2','1']);assert.equal(a.dragonText.split('\n')[1].split(',')[8],'0');assert.equal(a.stableText,'');assert.equal(a.stableChanged,true);assert.deepEqual(a.payments.map(x=>x.amount),[-100000,100000]);assert.equal(a.newLogText,now+'\t0\tStable nameは老朽化により閉鎖しました。\n'+now+'\t0\tDragon nameは引退しました。\n');
  const equal=project(fixture({dragonText:dragon({birth:now-27*day,stable:'',wt:62}),stableText:stable({birth:now-50*day}),draws:[.99,0]}));assert.equal(parsed(DF,equal.dragonText).wt,'62');assert.equal(equal.stableChanged,false);assert.deepEqual(equal.payments.map(x=>x.amount),[-200000]);
});
test('training candidate fails closed before publication for unresolved owner or draw state',()=>{
  for(const input of [fixture({stableText:stable({town:'alpha',owner:99})}),fixture({draws:[]}),fixture({draws:[...fixture().draws,0]}),fixture({drTime:[now,now+1,now+2]}),fixture({payoutByStreet:{beta:'bad\n'}})]){const before=structuredClone(input);assert.throws(()=>project(input),/R4 dragon training:/);assert.deepEqual(input,before);}
});
