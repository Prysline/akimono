import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {calculateSourceSaleTax} from '../src/shared-source-sale-tax.mjs';
import {fileURLToPath} from 'node:url';
import {reviewR4LordSaleTax,createR4LordSaleTaxContext,projectR4LordSaleTax}
  from '../src/original-r4-lord-sale-tax.mjs';

const originalDir=fileURLToPath(new URL('./original-perl/',import.meta.url));
const read=p=>readFile(new URL('./original-perl/'+p,import.meta.url),'utf8');
const pins=Object.fromEntries(await Promise.all(Object.entries({
  detail:'core-detail.cgi',item:'item.cgi',turn:'inc-turn.cgi',
}).map(async([key,file])=>[key,await read(file)])));
const reviewed=reviewR4LordSaleTax(pins);
const cases=[];
for(const townTaxRate of [0,1,20,40])
 for(const taxMode of [undefined,0,1,2])
  for(const eventState of [{},{rebel:1259200}])
   for(const listed of [1,50,99,100,101,150,200,500]){
    cases.push({townTaxRate,taxMode,eventState,basePrice:100,count:3,gross:listed*3});
   }
const oracle=JSON.parse(execFileSync('perl',['original-r4-lord-sale-tax-probe.pl'],{
 cwd:originalDir,input:JSON.stringify(cases),encoding:'utf8'}));
test('R4 frozen GetUserTaxRate/GetSaleTax: 256 exact source combinations',()=>{
 assert.equal(cases.length,256);assert.equal(oracle.length,cases.length);
 for(const [i,row] of cases.entries()){
  const context=createR4LordSaleTaxContext({reviewed,...row});
  assert.deepEqual(projectR4LordSaleTax({context,...row}),oracle[i],JSON.stringify(row));
 }
 // Exemption/war removes only lord tax; price markup still taxed.
 assert.equal(oracle[cases.findIndex(c=>c.townTaxRate===40&&c.taxMode===1&&!c.eventState.rebel&&c.gross===600)].taxRate,5);
 assert.equal(oracle[cases.findIndex(c=>c.townTaxRate===40&&c.taxMode===2&&!c.eventState.rebel&&c.gross===1500)].taxRate,99);
});
test('R4 lord tax source and context reject unknown inputs',()=>{
 for(const k of Object.keys(pins))assert.throws(()=>reviewR4LordSaleTax({...pins,[k]:pins[k]+' '}),/source drift/);
 const args={reviewed,townTaxRate:40,taxMode:2,eventState:{}};
 for(const change of [{reviewed:{...reviewed}},{townTaxRate:41},{townTaxRate:'40'},{taxMode:3},{eventState:null},{eventState:{rebel:0}},{eventState:{guildbattle:1}}])
  assert.throws(()=>createR4LordSaleTaxContext({...args,...change}),/R4 lord sale tax/);
 const context=createR4LordSaleTaxContext(args);
 for(const change of [{context:{...context}},{count:0},{gross:5,count:2},{basePrice:0},{gross:Number.MAX_SAFE_INTEGER}])
  assert.throws(()=>projectR4LordSaleTax({context,count:2,gross:200,basePrice:100,...change}),/R4 lord sale tax/);
});

// Frozen buy-s computes tax from the synthetic market seller, not the buyer.
// This controlled source oracle invokes GetWholeStore, GetUserTaxRate and
// GetSaleTax directly; no live lord authorization, market CAS or gameplay.
test('D7 frozen wholesale seller has no buyer taxmode and native BASE/tax results match reviewed context',async()=>{
 const whole=await read('whole.cgi'),buy=await read('buy-s.cgi');
 const blob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
 assert.equal(blob(whole),'778badaf157326bcfd1f8fa1e310d94f94995eb3');
 assert.equal(blob(buy),'6ba8df9a733ed16c490389414cd94934fe1185ca');
 const steps=['$DTS=GetWholeStore();',
   'GetSaleTax($itemno,$num,$baseprice*$num,GetUserTaxRate($DTS,$DTTaxrate))',
   '$DTS->{money}+=$num*$baseprice-$tax;',
   '$DT->{money}-=$num*$price;',
   '$DTS->{taxtoday}+=$tax;',
   'SetWholeStore($DTS) if $id==0;'];
 let position=-1;for(const step of steps){
   const next=buy.indexOf(step,position+1);assert.ok(next>position,step);position=next;
 }
 const script=[
   'use strict;use JSON::PP;our(@ITEM,@DTwholestore,$MAX_ITEM,%DTevent);',
   'sub l {$_[0]}',
   'require "./whole.cgi";require "./core-detail.cgi";require "./item.cgi";',
   'local $/;my $rows=decode_json(<STDIN>);my @out;',
   '$MAX_ITEM=1;$ITEM[1]={price=>100,pricebase=>50,pricehalf=>150,sort=>0};',
   'for my $r (@$rows){@DTwholestore=($r->{stock});%DTevent=%{$r->{eventState}};',
   'my $seller=GetWholeStore();my $price=$seller->{price}[0];',
   'my $gross=$price*$r->{count};my $user=GetUserTaxRate($seller,$r->{townTaxRate});',
   'my($rate,$tax)=GetSaleTax(1,$r->{count},$gross,$user);',
   'push @out,{price=>0+$price,gross=>0+$gross,hasTaxMode=>exists($seller->{taxmode})?1:0,userTaxRate=>0+$user,taxRate=>0+$rate,tax=>0+$tax};}',
   'print encode_json(\\@out);',
 ].join('\n');
 const rows=[];
 for(const townTaxRate of [0,1,20,40])
  for(const eventState of [{},{rebel:1259200}])
   for(const stock of [1,50,100,150])
    rows.push({townTaxRate,eventState,stock,count:Math.min(3,stock),basePrice:100});
 const original=JSON.parse(execFileSync('perl',['-e',script],{
   cwd:originalDir,input:JSON.stringify(rows),encoding:'utf8',timeout:3000,maxBuffer:65536,
 }));
 assert.equal(original.length,32);
 for(const [i,row] of rows.entries()){
   const native=original[i];
   assert.equal(native.hasTaxMode,0);
   assert.equal(native.gross,native.price*row.count);
   const context=createR4LordSaleTaxContext({reviewed,townTaxRate:row.townTaxRate,eventState:row.eventState});
   assert.deepEqual(projectR4LordSaleTax({context,count:row.count,gross:native.gross,basePrice:row.basePrice}),
     {userTaxRate:native.userTaxRate,taxRate:native.taxRate,tax:native.tax},JSON.stringify(row));
 }
});

test('D14 shared source sale tax matches exact frozen GetSaleTax for 270 total-price/count cases',()=>{
 const cases=[];
 for(const basePrice of [1,50,1200,10000,50000])
  for(const count of [1,2,13])
   for(const listed of [1,Math.ceil(basePrice/2),basePrice,Math.ceil(basePrice*1.1),basePrice*2,999999999])
    for(const plusTaxRate of [0,7,20])cases.push({basePrice,count,totalPrice:listed*count,plusTaxRate});
 const start=pins.item.indexOf('sub GetSaleTax\n'),end=pins.item.indexOf('\n}',start);
 assert.ok(start>=0&&end>start);
 const program='use JSON::PP;no strict;no warnings;local $/;my $in=decode_json(<STDIN>);'+pins.item.slice(start,end+2)+'\nmy @out;for my $x (@$in){$ITEM[1]{price}=$x->{basePrice};my($taxRate,$tax)=GetSaleTax(1,$x->{count},$x->{totalPrice},$x->{plusTaxRate});push @out,{taxRate=>$taxRate,tax=>$tax}}print encode_json(\\@out);';
 const original=JSON.parse(execFileSync('perl',['-e',program],{encoding:'utf8',input:JSON.stringify(cases)}));
 assert.equal(cases.length,270);assert.deepEqual(cases.map(calculateSourceSaleTax),original);
});
