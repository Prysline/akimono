# Frozen full lord view/handler oracle; authentication, presentation and disk
# hooks are isolated adapters. Not player acquisition or CAS evidence.
use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP qw(decode_json encode_json);
use Digest::SHA qw(sha1_hex);
our (%Q,%DTevent,%id2idx,@DT,@image,@term,%msg,$DT,$STATE,$DTTaxrate,$disp,$count,
     $DTlasttime,$TZ_JST,$DATE_REVISE_TIME,$ONE_DAY_TIME,
     $TB,$TR,$TD,$TRE,$TBE,$TDB,$METHOD,$USERPASSFORM);
my (@trace,@logs,@money);
sub l {my($s,@a)=@_;$s=~s/%([1-9][0-9]*)/defined($a[$1-1])?$a[$1-1]:""/ge;return $s}
sub GetTagImgKao {''}
sub Lock {push @trace,'lock';1}
sub DataRead {push @trace,'read-adapter';1}
sub CheckUserPass {push @trace,'auth-adapter';1}
sub PushLog {push @logs,[@_];push @trace,'log';1}
sub RenewLog {push @trace,'renew';1}
sub DataWrite {push @trace,'stage-adapter';1}
sub DataCommitOrAbort {push @trace,'commit-adapter';1}
sub UnLock {push @trace,'unlock';1}
sub OutSkin {push @trace,'render';1}
sub OutError {die "SOURCE_REFUSAL:$_[0]\n"}
sub GetMoneyString {push @money,0+$_[0];return $_[0]}
my %pins=('pinned-lord-f.cgi'=>'b96734f54267645c080c86d32aca5e778023b50b',
 'pinned-lord-s.cgi'=>'8754dabf130a521aa243fc0568910d5f52523362',
 'calc.cgi'=>'586354a9a300e26d0e12a4efa512fa25760e3197',
 '../../../_config.cgi'=>'87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0');
my %source;
for my $f(keys %pins){
 open my $h,'<:raw',"$FindBin::Bin/$f" or die $!;
 my $b=do{local $/;<$h>};close $h;
 die "source drift $f" unless sha1_hex("blob ".length($b)."\0".$b) eq $pins{$f};
 $source{$f}=$b;
}
for my $key(qw(ONE_DAY_TIME DATE_REVISE_TIME TZ_JST)){
 my($line)=$source{'../../../_config.cgi'}=~/^(\$\Q$key\E\s*=[^;]+;)/m;
 die "clock source missing $key" unless defined $line;
 eval $line;die "clock source $@" if $@;
}
require "$FindBin::Bin/calc.cgi";
binmode STDIN,':raw';binmode STDOUT,':raw';
my $input=decode_json(do{local $/;<STDIN>});
my $f=$input->{fixture};my $c=$input->{command};
$DTTaxrate=$f->{taxRate};$DTlasttime=$f->{lasttime};$STATE={%{$f->{town}}};
@DT=map{{%$_}}@{$f->{shops}};%id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
$DT=$DT[$id2idx{$f->{actorId}}];%DTevent=%{$f->{eventState}};
$disp=$TB=$TR=$TD=$TRE=$TBE=$TDB=$METHOD=$USERPASSFORM='';@term=('','');
sub form {
 my($mode)=@_;
 for my $form(split /<FORM\b/,$disp){
   return $form if $form=~/NAME=mode VALUE="\Q$mode\E"/;
 }
 return undef;
}
sub options {
 my($mode)=@_;my $form=form($mode);
 return [] unless defined $form;
 my @rows;
 while($form=~/<OPTION VALUE="(\d+)">([^<]*)/g){
   my($n,$label)=($1,$2);$label=~s/\s+$//;
   push @rows,{count=>0+$n,label=>$label} if $n>0;
 }
 return \@rows;
}
if(!$c){
 my $ok=do "$FindBin::Bin/pinned-lord-f.cgi";my $err=$@;
 die "unexpected view error: $err $!" if !defined($ok)&&$err!~/^SOURCE_REFUSAL:/;
 if(!defined($ok)){print encode_json({ok=>0});exit}
 my $reason=$disp=~/反乱中のため実行できません/?'rebellion':
   $disp=~/取り締まりに必要な兵士数が足りません/?'army':
   $disp=~/費用が足りません/?'funds':undef;
 my $taxform=form('taxside');
 my @targets=map{0+$_} $taxform=~/<OPTION VALUE="(\d+)">/g;
 my($rate)=$disp=~/NAME=taxrate SIZE=5 VALUE="(\d+)"/;
 my($devem)=$disp=~/NAME=devem SIZE=10 VALUE="(\d+)"/;
 my($safem)=$disp=~/NAME=safem SIZE=10 VALUE="(\d+)"/;
 # Original "$army人" interpolates a different Unicode variable; preserve
 # the rendered headline, then read the actual two labeled component counts.
 my($headline,$regular,$volunteer)=$disp=~/<b>([^<]*)<\/b><small>（正規軍 (\d+)人，義勇軍 (\d+)人）/;
 die 'original army view fields missing' unless defined($headline)&&defined($regular)&&defined($volunteer);
 my $army=$regular+$volunteer;
 my($unit)=$disp=~/正規軍１人につき(-?\d+)/;
 die 'original fiscal view fields missing' unless defined($rate)&&defined($devem)&&defined($safem)&&defined($unit);
 print encode_json({ok=>1,taxForecast=>$money[0],money=>$money[1],upkeep=>$money[2],
  taxRate=>0+$rate,devem=>0+$devem,safem=>0+$safem,army=>0+$army,sourceArmyHeadline=>$headline,
  regularArmy=>0+$regular,volunteerArmy=>0+$volunteer,unitUpkeep=>0+$unit,
  canHire=>defined(form('outside'))?JSON::PP::true:JSON::PP::false,
  canFire=>defined(form('outdel'))?JSON::PP::true:JSON::PP::false,
  canExpose=>defined(form('expose'))?JSON::PP::true:JSON::PP::false,
  exposeReason=>$reason,hireOptions=>options('outside'),fireOptions=>options('outdel'),targets=>\@targets});
 exit;
}
%Q=(mode=>$c->{kind},$c->{kind} eq 'expose'?(tg=>$c->{targetId}):(cnt1=>$c->{cnt1},cnt2=>$c->{cnt2}));
my $done=do "$FindBin::Bin/pinned-lord-s.cgi";my $err=$@;
die "unexpected handler error: $err $!" if !defined($done)&&$err!~/^SOURCE_REFUSAL:/;
my $reason=defined($done)?undef:$err=~/反乱中/?'rebellion':$err=~/人数を指定/?'quantity':
 $err=~/対象店を選択/?'target':$err=~/費用が足りません/?'funds':$err=~/あまり意味がない/?'rank':'unknown';
print encode_json({ok=>defined($done)?1:0,(defined($reason)?(reason=>$reason):()),
 fixture=>{%$f,town=>$STATE,shops=>\@DT},logs=>\@logs,trace=>\@trace});
