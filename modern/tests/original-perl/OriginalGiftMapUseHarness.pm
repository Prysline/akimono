package OriginalGiftMapUseHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalFullUseLostbookHarness;

# B-33: SOURCE-EXECUTED actual compiler SUBROUTINES (not full compiler!)
# and frozen Core UseItem, CheckWholeStore, UseTime/GetItemUseTime.
# Only allow gift ITEM #79 -> USE #0 literal source stanza.
# This is NOT original inc-makeitem.cgi top-level (which deletes output
# directories/creates locks/writes generated files). No world disk IO.
our $READY;
our @COMPILER_SUBS=qw(GetTime GetNumber GetString GetItemNumber ClearBuffer GetBuffer);
sub source {
  my($path)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$path)
    or die "B-33 pinned source not found $path: $!";
  local $/; my $text=<$fh>;close $fh;return $text;
}
sub original_dsl {
  my $p=File::Spec->catfile($FindBin::Bin,'..','..','..',
    'custom','inc-item-data.cgi');
  open my $fh,'<:encoding(UTF-8)',$p or die "B-33 original DSL missing: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
sub line_for_compiler {
  my($raw)=@_;
  $raw=~s/\s+#.*$//;
  $raw=~s/^\s+|\s+$//g;
  return undef if !$raw||$raw=~/^#/;
  $raw=~s/\t/ /g;
  $raw=~s/\s+/  /g;
  return " $raw ";
}
sub bootstrap {
  return 1 if $READY;
  OriginalFullUseLostbookHarness::bootstrap();
  my $compiler=source('inc-makeitem.cgi');
  my @text=map{OriginalFullUseLostbookHarness::section($compiler,$_)}
    @COMPILER_SUBS;
  die 'B-33 compiler GET default 1000 changed'
    unless $compiler=~/if\(\$val\[2\]eq''\)\{\$val\[2\]=1000;\}/;
  die 'B-33 compiler time rate semantics changed'
    unless index($compiler,'$g_use->{time}=int(GetNumber($1)*$g_define->{itemusetimerate});')>=0;
  die 'B-33 compiler exptime default semantics changed'
    unless index($compiler,'$g_use->{exptime}=$g_use->{time} if $g_use->{exptime}==0')>=0;
  die 'B-33 compiled output USE zero-based indexing drift'
    unless $compiler=~/\\\$USE\[\$use->\{no\}\]/;
  my $compiled=eval "package main; use utf8; no strict; no warnings;\n".
    join("\n",@text)."\n1;\n";
  die "B-33 compiler bounded SOURCE subroutines compile error: $@" unless $compiled;
  $READY=1;
  return 1;
}
sub parse_dsl {
  my $src=original_dsl();
  my @lines=split(/\r?\n/,$src);
  my @items;
  my $current;
  for my $line(@lines){
    if($line=~/^\s*@@(ITEM|USE|EVENT|FUNC\w+|END)\b/i){
      push @items,$current if $current&&$current->{kind} eq 'ITEM';
      $current={kind=>uc($1),lines=>[]};
    } elsif($current){
      push @{$current->{lines}},$line;
    }
  }
  push @items,$current if $current&&$current->{kind} eq 'ITEM';
  # Above collects only sections before USE header. That is enough to read
  # all ITEM header fields, which must occur before their first USE.
  my $full=original_dsl();
  my($giftSection)=$full=~/(^\@\@ITEM[^\n]*\n[ \t]*no[ \t]+79\b[\s\S]*?)(?=^\@\@(?:ITEM|EVENT|event|END)\b|\z)/mi;
  die 'B-33 exact source ITEM #79 section missing' unless $giftSection;
  my @parts=split(/^\s*\@\@USE[^\n]*(?:\n|\z)/mi,$giftSection);
  die 'B-33 original gift USE blocks changed' unless @parts==6;
  return (\@items,\@parts);
}
sub compile {
  bootstrap();
  my($items,$parts)=parse_dsl();
  die 'B-33 expected 79 real ITEM declarations' unless @$items==79;
  $main::g_define={
    scale=>'個',itemusetimerate=>0.5,localfuncmark=>'_local_',
    function=>{},
  };
  @main::out_item=();
  @main::ITEM=();
  $main::MAX_ITEM=79;
  for my $block(@$items){
    main::ClearBuffer('item');
    my @accepted;
    for my $raw(@{$block->{lines}}){
      if($raw=~/^\s*(no|code|name|price|limit|scale)\s+([^\s#]+)/i){
        push @accepted,[$raw,$1,lc $1,$2];
      }
    }
    my %counts;
    $counts{$_->[2]}++ for @accepted;
    for(qw(no code name price limit))
      {die "B-33 missing/duplicate original ITEM $_" unless $counts{$_}==1;}
    for my $field(@accepted){
      # All 79 PRICE/LIMIT statements are checked; do not eval arbitrary
      # expression syntax from a future changed source.
      if($field->[2] eq 'price' && $field->[3]!~/^\d+$/)
        {die 'B-33 unsupported price';}
      if($field->[2] eq 'limit' && $field->[3]!~/^\d+(?:\/\d+(?:\.\d+)?)?$/)
        {die 'B-33 unsupported limit';}
      my $normalized=line_for_compiler($field->[0]);
      main::GetBuffer('item',$normalized);
    }
    my $it=$main::g_item;
    die 'B-33 original item compiler missing code or limit'
      unless $it->{code}&&defined $it->{limit}&&defined $it->{wslimit};
    die 'B-33 original ITEM id bad' unless $it->{no}>=1&&$it->{no}<=79;
    $main::ITEM[$it->{no}]={
      code=>$it->{code},name=>$it->{name},scale=>$it->{scale},
      limit=>$it->{limit},wslimit=>$it->{wslimit},
    };
    push @main::out_item,{%$it};
  }
  die 'B-33 actual compiler did not produce 79 items'
    if grep(!defined($_),@main::ITEM[1..79]);
  my $gift=$main::ITEM[79];
  die 'B-33 gift original item changed'
    unless $gift->{name} eq '禮物卷' && $gift->{code} eq 'gift' &&
      $gift->{limit}==10&&$gift->{wslimit}==0;
  for my $id(9,12,14){
    die "B-33 map $id limit changed"
      unless $main::ITEM[$id]{limit}==3&&$main::ITEM[$id]{wslimit}==3;
  }
  $main::g_item={code=>'gift',no=>79,scale=>'枚'};
  $main::g_use={no=>-1,exptime=>0};
  main::ClearBuffer('use');
  for my $raw(split(/\n/,$parts->[1])){
    my $normalized=line_for_compiler($raw);
    next unless defined $normalized;
    die "B-33 gift USE has unreviewed callback or job: $raw"
      if $raw=~/^\s*(?:func|funcb|job|exp|exptime|price|need|needexp|needevent|needpoint|needpop)\b/i;
    die "B-33 gift USE has unexpected line: $raw"
      unless $raw=~/^\s*(?:time|action|name|info|okmsg|use|get)\b/i;
    main::GetBuffer('use',$normalized);
  }
  my $u=$main::g_use;
  die 'B-33 original compiler use owner/id/name changed'
    unless $u->{no}==0&&$u->{itemno}==79&&
      $u->{code} eq 'gift'&&$u->{name} eq '交換地圖集';
  die 'B-33 original compiler half-time default changed'
    unless $u->{time}==1800&&$u->{exptime}==1800;
  die 'B-33 source use must not have skill/callback/money/job'
    if $u->{exp}||$u->{func}||$u->{funcbefore}||$u->{money}||$u->{needjob};
  my @materials=map{
    my @v=split(/\t/,$_,-1);
    {no=>main::GetItemNumber($v[1]),count=>0+$v[0],
      proba=>0+$v[2],message=>$v[3]}
  }@{$u->{use}};
  my @creates=map{
    my @v=split(/\t/,$_,-1);
    {no=>main::GetItemNumber($v[1]),count=>0+$v[0],
      proba=>0+$v[2],message=>$v[3]}
  }@{$u->{get}};
  die 'B-33 compiler got unexpected gift USE input'
    unless @materials==1&&$materials[0]{no}==79&&
      $materials[0]{count}==2&&$materials[0]{proba}==1000;
  die 'B-33 compiler got unexpected gift USE map rewards'
    unless @creates==3&&join(',',map {$_->{no}} @creates) eq '12,9,14'&&
      !grep($_->{count}!=1||$_->{proba}!=1000,@creates);
  return {
    no=>$u->{no},code=>$u->{code},itemno=>$u->{itemno},
    name=>$u->{name},time=>$u->{time},exptime=>$u->{exptime},
    money=>0,exp=>0,use=>\@materials,
    result=>{create=>\@creates,message=>{resultok=>$u->{okmsg}}},
  };
}
sub run {
  my(%o)=@_;
  my $u=compile();
  @OriginalFullUseLostbookHarness::TRACE=();
  $main::NOW_TIME=exists($o{nowSeconds})?$o{nowSeconds}:1000000;
  $main::MAX_STOCK_TIME=259200;
  $main::LIMIT_EXP=3600;
  $main::USER='synthetic-b33';
  %main::DTevent=();
  my $stock=exists($o{stock})?$o{stock}:[(0)x78,5];
  my $whole=exists($o{wholesale})?$o{wholesale}:[(0)x79];
  die 'B-33 expects exactly 79 original ITEM slots'
    unless ref($stock) eq 'ARRAY'&&@$stock==79&&
       ref($whole) eq 'ARRAY'&&@$whole==79;
  $main::DT={
    id=>42,status=>1,shopname=>'來源真實禮物卷人工市場測試店',
    item=>[@$stock],money=>exists($o{money})?$o{money}:100000,
    time=>exists($o{time})?$o{time}:956800,
    paytoday=>exists($o{paytoday})?$o{paytoday}:0,
    rank=>5010,exp=>{},
  };
  @main::DT=($main::DT);
  @main::DTwholestore=@$whole;
  $u->{result}{expold}='';
  my $requested=exists($o{requestedCount})?$o{requestedCount}:1;
  main::UseItem($u,$requested);
  return {
    giftRule=>{
      itemno=>$u->{itemno},no=>$u->{no},name=>$u->{name},
      time=>$u->{time},exptime=>$u->{exptime},
      use=>[map {[$_->{no},$_->{count},$_->{proba}]}@{$u->{use}}],
      create=>[map {[$_->{no},$_->{count},$_->{proba}]}@{$u->{result}{create}}],
    },
    result=>{
      count=>$u->{result}{count},
      useitem=>$u->{result}{useitem},
      additem=>$u->{result}{additem},
      usemsg=>$u->{result}{usemsg},
      addmsg=>$u->{result}{addmsg},
      function_return=>$u->{result}{function_return},
    },
    stock=>[@{$main::DT->{item}}],
    wholesale=>[@main::DTwholestore],
    money=>$main::DT->{money},
    paytoday=>$main::DT->{paytoday},
    time=>$main::DT->{time},
    trace=>[@OriginalFullUseLostbookHarness::TRACE],
    itemLimits=>[map {[$main::ITEM[$_]{limit},$main::ITEM[$_]{wslimit}]} 1..79],
    scope=>'source-executed bounded GetBuffer/ClearBuffer/GetNumber/GetItemNumber and frozen Core UseItem on real DSL gift #79; synthetic 79-slot market, no full compiler, CGI or world IO',
  };
}
1;
