package OriginalNormalCommerceItemHarness;
use strict;
use warnings;
use utf8;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;

# Execute original compiler functions for reviewed fields only. TYPE/FLAG
# are compiled by the actual frozen GetBuffer rather than forced to type 10.
sub compiled_items {
  OriginalGiftMapUseHarness::compile();
  my $source=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
  my $type=OriginalFullUseLostbookHarness::section($source,'GetTypeNumber');
  eval "package main; use utf8; no strict; no warnings; $type\n1;" or die $@;
  my $dsl=OriginalGiftMapUseHarness::original_dsl();
  my ($define)=$dsl=~/^\@\@DEFINE\b[^\n]*\n([\s\S]*?)(?=^\@\@ITEM\b)/mi;
  die 'missing original DEFINE' unless defined $define;
  for my $line(split /\n/,$define){
    next unless $line=~/^\s*type\d+\s+\S+/i;
    main::GetBuffer('define',OriginalGiftMapUseHarness::line_for_compiler($line));
  }
  my ($blocks)=OriginalGiftMapUseHarness::parse_dsl();
  my @rows;
  for my $block(@$blocks){
    main::ClearBuffer('item');
    for my $line(@{$block->{lines}}){
      next unless $line=~/^\s*(?:no|price|pop|point|cost|type|flag)\s+\S+/i;
      main::GetBuffer('item',OriginalGiftMapUseHarness::line_for_compiler($line));
    }
    my $r=$main::g_item;
    die 'incomplete original ITEM compiler row' unless $r->{no}&&defined $r->{type}&&defined $r->{flag};
    $rows[$r->{no}-1]={id=>0+$r->{no},(map {$_=>0+($r->{$_}//0)} qw(price popular point cost type)),flag=>$r->{flag}};
  }
  die '79 original compiler rows required' unless @rows==79&&!grep {!defined $_} @rows;
  return \@rows;
}
1;
