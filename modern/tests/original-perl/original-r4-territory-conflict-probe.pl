# Execute the complete original territory region, including RebelRobin.
use strict;use warnings;use utf8;use FindBin;use JSON::PP;use Digest::SHA qw(sha1_hex);
our($NOW_TIME,$STATE,$DTpeople,$DTusercount,$BAL_JOB,$BAL_NAME,@LOG,@DRAWS,@RANGES,%DTevent,%id2idx);
BEGIN{no warnings 'redefine';*CORE::GLOBAL::rand=sub(;$){
 die 'territory RNG exhausted' unless @main::DRAWS;
 my $v=shift @main::DRAWS;my $range=0+($_[0]//1);
 push @main::RANGES,$range;return $v*$range/1000000;
};}
sub source{my($name,$sha)=@_;open my $f,'<:raw',"$FindBin::Bin/$name" or die $!;my $raw=do{local $/;<$f>};close $f;
 die "source drift $name" unless sha1_hex("blob ".length($raw)."\0".$raw) eq $sha;
 utf8::decode($raw) or die 'source UTF-8';return $raw}
my $period=source('period.cgi','6183e88e9dd69a16606a1064c8084e9a1411dbd5');
my $read=source('inc-func.cgi','e7a8add7b0291901e71fe797783b664dff1568a0');
die 'source population count' unless index($read,'$DTusercount=$cnt;')>=0;
sub PushLog{push @LOG,[@_];1}
sub l{my($s,@args)=@_;$s=~s/%([12])/$args[$1-1]/ge;return $s}
my $start=index($period,'#領土データ調整');my $end=index($period,'#決算時のカスタム処理（リセット後）',$start);
die 'territory source moved' unless $start>=0&&$end>$start;
my $region=substr($period,$start,$end-$start);
my $a=index($period,"sub RebelRobin\n");my $b=index($period,'sub DragonBalance',$a);
die 'RebelRobin moved' unless $a>=0&&$b>$a;
my $fn=substr($period,$a,$b-$a);
my $ok=eval "package main;use utf8;no strict;no warnings;\n".$fn."\nsub actualTerritory {my \$taxin=shift;\n".$region."\nreturn \$armycost;}\n1;";
die "original territory compilation: $@" unless $ok;
my %base=(leader=>1,money=>5000000,in=>0,out=>0,develop=>5001,devem=>0,safety=>5001,safem=>0,army=>10000,robina=>0,robinb=>0);
sub run{
 my(%s)=@_;$NOW_TIME=1000000;$DTpeople=$s{people}//500000;$DTusercount=$s{count}//1;
 $STATE={%{$s{town}}};my $ids=$s{ids}//[1];%id2idx=map{($ids->[$_]=>$_)}0..$#$ids;
 %DTevent=$s{active}?(rebel=>$s{active}):();$BAL_JOB='外敵';$BAL_NAME='首領';
 @LOG=();@DRAWS=@{$s{draws}};@RANGES=();
 my $input={town=>{%$STATE},dtPeople=>$DTpeople,dtUserCount=>$DTusercount,activeShopIds=>$ids,
  taxIn=>$s{tax}//0,nowSeconds=>$NOW_TIME,activeUntilSeconds=>$s{active},drawMillionths=>$s{draws},balJob=>$BAL_JOB,balName=>$BAL_NAME};
 my $cost=actualTerritory($input->{taxIn});
 die "unused RNG $s{name}" if @DRAWS;
 return {name=>$s{name},input=>$input,output=>{town=>{%$STATE},dtPeople=>$DTpeople,
  eventState=>{%DTevent},activeUntilSeconds=>$DTevent{rebel},armyCost=>$cost,logs=>[@LOG],randomDrawRanges=>[@RANGES],drawsUsed=>scalar @RANGES}};
}
my @cases=(
 run(name=>'unled-volunteer',town=>{%base,leader=>0,army=>0,robina=>2000},draws=>[0,0]),
 run(name=>'stale-leader',town=>{%base,leader=>3,army=>2000,robina=>3000},draws=>[0,0]),
 run(name=>'led-calm',town=>{%base,robina=>2000},draws=>[0,0,0,0]),
 run(name=>'led-uneasy',town=>{%base,develop=>8000,safety=>8000},draws=>[0,0,0,0]),
 run(name=>'led-start',town=>{%base,develop=>9000,safety=>9000},draws=>[0,0,0,0,299999]),
 run(name=>'led-deferred',town=>{%base,develop=>9000,safety=>9000},draws=>[0,0,0,0,300000]),
 run(name=>'already-active-past-expiry',town=>{%base,robina=>2000},active=>900000,draws=>[0,0]),
 run(name=>'led-insolvent-before-trigger',town=>{%base,money=>0,army=>3000,robina=>2000},draws=>[0,0,0,0]),
 run(name=>'unled-insolvent-after-transfer',town=>{%base,leader=>0,money=>0,robina=>2000},draws=>[0,0]),
 run(name=>'dataread-count-not-active-count',town=>{%base,leader=>2,devem=>4000000,safem=>2000000},
  ids=>[2],count=>4,people=>500000,tax=>3000000,draws=>[100000,200000,0,0]),
);
binmode STDOUT,':raw';print JSON::PP->new->canonical->utf8->encode({cases=>\@cases});
