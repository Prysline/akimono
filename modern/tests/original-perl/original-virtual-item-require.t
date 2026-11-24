use strict;
use warnings;
use utf8;
use Test::More;
use FindBin;
use lib $FindBin::Bin;
use OriginalVirtualItemLoader;
binmode STDOUT, ':encoding(UTF-8)';

# B-28: only reads pinned upstream CGI sources and the original repository
# _config.cgi. NO CGI, admin compiler, dynamic app require, real writes.
# The actual Perl REQUIRE operator runs through an in-memory @INC hook
# containing ONLY the two B-27-reviewed original inline callback bodies.
sub read_text {
  my($name)=@_;
  open(my $fh,'<:encoding(UTF-8)',"$FindBin::Bin/$name")
    or die "Missing pinned source $name: $!";
  local $/;my $out=<$fh>;close $fh;return $out;
}
my $config=read_text('../../../_config.cgi');
my $detail=read_text('core-item-detail.cgi');
my $form=read_text('core-item-form.cgi');
my $submit=read_text('core-item-submit.cgi');
my $common=read_text('core-inc-item.cgi');
my $compiler=read_text('inc-makeitem.cgi');
my $use=read_text('use.cgi');

like($config,qr/sub RequireFile\n\{/,
  'B-28-P01 repository original RequireFile source exists');
like($config,qr/my \$customfile="\$CUSTOM_DIR\/\$_\[0\]";/,
  'B-28-P02 RequireFile builds custom override path FIRST');
like($config,qr/require \$customfile,return if -e \$customfile;/,
  'B-28-P03 custom override is prioritized');
like($config,qr/my \$fname="\$INCLUDE_DIR\/\$_\[0\]";/,
  'B-28-P04 fallback uses include directory');
like($config,qr/require \$fname;/,
  'B-28-P05 fallback uses Perl require');
like($common,qr/^package item; #変更不可$/m,
  'B-28-P06 fixed original inc-item.cgi uses package item');
like($common,qr/^sub WriteLog\n\{/m,
  'B-28-P07 common loader defines item::WriteLog');
like($common,qr/^sub UseItem\n\{/m,
  'B-28-P08 common loader defines item::UseItem');
like($common,qr/require "\$main::ITEM_DIR\/funcitem\.cgi" if \$main::DEFINE_FUNCITEM;/,
  'B-28-P09 fixed common loader conditionally requires shared funcitem.cgi');
unlike($common,qr/require \$itemcode/,
  'B-28-P10 inc-item.cgi does NOT select a per-item use module');
my $index=0;
for my $entry(
  ['core-item-detail.cgi',$detail,'GetUseItemList()'],
  ['core-item-form.cgi',$form,'GetUseItem($no)'],
  ['core-item-submit.cgi',$submit,'GetUseItem($no)'],
){
  my($path,$src,$lookup)=@$entry;
  my $route=index($src,'GetPath($ITEM_DIR,"use",$ITEM[$itemno]->{code})');
  my $commonAt=index($src,"RequireFile('inc-item.cgi')");
  my $direct=index($src,'require $itemcode;');
  my $lookupAt=index($src,$lookup,$direct);
  ok($route>=0 && $commonAt>$route && $direct>$commonAt && $lookupAt>$direct,
    'B-28-P'.sprintf('%02d',11+$index).
    " $path selects per-item path, loads shared module, directly requires item, then queries USE");
  ++$index;
}
like($compiler,qr/\$ITEM_DIR\/use\/\$item->\{code\}/,
  'B-28-P14 compiler produces distinct per-code use/<code> files');
like($compiler,qr/\$s\.="package item;\\0"/,
  'B-28-P15 all compiled per-code use modules join SAME package item namespace');
like($compiler,qr/\\\$USE\[\$use->\{no\}\]=/,
  'B-28-P16 compiler assigns USE array by index');
like($compiler,qr/\$s\.="sub \$use->\{func\} \{eval\(<<'_eval_code_'\);/,
  'B-28-P17 local subroutines are generated using original eval wrapper');
my $start=index($compiler,'open(MAKEOUT,');
my $end=index($compiler,'close(MAKEOUT);',$start);
ok($start>=0 && $end>$start,
  'B-28-P18 compiler file-generation segment found');
my $segment=substr($compiler,$start,$end-$start);
unlike($segment,qr/undef \@USE|undef \@item::USE/,
  'B-28-P19 per-product compiler emits no @item::USE clearing statement');
my $whole=index($use,'CheckWholeStore();');
my $requireAfter=index($use,"RequireFile('inc-item.cgi');",$whole);
my $function=index($use,'my $itemfunc="item::".$USE->{result}->{function};',$requireAfter);
ok($whole>=0&&$requireAfter>$whole&&$function>$requireAfter,
  'B-28-P20 original UseItem requests shared inc-item after production before dynamic symbol');

my $single=OriginalVirtualItemLoader::scenario('book-work');
is(scalar(@{$single->{steps}}),1,'B-28-P21 single item scenario recorded');
is($single->{steps}[0]{returned},'¥4稼ぎました',
  'B-28-P22 reviewable original book-work body runs from virtual Perl require');
is($single->{steps}[0]{moneyAfter},104,
  'B-28-P23 original work body mutated synthetic money via required symbol');
is_deeply($single->{steps}[0]{useOwners},['book-work','book-work'],
  'B-28-P24 generated-style source loads only two work USE records');
is($single->{steps}[0]{activeFunctionOwner},'book-work',
  'B-28-P25 selected symbol is original work source when loaded alone');
is(scalar(@{$single->{hookRequests}}),1,
  'B-28-P26 one in-memory require hook call');

my $same=OriginalVirtualItemLoader::scenario(
  'book-work','book-work','edit-showcase','book-work');
is(scalar(@{$same->{steps}}),4,'B-28-P27 multi-load synthetic sequence recorded');
is($same->{steps}[0]{activeFunctionOwner},'book-work',
  'B-28-P28 first distinct module owns item::_local_1');
ok(!$same->{steps}[0]{requireCacheHit},
  'B-28-P29 first per-code require is a cache miss');
ok($same->{steps}[1]{requireCacheHit},
  'B-28-P30 second identical per-code require hits Perl %INC');
is($same->{steps}[1]{activeFunctionOwner},'book-work',
  'B-28-P31 identical repeat does not change active symbol');
is($same->{steps}[2]{activeFunctionOwner},'edit-showcase',
  'B-28-P32 distinct second per-code module overwrites item::_local_1');
is($same->{steps}[2]{returned},'展示架已經改成2個了',
  'B-28-P33 original showcase body executes after second direct require');
ok($same->{steps}[3]{requireCacheHit},
  'B-28-P34 earlier work path remains cached even after symbol overwritten');
is($same->{steps}[3]{activeFunctionOwner},'edit-showcase',
  'B-28-P35 require cached work path does NOT restore original work callback');
is($same->{steps}[3]{returned},'展示架已經改成2個了',
  'B-28-P36 most recently defined callback still runs after cache hit');
is_deeply($same->{hookRequests},[
  'b28/use/book-work.cgi','b28/use/edit-showcase.cgi',
],'B-28-P37 in-memory require hook only serves each distinct path once');
is_deeply($same->{steps}[2]{useOwners},[
  ('edit-showcase') x 8,
],'B-28-P38 second product overwrites all eight synthetic use slots');

my $reverse=OriginalVirtualItemLoader::scenario(
  'edit-showcase','book-work','edit-showcase');
is($reverse->{steps}[0]{activeFunctionOwner},'edit-showcase',
  'B-28-P39 showcase-first module owns symbol');
is($reverse->{steps}[1]{activeFunctionOwner},'book-work',
  'B-28-P40 later work module overrides symbol');
is_deeply($reverse->{steps}[1]{useOwners},[
  'book-work','book-work',('edit-showcase') x 6,
],'B-28-P41 smaller source USE indices overwrite only 1..2, previous 3..8 remain');
is($reverse->{steps}[2]{activeFunctionOwner},'book-work',
  'B-28-P42 cached showcase require does not restore symbol');
is($reverse->{steps}[2]{moneyAfter},104,
  'B-28-P43 cached showcase path unexpectedly uses last defined work body');
is_deeply($reverse->{hookRequests},[
  'b28/use/edit-showcase.cgi','b28/use/book-work.cgi',
],'B-28-P44 hook order matches distinct require file order');

my $only=OriginalVirtualItemLoader::scenario('edit-showcase');
is($only->{steps}[0]{activeFunctionOwner},'edit-showcase',
  'B-28-P45 new isolated scenario can load showcase alone');
is_deeply($only->{steps}[0]{useOwners},[('edit-showcase') x 8],
  'B-28-P46 new controlled scenario has no stale USE records');
is($only->{steps}[0]{showcaseCountAfter},2,
  'B-28-P47 source showcase body runs with synthetic fixture');
is_deeply($only->{steps}[0]{showcase},[9,0],
  'B-28-P48 original callback expansion verified through actual Perl require');
is_deeply($only->{steps}[0]{prices},[90,0],
  'B-28-P49 original callback price expansion verified');
is_deeply($only->{steps}[0]{logCalls},[
  [0,42,'展示架已經改成2個了'],
  [3,0,'原版店的展示架已經變成2個了'],
],'B-28-P50 original recording-only WriteLog argument order survived require');

done_testing();
