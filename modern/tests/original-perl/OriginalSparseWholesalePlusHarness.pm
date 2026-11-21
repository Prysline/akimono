package OriginalSparseWholesalePlusHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalGiftMapUseHarness;

# Override CORE::rand at compile time, BEFORE the literal Core fragment is
# compiled by eval. Each draw is an explicitly injected integer millionth.
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand = sub ($) {
    die 'B-35 missing explicit source random draw' unless @main::B35_DRAWS;
    $main::B35_USED++;
    my $fraction=shift @main::B35_DRAWS;
    return $fraction*$_[0]/1000000;
  };
}
our $LOADED;
sub source_fragment {
  my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
  my $start=index($turn,"\t\t#市場商品数のUP/DOWN処理");
  my $end=index($turn,"\t\t#市場在庫上限下限チェック＆補正",$start);
  die 'B-35 fixed original turn loop not found' unless $start>=0&&$end>$start;
  my $part=substr($turn,$start,$end-$start);
  for my $literal (
    '$add=$timespan/abs($ITEM->{plus})*$DTpeople/(100000/(($MAX_USER+$#DT-1)*0.2+1));',
    '$DTwholestore[$cnt-1]+=$ITEM->{plus}>0 ? $add : -$add;',
    'if($add<1 && $add>0){if(rand(1/$add)<1){$add=1;}}'
  ){
    die 'B-35 source PLUS drift' unless index($part,$literal)>=0;
  }
  return $part;
}
sub bootstrap {
  return if $LOADED;
  my $config=File::Spec->catfile($FindBin::Bin,'..','..','..','_config.cgi');
  open(my $fh,'<:encoding(UTF-8)',$config) or die $!;
  local $/;my $configText=<$fh>;close $fh;
  die 'B-35 MAX_USER differs from frozen config'
    unless $configText=~/\$MAX_USER\s*=\s*50\s*;/;
  my $fragment=source_fragment();
  my $whole=File::Spec->catfile($FindBin::Bin,'whole.cgi');
  require $whole; # Exact frozen original CheckWholeStore; no CGI top-level.
  my $program="package main; no strict; no warnings; use utf8;\n".
    "sub B35SourceStep { my (\$timespan)=\@_;\n".
    $fragment."\nCheckWholeStore();\nreturn 1; }\n1;\n";
  my $compiled=eval $program;
  die "B-35 original PLUS fragment failed to compile: $@" unless $compiled;
  $LOADED=1;
}
sub run {
  my (%o)=@_;
  bootstrap();
  OriginalGiftMapUseHarness::compile();
  my $plus=main::GetTime('20m'); # Actual original compiler bounded function.
  die 'B-35 original PLUS 20m not 1200sec' unless $plus==1200;
  die 'B-35 original ITEM #10 drift'
    unless $main::ITEM[10]{code} eq 'book-make' &&
      $main::ITEM[10]{wslimit}==10;
  for my $i (1..79){$main::ITEM[$i]{plus}=0;}
  $main::ITEM[10]{plus}=$plus; # Explicit one-active-item TEST fixture.
  $main::MAX_ITEM=79;
  $main::MAX_USER=50;
  $main::DTpeople=500000;
  @main::DT=({item=>[(0)x79]});
  $main::DT[0]{item}[62]=1; # Real new shop #63
  $main::DT[0]{item}[78]=5; # Real new shop #79
  @main::DTwholestore=exists $o{wholesale} ? @{$o{wholesale}} : ();
  my $timespan=exists $o{timespanSeconds} ? $o{timespanSeconds} : 60;
  die 'B-35 positive bounded timespan' unless $timespan>=1&&$timespan<=3600;
  @main::B35_DRAWS=@{$o{randomDraws}//[0]};
  for(@main::B35_DRAWS){
    die 'B-35 random unit millionths' unless /^\d+$/&&$_<1000000;
  }
  $main::B35_USED=0;
  my $before=$main::DTwholestore[9]//0;
  main::B35SourceStep($timespan); # ORIGINAL inc-turn loop + full original cap.
  die 'B-35 unexpected leftover random draws' if @main::B35_DRAWS;
  my @whole=@main::DTwholestore;
  my @defined=grep {defined($main::DTwholestore[$_])} 0..$#main::DTwholestore;
  no warnings 'uninitialized';
  my $wire=join(',',@main::DTwholestore);
  return {
    item10Before=>0+$before,item10After=>0+($main::DTwholestore[9]//0),
    randomDrawsUsed=>$main::B35_USED,wireCsv=>$wire,
    definedIndices=>\@defined,
    wholesale=>\@whole,
    sourceScope=>'actual frozen inc-turn PLUS loop with one active item + original plug/whole CheckWholeStore; synthetic in-memory state; no entire CGI',
  };
}
1;
