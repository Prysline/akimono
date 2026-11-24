use strict;
use warnings;
use utf8;
use JSON::PP;
use Storable qw(dclone);
use FindBin;
use File::Spec;
binmode STDOUT,':raw';

our (%EVENT,%DTevent,$temptimenow,$timespan,@B48_RAND,$B48_USED,@LOG);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub {
    my ($max)=@_;
    die 'Original EVENT start consumed unprovided rand()' unless @main::B48_RAND;
    $main::B48_USED++;
    return shift(@main::B48_RAND)*$max/1000000;
  };
}
sub PushLog { push @LOG, [@_]; return 1; }
sub RequireFile { die 'Unreviewed source event dynamic function must not execute'; }
sub GetPath { die 'Unreviewed source event file lookup must not execute'; }

my $original=File::Spec->catfile($FindBin::Bin,'inc-turn.cgi');
open(my $fh,'<:encoding(UTF-8)',$original) or die $!;
local $/;
my $source=<$fh>;
close($fh);
my $from=index($source,"\t\t#イベント開始処理\n");
my $to=index($source,"\n\t\tforeach my \$key (keys(%DTevent))",$from);
die 'Frozen Core EVENT start region was moved' unless $from>=0&&$to>$from;
my $body=substr($source,$from,$to-$from);
for my $marker (
  'foreach my $key (keys(%EVENT))',
  'next if $group{$E->{group}};',
  'rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0',
  '$DTevent{$key}=$temptimenow+int(rand($timespan))+$E->{basetime}+int(rand($E->{plustime}))',
) {
  die 'Frozen EVENT source drift' unless index($body,$marker)>=0;
}
my $compiled=eval "no strict; no warnings; sub run_original_event_gate {\n".
  "my (\$occupied)=\@_; my %group=\$occupied?('reviewed'=>1):();\n".
  "$body\n".
  "return {active=>{%DTevent},group=>{%group}};\n".
  "}\n1;";
die "Original EVENT gate failed to compile: $@" unless $compiled;

sub run {
  my(%args)=@_;
  $temptimenow=1000000;
  $timespan=$args{span}//120;
  my $event={
    code=>$args{code}//'reviewed',group=>'reviewed',
    startproba=>$args{prob},
    startfunc=>'',endfunc=>'',nowfunc=>'',
    basetime=>$args{base}//0,
    plustime=>$args{plus}//0,
    startmsg=>'',
  };
  %EVENT=($event->{code}=>$event);
  %DTevent=();
  @LOG=();
  @B48_RAND=map {0+$_} @{$args{draws}};
  $B48_USED=0;
  my $original=run_original_event_gate($args{blocked}//0);
  die 'EVENT rand draw was not fully consumed' unless !@B48_RAND;
  my $active=$original->{active};
  my $entered=$original->{group}{reviewed}?1:0;
  return {
    name=>$args{name},
    input=>{
      event=>$event,spanSeconds=>$timespan,startSeconds=>$temptimenow,
      groupOccupied=>($args{blocked}?JSON::PP::true:JSON::PP::false),
      randomDraws=>$args{draws},
    },
    output=>{
      entered=>($entered&&!$args{blocked}?JSON::PP::true:JSON::PP::false),
      groupNowOccupied=>($entered?JSON::PP::true:JSON::PP::false),
      expiresAt=>exists($active->{$event->{code}})?0+$active->{$event->{code}}:undef,
      randomDrawsUsed=>$B48_USED,
      activeCount=>scalar(keys %$active),
      logCount=>scalar(@LOG),
    },
  };
}
my @rows=(
  run(name=>'zero-chance-but-entered',prob=>0,draws=>[700000]),
  run(name=>'positive-probability-fails',prob=>100000,draws=>[200000]),
  run(name=>'positive-probability-succeeds',prob=>100000,
    base=>3600,plus=>600,draws=>[10000,400000,300000]),
  run(name=>'occupied-group-skips-all-rand',prob=>0,
    blocked=>1,draws=>[]),
  run(name=>'zero-probability-with-duration',prob=>0,
    base=>60,plus=>0,draws=>[999999,500000,999999]),
);
print JSON::PP->new->canonical->utf8->encode({
  sourceStart=>$from,sourceEnd=>$to,
  cases=>\@rows,
  scope=>'exact fixed inc-turn event-start region; one callback-free synthetic EVENT only; no real EVENT callbacks, period or world I/O',
});
