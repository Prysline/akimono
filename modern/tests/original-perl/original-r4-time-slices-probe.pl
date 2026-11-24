use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDOUT, ':raw';
our ($NOW_TIME,$DTlasttime,$TZ_JST,$DATE_REVISE_TIME,$ONE_DAY_TIME,
     $now,$lasttime,@timespan);
open my $fh,'<:encoding(UTF-8)',
  File::Spec->catfile($FindBin::Bin,'inc-turn.cgi') or die $!;
local $/;
my $original=<$fh>; close $fh;
my $from=index($original,'$now=$NOW_TIME+$TZ_JST-$DATE_REVISE_TIME;');
my $to=index($original,'OutError("error:', $from);
die 'frozen inc-turn partition extraction drift'
  if $from<0||$to<=$from;
my $original_code=substr($original,$from,$to-$from);
for my $needle (
  'while(int($lasttime/$ONE_DAY_TIME)<int($now/$ONE_DAY_TIME))',
  'push(@timespan,[1,$ONE_DAY_TIME-($lasttime%$ONE_DAY_TIME)]);',
  'push(@timespan,[0,$now-$lasttime]);',
  '$DTlasttime=$lasttime-$TZ_JST+$DATE_REVISE_TIME;',
) { die "missing original turn statement: $needle"
      if index($original_code,$needle)<0; }
my $compiled=eval "sub run_original_partition {\n no strict 'vars';\n".
  $original_code."\n return 1;\n}\n1;";
die "Cannot execute original inc-turn code: $@" unless $compiled;
($TZ_JST,$DATE_REVISE_TIME,$ONE_DAY_TIME)=(32400,21600,129600);
my @cases=(
 ['no-cross',1000000,1003600],
 ['one-minute',118740,118799],
 ['exact-boundary',118740,118800],
 ['boundary-plus-one',118740,118801],
 ['starts-at-boundary',118800,118860],
 ['zero-span',118800,118800],
 ['two-boundaries',118740,248460],
 ['exact-second-boundary',118740,248400],
 ['three-boundaries',118740,378060],
);
my @outputs;
for my $case (@cases){
  my($name,$start,$end)=@$case;
  ($DTlasttime,$NOW_TIME)=($start,$end);
  run_original_partition();
  push @outputs,{name=>$name,lastSeconds=>$start,nowSeconds=>$end,
    rawSlices=>[map { [0+$_->[0],0+$_->[1]] } @timespan],
    lastTimeAfter=>0+$DTlasttime,nowAfter=>0+$now};
}
print JSON::PP->new->utf8->canonical->encode({
  oracle=>'executed unchanged frozen inc-turn clock-partition source',
  cases=>\@outputs,
});
