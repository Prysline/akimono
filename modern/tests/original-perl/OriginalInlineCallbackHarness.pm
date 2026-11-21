package OriginalInlineCallbackHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
our (@LOGS,@term,%BODIES,%DETAILS,$COMPILED_CORE,$CALLBACK);
{
  package item;
  our ($DT,$USE,$count);
  sub WriteLog {
    push @OriginalInlineCallbackHarness::LOGS,[@_];
    return 1;
  }
  sub GetMoneyString {
    return OriginalInlineCallbackHarness::GetMoneyString(@_);
  }
}
sub read_source {
  my($path)=@_;
  open(my $f,'<:encoding(UTF-8)',$path) or die "Cannot read pinned B-27 source $path: $!";
  local $/; my $text=<$f>; close $f; return $text;
}
sub bootstrap {
  my $dsl=read_source(File::Spec->catfile($FindBin::Bin,'..','..','..',
    'custom','inc-item-data.cgi'));
  my $compiler=read_source(File::Spec->catfile($FindBin::Bin,
    'inc-makeitem.cgi'));
  my $core=read_source(File::Spec->catfile($FindBin::Bin,'inc-func.cgi'));
  for my $token (
    'GetLocalFunction($name,$g_use->{no}+1)',
    'sub $use->{func} {eval(<<',
    'sub GetLocalFunction'
  ){
    die "Original compiler contract not pinned: $token"
      unless index($compiler,$token)>=0;
  }
  my ($core_body)=$core=~/(^sub GetMoneyString\n\{[\s\S]*?^\}\n)/m;
  die "Pinned GetMoneyString Core body missing" unless defined $core_body;
  my $compiled=eval("package OriginalInlineCallbackHarness; no strict; no warnings;\n".
    $core_body."\n1;\n");
  die "Pinned Core money formatter compile error: $@" unless $compiled;
  $COMPILED_CORE=1;
  for my $spec(
    ['work',13,'book-work',2,1],
    ['showcase',63,'edit-showcase',8,7],
  ){
    my($name,$id,$code,$uses,$aliases)=@$spec;
    my @blocks=split(/(?=^\@\@ITEM\b)/m,$dsl);
    my($block)=grep{
      /^[ \t]*no[ \t]+\Q$id\E[ \t]*(?:#.*)?$/m &&
      /^[ \t]*code[ \t]+\Q$code\E[ \t]*(?:#.*)?$/m
    }@blocks;
    die "Missing original item $id/$code" unless defined $block;
    my($body)=$block=~/^[ \t]*func[ \t]+_local_[ \t]*(?:#.*)?\n([\s\S]*?)^[ \t]*_local_[ \t]*(?:#.*)?$/m;
    die "Missing original local Perl body $name" unless defined $body;
    my $nuses=()=$block=~/^[ \t]*\@\@use\b/gim;
    my $nalias=()=$block=~/^[ \t]*func[ \t]+_local_1[ \t]*(?:#.*)?$/gim;
    my $ndef=()=$block=~/^[ \t]*func[ \t]+_local_[ \t]*(?:#.*)?$/gim;
    die "Original callback inventory drift $name $nuses/$nalias/$ndef"
      unless $nuses==$uses && $nalias==$aliases && $ndef==1;
    $BODIES{$name}=$body;
    $DETAILS{$name}={id=>$id,code=>$code,useCount=>$nuses,
      aliasCount=>$nalias,definitionCount=>$ndef};
  }
  return 1;
}
sub select_callback {
  my($name)=@_;
  my $body=$BODIES{$name};
  die "Unreviewed local callback $name" unless defined $body;
  # This wrapper is exactly the source template in inc-makeitem.cgi.
  # It compiles ONLY the already reviewed original inline body in memory,
  # not the whole original DSL, and does not write the output file.
  my $wrapper="package item; use utf8; no strict; no warnings;\n".
    "sub _local_1 {eval(<<'_eval_code_');\n".
    $body."\n_eval_code_\n}\n1;\n";
  my $ok;
  { no warnings 'redefine'; $ok=eval($wrapper); }
  die "Pinned local callback compile error $name: $@" unless $ok;
  $CALLBACK=$name;
  return $wrapper;
}
sub fixture {
  my(%o)=@_;
  @LOGS=();
  @term=($o{moneyPrefix}//'¥',$o{moneySuffix}//'');
  $item::DT={
    id=>$o{shopId}//42,shopname=>$o{shopName}//'原版店',
    money=>exists $o{money}?$o{money}:1000,
    showcasecount=>exists $o{showcaseCount}?$o{showcaseCount}:2,
    showcase=>[ @{$o{showcase}//[10,20]} ],
    price=>[ @{$o{prices}//[100,200]} ],
    item=>[7,8,9],time=>250,exp=>{13=>100},
  };
  $item::USE={param1=>exists $o{param1}?$o{param1}:3000};
  $item::count=exists $o{count}?$o{count}:2;
  return $item::DT;
}
sub run {
  die "No selected callback" unless $CALLBACK;
  my $result=item::_local_1();
  die "Original local callback eval raised: $@" if $@;
  return $result;
}
1;
