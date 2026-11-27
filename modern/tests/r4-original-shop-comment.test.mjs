import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {reviewOriginalShopComment,projectOriginalShopComment} from '../src/original-r4-shop-comment.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const f=n=>read('./original-perl/'+n);
const sources={ownerMainSource:f('core-inc-main.cgi'),formSource:f('core-other.cgi'),submitSource:f('core-user-settings.cgi'),nameSource:f('core-name.cgi'),configSource:read('../../_config.cgi'),readSource:f('inc-func.cgi'),logSource:f('pinned-log.cgi')};
const review=reviewOriginalShopComment(sources);
test('R4 comment frozen Perl differential, success and rejection without unrelated shop mutation',()=>{
 const body=sources.submitSource.match(/sub comment\n\{[\s\S]*?\n\}/)[0];
 const ng=sources.nameSource.match(/sub CheckNGName\n\{[\s\S]*?\n\}/)[0];
 const config=sources.configSource.match(/@NG_SHOP_NAME\s*=\s*qw\([^)]+\);/)[0];
 const vals=['','店鋪評論','空 白','"引號"','AA','HTTP','0','字'.repeat(36),'字'.repeat(37),'😀'.repeat(36),'😀'.repeat(37),'管理','支','11','12','aa','http','?',',',':',';','\t','\r','\n','<','>','&'];
 const oracle='use utf8; use JSON::PP; '+config+'\n'+ng+'\n'+body+'\n'+
   'sub l { return $_[0]; } sub OutError { die $_[0]; } local $/; my $a=decode_json(<STDIN>); my @results; for my $value (@$a) { $Q{cmt}=$value; $DT={comment=>"prior"}; $disp=""; my $ok=eval { comment(); 1 }; push @results, [ $ok?1:0, $DT->{comment} ]; } print encode_json(\\@results);';
 const expected=JSON.parse(execFileSync('perl',['-e',oracle],{input:JSON.stringify(vals),encoding:'utf8'}));
 const world={nowSeconds:100,shops:[{id:1,status:1,comment:'prior',lastlogin:90,money:123,time:80}]};
 const actual=vals.map(comment=>{
   const command={kind:'edit-shop-comment',shopId:1,expectedRevision:0,comment};
   try{const r=projectOriginalShopComment({reviewed:review,world,command});
      assert.deepEqual(r.shops[0],{...world.shops[0],comment,lastlogin:100});return [1,r.shops[0].comment];}
   catch(e){if(!(e instanceof RangeError))throw e;return [0,world.shops[0].comment];}
 });
 assert.deepEqual(actual,expected);
 assert.equal(world.shops[0].comment,'prior');
 assert.throws(()=>reviewOriginalShopComment({...sources,submitSource:sources.submitSource+' '}),/source drift/);
});
