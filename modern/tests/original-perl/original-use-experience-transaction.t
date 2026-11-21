use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';

# B-24: exact frozen Core UseItem fragments BEFORE and AFTER the dynamic
# item callback, compiled together only for CALLBACK-FREE SYNTHETIC fixtures.
# Entire CGI entrypoints, job/functionbefore checks and callbacks are NEVER
# required or executed. Compare full synthetic transaction + exp tail.
our ($DT,$NOW_TIME,$MAX_STOCK_TIME,$USER,$MAX_ITEM,@ITEM,@DT,@DTwholestore,
     %DTevent,$LIMIT_EXP);
$NOW_TIME=1000;
$MAX_STOCK_TIME=259200;
$USER='isolated';
$MAX_ITEM=3;
$LIMIT_EXP=3600;
sub l {return join(' ',@_);}
sub OutError {die "Original OutError: ".join(' ',@_);}
sub pinned {
  my ($name)=@_;
  open(my $fh,'<:encoding(UTF-8)',$name) or die "$name: $!";
  local $/;my $text=<$fh>;close $fh;return $text;
}
my $src=pinned('use.cgi');
my ($make)=$src=~/(^sub MakeAmount\n\{[\s\S]*?^\}\n)(?=\nsub AddItem)/m;
my $start=index($src,"\t#熟練度不足で作業不可能かどうかを判定");
my $end=index($src,"\n\t#アイテム別関数存在チェック\n",$start);
my $gainStart=index($src,"\t#熟練度処理\n");
my $gainEnd=index($src,"\n}\n\nsub MakeAmount",$gainStart);
ok(defined($make),'B-24-P01 original MakeAmount located');
ok($start>=0&&$end>$start,'B-24-P02 original gate-through-wholesale fragment located');
ok($gainStart>$end&&$gainEnd>$gainStart,'B-24-P03 original experience tail located after callback');
die 'Original source extraction drift' unless
  defined($make)&&$start>=0&&$end>$start&&$gainStart>$end&&$gainEnd>$gainStart;
my $before=substr($src,$start,$end-$start);
my $gain=substr($src,$gainStart,$gainEnd-$gainStart);
like($gain,qr/\$USE->\{result\}->\{expold\}=\$exp\+0/,
  'B-24-P04 original expold overwritten during exp tail');
like($gain,qr/\$expplus=1000-\$exp if \$exp\+\$expplus>1000/,
  'B-24-P05 original per-item cap may make award negative');
like($gain,qr/\$LIMIT_EXP>0 && \$expsum>\$LIMIT_EXP/,
  'B-24-P06 original total cap only if positive and exceeded');
like($gain,qr/my \@key=sort \{ \$DT->\{exp\}\{\$a\} <=> \$DT->\{exp\}\{\$b\} \}keys/,
  'B-24-P07 original uses Perl hash-key sort without item-ID tie break');
like($gain,qr/my \$keycnt=\$#key/,
  'B-24-P08 original denominator starts from sorted key count minus one');
like($gain,qr/delete \$DT->\{exp\}\{\$_\} if !\$DT->\{exp\}\{\$_\}/,
  'B-24-P09 original zero-valued other skill deleted');
my $wholePosition=index($src,'CheckWholeStore();',$start);
my $callbackPosition=index($src,"RequireFile('inc-item.cgi');",$wholePosition);
ok($wholePosition<$callbackPosition&&$callbackPosition<$gainStart,
  'B-24-P10 original market check then callback then experience tail');
my $eval=eval "no strict; no warnings;\n".
  $make."\nsub isolated_full_use_exp {\nmy (\$USE,\$count)=\@_;\n".
  "my \$usetime=GetItemUseTime(\$USE);\n".$before."\n".
  "# Dynamic callbacks deliberately excluded ONLY for source-verified callback-free fixture\n".
  $gain."\nreturn 1;\n}\n1;\n";
die "Cannot compile pinned fragments: $@" unless $eval;
require './calc.cgi';
require './whole.cgi';
ok(defined(&isolated_full_use_exp),'B-24-P11 source fragments compiled');
ok(defined(&GetItemUseTime)&&defined(&CheckWholeStore),
  'B-24-P12 original time and market routines loaded');

sub fixture {
  $NOW_TIME=1000;$MAX_STOCK_TIME=259200;$LIMIT_EXP=3600;
  %DTevent=(permit=>1);
  @ITEM=(undef,
    {code=>'A',limit=>10,wslimit=>8,name=>'A',scale=>'item'},
    {code=>'B',limit=>6,wslimit=>-10,name=>'B',scale=>'item'},
    {code=>'',limit=>5,wslimit=>1,name=>'C',scale=>'item'},
  );
  $DT={
    item=>[8,4,3],exp=>{1=>200},job=>'worker',point=>10,
    rank=>20,money=>70,paytoday=>5,time=>950,status=>1,
  };
  @DT=($DT,{item=>[3,4,2]});
  @DTwholestore=(4,0,-5);
  return {
    itemno=>1,exp=>30,needexp=>100,needjob=>'worker',
    needpoint=>10,needpop=>10,needevent=>'permit',money=>20,
    time=>20,exptime=>10,
    use=>[
      {no=>1,count=>2,proba=>1000,message=>'consume A'},
      {no=>2,count=>1,proba=>0,message=>'consume B 0'},
    ],
    result=>{
      expold=>'',create=>[
        {no=>1,count=>5,proba=>1000,message=>'create A'},
        {no=>2,count=>4,proba=>1000,message=>'create B'},
        {no=>1,count=>2,proba=>1000,message=>'create A again'},
        {no=>3,count=>2,proba=>1000,message=>'create C'},
      ],
    },
  };
}
my $u=fixture();
isolated_full_use_exp($u,4);
is($u->{result}{count},2,'B-24-P13 actual count after money/time gate is 2');
is($DT->{money},30,'B-24-P14 source money deduction preserved');
is($DT->{paytoday},45,'B-24-P15 source paytoday preserved');
is($DT->{time},986,'B-24-P16 source clock preserved');
is_deeply($DT->{item},[10,6,5],'B-24-P17 source shop stock preserved');
is_deeply(\@DTwholestore,[3,0,-3],'B-24-P18 source wholesale preserved');
is_deeply($u->{result}{additem},[[1,6],[2,2],[1,0],[3,2]],
  'B-24-P19 source duplicate creation retains zero addition');
is($u->{result}{expold},200,
  'B-24-P20 original tail stores exp before awarding skill');
is($DT->{exp}{1},260,'B-24-P21 source exp+30*count after items');

$u=fixture();$DT->{exp}={1=>900,2=>700,3=>800,4=>850,5=>900};
$u->{exp}=100;$u->{needexp}=100;
isolated_full_use_exp($u,1);
is($u->{result}{count},1,'B-24-P22 experience overflow fixture executes once');
is($u->{result}{expold},900,'B-24-P23 original expold before cap');
is_deeply($DT->{exp},{
  1=>1000,2=>538,3=>638,4=>687,5=>737,
},'B-24-P24 exact staged redistribution follows original Perl');
is(scalar(grep{$_==0}values%{$DT->{exp}}),0,
  'B-24-P25 no zero skill left after unique-value overflow');

$u=fixture();$DT->{exp}={1=>990};$u->{exp}=20;
isolated_full_use_exp($u,2);
is($DT->{exp}{1},1000,'B-24-P26 original per-item skill cap at 1000');
is($u->{result}{expold},990,'B-24-P27 cap records original exp');

$u=fixture();$DT->{exp}={1=>1050};$u->{exp}=1;
isolated_full_use_exp($u,1);
is($DT->{exp}{1},1000,
  'B-24-P28 preexisting skill above cap produces NEGATIVE exp award, not no-op');
is($u->{result}{expold},1050,
  'B-24-P29 high old skill still recorded numerically');

$u=fixture();$u->{exp}=-10;isolated_full_use_exp($u,1);
is($DT->{exp}{1},190,
  'B-24-P30 negative expPerUse subtracts skill in original truthy branch');

$u=fixture();$u->{exp}=0;
isolated_full_use_exp($u,1);
is($DT->{exp}{1},200,
  'B-24-P31 exp=0 bypasses full skill tail after spending');
is($u->{result}{expold},'',
  'B-24-P32 exp=0 does not overwrite existing expold');

$u=fixture();$DT->{money}=0;
isolated_full_use_exp($u,4);
is($u->{result}{count},0,'B-24-P33 count0 returns before tail');
is($DT->{exp}{1},200,'B-24-P34 count0 does not grant exp');
is($DT->{money},0,'B-24-P35 count0 never charges money');
is_deeply(\@DTwholestore,[4,0,-5],
  'B-24-P36 count0 never checks market');

$u=fixture();$u->{result}{expold}=1000;
isolated_full_use_exp($u,4);
is($u->{result}{count},3,
  'B-24-P37 prior result.expold overrides THIS invocation GetItemUseTime');
is($u->{result}{expold},200,
  'B-24-P38 tail overwrites prior expold for NEXT invocation');
is($DT->{exp}{1},290,
  'B-24-P39 final skill gain still based on actual old DT.exp');

$u=fixture();$DT->{exp}={1=>900,2=>700,3=>800,4=>850,5=>900};
$u->{exp}=100;$LIMIT_EXP=0;
isolated_full_use_exp($u,1);
is_deeply($DT->{exp},{1=>1000,2=>700,3=>800,4=>850,5=>900},
  'B-24-P40 nonpositive exp limit disables redistribution');

$u=fixture();$DT->{exp}={1=>900};$u->{exp}=100;
$LIMIT_EXP=500;
isolated_full_use_exp($u,1);
is($DT->{exp}{1},1000,
  'B-24-P41 only selected item cannot be reduced even with residual excess');

$u=fixture();$DT->{exp}={1=>990,2=>5,3=>500};$u->{exp}=30;
$LIMIT_EXP=1100;
isolated_full_use_exp($u,1);
is_deeply($DT->{exp},{1=>1000,3=>100},
  'B-24-P42 low-experience other key deleted when reduced exactly to 0');

# Tied sorted keys are observable but not a universal source-defined ID order.
$u=fixture();$DT->{exp}={1=>900,2=>700,3=>700,4=>851,5=>900};
$u->{exp}=100;
$DT->{exp}{1}=1000;
my @observed=sort { $DT->{exp}{$a} <=> $DT->{exp}{$b} } keys(%{$DT->{exp}});
$DT->{exp}{1}=900;
isolated_full_use_exp($u,1);
my @firstTwo=grep { $_==2||$_==3 } @observed;
is_deeply([sort {$a<=>$b}@firstTwo],[2,3],
  'B-24-P43 observed tied Perl hash order contains both item keys');
is($DT->{exp}{$firstTwo[0]},563,
  'B-24-P44 first tied key receives original int(551/4)=137 reduction');
is($DT->{exp}{$firstTwo[1]},562,
  'B-24-P45 second tied key receives original int(414/3)=138 reduction');
is($DT->{exp}{4},713,'B-24-P46 third original reduction is 138');
is($DT->{exp}{5},762,'B-24-P47 fourth original reduction is 138');
is(scalar(@observed),5,'B-24-P48 exact source sorted hash order is fixture-local');

done_testing();
