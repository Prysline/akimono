import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewOriginalOwnerIcon,describeOriginalOwnerIconForm,projectOriginalOwnerIcon} from '../src/original-r4-owner-icon.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const f=n=>read('./original-perl/'+n);
const sources={formSource:f('core-other.cgi'),submitSource:f('core-user-settings.cgi'),listSource:f('core-icon.cgi'),imagePluginSource:f('core-img.cgi'),configSource:read('../../_config.cgi'),readSource:f('inc-func.cgi'),newSource:f('new.cgi'),newFormSource:read('../../custom/inc-new.cgi'),ownerMainSource:f('core-inc-main.cgi')};
const review=reviewOriginalOwnerIcon(sources);
test('R4 frozen icon handler and form boundaries, one request-local draw and no submit draw',()=>{
 const body=sources.submitSource.match(/sub icon\n\{[\s\S]*?\n\}/)[0];
 const img=sources.readSource.match(/sub GetTagImgKao\n\{[\s\S]*?\n\}/)[0];
 const vals=[...Array.from({length:25},(_,i)=>i+1),0,26,-1,'abc',''];
 const oracle='use utf8; use JSON::PP; '+body+'\n'+img+'\n'+
  'sub l { $_[0] } $ICON_SIZE="WIDTH=48 HEIGHT=48"; $IMAGE_URL="./image"; local $/; my $a=decode_json(<STDIN>); my @r; for my $v (@$a) { $DT={icon=>1}; $Q{icon}=$v; $disp=""; icon(); push @r,[$DT->{icon},$disp,GetTagImgKao("",$v)]; } print encode_json(\\@r);';
 const expected=JSON.parse(execFileSync('perl',['-e',oracle],{input:JSON.stringify(vals),encoding:'utf8'}));
 assert.deepEqual(expected.map(x=>x[0]),vals); // The original handler accepts even out-of-form values.
 const world={nowSeconds:100,shops:[{id:1,status:1,icon:1,lastlogin:90,money:100000,time:80}]};
 for(let n=0;n<25;n++){
   let calls=0;
   const form=describeOriginalOwnerIconForm(review,max=>{assert.equal(max,25);calls++;return n;});
   assert.equal(calls,1);assert.equal(form.randomIcon,n+1);assert.equal(form.columns,5);
   assert.equal(form.icons.length,25);assert.equal(form.icons[n].path,'./image/kao/kao'+(n+1)+'.png');
   assert.ok(expected[n][2].includes(form.icons[n].path));assert.match(expected[n][2],/WIDTH=48 HEIGHT=48/);
   const result=projectOriginalOwnerIcon({reviewed:review,world,command:{kind:'edit-owner-icon',shopId:1,expectedRevision:0,icon:n+1}});
   assert.deepEqual(result.shops[0],{...world.shops[0],icon:expected[n][0],lastlogin:100});assert.equal(calls,1);
 }
 for(const icon of [0,26,-1,'1','abc',null])assert.throws(()=>projectOriginalOwnerIcon({reviewed:review,world,command:{kind:'edit-owner-icon',shopId:1,expectedRevision:0,icon}}),/local owner icon/);
 assert.equal(world.shops[0].lastlogin,90);
 assert.throws(()=>reviewOriginalOwnerIcon({...sources,listSource:sources.listSource+' '}),/source drift/);
});

test('R4 original creation and procedures form preselect at page render',()=>{
 const expressions=[sources.newFormSource,sources.formSource].map(s=>s.match(/\$i_rand=int\(rand\(\$ICON_NUMBER\)\)\+1;/)[0]);
 const oracle='use JSON::PP; $ICON_NUMBER=25; my @r; for my $seed (0..99) { srand($seed); my $raw=rand($ICON_NUMBER); srand($seed); '+expressions[0]+' my $first=$i_rand; srand($seed); '+expressions[1]+' push @r,[$raw,$first,$i_rand]; } print encode_json(\\@r);';
 const rows=JSON.parse(execFileSync('perl',['-e',oracle],{encoding:'utf8'}));
 for(const [raw,newIcon,procedureIcon] of rows){
   const form=describeOriginalOwnerIconForm(review,()=>Math.floor(raw));
   assert.equal(form.randomIcon,newIcon);assert.equal(form.randomIcon,procedureIcon);
 }
});
