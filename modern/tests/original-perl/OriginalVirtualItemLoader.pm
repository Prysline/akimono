package OriginalVirtualItemLoader;
use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP ();
use Encode qw(encode_utf8);
use lib $FindBin::Bin;
use OriginalInlineCallbackHarness;

# B-28: in-memory @INC hook only. Never open a generated CGI file, never
# execute real _config.cgi/inc-item.cgi/item-m.cgi/item-s.cgi, and never
# write to disk. ONLY two reviewed exact original local Perl bodies.
our @HOOK_REQUESTS;
my $READY=0;
my %SPEC=(
  'book-work'=>{owner=>'work',uses=>2},
  'edit-showcase'=>{owner=>'showcase',uses=>8},
);
sub bootstrap {
  return 1 if $READY;
  OriginalInlineCallbackHarness::bootstrap();
  for my $token ('sub $use->{func} {eval(<<',
    'GetLocalFunction($name,$g_use->{no}+1)'){
    my $compiler=OriginalInlineCallbackHarness::read_source(
      "$FindBin::Bin/inc-makeitem.cgi");
    die "Original compiler contract drift $token"
      unless index($compiler,$token)>=0;
  }
  my $m=OriginalInlineCallbackHarness::read_source(
    "$FindBin::Bin/core-item-form.cgi");
  my $s=OriginalInlineCallbackHarness::read_source(
    "$FindBin::Bin/core-item-submit.cgi");
  my $d=OriginalInlineCallbackHarness::read_source(
    "$FindBin::Bin/core-item-detail.cgi");
  for my $file($m,$s,$d){
    die "Original direct require missing"
      unless index($file,'require $itemcode;')>=0;
    die "Original item path missing"
      unless index($file,'GetPath($ITEM_DIR,"use",$ITEM[$itemno]->{code})')>=0;
    die "inc-item before itemcode require"
      unless index($file,"RequireFile('inc-item.cgi')") <
        index($file,'require $itemcode;');
  }
  $READY=1;
  return 1;
}
sub make_module {
  my($code)=@_;
  my $spec=$SPEC{$code};
  die "Unreviewed source $code" unless $spec;
  my $body=$OriginalInlineCallbackHarness::BODIES{$spec->{owner}};
  die "No pinned local body $code" unless defined $body;
  my $module="use utf8;\npackage item;\n";
  for my $i(1..$spec->{uses}){
    # This small USE-row scaffold is SYNTHETIC. The original compiler emits
    # @USE assignments with richer fields. No actual game data is loaded.
    $module.="\$USE[$i]={no=>$i,code=>'$code'};\n";
  }
  $module.="sub _local_1 {eval(<<'_eval_code_');\n".
    $body."\n_eval_code_\n}\n1;\n";
  return $module;
}
sub scenario {
  my(@sequence)=@_;
  bootstrap();
  die "No sequence" unless @sequence;
  die "Too many synthetic loads" if @sequence>12;
  my %virtual=map {
    ("b28/use/$_.cgi" => make_module($_))
  } keys %SPEC;
  @HOOK_REQUESTS=();
  @item::USE=();
  # Force fresh virtual key cache without modifying the real process cache.
  local %INC=%INC;
  delete $INC{$_} for keys %virtual;
  my $hook=sub {
    my($self,$requested)=@_;
    die "Unknown in-memory loading request $requested"
      unless exists $virtual{$requested};
    push @HOOK_REQUESTS,$requested;
    # PerlIO scalar filehandles cannot directly open wide-character strings.
    # Encode the reviewed UTF-8 source as bytes, exactly as require reads
    # generated files; the virtual file's first line is use utf8.
    my $bytes=encode_utf8($virtual{$requested});
    open(my $fh,'<',\$bytes) or die "Cannot open virtual UTF-8 bytes: $!";
    return $fh;
  };
  local @INC=($hook);
  my @warnings;
  local $SIG{__WARN__}=sub {push @warnings,@_};
  my @steps;
  for my $code(@sequence){
    die "Not a reviewed item $code" unless exists $SPEC{$code};
    my $itemcode="b28/use/$code.cgi";
    my $cached=exists $INC{$itemcode} ? 1 : 0;
    # EXACT original operator/lexical variable pattern from item-m.cgi.
    require $itemcode;
    OriginalInlineCallbackHarness::fixture(
      money=>100,param1=>2,count=>2,
      showcaseCount=>1,showcase=>[9],prices=>[90],
      shopId=>42,shopName=>'原版店',
      moneyPrefix=>'¥',moneySuffix=>'',
    );
    my $returned=item::_local_1();
    die "Original virtual local callback error: $@" if $@;
    my $active=$returned=~/^展示架已經改成/ ? 'edit-showcase'
      : $returned=~/稼ぎました$/ ? 'book-work'
      : die "Unknown original callback result $returned";
    my @owners=map {
      my $rec=$item::USE[$_];
      defined $rec && ref($rec) eq 'HASH' ? $rec->{code} : undef;
    }(1..$#item::USE);
    push @steps,{
      requestedCode=>$code,virtualPath=>$itemcode,
      requireCacheHit=>$cached ? JSON::PP::true : JSON::PP::false,
      activeFunctionOwner=>$active,activeFunctionName=>'item::_local_1',
      returned=>$returned,moneyAfter=>$item::DT->{money},
      showcaseCountAfter=>$item::DT->{showcasecount},
      showcase=>[@{$item::DT->{showcase}}],
      prices=>[@{$item::DT->{price}}],
      logCalls=>[map{[@$_]}@OriginalInlineCallbackHarness::LOGS],
      useOwners=>\@owners,
    };
  }
  return {
    steps=>\@steps,
    loadedPaths=>[@HOOK_REQUESTS],
    hookRequests=>[@HOOK_REQUESTS],
    warningCount=>scalar(@warnings),
    scope=>'synthetic in-memory Perl require using only reviewed original local bodies; no disk writes or real CGI',
  };
}
1;
