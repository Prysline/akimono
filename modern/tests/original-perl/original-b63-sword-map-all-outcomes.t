use strict;
use warnings;
use utf8;
use Test::More;
use JSON::PP qw(decode_json);
use FindBin;
use File::Spec;
binmode STDOUT,':encoding(UTF-8)';
my $probe=File::Spec->catfile($FindBin::Bin,
  'original-b63-sword-map-all-outcomes-probe.pl');
my %expected=(
  mixed=>[[2,2,2,2,2],1,52,0,0],
  'mixed-loss'=>[[2,2,2,2,2],0,52,0,1],
  doubled=>[[8,7,3,1,1],1,12,1,0],
  'doubled-loss'=>[[8,7,3,1,1],0,12,1,1],
  'zero-loss'=>[[0,0,0,0,0],0,52,0,1],
);
for my $scenario(qw(mixed mixed-loss doubled doubled-loss zero-loss)){
  my $raw=qx{perl "$probe" "$scenario" 2>&1};
  my $status=$?;
  is($status,0,"B-63 actual fixed Perl GetBuffer/funcb/UseItem/MakeAmount/lostbook $scenario");
  next if $status;
  my $o=eval{decode_json($raw)};
  ok(!$@&&ref($o)eq'HASH',"B-63 actual Perl result parses $scenario");
  next unless $o;
  my($swords,$maps,$draws,$doubled,$lost)=@{$expected{$scenario}};
  is($o->{scenario},$scenario,"Perl scenario retained $scenario");
  is($o->{compiled}{itemId},14,'original map item 14');
  is($o->{compiled}{seconds},7200,'original GetBuffer 4h * 0.5');
  is($o->{compiled}{expTimeSeconds},3600,'original map exptime 2h * 0.5');
  is($o->{compiled}{money},12000,'original map use spends 12000');
  is($o->{compiled}{exp},20,'original map use experience 2%');
  is($o->{compiled}{callback},'_local_b1','original funcb named');
  is($o->{compiled}{function},'lostbook','original second callback');
  is_deeply([map {$_->{no}} @{$o->{compiled}{outputs}}],
    [40,41,42,43,44],'five actual original resolved item IDs');
  is_deeply([map {$_->{proba}} @{$o->{compiled}{outputs}}],
    [400,350,150,60,30],'five original compiled GET probabilities');
  is_deeply($o->{result}{swords},$swords,
    "source-executed true five sword stocks $scenario");
  is($o->{result}{maps},$maps,"real original lostbook map stock $scenario");
  is($o->{result}{mapItemConsumed},$lost,
    "source map destruction recorded $scenario");
  is($o->{result}{money},78000,'original source deducts 12000');
  is($o->{result}{paytoday},22000,'original original paytoday accrues 12000');
  is($o->{result}{time},862000,'original source uses 7200 seconds');
  is($o->{result}{exp14},20,'original source awards 20 EXP');
  is($o->{result}{count},1,'only one actual source first USE');
  is($o->{result}{callbackResult},'','original shared lostbook return');
  is($o->{consumedDraws},$draws,
    "actual source rand call count follows original loop $scenario");
  is(scalar(@{$o->{originalSamples}}),$draws,
    "exact supplied original random samples $scenario");
  my @pairs=map {$_->[0]} @{$o->{result}{created}//[]};
  my @expectedPair=();
  for my $i(0..4){push @expectedPair,40+$i if $swords->[$i]>0;}
  is_deeply(\@pairs,\@expectedPair,
    "original USE result additem only nonzero outputs $scenario");
  if($lost){
    is_deeply($o->{result}{originalUseItem},[[14,1]],
      'real item::UseItem inserted map destruction useitem row');
    is_deeply($o->{result}{originalUseMsg},
      ['到劍市的地圖已經破爛到看不懂，就扔掉了。'],
      'true original message for destroyed map');
  }else{
    ok(!defined($o->{result}{originalUseItem})||
      !@{$o->{result}{originalUseItem}},
      'original source recorded no map destruction');
  }
  if($doubled){
    is($o->{result}{originalResultOk},'這次我們收穫的比平時多。',
      'source double callback writes its original resultok');
    is_deeply([map {$_->{count}}
      @{$o->{result}{createdBeforeMakeAmount}}],
      [20,20,20,20,20],
      'original funcb really doubles five GET attempts BEFORE original Gaussian');
    is_deeply($o->{randRanges},[1000,(1)x10,1000],
      '20-count original MakeAmount each consumes two rand() calls');
  }else{
    is_deeply($o->{randRanges},[(1000)x52],
      '10-count original MakeAmount consumes fifty rand(1000) calls');
  }
}
done_testing();
