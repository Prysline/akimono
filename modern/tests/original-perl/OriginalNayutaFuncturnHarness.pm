package OriginalNayutaFuncturnHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalNaturalSalePlusHarness;
use OriginalSparseAllPlusHarness;
use OriginalGiftMapUseHarness;

# B-39: real ITEM #70 FUNCT _local_ inline Perl evaluated in an isolated
# package item wrapper matching the frozen compiler's generated sub semantics.
# The genuine inc-turn FUNCTURN foreach block is executed between the genuine
# B-38 natural-sales block and B-37 original full 59 PLUS. We SKIP other item
# callbacks (the fixed DSL declares no FUNCS for #70), SortDT, period, CGI.
our $READY;
sub original_inline_body {
  my($blocks)=OriginalGiftMapUseHarness::parse_dsl();
  my @hits;
  my $body;
  for my $block (@$blocks){
    my ($no)=map { /^\s*no\s+(\d+)\b/i ? $1 : () } @{$block->{lines}};
    my @funct=grep { /^\s*funct\s+(\S+)/i } @{$block->{lines}};
    push @hits,$no if @funct;
    next unless defined($no)&&$no==70;
    my @lines=@{$block->{lines}};
    my @indices=grep {$lines[$_]=~/^\s*funct\s+_local_\s*$/i} 0..$#lines;
    die 'B-39 ITEM #70 must declare exactly one local FUNCT' unless @indices==1;
    my $first=$indices[0]+1;
    my @ends=grep {$_>$first && $lines[$_]=~/^\s*_local_\s*$/} 0..$#lines;
    die 'B-39 ITEM #70 inline callback terminator absent' unless @ends==1;
    $body=join("\n",@lines[$first..$ends[0]-1]);
  }
  die 'B-39 source must contain only original ITEM #70 FUNCT'
    unless join(',',@hits) eq '70';
  for my $token (
    'my($ITEM,@DT)=@_;',
    'my $rankup=$TIMESPAN/86.4;',
    '$rankup=$rankup<1 && rand(1)<$rankup ? 1 : int($rankup);',
    'next if $DT->{showcase}[0]!=$ITEM->{no} || $DT->{price}[0]>$ITEM->{price};',
    '$DT->{rank}+=$rankup;',
    '$DT->{rank}=10000 if $DT->{rank}>10000;',
    'DebugLog("item $ITEM->{name} $DT->{shopname}',
  ){die 'B-39 original inline FUNCTURN body drift' unless index($body,$token)>=0;}
  return $body;
}
sub original_turn_loop {
  my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
  my $start=index($turn,"\t\t#\@\@item funct 処理");
  my $end=index($turn,"\t\t#\@\@item funcs 処理",$start);
  die 'B-39 original FUNCTURN loop section missing'
    unless $start>=0&&$end>$start;
  my $fragment=substr($turn,$start,$end-$start);
  for my $token (
    'sort {$a->{no}<=>$b->{no}} grep($_->{functurn},@ITEM)',
    '@item::TURN_DT=grep($_->{item}[$item->{no}-1],@DT);',
    '&$func($item,@item::TURN_DT);',
    'undef &$func if !$funcexists;',
  ){die 'B-39 actual original turn loop drift' unless index($fragment,$token)>=0;}
  return $fragment;
}
sub bootstrap {
  return if $READY;
  OriginalNaturalSalePlusHarness::bootstrap();
  my $body=original_inline_body();
  # Original frozen compiler emits:
  # package item; sub _local_ { eval(<<'_eval_code_'); ... _eval_code_ }
  # The inline code is copied, not rewritten or precomputed.
  my $program="package item; no strict; no warnings; use utf8;\n".
    "sub _local_ { eval(<<'_eval_code_');\n".$body.
    "\n_eval_code_\n}\n1;\n";
  my $ok=eval $program;
  die "B-39 original local callback cannot compile: $@" unless $ok;
  my $turn=original_turn_loop();
  my $natural=OriginalNaturalSalePlusHarness::natural_source();
  my $run="package main; no strict; no warnings; use utf8;\n".
    "sub B39SourceNaturalTurnPlus { my (\$timespan)=\@_; \$TIMESPAN=\$timespan;\n".
    "\$item::TIMESPAN=\$TIMESPAN;\n".
    $natural."\n".$turn."\n".
    "B35SourceStep(\$timespan);\nreturn 1; }\n1;\n";
  my $done=eval $run;
  die "B-39 natural+real FUNCTURN+PLUS cannot compile: $@" unless $done;
  {
    no strict 'refs';
    *{'item::DebugLog'}=sub { push @main::B39_DEBUG_LOG,$_[0]; };
  }
  $READY=1;
}
sub prepare_items {
  my $plus=OriginalSparseAllPlusHarness::reviewed_seconds();
  for my $id (1..79){$main::ITEM[$id]{plus}=$plus->[$id-1];}
  my $nayuta=OriginalNaturalSalePlusHarness::compiled_item(70);
  my $gift=OriginalNaturalSalePlusHarness::compiled_item(79);
  die 'B-39 original item #70 compiled numeric values changed'
    unless $nayuta->{price}==50000 &&
      $nayuta->{popular}==172800 &&
      $nayuta->{point}==20000 &&
      $nayuta->{cost}==200;
  die 'B-39 original gift upkeep changed' unless $gift->{cost}==10;
  @{$main::ITEM[70]}{qw(no price popular point cost type functurn)}=(
    70,$nayuta->{price},$nayuta->{popular},$nayuta->{point},
    $nayuta->{cost},70,'_local_'
  );
  $main::ITEM[79]{cost}=$gift->{cost};
  $main::ITEM[63]{cost}=0;
  $main::MAX_ITEM=79;$main::MAX_USER=50;$main::DTpeople=500000;
  $main::SALE_SPEED=12;$main::POP_DOWN_RATE=5;$main::DTTaxrate=0;
  $main::ITEM_DIR='/__b39_disabled_original_generated_items__';
  $main::FILE_EXT='.cgi';$main::DEFINE_FUNCTURN=0;
  %main::DTevent=();
  return $plus;
}
sub run {
  my(%o)=@_;
  bootstrap();
  my $plus=prepare_items();
  my $display=exists($o{display})?$o{display}:1;
  die 'B-39 only reviewed displayed or empty shop fixture'
    unless $display==0||$display==1;
  my @inventory=(0)x79;
  $inventory[62]=1;$inventory[78]=5;$inventory[69]=$display?1:0;
  @main::DT=({
    id=>42,status=>1,showcasecount=>1,shopname=>'B39來源新店',
    showcase=>[$display?70:0],price=>[$display?50000:0],
    item=>\@inventory,money=>100000,rank=>5010,trush=>0,
    saletoday=>0,taxtoday=>0,costtoday=>0,
    itemtoday=>{},itemyesterday=>{},taxmode=>0,
  });
  @main::DTwholestore=();
  @main::B39_DEBUG_LOG=();
  my $timespan=8640;
  my @samples=@{$o{randomDraws}//[(0)x121]};
  die 'B-39 too many source random samples' if @samples>121;
  for(@samples){die 'B-39 invalid millionth sample' unless /^\d+$/&&$_<1000000;}
  @main::B35_DRAWS=@samples;$main::B35_USED=0;
  main::B39SourceNaturalTurnPlus($timespan);
  my $used=$main::B35_USED;
  my $shop=$main::DT[0];
  my @whole=@main::DTwholestore;
  my @numbers=map {0+($_//0)} @whole;
  my @defined=grep {defined($main::DTwholestore[$_])} 0..$#main::DTwholestore;
  no warnings 'uninitialized';
  return {
    display=>$display,sourceItem70Price=>0+$main::ITEM[70]{price},
    sourceItem70Point=>0+$main::ITEM[70]{point},
    saleCount=>0+($shop->{itemtoday}{70}//0),
    item70=>0+$shop->{item}[69],
    money=>0+$shop->{money},trush=>0+$shop->{trush},
    saletoday=>0+$shop->{saletoday},taxtoday=>0+$shop->{taxtoday},
    costtoday=>0+$shop->{costtoday},
    rank=>0+$shop->{rank},temprank=>0+$shop->{temprank},
    callbackLog=>[@main::B39_DEBUG_LOG],
    wholesale=>\@whole,numericWholesale=>\@numbers,
    definedIndices=>\@defined,
    originalWholesaleCsv=>join(',',@main::DTwholestore),
    randomDrawsUsed=>$used,consumedSamples=>[@samples[0..$used-1]],
    scope=>'actual original natural sales region, source ITEM70 inline FUNCTURN body called via original inc-turn FUNCTURN loop, skip FUNCSALE/SortDT/period, original all59 PLUS and whole cap',
  };
}
sub callback_only {
  my(%o)=@_;
  bootstrap();
  prepare_items();
  my $rank=$o{rank}//5010;
  my $item=$main::ITEM[70];
  my $shop={rank=>$rank,shopname=>'單獨回呼測資',
    showcase=>[$o{display}//70],price=>[$o{price}//50000]};
  $item::TIMESPAN=$o{timespan}//60;
  @main::B39_DEBUG_LOG=();
  @main::B35_DRAWS=@{$o{randomDraws}//[0]};
  $main::B35_USED=0;
  item::_local_($item,$shop);
  return {rank=>$shop->{rank},drawsUsed=>$main::B35_USED,
    callbackLog=>[@main::B39_DEBUG_LOG]};
}
1;
