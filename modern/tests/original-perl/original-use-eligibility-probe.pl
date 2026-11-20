use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
binmode STDOUT, ':encoding(UTF-8)';

# B-25: JSON evidence of PINNED ORIGINAL CheckUseItem/Get wrappers.
# Locally declared test-only package item callbacks; no real DSL code.
our ($DT,@CALLS,%SYN);
{
  package item;
  our @USE;
  sub _job_use_7_worker_ {main::jobcall('item::_job_use_7_worker_',@_);}
  sub _job_use_0_worker_ {main::jobcall('item::_job_use_0_worker_',@_);}
  sub _job_use_0_fallback_ {main::jobcall('item::_job_use_0_fallback_',@_);}
  sub _job_use_7_switch_ {main::jobcall('item::_job_use_7_switch_',@_);}
  sub _job_use_7_stock_ {main::jobcall('item::_job_use_7_stock_',@_);}
  sub before_show {main::beforecall('item::before_show',@_);}
  sub before_hide {main::beforecall('item::before_hide',@_);}
  sub before_pass {main::beforecall('item::before_pass',@_);}
  sub before_other {main::beforecall('item::before_other',@_);}
  sub before_stock {main::beforecall('item::before_stock',@_);}
  sub before_change_need {main::beforecall('item::before_change_need',@_);}
}
sub pinned {
  open(my $f,'<:encoding(UTF-8)',"$FindBin::Bin/use.cgi") or die $!;
  local $/;my $s=<$f>;close $f;return $s;
}
my $source=pinned();
my @names=(['GetUseItemList','GetUseItemListSub'],
  ['GetUseItemListSub','CheckUseItem'],
  ['CheckUseItem','GetUseItem'],['GetUseItem','UseItem']);
my @parts=map{
  my($a,$b)=@$_;
  my($part)=$source=~/(^sub \Q$a\E\n\{[\s\S]*?^\}\n)(?=\nsub \Q$b\E)/m;
  die "frozen source drift $a" unless defined $part;
  $part;
}@names;
my $ok=eval("no strict; no warnings;\n".join("\n",@parts)."\n1;\n");
die "compiled frozen methods: $@" unless $ok;

sub effect {
  my($f,$record)=@_;
  for my $e (@{$f->{effects}//[]}){
    if($e->{op}eq'set-material-count'){
      $record->{use}[$e->{index}]{count}=$e->{value};
    }elsif($e->{op}eq'set-stock'){
      $DT->{item}[$e->{itemId}-1]=$e->{value};
    }elsif($e->{op}eq'set-functionbefore'){
      $record->{functionbefore}=$e->{name};
    }elsif($e->{op}eq'set-flag'){
      $record->{$e->{name}}=$e->{value};
    }else{die "Unknown synthetic effect";}
  }
}
sub jobcall {
  my($symbol,$no)=@_;
  push @CALLS,{phase=>'job',symbol=>$symbol,useNo=>$no};
  my $r=$item::USE[$no];
  my $fn=$SYN{jobFunctions}{$symbol};
  die "Unexpected job function $symbol" unless $fn;
  effect($fn,$r);
  return $fn->{returnValue}//0;
}
sub beforecall {
  my($symbol,$r)=@_;
  push @CALLS,{phase=>'functionbefore',symbol=>$symbol,useNo=>$r->{no}};
  my $fn=$SYN{beforeFunctions}{$symbol};
  die "Unexpected before function $symbol" unless $fn;
  effect($fn,$r);
  return $fn->{returnValue}//0;
}

my $effects={
 exact=>{'item::_job_use_7_worker_'=>{effects=>[
   {op=>'set-material-count',index=>0,value=>3}],returnValue=>999},
   'item::_job_use_0_worker_'=>{effects=>[
   {op=>'set-material-count',index=>0,value=>2}]}},
 fallback=>{'item::_job_use_0_fallback_'=>{effects=>[
   {op=>'set-material-count',index=>0,value=>2}]}},
 switch=>{'item::_job_use_7_switch_'=>{effects=>[
   {op=>'set-functionbefore',name=>'before_show'}]}},
 stock=>{'item::_job_use_7_stock_'=>{effects=>[
   {op=>'set-stock',itemId=>1,value=>0}]}},
};
my $befores={
 'item::before_show'=>{returnValue=>2},
 'item::before_hide'=>{returnValue=>1},
 'item::before_pass'=>{returnValue=>0},
 'item::before_other'=>{returnValue=>7},
 'item::before_stock'=>{returnValue=>0,effects=>[
   {op=>'set-stock',itemId=>1,value=>0}]},
 'item::before_change_need'=>{returnValue=>0,effects=>[
   {op=>'set-material-count',index=>0,value=>8}]},
};
sub use_row {
  my($no,$need,$before,%flags)=@_;
  return {no=>$no,materials=>[{itemId=>1,count=>$need}],
    functionbefore=>$before//'',%flags};
}
my @fixtures=(
  {case=>'job exact over fallback',mode=>'list',job=>'worker',stock=>[5,2,0],
    uses=>[use_row(7,4,'')],jobFunctions=>$effects->{exact}},
  {case=>'job generic fallback',mode=>'get',requestedNo=>9,job=>'worker',
    stock=>[1,2,0],uses=>[use_row(9,1,'')],jobFunctions=>$effects->{exact}},
  {case=>'fallback only',mode=>'list',job=>'fallback',stock=>[2,2,0],
    uses=>[use_row(7,1,'')],jobFunctions=>$effects->{fallback}},
  {case=>'job switches before',mode=>'list',job=>'switch',stock=>[0,2,0],
    uses=>[use_row(7,1,'')],jobFunctions=>$effects->{switch}},
  {case=>'return 2 with stale allow flag',mode=>'get',requestedNo=>7,
    job=>'none',stock=>[0,2,0],
    uses=>[use_row(7,1,'before_show',useok=>1)]},
  {case=>'return 1 with stale flags',mode=>'list',job=>'none',stock=>[5,2,0],
    uses=>[use_row(7,1,'before_hide',useok=>1,dispok=>1)]},
  {case=>'return 0 allows',mode=>'list',job=>'none',stock=>[5,2,0],
    uses=>[use_row(7,1,'before_pass')]},
  {case=>'other return allows',mode=>'list',job=>'none',stock=>[5,2,0],
    uses=>[use_row(7,1,'before_other')]},
  {case=>'before stock mutation',mode=>'get',requestedNo=>7,job=>'none',
    stock=>[5,2,0],uses=>[use_row(7,1,'before_stock')]},
  {case=>'before material mutation',mode=>'list',job=>'none',stock=>[5,2,0],
    uses=>[use_row(7,1,'before_change_need')]},
  {case=>'job stock mutation',mode=>'list',job=>'stock',stock=>[5,2,0],
    uses=>[use_row(7,1,'')],jobFunctions=>$effects->{stock}},
  {case=>'list mixed flags',mode=>'list',job=>'none',stock=>[5,2,0],
    uses=>[use_row(7,1,'before_show',useok=>1),
      use_row(8,1,'before_hide',dispok=>1),use_row(9,1,'')]},
  {case=>'get absent',mode=>'get',requestedNo=>8,job=>'none',stock=>[5,2,0],
    uses=>[use_row(7,1,'')]},
);
sub run {
  my($input)=@_;
  %SYN=(jobFunctions=>$input->{jobFunctions}//{},
        beforeFunctions=>$befores);
  @CALLS=();
  $DT={job=>$input->{job},item=>[@{$input->{stock}}]};
  my @records=map{{
     no=>$_->{no},
     use=>[map{{no=>$_->{itemId},count=>$_->{count}}}@{$_->{materials}}],
     functionbefore=>$_->{functionbefore},
     (exists($_->{useok})?(useok=>$_->{useok}):()),
     (exists($_->{dispok})?(dispok=>$_->{dispok}):()),
  }}@{$input->{uses}};
  @item::USE=();
  $item::USE[$_->{no}]=$_ for @records;
  my $got=$input->{mode}eq'list'
    ?[GetUseItemListSub(@records)]
    :GetUseItem($input->{requestedNo});
  my $selectedIndex;
  if($input->{mode}eq'get'){
    for my $i(0..$#records){
      if($records[$i]{no}==$input->{requestedNo}){$selectedIndex=$i;last;}
    }
  }
  my @out=map{{
    no=>$_->{no},
    materials=>[map{{itemId=>$_->{no},count=>$_->{count}}}@{$_->{use}}],
    functionbefore=>$_->{functionbefore},
    (exists($_->{useok})?(useok=>$_->{useok}):()),
    (exists($_->{dispok})?(dispok=>$_->{dispok}):()),
  }}@records;
  my $in={%$input,beforeFunctions=>$befores};
  return {case=>$input->{case},input=>$in,observed=>{
    records=>\@out,stock=>[@{$DT->{item}}],calls=>[@CALLS],
    selectedIndex=>$selectedIndex,
    selectedNo=>($selectedIndex>=0&&defined $selectedIndex
      ?$records[$selectedIndex]{no}:0),
  }};
}
my @out=map{run($_)}@fixtures;
print JSON::PP->new->canonical->encode(\@out),"\n";
