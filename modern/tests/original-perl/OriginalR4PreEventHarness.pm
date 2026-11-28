package OriginalR4PreEventHarness;
use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;

# Shared exact source extraction for the isolated pre-EVENT probe and
# continuous cross-period command oracle. No source disk tail in this module.
sub prepare {
my($input,$preserveLogs)=@_;
OriginalNayutaFuncturnHarness::bootstrap();
my $full;
if($input->{fullCommerce}){require OriginalNormalCommerceItemHarness;$full=OriginalNormalCommerceItemHarness::compiled_items();}
OriginalNayutaFuncturnHarness::prepare_items();
# Reuse P3's exact source-compiled holding cost setup; all 79 items are
# initialized before the actual generated EVENT overlays execute.
for my $id(1..79){
  my $row=OriginalNaturalSalePlusHarness::compiled_item($id);
  for my $key(qw(price popular point cost)){
    $main::ITEM[$id]{$key}=$row->{$key} if defined $row->{$key};
  }
  $main::ITEM[$id]{type}=$full?$full->[$id-1]{type}:10;
}
$main::ITEM[63]{cost}=0;
$main::ITEM[70]{functurn}='_local_';$main::ITEM[70]{no}=70;
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
my($get)=$read=~/(^sub GetDTPoint\n\{[\s\S]*?^\}\n)(?=\nsub CheckUserPass)/m;
die 'original GetDTPoint source moved' unless $get;
eval "package main;no strict;no warnings;$get\n1;" or die $@;
my $a=index($turn,"\t\t#\@\@item funcs 処理");
my $b=index($turn,"\t\t#決算処理",$a);
die 'actual FUNCSALE/SortDT source missing' unless $a>=0&&$b>$a;
my $functail=substr($turn,$a,$b-$a);
my $natural=OriginalNaturalSalePlusHarness::natural_source();
my $funct=OriginalNayutaFuncturnHarness::original_turn_loop();
# The optional boundary oracle executes the genuine period prefix in
# the SAME process, between source SortDT and source PLUS. Disk tail,
# external payouts and closure remain explicitly outside this probe.
my $periodCall='';
if(exists $input->{settlement}){
  my $period=OriginalGiftMapUseHarness::source('period.cgi');
  my $dsl=OriginalGiftMapUseHarness::original_dsl();
  my $use=OriginalGiftMapUseHarness::source('use.cgi');
  my($add)=$use=~/(^sub AddItem\n\{[\s\S]*?^\}\n)(?=\nsub GetBackUrl)/m;
  my($rebel)=$period=~/(^sub RebelRobin\n\{[\s\S]*?^\}\n)(?=\nsub DragonBalance)/m;
  my $fstart=index($dsl,'sub UpdateResetBefore');
  my $fend=index($dsl,"\n\@\@FUNCNEW",$fstart);
  die 'original period helpers missing' unless $add&&$rebel&&$fstart>=0&&$fend>$fstart;
  my $update=substr($dsl,$fstart,$fend-$fstart);
  my %ids;
  for my $block(split /^\@\@ITEM[ \t]*(?:\#.*)?\r?\n/mi,$dsl){
    my($id)=$block=~/^\s*no\s+(\d+)\s*(?:#.*)?$/m;
    my($name)=$block=~/^\s*name\s+([^\r\n#]+?)(?:\s*#.*)?$/m;
    next unless defined($id)&&defined($name);
    $name=~s/\s+$//;$ids{$name}=$id;
    $main::ITEM[$id]{name}=$name;
    my($scale)=$block=~/^\s*scale\s+([^\r\n#]+)/m;
    $main::ITEM[$id]{scale}=$scale//'';
    $main::ITEM[$id]{scale}=~s/\s+$//;
  }
  die '79 source names required' unless keys(%ids)==79;
  $update=~s/\@\@ITEMNO\s*"([^"]+)"/exists $ids{$1}?$ids{$1}:die("unknown ITEMNO $1")/gex;
  die 'unexpanded period macro' if $update=~/\@\@(ITEMNO|VALUE|FUNC)/;
  my $from=index($period,"\tforeach(keys(%GUILD))");
  my $to=index($period,"\t#データバックアップ",$from);
  die 'source period prefix moved' unless $from>=0&&$to>$from;
  if($input->{disk}){$to=index($period,"\n1;",$to);die 'source period tail missing' unless $to>$from;}
  my $body=substr($period,$from,$to-$from);
  my $compiled=eval "package main;no strict;no warnings;use utf8;\n$add\n$rebel\n$update\nsub ActualBoundaryPeriod {\n$body\n1;\n}\n1;";
  die "source period compile $@" unless $compiled;
  {
    no warnings 'redefine';
    unless($input->{disk}){*main::DragonBalance=sub { die 'external dragon payout not in prefix oracle' if grep {($_->{dragon}//0)!=0} @main::DT; };}
    *main::CloseShop=sub {die 'closure outside source prefix oracle'};
    *main::EditGuildMoney=sub {die 'guild outside source prefix oracle'};
    unless($preserveLogs){
      *main::WriteLog=sub {1};
      *main::PushLog=sub {1};
    }
    *main::l=sub {$_[0]};
  }
  my $s=$input->{settlement};
  $main::STATE=$s->{town};$main::DTpeople=$s->{dtPeople};$main::DTusercount=1;
  $main::NOW_TIME=$s->{commandNowSeconds};
  if($input->{externalCandidate}){$main::BAL_JOB='外敵';$main::BAL_NAME='首領';}
  $main::EXPIRE_TIME=604800;$main::DEFINE_FUNCUPDATE=0;
  $main::PROFIT_DAY_COUNT=3;$main::EXP_DOWN_RATE=60;$main::EXP_DOWN_POINT=5;
  @main::SHOWCASE_COST=(0,2000,4000,8000,16000,32000,64000,128000);%main::GUILD=();%main::GUILD_DATA=();
  $periodCall='ActualBoundaryPeriod() if $dateupdate;';
}
my $ok=eval "package main;no strict;no warnings;use utf8;sub ActualPreEvent {my(\$timespan,\$dateupdate)=\@_; \$TIMESPAN=\$timespan;\$item::TIMESPAN=\$timespan;\n$natural\n$funct\n$functail\n$periodCall\nB35SourceStep(\$timespan);1;}\n1;";
die "original pre-EVENT source compile failed $@" unless $ok;
open my $p,'-|',$^X,"$FindBin::Bin/original-r4-event-item-param-probe.pl" or die $!;
my $raw=<$p>;close $p or die 'original overlay compiler failed';
my $compiled=JSON::PP->new->utf8->decode($raw);
my %generated=map {$_->{eventCode}=>$_->{generatedSource}} @{$compiled->{cases}};
if(exists $input->{eventWire}) {
  %main::DTevent=split(/,/,$input->{eventWire});
}else {
  %main::DTevent=%{$input->{events}};
}
my @order=keys %main::DTevent;
for my $code(@order){
  next if $code eq 'happy'||($input->{externalCandidate}&&$code eq 'rebel');
  die 'unknown source overlay' unless exists $generated{$code};
  eval "package main;no strict;no warnings;".$generated{$code}."\n1;" or die $@;
}
$main::DTpeople=$input->{dtPeople} if exists $input->{dtPeople};
@main::DT=($input->{shop});
@main::DTwholestore=length($input->{csv})?map{length($_)?0+$_:undef}split(/,/,$input->{csv},-1):();

if($input->{disk}){
  require OriginalR4CrossPeriodDiskHarness;
  OriginalR4CrossPeriodDiskHarness::prepare($input,\%generated);
}
return \@order;
}
1;
