/** Frozen ReadLog/GetPage/GetTime2FormatTime versus local owner news.
 * Temp files and synthetic rows only; no multiplayer or CGI auth proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {loadNormalCommerceAuditSources} from '../scripts/audit-normal-commerce.mjs';
import {reviewOriginalNews,describeOriginalNews} from '../src/original-r4-news-view.mjs';
import {queryOriginalNews} from '../src/shared-source-news-query.mjs';
const perl=[
 'use utf8;use JSON::PP;use File::Temp qw(tempdir);no strict;no warnings;',
 'local $/;my $in=decode_json(<STDIN>);$dir=tempdir(CLEANUP=>1);',
 'sub GetPath {return "$dir/$_[0].cgi"} sub l {$_[0] eq "情報はありません" ? "沒有資料" : $_[0]}',
 'for my $name (qw(log0 log1 log2)){open(my $fh,">:encoding(UTF-8)",GetPath($name)) or die $!;print $fh $in->{files}{$name};close($fh);}',
 'for my $source (@{$in->{sources}}){eval $source;die $@ if $@;}',
 '$DT={id=>1};$TZ_JST=9*3600;my @out;',
 'for my $q (@{$in->{queries}}){local $/="\\n";ReadLog(1,$q->{mode},$q->{keyword},$q->{target});',
 'my ($p,$s,$e,$n,$v,$m)=GetPage($q->{page},25,scalar(@MESSAGE));',
 'my @rows;for my $line (@MESSAGE[$s..$e]){chomp($line);my($tm,$mode,$id,$msg)=split(/\\t/,$line);',
 'next if !$tm && !$mode && !$id && $msg eq "沒有資料";',
 'push @rows,{wire=>$line,timeLabel=>GetTime2FormatTime($tm),private=>$id==1?1:0};}',
 'push @out,{page=>$p,pageMax=>$m,pagePrev=>$v,pageNext=>$n,rows=>\\@rows};}',
 'print encode_json(\\@out);',
].join('\n');
test('R4 newspaper retains log0/log1 order and exact original literal query and page limits',async()=>{
 const input=await loadNormalCommerceAuditSources();
 const sources={newsViewSource:input.originalNewsViewSource,newsHtmlSource:input.originalNewsHtmlSource,newsPageSource:input.originalNewsPageSource,newsTimeSource:input.originalNewsTimeSource,logSource:input.originalLogSource,configSource:input.originalConfigSource,itemDsl:input.itemDsl,rebelDsl:input.rebelDsl,compilerSource:input.originalCompilerSource,ownerMainSource:input.originalOwnerMainSource};
 const reviewed=reviewOriginalNews(sources);
 assert.throws(()=>reviewOriginalNews({...sources,newsViewSource:sources.newsViewSource+'\n'}),/source drift/);
 const log0=Array.from({length:28},(_,i)=>[1000-i,i%4,i%7===0?2:i%2,'店主 Alpha [a] '+i].join('\t')+'\n').join('');
 const files={log0,log1:'900\t2\t0\t其他\n800\t0\t1\t秘密\n',log2:'700\t1\t0\texcluded\n'};
 const world={nowSeconds:1000,shops:[{id:1,status:1,shopname:'店主'}],period:{eventState:{'boom-posyon':1100},disk:{live:Object.fromEntries(Object.entries(files).map(([k,bytes])=>[k+'.cgi',{bytes}]))}}};
 const before=structuredClone(world),news=describeOriginalNews({reviewed,world});
 assert.deepEqual(world,before);
 assert.deepEqual(news.recentRows,news.rows.filter(r=>r.wire.includes('店主')).slice(0,10));
 assert.equal(news.recentRows.length,10);
 assert.equal(news.rows.length,26);assert.deepEqual(news.eventMessages,['治療劑相關商品人氣提升']);
 assert.ok(news.rows.every(row=>row.id===0||row.id===1));assert.ok(news.rows.every(row=>!row.message.includes('excluded')));
 assert.throws(()=>describeOriginalNews({reviewed,world:{...world,shops:[{id:2,status:1}]}}),/local owner/);
 const queries=[{}, {page:99}, {page:-1}, {keyword:'ALPHA [A]',page:99}, {mode:2,target:'店主'}, {keyword:'[a]'}, {target:'alpha'}, {keyword:'excluded'}, {mode:3,keyword:'[A]'}, {keyword:'0',target:'0'}].map(q=>({mode:0,keyword:'',target:'',page:0,...q}));
 // Frozen ReadLog uses /o: each CGI request needs a fresh Perl process
 // or the first interpolated keyword/mode/target remains compiled.
 for(const q of queries){
   const [expected]=JSON.parse(execFileSync('perl',['-e',perl],{encoding:'utf8',input:JSON.stringify({files,queries:[q],sources:[sources.logSource,sources.newsPageSource,sources.newsTimeSource]})}));
   const result=queryOriginalNews(news,q);
   assert.deepEqual({page:result.page,pageMax:result.pageMax,pagePrev:result.pagePrev,pageNext:result.pageNext,rows:result.rows.map(r=>({wire:r.wire,timeLabel:r.timeLabel,private:Number(r.private)}))},expected);
 }
});
