use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNaturalSalePlusHarness;
use OriginalNormalCommerceItemHarness;
use Storable qw(dclone);

# Isolated frozen inc-turn NATURAL region, all source-listable items.
# No USE, FUNCTURN, EVENT, CAS, disk, or player acquisition claim.
OriginalNaturalSalePlusHarness::bootstrap();
my $rows=OriginalNormalCommerceItemHarness::compiled_items();
my $natural=OriginalNaturalSalePlusHarness::natural_source();
eval "package main; use utf8; no strict; no warnings; sub NormalCommerceNatural {my(\$timespan)=\@_;\n$natural\n1;}\n1;" or die $@;
my @cases=map { {name=>'item-'.$_->{id},shown=>[$_->{id}],prices=>[$_->{price}]} }
  grep {$_->{flag}!~/s/&&$_->{price}>0} @$rows;
push @cases,
  {name=>'zero-pop-and-sword',shown=>[65,40],prices=>[50000,1200]},
  {name=>'eight-mixed',shown=>[1,2,65,40,77,79,62,71],prices=>[50,100,50000,1200,200000,10000,100000,3000]};
# Optional manual EVENT differential: use the original compiler's generated
# ITEM overlay from the independent source probe. Never write frozen files.
# The default 69 cases are unchanged. Fixed draws here are isolated only.
if(@ARGV){
  die 'expected --manual-events' unless @ARGV==1&&$ARGV[0] eq '--manual-events';
  open(my $pipe,'-|',$^X,"$FindBin::Bin/original-r4-manual-event-source-probe.pl") or die $!;
  binmode($pipe,':raw');
  my $wire;{local $/;$wire=<$pipe>;}
  close($pipe) or die 'manual source compiler probe failed';
  my $oracle=decode_json($wire);
  my %iron=('kill-ken'=>41,'kill-yoroi'=>53,'kill-tate'=>47,'kill-tue'=>58);
  @cases=();
  for my $event(@{$oracle->{cases}}){
    my $code=$event->{code};my $id=$iron{$code} or die 'unexpected manual EVENT';
    my $points=$event->{timeline}[0]{point};
    die 'original iron ITEM negative POINT required' unless @$points==79&&$points->[$id-1]==-100;
    for my $active(0,1){
      push @cases,{name=>$code.($active?'-active':'-baseline'),shown=>[$id],
        prices=>[$rows->[$id-1]{price}],stock=>40,manualCode=>$code,
        active=>$active,($active?(pointOverride=>$points):())};
    }
  }
  die 'all four source manual EVENT pairs required' unless @cases==8;
}
my @results;
for my $case(@cases){
  @main::ITEM=(undef,map {+{%$_,no=>$_->{id}}} @$rows);
  if($case->{pointOverride}){
    for my $i(1..79){$main::ITEM[$i]{point}=$case->{pointOverride}[$i-1];}
  }
  $main::MAX_ITEM=79;$main::DTpeople=500000;$main::MAX_USER=50;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  %main::DTevent=();
  my @stock=(0)x79;
  for my $id(@{$case->{shown}}){$stock[$id-1]=$case->{stock}//1;}
  $stock[62]=1 if @{$case->{shown}}==1;
  my $shop={id=>1,status=>1,rank=>5010,money=>100000,
    item=>\@stock,showcasecount=>scalar(@{$case->{shown}}),
    showcase=>$case->{shown},price=>$case->{prices},trush=>0,saletoday=>0,
    taxtoday=>0,costtoday=>0,itemtoday=>{},itemyesterday=>{},taxmode=>0};
  my $before=dclone($shop);
  @main::DT=($shop);
  my @draws=(500000)x121;
  @main::B35_DRAWS=@draws;$main::B35_USED=0;
  main::NormalCommerceNatural(3600);
  my $used=$main::B35_USED;
  push @results,{name=>$case->{name},input=>$before,
    output=>$shop,draws=>[ @draws[0..$used-1] ],used=>$used,
    (defined($case->{manualCode})?(manualCode=>$case->{manualCode},active=>$case->{active}):())};
}
binmode STDOUT,':raw';
print JSON::PP->new->utf8->canonical->encode(\@results);
