#!/usr/bin/env perl
use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalNayutaFuncturnHarness;
use OriginalGiftMapUseHarness;

# Execute ORIGINAL inc-turn.cgi ITEM FUNCTURN + FUNCSALE dispatch verbatim.
# Reuse B-39's compiled/executed ORIGINAL ITEM #70 _local_ callback body
# with original, fixed millionth random samples. No modified frozen sources.
binmode STDOUT,':encoding(UTF-8)';
OriginalNayutaFuncturnHarness::bootstrap();
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $start=index($turn,"\t\t#\@\@item funct 処理");
my $end=index($turn,"\t\tundef \$item::TIMESPAN;",$start);
die "R3 callback stage source missing" unless $start>=0&&$end>$start;
my $body=substr($turn,$start,$end-$start);
for my $marker (
  'my @itemt=sort {$a->{no}<=>$b->{no}} grep($_->{functurn},@ITEM);',
  'my @items=grep($_->{funcsale},@ITEM);',
  'foreach(@DT){delete $_->{_sale_count_}}',
) { die "R3 source callback marker drift" unless index($body,$marker)>=0; }
my $program="package main; no strict; no warnings; use utf8;\n".
  "sub R3OriginalItemCallbacks { my (\$timespan)=\@_; ".
  "\$TIMESPAN=\$timespan; \@item::DT=\@DT; ".
  "\$item::DT=\$DT; \@item::ITEM=\@ITEM; ".
  "\$item::TIMESPAN=\$TIMESPAN;\n".
  $body.
  "\nundef \$item::TIMESPAN; return 1; }\n1;\n";
my $ok=eval $program;
die "R3 direct original inc-turn callback cannot compile: $@" unless $ok;

my @cases=(
  {name=>'empty-60-low',span=>60,owned=>0,show=>0,draw=>0},
  {name=>'empty-60-high',span=>60,owned=>0,show=>0,draw=>999999},
  {name=>'empty-120',span=>120,owned=>0,show=>0,draw=>0},
  {name=>'empty-1800',span=>1800,owned=>0,show=>0,draw=>0},
  {name=>'owned-not-shown-60',span=>60,owned=>1,show=>0,draw=>0},
  {name=>'owned-shown-60-low',span=>60,owned=>1,show=>70,draw=>0},
  {name=>'owned-shown-60-high',span=>60,owned=>1,show=>70,draw=>999999},
);
my $emptyStreet=@ARGV&&$ARGV[0] eq '--empty-street';
@cases=(
  {name=>'zero-shops-1s',span=>1,owned=>0,show=>0,draw=>0},
  {name=>'zero-shops-60-low',span=>60,owned=>0,show=>0,draw=>0},
  {name=>'zero-shops-60-high',span=>60,owned=>0,show=>0,draw=>999999},
  {name=>'zero-shops-87s',span=>87,owned=>0,show=>0,draw=>0},
  {name=>'zero-shops-3600s',span=>3600,owned=>0,show=>0,draw=>0},
) if $emptyStreet;
my @out;
for my $case (@cases){
  OriginalNayutaFuncturnHarness::prepare_items();
  $main::DEFINE_FUNCTURN=0;
  $main::DEFINE_FUNCSALE=0;
  $main::ITEM_DIR='/__r3_no_generated_callback_file__';
  $main::FILE_EXT='.cgi';
  my @item=(0)x79;
  $item[62]=1; $item[78]=5;
  $item[69]=$case->{owned};
  my $shop={
    id=>1,rank=>5010,shopname=>'R3原版回呼測試店',
    item=>\@item,
    showcase=>[$case->{show}],
    price=>[$case->{show}==70?50000:0],
    _sale_count_=>{10=>{count=>1,price=>5000}},
  };
  @main::DT=$emptyStreet?():($shop);
  $main::B35_USED=0;
  @main::B35_DRAWS=($case->{draw});
  @main::B39_DEBUG_LOG=();
  main::R3OriginalItemCallbacks($case->{span});
  push @out,{
    ($emptyStreet?(activeShops=>scalar(@main::DT)):()),
    name=>$case->{name},span=>$case->{span},
    owned=>$case->{owned},show=>$case->{show},
    draw=>$case->{draw},drawsUsed=>0+$main::B35_USED,
    rankBefore=>5010,rankAfter=>0+$shop->{rank},
    temporarySaleCountExists=>exists($shop->{_sale_count_})?
      JSON::PP::true:JSON::PP::false,
    callbackLog=>[@main::B39_DEBUG_LOG],
  };
}
print JSON::PP->new->canonical->encode({
  scope=>'unchanged source inc-turn ITEM FUNCTURN and FUNCSALE loops, actual compiled #70 body, direct rand consumption and _sale_count_ cleanup; no full EVENT/SortDT/PLUS',
  cases=>\@out,
}),"\n";
