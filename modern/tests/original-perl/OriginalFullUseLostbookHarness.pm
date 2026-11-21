package OriginalFullUseLostbookHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use OriginalItemHelperHarness;
our ($READY,@TRACE,@SOURCE_NAMES);
my ($WHOLE_SUB,$BOOK_SUB,$TIME_SUB);

# B-30: execute only source-extracted, SHA-pinned functions in isolated
# memory. Core plug/use.cgi::UseItem and MakeAmount; Core calc.cgi::UseTime,
# GetItemUseTime; Core whole.cgi::CheckWholeStore; Core inc-item.cgi item::
# UseItem and UseItemSub, plus Standard Street lostbook (B-29 harness).
# The original UseItem's RequireFile call resolves ONLY to a recording-only
# stub: it does NOT load any CGI or access any real game file.
sub source {
  my($p)=@_;
  open(my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$p))
    or die "B-30 pinned source $p missing: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
sub section {
  my($source,$name)=@_;
  my($part)=$source=~/(^sub \Q$name\E\n\{[\s\S]*?^\}\n)/m;
  die "B-30 original sub $name missing" unless defined $part;
  return $part;
}
sub bootstrap {
  return 1 if $READY;
  OriginalItemHelperHarness::bootstrap();
  my $use=source('use.cgi');
  my $calc=source('calc.cgi');
  my $whole=source('whole.cgi');
  my @bodies=(
    section($use,'UseItem'),section($use,'MakeAmount'),
    section($calc,'UseTime'),section($calc,'GetItemUseTime'),
    section($whole,'CheckWholeStore'),
  );
  die 'B-30 original callback/market/experience order changed'
    unless index($use,'CheckWholeStore();')
      < index($use,"RequireFile('inc-item.cgi');") &&
      index($use,"RequireFile('inc-item.cgi');")
      < index($use,'$USE->{result}->{function_return}=&$itemfunc();') &&
      index($use,'$USE->{result}->{function_return}=&$itemfunc();')
      < index($use,'#熟練度処理');
  die 'B-30 restricted dynamic call target drift'
    unless $bodies[0]=~/my \$itemfunc="item::"\.\$USE->\{result\}->\{function\}/;
  my $compiled=eval "package main; use utf8; no strict; no warnings;\n".
    join("\n",@bodies)."\n1;\n";
  die "B-30 isolated original Perl source failed to compile: $@"
    unless $compiled;
  $WHOLE_SUB=\&main::CheckWholeStore;
  $BOOK_SUB=\&item::lostbook;
  $TIME_SUB=\&main::UseTime;
  {
    no warnings 'redefine';
    *main::CheckWholeStore=sub {
      push @TRACE,'wholesale';
      return $WHOLE_SUB->(@_);
    };
    *main::UseTime=sub {
      push @TRACE,'use-time';
      return $TIME_SUB->(@_);
    };
    *item::lostbook=sub {
      push @TRACE,'lostbook';
      $main::B30_EXP_AT_CALLBACK=$main::DT->{exp}{1};
      $main::B30_STOCK_AT_CALLBACK=$main::DT->{item}[0];
      @main::B30_WHOLE_AT_CALLBACK=@main::DTwholestore;
      return $BOOK_SUB->(@_);
    };
  }
  $READY=1;
  return 1;
}

# Intentionally never delegates to real file loading, even for allowed path.
sub main::RequireFile {
  my($name)=@_;
  die "B-30 refuse unreviewed external require $name"
    unless $name eq 'inc-item.cgi';
  push @TRACE,'require-common';
  return 1;
}
sub main::l { return join(' ',@_); }
sub main::OutError {die "B-30 original OutError: ".join(' ',@_);}

sub run {
  my(%o)=@_;
  bootstrap();
  @TRACE=();
  $main::NOW_TIME=exists($o{nowSeconds})?$o{nowSeconds}:1000;
  $main::MAX_STOCK_TIME=259200;
  $main::LIMIT_EXP=3600;
  $main::USER='synthetic';
  $main::MAX_ITEM=3;
  %main::DTevent=(permit=>1);
  my $oldExp=exists($o{exp})?$o{exp}:200;
  my $initialStock=exists($o{initialStock})?$o{initialStock}:8;
  my $money=exists($o{money})?$o{money}:70;
  my $status=exists($o{status})?$o{status}:1;
  my $seed=exists($o{seed})?$o{seed}:12;
  my $param1=exists($o{param1})?$o{param1}:1000;
  my $method=exists($o{callback})?$o{callback}:'lostbook';
  die "B-30 only supports lostbook or absent callback"
    unless $method eq 'lostbook'||$method eq '';
  @main::ITEM=(undef,
    {code=>'A',limit=>10,wslimit=>8,name=>'A',scale=>'item'},
    {code=>'B',limit=>6,wslimit=>-10,name=>'B',scale=>'item'},
    {code=>'',limit=>5,wslimit=>1,name=>'C',scale=>'item'},
  );
  my $stocks=exists($o{stocks})?$o{stocks}:[$initialStock,4,3];
  my $other=exists($o{otherShopStock})?$o{otherShopStock}:[3,4,2];
  my $wholesale=exists($o{wholesale})?$o{wholesale}:[4,0,-5];
  die 'B-32 expects three synthetic stocks each' unless
    ref($stocks) eq 'ARRAY' && @$stocks==3 &&
    ref($other) eq 'ARRAY' && @$other==3 &&
    ref($wholesale) eq 'ARRAY' && @$wholesale==3;
  $main::DT={
    item=>[@$stocks],exp=>{1=>$oldExp},
    job=>'worker',point=>10,rank=>20,money=>$money,
    paytoday=>exists($o{paytoday})?$o{paytoday}:5,
    time=>exists($o{storedTimeSeconds})?$o{storedTimeSeconds}:950,
    status=>$status,id=>42,shopname=>'原版店',
  };
  @main::DT=($main::DT,{item=>[@$other]});
  @main::DTwholestore=@$wholesale;
  $main::B30_EXP_AT_CALLBACK=undef;
  $main::B30_STOCK_AT_CALLBACK=undef;
  @main::B30_WHOLE_AT_CALLBACK=();
  my $uses=[
    {no=>1,count=>2,proba=>1000,message=>'consume A'},
    {no=>2,count=>1,proba=>0,message=>'consume B 0'},
  ];
  my $creates=[
    {no=>1,count=>5,proba=>1000,message=>'create A'},
    {no=>2,count=>4,proba=>1000,message=>'create B'},
    {no=>1,count=>2,proba=>1000,message=>'create A again'},
    {no=>3,count=>2,proba=>1000,message=>'create C'},
  ];
  if($o{emptyActions}){$uses=[];$creates=[];}
  if($o{duplicateMaterials}){
    $uses=[
      {no=>1,count=>6,proba=>1000,message=>'consume six A'},
      {no=>1,count=>6,proba=>1000,message=>'consume six A again'},
    ];
    $creates=[];
  }
  my $result={
    expold=>exists($o{experienceOld})?$o{experienceOld}:'',
    create=>$creates,
    function=>$method,
  };
  my $u={
    itemno=>1,param1=>$param1,
    exp=>exists($o{expPerUse})?$o{expPerUse}:30,
    needexp=>exists($o{needExp})?$o{needExp}:100,
    needjob=>'worker',needpoint=>10,needpop=>10,needevent=>'permit',
    money=>20,time=>20,exptime=>10,use=>$uses,result=>$result,
    arg=>{targetidx=>0},
  };
  # B-30 uses only deterministic 0 / 1000 permille material actions.
  # Thus the first rand(1000) in a live callback is reproducible here.
  srand($seed);
  my $expectedDraw=rand(1000);
  srand($seed);
  my $requested=exists($o{requestedCount})?$o{requestedCount}:4;
  main::UseItem($u,$requested);
  my @keys=(qw(count function_return expold useitem usemsg additem addmsg));
  my %out=map {$_ => $u->{result}{$_}} @keys;
  return {
    stock=>[@{$main::DT->{item}}],
    otherShopStock=>[@{$main::DT[1]{item}}],
    wholesale=>[@main::DTwholestore],
    money=>$main::DT->{money},
    paytoday=>$main::DT->{paytoday},
    time=>$main::DT->{time},
    exp=>$main::DT->{exp}{1},
    expAtCallback=>$main::B30_EXP_AT_CALLBACK,
    stockAtCallback=>$main::B30_STOCK_AT_CALLBACK,
    wholesaleAtCallback=>[@main::B30_WHOLE_AT_CALLBACK],
    result=>\%out,
    trace=>[@TRACE],
    originalPerlDraw=>$expectedDraw,
    scope=>'exact frozen Core UseItem+MakeAmount+time+wholesale+helper and exact Standard Street lostbook; synthetic single interpreter, recording-only RequireFile; no CGI/world writes',
  };
}
1;
