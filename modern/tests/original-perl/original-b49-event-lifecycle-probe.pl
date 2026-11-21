use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDOUT,':raw';
our (%EVENT,%DTevent,$temptimenow,$timespan,@B49_DRAWS,$B49_USED,@DT,@ITEM,@LOG);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub{
    my($max)=@_;
    die 'EVENT lifecycle consumed missing random sample' unless @main::B49_DRAWS;
    $main::B49_USED++;
    return shift(@main::B49_DRAWS)*$max/1000000;
  };
}
sub PushLog {push @LOG,[@_]; return 1;}
sub RequireFile {die 'unreviewed original event callback invoked';}
sub GetPath {die 'unreviewed original file dependency invoked';}
my $fn=File::Spec->catfile($FindBin::Bin,'inc-turn.cgi');
open(my $fh,'<:encoding(UTF-8)',$fn) or die $!;
local $/;my $text=<$fh>;close($fh);
my $from=index($text,"\t\t#イベント終了処理\n");
my $to=index($text,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($text,"\t\t#イベント開始処理\n",$from));
die 'Pinned original combined EVENT lifecycle segment moved' unless $from>=0&&$to>$from;
my $body=substr($text,$from,$to-$from);
for my $m (
  'if($DTevent{$key}<$temptimenow+$timespan)',
  'delete $DTevent{$key};',
  'rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0',
) { die 'Frozen source event gate drift' unless index($body,$m)>=0; }
my $compiled=eval "no strict; no warnings; sub run_b49_original { \n".
  "$body\n".
  "return {active=>{%DTevent},group=>{%group}}; }\n1;";
die "Compiling original combined EVENT region failed: $@" unless $compiled;
sub run {
  my (%o)=@_;
  $timespan=$o{span}//120;
  $temptimenow=1000000;
  %EVENT=(reviewed=>{
    code=>'reviewed',group=>'one',startproba=>$o{prob}//0,
    startfunc=>'',endfunc=>'',nowfunc=>'',
    basetime=>$o{base}//0,plustime=>$o{plus}//0,
    startmsg=>'',endmsg=>'',
  });
  %DTevent=();
  $DTevent{reviewed}=$o{active} if defined $o{active};
  @DT=({id=>1});@ITEM=();@LOG=();
  @B49_DRAWS=map {0+$_} @{$o{draws}};
  $B49_USED=0;
  my $result=run_b49_original();
  die 'Original EVENT lifecycle failed to use all provided random draws'
    unless !@B49_DRAWS;
  my $after=$result->{active};
  my $entered=$result->{group}{one} && (!defined($o{active}) ||
    $o{active}<$temptimenow+$timespan);
  return {
    name=>$o{name},
    input=>{
      spanSeconds=>$timespan,startSeconds=>$temptimenow,
      activeUntilSeconds=>defined($o{active})?0+$o{active}:undef,
      event=>$EVENT{reviewed},randomDraws=>$o{draws},
    },
    output=>{
      expired=>(defined($o{active})&&$o{active}<$temptimenow+$timespan
        ?JSON::PP::true:JSON::PP::false),
      entered=>($entered?JSON::PP::true:JSON::PP::false),
      groupNowOccupied=>($result->{group}{one}?JSON::PP::true:JSON::PP::false),
      activeUntilSeconds=>exists $after->{reviewed}?0+$after->{reviewed}:undef,
      randomDrawsUsed=>$B49_USED,
    },
  };
}
my @cases=(
  run(name=>'fresh-zero-no-duration',draws=>[800000]),
  run(name=>'active-after-span',active=>1001000,draws=>[]),
  run(name=>'equal-to-boundary',active=>1000120,draws=>[]),
  run(name=>'expired-zero-retriggers-no-duration',
    active=>999999,draws=>[900000]),
  run(name=>'expired-zero-restarts-duration',
    active=>999999,base=>3600,plus=>600,draws=>[200000,500000,100000]),
  run(name=>'positive-misses-after-expiry',
    active=>999999,prob=>1000,draws=>[900000]),
);
print JSON::PP->new->utf8->canonical->encode({
  start=>$from,end=>$to,cases=>\@cases,
  scope=>'original frozen event expiry + start sections with one callback-free EVENT; does not execute real EVENT files/nowfunc/world',
});
