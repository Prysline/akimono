package OriginalItemHelperHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
our (%BODY,$COMPILED);

# B-29: extract and run ONLY four reviewed, exact SHA-pinned Core helper
# subroutines and the exact Standard Street lostbook subroutine. This NEVER
# requires inc-item.cgi or invokes the original game, callbacks outside
# lostbook, real CGI, logger, user data, locks, or persistence.
sub read_text {
  my($p)=@_;
  open(my $fh,'<:encoding(UTF-8)',$p) or die "B-29 source not found $p: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
sub bootstrap {
  return 1 if $COMPILED;
  my $inc=read_text(File::Spec->catfile($FindBin::Bin,'core-inc-item.cgi'));
  die 'B-29 source package item changed'
    unless $inc=~/^package item; #変更不可$/m;
  for my $name(qw(UseItem UseItemSub AddItem AddItemSub)){
    my ($sub)=$inc=~/(^sub \Q$name\E\n\{[\s\S]*?^\}\n)/m;
    die "Missing original Core sub $name" unless defined $sub;
    $BODY{$name}=$sub;
  }
  die 'B-29 helper order changed' unless
    index($inc,'sub UseItem\n')<index($inc,'sub UseItemSub\n') &&
    index($inc,'sub UseItemSub\n')<index($inc,'sub AddItem\n') &&
    index($inc,'sub AddItem\n')<index($inc,'sub AddItemSub\n');
  my $dsl=read_text(File::Spec->catfile($FindBin::Bin,'..','..','..',
    'custom','inc-item-data.cgi'));
  my ($section)=$dsl=~/(^\@\@FUNCITEM\b[\s\S]*?)(?=^\@\@FUNCUPDATE\b)/m;
  die "B-29 source @@FUNCITEM missing" unless defined $section;
  my ($book)=$section=~/(^sub lostbook\s*\n\{[\s\S]*?^\}\n)/m;
  die 'B-29 exact original lostbook missing' unless defined $book;
  $BODY{lostbook}=$book;
  die 'B-29 unexpected lostbook external function'
    unless $book=~/UseItem\(\$itemno,1,\$ITEM\[\$itemno\]->\{name\}/;
  my $source=join("\n",@BODY{qw(UseItem UseItemSub AddItem AddItemSub lostbook)});
  my $ok=eval "package item; use utf8; no strict; no warnings;\n".
    $source."\n1;\n";
  die "B-29 original Core helper source failed to compile: $@" unless $ok;
  $COMPILED=1;
  return 1;
}
sub fixture {
  my(%o)=@_;
  bootstrap();
  my $itemNo=exists($o{itemNo})?$o{itemNo}:1;
  my $stock=exists($o{stock})?$o{stock}:5;
  my $limit=exists($o{limit})?$o{limit}:10;
  my $itemName=exists($o{itemName})?$o{itemName}:
    ($itemNo==1?'書本甲':'書本乙');
  my @stock=();
  $stock[$itemNo-1]=$stock;
  $item::DT={
    item=>\@stock,money=>700,time=>250,exp=>{1=>120},
    id=>42,shopname=>'原版店',
  };
  my $result=exists($o{result})?$o{result}:{count=>7};
  $item::USE={
    itemno=>$itemNo,
    param1=>exists($o{param1})?$o{param1}:1000,
    result=>$result,
  };
  @main::ITEM=();
  $main::ITEM[$itemNo]={limit=>$limit};
  @item::ITEM=();
  $item::ITEM[$itemNo]={name=>$itemName};
  return $item::DT;
}
sub subcall {
  my(%o)=@_;
  fixture(%o);
  my($method,$itemNo,$count,$msg) =
    @o{qw(method itemNo count message)};
  $itemNo=1 if !defined $itemNo;
  $msg='' if !defined $msg;
  my $returned;
  if($method eq 'UseItem'){
    $returned=item::UseItem($itemNo,$count,$msg);
  }elsif($method eq 'UseItemSub'){
    $returned=item::UseItemSub($itemNo,$count,$item::DT);
  }elsif($method eq 'AddItem'){
    $returned=item::AddItem($itemNo,$count,$msg);
  }elsif($method eq 'AddItemSub'){
    $returned=item::AddItemSub($itemNo,$count,$item::DT);
  }else{die "Unreviewed item helper method: $method"}
  return {
    returned=>$returned,
    stockAfter=>$item::DT->{item}[$itemNo-1],
    result=>$item::USE->{result},
  };
}
sub lostbook {
  my(%o)=@_;
  fixture(%o);
  my $seed=exists($o{seed})?$o{seed}:12;
  # Precompute the *Perl original* rand draw for cross-language input.
  srand($seed);my $draw=rand(1000);srand($seed);
  my $ret=item::lostbook();
  return {
    returned=>$ret,randomDraw=>$draw,
    stockAfter=>$item::DT->{item}[$item::USE->{itemno}-1],
    result=>$item::USE->{result},
    moneyAfter=>$item::DT->{money},
    timeAfter=>$item::DT->{time},
    expAfter=>$item::DT->{exp},
  };
}
1;
