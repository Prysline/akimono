use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
binmode STDOUT, ':encoding(UTF-8)';

# B-24 deterministic Perl original-source numeric probe for Node cross-language
# tests. Runs exact frozen slices from use.cgi plus original calc/whole
# subs on synthetic memory only; callback block intentionally EXCLUDED.
our ($DT,$NOW_TIME,$MAX_STOCK_TIME,$USER,$MAX_ITEM,@ITEM,@DT,@DTwholestore,
     %DTevent,$LIMIT_EXP);
$MAX_ITEM=3;
$USER='synthetic';
sub l {return join(' ',@_);}
sub OutError {die join(' ',@_);}
sub pinned {
  my ($filename)=@_;
  open(my $fh,'<:encoding(UTF-8)',"$FindBin::Bin/$filename")
    or die "$filename: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
my $source=pinned('use.cgi');
my ($make)=$source=~/(^sub MakeAmount\n\{[\s\S]*?^\}\n)(?=\nsub AddItem)/m;
my $from=index($source,"\t#熟練度不足で作業不可能かどうかを判定");
my $to=index($source,"\n\t#アイテム別関数存在チェック\n",$from);
my $after=index($source,"\t#熟練度処理\n");
my $end=index($source,"\n}\n\nsub MakeAmount",$after);
die 'Frozen source extraction drift' unless
 defined($make)&&$from>=0&&$to>$from&&$after>$to&&$end>$after;
my $compiled=eval "no strict; no warnings;\n".$make."\n".
 "sub run_original_numeric {\nmy (\$USE,\$count)=\@_;\n".
 "my \$usetime=GetItemUseTime(\$USE);\n".
 substr($source,$from,$to-$from)."\n".
 substr($source,$after,$end-$after)."\nreturn 1;\n}\n1;\n";
die "Source fragment compile: $@" unless $compiled;
require "$FindBin::Bin/calc.cgi";
require "$FindBin::Bin/whole.cgi";

sub scenario {
  my ($name,$opts)=@_;
  $NOW_TIME=1000;$MAX_STOCK_TIME=259200;$LIMIT_EXP=$opts->{limit}//3600;
  %DTevent=(permit=>1);
  @ITEM=(undef,
    {code=>'A',limit=>10,wslimit=>8,name=>'A',scale=>'one'},
    {code=>'B',limit=>6,wslimit=>-10,name=>'B',scale=>'one'},
    {code=>'',limit=>5,wslimit=>1,name=>'C',scale=>'one'},
  );
  my %exp=%{$opts->{exp}};
  $DT={item=>[8,4,3],exp=>\%exp,job=>'worker',point=>10,
    rank=>20,money=>$opts->{money}//70,paytoday=>5,time=>950,status=>1};
  @DT=($DT,{item=>[3,4,2]});
  @DTwholestore=(4,0,-5);
  my $initialExpOld=$opts->{expold};
  my $u={
    itemno=>1,exp=>$opts->{peruse},needexp=>100,needjob=>'worker',
    needpoint=>10,needpop=>10,needevent=>'permit',money=>20,
    time=>20,exptime=>10,
    use=>[
      {no=>1,count=>2,proba=>1000,message=>'consume A'},
      {no=>2,count=>1,proba=>0,message=>'zero B'},
    ],
    result=>{
      expold=>defined $initialExpOld?$initialExpOld:'',
      create=>[
        {no=>1,count=>5,proba=>1000,message=>'produce A'},
        {no=>2,count=>4,proba=>1000,message=>'produce B'},
        {no=>1,count=>2,proba=>1000,message=>'produce A duplicate'},
        {no=>3,count=>2,proba=>1000,message=>'produce C'},
      ],
    },
  };
  my $observed;
  if($opts->{observed_tie}){
    my $saved=$DT->{exp}{1};
    $DT->{exp}{1}=1000;
    $observed=[sort{ $DT->{exp}{$a} <=> $DT->{exp}{$b} }keys(%{$DT->{exp}})];
    $DT->{exp}{1}=$saved;
  }
  my %originalExp=%exp;
  run_original_numeric($u,$opts->{requested});
  return {
    case=>$name,
    input=>{
      experienceRecords=>[
        map{{itemId=>0+$_,value=>$originalExp{$_}}}
        sort{$a<=>$b}keys(%originalExp)
      ],
      experience=>0+($originalExp{1}//0),
      expPerUse=>$opts->{peruse},requestedCount=>$opts->{requested},
      experienceOld=>$initialExpOld,money=>$opts->{money}//70,
      experienceLimit=>$LIMIT_EXP,observedPerlSortedKeys=>$observed,
    },
    observed=>{
      count=>$u->{result}{count},money=>$DT->{money},
      paytoday=>$DT->{paytoday},time=>$DT->{time},
      stock=>$DT->{item},wholesale=>[@DTwholestore],
      experience=>[
        map{{itemId=>0+$_,value=>$DT->{exp}{$_}}}
        sort{$a<=>$b}keys(%{$DT->{exp}})
      ],
      expold=>(defined($u->{result}{expold})&&$u->{result}{expold} ne '')
        ?0+$u->{result}{expold}:undef,
      added=>$u->{result}{additem}||[],
      consumed=>$u->{result}{useitem}||[],
    },
  };
}
my @cases=(
 scenario('normal',{exp=>{1=>200},peruse=>30,requested=>4}),
 scenario('overflow',{exp=>{1=>900,2=>700,3=>800,4=>850,5=>900},
   peruse=>100,requested=>1}),
 scenario('above-cap',{exp=>{1=>1050},peruse=>1,requested=>1}),
 scenario('zero-exp',{exp=>{1=>200},peruse=>0,requested=>1}),
 scenario('zero-count',{exp=>{1=>200},peruse=>30,requested=>4,money=>0}),
 scenario('prior-expold',{exp=>{1=>200},peruse=>30,requested=>4,expold=>1000}),
 scenario('residual-excess',{exp=>{1=>900},peruse=>100,requested=>1,limit=>500}),
 scenario('zero-key-deletion',{exp=>{1=>990,2=>5,3=>500},peruse=>30,
   requested=>1,limit=>1100}),
 scenario('perl-hash-tie',{exp=>{1=>900,2=>700,3=>700,4=>851,5=>900},
   peruse=>100,requested=>1,observed_tie=>1}),
);
print JSON::PP->new->canonical->encode(\@cases),"\n";
