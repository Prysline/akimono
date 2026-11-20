use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';

# B-25: EXACT source functions from the SHA-pinned use.cgi are executed.
# Synthetic, locally declared package item callbacks only. NO compilation
# of custom DSL, real require, item action, live player, CGI or file writes.
our ($DT,$CASE,@TRACE);
$CASE='';
@TRACE=();
{
  package item;
  our @USE;
  sub _job_use_7_worker_ {
    my($no)=@_; push @main::TRACE,'exact-'.$no;
    $USE[$no]{use}[0]{count}=3;
    return 999; # ignored by ORIGINAL CheckUseItem
  }
  sub _job_use_0_worker_ {
    my($no)=@_; push @main::TRACE,'fallback-'.$no;
    $USE[$no]{use}[0]{count}=2;
  }
  sub _job_use_0_fallback_ {
    my($no)=@_; push @main::TRACE,'fallback-only-'.$no;
    $USE[$no]{use}[0]{count}=2;
  }
  sub _job_use_7_switch_ {
    my($no)=@_; push @main::TRACE,'switch-'.$no;
    $USE[$no]{functionbefore}='before_show';
  }
  sub _job_use_7_stock_ {
    my($no)=@_; push @main::TRACE,'stock-'.$no;
    $main::DT->{item}[0]=0;
  }
  sub before_show {
    my($u)=@_;push @main::TRACE,'before-show';return 2;
  }
  sub before_hide {
    my($u)=@_;push @main::TRACE,'before-hide';return 1;
  }
  sub before_pass {
    my($u)=@_;push @main::TRACE,'before-pass';return 0;
  }
  sub before_other {
    my($u)=@_;push @main::TRACE,'before-other';return 7;
  }
  sub before_stock {
    my($u)=@_;push @main::TRACE,'before-stock';
    $main::DT->{item}[0]=0;return 0;
  }
  sub before_change_need {
    my($u)=@_;push @main::TRACE,'before-change-need';
    $u->{use}[0]{count}=8;return 0;
  }
}

sub pinned {
  open(my $fh,'<:encoding(UTF-8)','use.cgi') or die "Pinned use.cgi: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
my $source=pinned();
sub extract {
  my($name,$next)=@_;
  my($part)=$source=~/(^sub \Q$name\E\n\{[\s\S]*?^\}\n)(?=\nsub \Q$next\E)/m;
  return $part;
}
my @original=(
  extract('GetUseItemList','GetUseItemListSub'),
  extract('GetUseItemListSub','CheckUseItem'),
  extract('CheckUseItem','GetUseItem'),
  extract('GetUseItem','UseItem'),
);
for my $i (0..3){
  ok(defined $original[$i],'B-25-P'.sprintf('%02d',$i+1).
    ' exact original Get/CheckUseItem routine extracted');
}
die 'SHA-pinned original source missing' if grep {!defined $_} @original;
my $check=$original[2];
like($check,qr/defined \&\$jobfunc/,
  'B-25-P05 specific-job symbol existence checked');
like($check,qr/item::_job_use_0_\$DT->\{job\}_/,
  'B-25-P06 original fallback only when specific symbol absent');
like($check,qr/\&\{"item::"\.\$funcbefore\}\(\$USE\)/,
  'B-25-P07 source calls dynamically named functionbefore');
like($check,qr/return 2 if \$ret==2/,
  'B-25-P08 functionbefore=2 grants display only');
like($check,qr/return 0 if \$ret==1/,
  'B-25-P09 functionbefore=1 rejects use');
like($check,qr/return 0 if \$DT->\{item\}\[\$item->\{no\}-1\]<\$item->\{count\}/,
  'B-25-P10 source material shortage evaluated after callbacks');
my $compiled=eval("no strict; no warnings;\n".join("\n",@original)."\n1;\n");
die "Frozen original routines could not compile: $@" unless $compiled;
ok(defined(&CheckUseItem),'B-25-P11 unmodified CheckUseItem compiled');
ok(defined(&GetUseItem)&&defined(&GetUseItemListSub),
  'B-25-P12 original list/get wrappers compiled');

sub shop {
  my(%o)=@_;
  $DT={job=>$o{job}//'none',item=>[$o{stock}//5,2,0]};
  @TRACE=();
  @item::USE=();
}
sub use_record {
  my(%o)=@_;
  my $id=$o{no}//7;
  return {
    no=>$id,use=>[
      {no=>1,count=>$o{need}//1},
    ],
    (defined $o{before}?(functionbefore=>$o{before}):()),
    (exists($o{dispok})?(dispok=>$o{dispok}):()),
    (exists($o{useok})?(useok=>$o{useok}):()),
  };
}
sub register_use {
  my($u)=@_;
  $item::USE[$u->{no}]=$u;
}
shop(job=>'worker');
my $u=use_record(no=>7,need=>4);
register_use($u);
is(CheckUseItem($u),1,
  'B-25-P13 exact job applied before materials; need4 becomes3');
is($u->{use}[0]{count},3,'B-25-P14 job callback actually mutates USE row');
is_deeply(\@TRACE,['exact-7'],
  'B-25-P15 exact defined callback suppresses generic fallback');
ok(!exists($u->{useok})&&!exists($u->{dispok}),
  'B-25-P16 plain CheckUseItem does not set wrapper flags');

shop(job=>'worker',stock=>1);
$u=use_record(no=>9,need=>1);
register_use($u);
is(CheckUseItem($u),0,'B-25-P17 missing specific invokes fallback then shortage');
is($u->{use}[0]{count},2,'B-25-P18 fallback changed requirement to2');
is_deeply(\@TRACE,['fallback-9'],
  'B-25-P19 only generic job stub was invoked');

shop(job=>'fallback',stock=>2);
$u=use_record(no=>7,need=>1);
register_use($u);
is(CheckUseItem($u),1,'B-25-P20 fallback-only job allows exactly two stocked');
is_deeply(\@TRACE,['fallback-only-7'],
  'B-25-P21 fallback selected by missing exact symbol');

shop(job=>'none',stock=>1);
$u=use_record(no=>7,need=>1);
register_use($u);
is(CheckUseItem($u),1,'B-25-P22 no job sub defined skips optional dispatch');
is_deeply(\@TRACE,[],'B-25-P23 no job callback observed');

shop(job=>'switch',stock=>0);
$u=use_record(no=>7,need=>1);
register_use($u);
is(CheckUseItem($u),2,'B-25-P24 job can set functionbefore dynamically');
is($u->{functionbefore},'before_show',
  'B-25-P25 original callback name read AFTER job side effect');
is_deeply(\@TRACE,['switch-7','before-show'],
  'B-25-P26 preflight order exact job -> functionbefore');

shop(job=>'none',stock=>0);
$u=use_record(before=>'before_show');
register_use($u);
is(CheckUseItem($u),2,'B-25-P27 return2 avoids checking missing materials');
is_deeply(\@TRACE,['before-show'],
  'B-25-P28 material check bypassed by display-only return');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_hide');
register_use($u);
is(CheckUseItem($u),0,'B-25-P29 return1 rejects even when stock enough');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_pass');
register_use($u);
is(CheckUseItem($u),1,'B-25-P30 return0 continues material checks');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_other');
register_use($u);
is(CheckUseItem($u),1,'B-25-P31 return7 falls through, does not reject');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_stock');
register_use($u);
is(CheckUseItem($u),0,
  'B-25-P32 functionbefore stock mutation affects material check');
is($DT->{item}[0],0,'B-25-P33 shop state mutation persists');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_change_need',need=>1);
register_use($u);
is(CheckUseItem($u),0,
  'B-25-P34 functionbefore may raise required materials to 8');
is($u->{use}[0]{count},8,'B-25-P35 source mutated USE requirement kept');

shop(job=>'stock',stock=>5);
$u=use_record(no=>7);
register_use($u);
is(CheckUseItem($u),0,'B-25-P36 job stock mutation takes effect before check');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_show',useok=>1);
register_use($u);
my $returned=GetUseItem(7);
is($returned,$u,'B-25-P37 GetUseItem returns same reference for matched use');
is($u->{dispok},1,'B-25-P38 wrapper sets display-only flag');
is($u->{useok},1,
  'B-25-P39 wrapper does NOT clear stale useok even when return2');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_hide',useok=>1,dispok=>1);
register_use($u);
is(GetUseItem(7),$u,'B-25-P40 matched denied use still returned');
is($u->{useok},1,
  'B-25-P41 original wrapper does not clear stale allow flag on reject');
is($u->{dispok},1,
  'B-25-P42 original wrapper does not clear stale display flag on reject');

shop(job=>'none',stock=>5);
$u=use_record(before=>'before_pass');
register_use($u);
is(GetUseItem(7),$u,'B-25-P43 matched use found');
is($u->{useok},1,'B-25-P44 wrapper sets useok only for return1');
ok(!exists($u->{dispok}),'B-25-P45 successful use does not add display flag');

shop(job=>'none',stock=>5);
$u=use_record(no=>7);
register_use($u);
is(GetUseItem(8),0,'B-25-P46 missing no returns numeric 0');
ok(!exists($u->{useok}),'B-25-P47 unmatched get never inspects other use');

shop(job=>'none',stock=>5);
my $first=use_record(no=>7,before=>'before_show',useok=>1);
my $second=use_record(no=>8,before=>'before_hide',dispok=>1);
my $third=use_record(no=>9,need=>2);
register_use($_) for ($first,$second,$third);
my @list=GetUseItemListSub($first,$second,$third);
is(scalar(@list),3,'B-25-P48 list wrapper returns all original USE references');
is($list[0],$first,'B-25-P49 list preserves identity/order');
is($first->{dispok},1,'B-25-P50 list sets display-only on first');
is($first->{useok},1,'B-25-P51 list keeps stale useok on first');
ok(!exists($second->{useok}),'B-25-P52 list rejection does not add useok');
is($second->{dispok},1,'B-25-P53 list rejection retains prior display flag');
is($third->{useok},1,'B-25-P54 list sets useok for passing third');
is_deeply(\@TRACE,['before-show','before-hide'],
  'B-25-P55 list sequentially calls only defined functionbefore');

shop(job=>'none',stock=>2);
$u=use_record(before=>'unresolved_synthetic');
register_use($u);
my $ok=eval {CheckUseItem($u);1};
ok(!$ok,'B-25-P56 undefined named functionbefore raises Perl error');
like($@,qr/Undefined subroutine .*unresolved_synthetic/,
  'B-25-P57 original undefined symbol is not treated as allowed');

shop(job=>'none',stock=>5);
$u=use_record(no=>7,need=>1);
$u->{use}=[
  {no=>1,count=>1},{no=>2,count=>3},{no=>3,count=>1},
];
register_use($u);
is(CheckUseItem($u),0,
  'B-25-P58 source stops after second material shortage');
is($DT->{item}[2],0,'B-25-P59 original stock is not mutated by material check');

done_testing();
