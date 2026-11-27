use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use File::Temp qw(tempdir);
use OriginalNormalCommerceItemHarness;
use OriginalGiftMapUseHarness;

# This is a bounded original-source compiler and lifecycle oracle, not a
# player path. OutEventData writes ONLY inside a private temporary directory.
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$) {
    $main::DRAW_COUNT++;
    return 0.999999*($_[0]//1);
  };
}
our (@out_event,@ITEM,%EVENT,%DTevent,@EVENTMSG,@DT,@LOG,@errormsg,
     %g_define_event,$g_event,$g_event_no,$ITEM_DIR,$FILE_EXT,
     $temptimenow,$timespan,$DRAW_COUNT);
sub PushLog { push @LOG,[@_]; return 1; }
sub RequireFile { die 'unexpected manual EVENT callback'; }

my $baseline=OriginalNormalCommerceItemHarness::compiled_items();
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $compiler=OriginalGiftMapUseHarness::source('inc-makeitem.cgi');
my $turn=OriginalGiftMapUseHarness::source('inc-turn.cgi');
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
die 'original DataRead event file loader missing' unless
  index($read,'foreach(keys(%DTevent)){require(GetPath($ITEM_DIR,"event",$_));}')>=0;
my $from=index($compiler,"sub OutEventData\n{");
my $to=index($compiler,"\nsub GetFuncItemNo",$from);
die 'original OutEventData source moved' unless $from>=0&&$to>$from;
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  substr($compiler,$from,$to-$from)."\n1;";
die "actual original OutEventData compilation failed: $@" unless $ok;
my @manual=qw(kill-ken kill-yoroi kill-tate kill-tue);
my %wanted=map {$_=>1} (@manual,'ken-sale');
my @blocks=split(/^\s*\@\@EVENT\b[^\r\n]*\r?\n/mi,$dsl);shift @blocks;
@out_event=();%g_define_event=();$g_event_no=0;
for my $block(@blocks){
  $block=~s/^\s*\@\@(ITEM|USE|EVENT|DEFINE|FUNC[A-Z]+|END)\b[\s\S]*$//mi;
  my($code)=$block=~/^\s*code\s+([^\s#]+)/mi;
  next unless defined($code)&&$wanted{$code};
  main::ClearBuffer('event');
  for my $line(split /\n/,$block){
    my $normalized=OriginalGiftMapUseHarness::line_for_compiler($line);
    next unless defined $normalized;
    die "unexpected source row in $code: $line" unless
      $line=~/^\s*(?:code|start|basetime|plustime|startmsg|endmsg|info|param)\s+/i;
    main::GetBuffer('event',$normalized);
  }
  die "wrong original compiler EVENT $code" unless
    $g_event->{code} eq $code&&@{$g_event->{param}}>0&&
    $g_event->{startproba}==($code eq 'ken-sale'?100:-1);
  push @out_event,{%$g_event};
}
die 'four manual and one automatic EVENT source required' unless @out_event==5;
die 'original compiler parse errors: '.join(';',@errormsg) if @errormsg;
$ITEM_DIR=tempdir(CLEANUP=>1);
$FILE_EXT='.cgi';
mkdir "$ITEM_DIR/event" or die $!;
main::OutEventData();
die 'original compiler output errors: '.join(';',@errormsg) if @errormsg;
%EVENT=();
my $load=do "$ITEM_DIR/event.cgi";
die "actual original compiled EVENT catalog failed: $@ $!" unless $load;
die 'manual keys must be absent from automatic EVENT registry' unless
  join(',',sort keys %EVENT) eq 'ken-sale';

$from=index($turn,"\t\t#イベント終了処理\n");
$to=index($turn,"\n\t\tforeach my \$key (keys(%DTevent))",
  index($turn,"\t\t#イベント開始処理\n",$from));
die 'original END/START source moved' unless $from>=0&&$to>$from;
$ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub RunManualEventCycle {\n".substr($turn,$from,$to-$from).
  "\nreturn 1;}\n1;";
die "actual original END/START fragment compilation failed: $@" unless $ok;

sub read_generated {
  my($code)=@_;
  @ITEM=(undef,map {{%$_}} @$baseline);
  @EVENTMSG=();
  if(defined $code){
    my $loaded=do "$ITEM_DIR/event/$code.cgi";
    die "actual original DataRead ITEM overlay failed $code: $@ $!" unless $loaded;
  }
  return [map {0+$_->{point}} @ITEM[1..79]];
}
my @cases;
for my $code(@manual){
  my $base=read_generated(undef);
  my $point=read_generated($code);
  my @changed=map {[$_+1,$base->[$_],$point->[$_]]}
    grep {$base->[$_]!=$point->[$_]} 0..78;
  die "manual EVENT must generate negative points $code" unless
    @changed&&grep {$_->[2]<0} @changed;
  my @timeline;
  my $expiry=1000000+8*3600;
  for my $entry (
      {name=>'before',start=>$expiry-3601,span=>3600,active=>1},
      {name=>'equal',start=>$expiry-3600,span=>3600,active=>1},
      {name=>'expired',start=>$expiry,span=>1,active=>1},
      {name=>'next-read',start=>$expiry+1,span=>60,active=>0}){
    %DTevent=$entry->{active}?($code=>$expiry):();
    my $snapshot=read_generated($entry->{active}?$code:undef);
    my @messages=@EVENTMSG;
    $temptimenow=$entry->{start};$timespan=$entry->{span};
    @LOG=();@DT=();$DRAW_COUNT=0;
    main::RunManualEventCycle();
    die 'manual event must not naturally re-enter automatic scan' unless
      join(',',sort keys %EVENT) eq 'ken-sale'&&$DRAW_COUNT==1;
    push @timeline,{
      name=>$entry->{name},activeAtDataRead=>$entry->{active}?JSON::PP::true:JSON::PP::false,
      activeAfter=>exists($DTevent{$code})?JSON::PP::true:JSON::PP::false,
      point=>$snapshot,messages=>[@messages],logs=>[map {[@$_]} @LOG],
      automaticDrawCount=>$DRAW_COUNT,
    };
  }
  die "manual source expiry behavior changed $code" unless
    $timeline[0]{activeAfter}&&$timeline[1]{activeAfter}&&
    !$timeline[2]{activeAfter}&&!$timeline[3]{activeAfter}&&
    !@{$timeline[2]{logs}};
  push @cases,{code=>$code,compiledAutomatic=>JSON::PP::false,
    generatedItemFile=>JSON::PP::true,changedPoints=>\@changed,timeline=>\@timeline};
}
binmode STDOUT,':raw';
print JSON::PP->new->canonical->utf8->encode({
  scope=>'actual frozen GetBuffer/OutEventData and END/START fragment; no player, CAS, history or committed EVENT',
  cases=>\@cases,
});
