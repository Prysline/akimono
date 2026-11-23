use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
binmode STDOUT,':raw';
our (%EVENT,%DTevent,%GUILD,%GUILD_DATA,%TOWN,@DT,@LOG,
  $temptimenow,$timespan,$ITEM_DIR,$GUILD_READ,$GUILD_DATA_READ,
  $SET_TOWN,@GUILD_DRAWS,@GUILD_RANGES);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'original guildbattle rand exhausted' unless @main::GUILD_DRAWS;
    my $sample=shift @main::GUILD_DRAWS;
    my $range=0+($_[0]//1);
    die 'source RNG sample out of range' unless
      defined($sample)&&$sample=~/^\d+$/&&$sample<1000000;
    push @main::GUILD_RANGES,$range;
    return $sample*$range/1000000;
  };
}
sub source{
  my($p)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$p)
    or die $!;
  local $/;my $x=<$fh>;close $fh;return $x;
}
my $dsl=source('../../../custom/inc-rebel-data.cgi');
my $turn=source('inc-turn.cgi');
my @blocks=split(/^\s*\@\@event[^\r\n]*\r?\n/mi,$dsl);
shift @blocks;
for(@blocks){s/^\s*\@\@(event|END|ITEM|FUNC\w+)\b[\s\S]*$//mi;}
my @matched=grep(/^\s*code\s+guildbattle(?:\s|$)/m,@blocks);
die 'source guildbattle EVENT missing or ambiguous' unless @matched==1;
my($body)=$matched[0]=~/
  ^\s*endfunc\s+_local_\s*\r?\n
  ([\s\S]*?)
  ^[ \t]*_local_[ \t]*$
/mx;
die 'actual original guildbattle END body missing' unless
  defined($body)&&
  index($body,'main::ReadGuild();')>=0&&
  index($body,'main::ReadGuildData();')>=0&&
  index($body,"main::SetTownData('dominion',")>=0&&
  index($body,'return 1,')>=0;
my $dir=tempdir('akimono-original-r4-guild-XXXX',TMPDIR=>1,CLEANUP=>1);
make_path("$dir/event-e");
$ITEM_DIR=$dir;
open my $fh,'>:encoding(UTF-8)',"$dir/event-e/guildbattle.pl" or die $!;
print $fh "use utf8;\npackage event;\nsub _local_end{\n".$body.
  "\n}\n1;\n";
close $fh or die $!;
sub PushLog{push @LOG,[@_];1;}
sub RequireFile{die 'unexpected original IO' unless $_[0] eq 'inc-event.cgi';1;}
sub GetPath{
  my($base,$kind,$code)=@_;
  die 'unreviewed guild event path' unless
    $base eq $ITEM_DIR && $code eq 'guildbattle' &&
    ($kind eq 'event-e'||$kind eq 'event-n');
  return "$dir/$kind/$code.pl";
}
sub ReadGuild{$GUILD_READ++;1;}
sub ReadGuildData{$GUILD_DATA_READ++;1;}
sub SetTownData{
  die 'unexpected town data update' unless $_[0] eq 'dominion';
  $TOWN{dominion}=$_[1];$SET_TOWN++;1;
}
my $from=index($turn,"\t\t#イベント終了処理\n");
my $to=index($turn,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($turn,"\t\t#イベント開始処理\n",$from));
die 'original frozen END/START region moved' unless $from>=0&&$to>$from;
my $fragment=substr($turn,$from,$to-$from);
for my $literal(
  'my $func="event::".$E->{endfunc};',
  '($ret,$msg)=&$func(split(/[:,]/,$E->{endfuncparam}));',
  'if($DTevent{$key}<$temptimenow+$timespan)',
  'delete $DTevent{$key};',
  'if(rand(100000)<$timespan*$E->{startproba}/864 || $E->{startproba}==0)'
){
  die "frozen guild END/START drift $literal" unless
    index($fragment,$literal)>=0;
}
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub originalGuildEventSlice{\n".$fragment.
  "\nreturn {state=>{%DTevent},groups=>{%group}};}\n1;";
die "true frozen Perl END/START eval failed $@" unless $ok;
sub run{
  my(%in)=@_;
  $temptimenow=1000000;$timespan=3600;
  %EVENT=(guildbattle=>{
    group=>'original-guild-group',startproba=>0,
    startfunc=>'',endfunc=>'_local_end',endfuncparam=>'',
    func=>'',basetime=>0,plustime=>0,startmsg=>'',endmsg=>'',
  });
  %DTevent=();
  $DTevent{guildbattle}=$in{active} if defined $in{active};
  %GUILD=map{($_->{id}=>[$_->{name}])}@{$in{guilds}};
  %GUILD_DATA=map{($_->{id}=>{money=>$_->{money}})}@{$in{guilds}};
  $event::GUILDIDX_name=0;
  %TOWN=(dominion=>$in{dominion});@DT=({id=>1});
  @LOG=();$GUILD_READ=0;$GUILD_DATA_READ=0;$SET_TOWN=0;
  @GUILD_DRAWS=@{$in{draws}};@GUILD_RANGES=();
  my $out=originalGuildEventSlice();
  die 'guildbattle unused source RNG' if @GUILD_DRAWS;
  my @records=map{{
    id=>$_,name=>$GUILD{$_}[0],money=>$GUILD_DATA{$_}{money},
    (exists($GUILD_DATA{$_}{guild})?
      (guild=>$GUILD_DATA{$_}{guild}):()),
  }}sort keys(%GUILD);
  return {
    name=>$in{name},
    input=>{
      startSeconds=>1000000,spanSeconds=>3600,
      activeUntilSeconds=>$in{active},
      guilds=>$in{guilds},dominion=>$in{dominion},
      randomDraws=>$in{draws},
    },
    output=>{
      activeUntilSeconds=>$out->{state}{guildbattle},
      eventPersisted=>exists($out->{state}{guildbattle})?
        JSON::PP::true:JSON::PP::false,
      expired=>defined($in{active})&&$in{active}<1003600?
        JSON::PP::true:JSON::PP::false,
      dominion=>$TOWN{dominion},guildRecords=>\@records,
      logs=>[map{[@$_]}@LOG],readGuildCalls=>$GUILD_READ,
      readGuildDataCalls=>$GUILD_DATA_READ,setTownCalls=>$SET_TOWN,
      randomDrawRanges=>[@GUILD_RANGES],drawsUsed=>scalar(@GUILD_RANGES),
      groupOccupied=>$out->{groups}{'original-guild-group'}?
        JSON::PP::true:JSON::PP::false,
    }
  };
}
my @guilds=(
  {id=>'alpha',name=>'金砂會',money=>1000000},
  {id=>'beta',name=>'赤月會',money=>1500000},
  {id=>'gamma',name=>'灰石會',money=>20000},
);
my @cases=(
  run(name=>'expire-battle-beta-wins',active=>1003599,
    guilds=>\@guilds,dominion=>'alpha',draws=>[999999]),
  run(name=>'boundary-equality-active',active=>1003600,
    guilds=>\@guilds,dominion=>'alpha',draws=>[]),
  run(name=>'future-active-no-end',active=>9999999,
    guilds=>\@guilds,dominion=>'alpha',draws=>[]),
  run(name=>'never-started-zero-probability-transient',
    guilds=>\@guilds,dominion=>'alpha',draws=>[333333]),
  run(name=>'winner-changes-with-money',active=>1003599,
    guilds=>[
      {id=>'alpha',name=>'金砂會',money=>9000000},
      {id=>'beta',name=>'赤月會',money=>1500000},
    ],dominion=>'gamma',draws=>[0]),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'true frozen inc-turn END/START + exact DSL guildbattle _local_ ENDFUNC; explicit stub ReadGuild/ReadGuildData/SetTownData IO only',
  cases=>\@cases,
  scope=>'single externally seeded guildbattle, unique maximum guild money only; no real guild files/CAS/saved world, hash ties unreviewed',
});
