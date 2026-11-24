use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use JSON::PP;
binmode STDOUT,':raw';
our (%GUILD,%GUILD_DETAIL,%GUILD_DATA,@DT,$COMMON_DIR,$DATA_DIR,$TEMP_DIR,$GUILD_FILE,$GUILDBAL_FILE,$GUILDIDX_name,$GUILDIDX_dealrate,$GUILDIDX_feerate);
my $root=tempdir(CLEANUP=>1);
$COMMON_DIR="$root/common";$DATA_DIR="$root/live";$TEMP_DIR="$root/stage";
mkdir $_ or die $! for($COMMON_DIR,$DATA_DIR,$TEMP_DIR);
$GUILD_FILE='guild.cgi';$GUILDBAL_FILE='guildbal.cgi';
sub GetPath {return @_==1?"$DATA_DIR/$_[0]":join('/',@_)}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub PushLog {}
sub l {return $_[0]}
sub put {my($p,$s)=@_;open my $f,'>:encoding(UTF-8)',$p or die $!;print $f $s;close $f or die $!}
sub get {my($p)=@_;open my $f,'<:encoding(UTF-8)',$p or die $!;local $/;my $s=<$f>;close $f;return $s}
for my $n(qw(pinned-guild.cgi pinned-guildsub.cgi)){
  eval 'no strict;no warnings;'.get("$FindBin::Bin/$n") or die $@;
}
for my $pair(['pinned-config.cgi','ReadConfig'],['pinned-sub.cgi','GetString']){
  my $s=get("$FindBin::Bin/$pair->[0]");my($fn)=$s=~/(^sub $pair->[1]\n\{[\s\S]*?^\}\n)/m;
  die 'source function missing' unless $fn;eval "no strict;no warnings;$fn\n1;" or die $@;
}
my @warnings;
{
  local $SIG{__WARN__}=sub{push @warnings,$_[0]};
  ReadGuildData();
}
my $missingCount=scalar keys %GUILD_DATA;
my $malformed="alpha\tmoney\t12\tin\n";
put(GetPath($GUILDBAL_FILE),$malformed);
{
  local $SIG{__WARN__}=sub{push @warnings,$_[0]};
  ReadGuildData();
}
my $malformedMoney=0+$GUILD_DATA{alpha}{money};
my $malformedInDefined=defined($GUILD_DATA{alpha}{in})?1:0;
my $invalid="shortname=Bad Guild\ndealrate=nope\nfeerate=60\n";
put("$COMMON_DIR/alpha.pl",$invalid);
ReadGuild('');MakeGuildFile();
my $invalidGenerated=get(GetPath($TEMP_DIR,$GUILD_FILE));
unlink GetPath($TEMP_DIR,$GUILD_FILE) or die $!;
my $config="shortname=Alpha\ndealrate=10\nfeerate=50\n";
put("$COMMON_DIR/alpha.pl",$config);
ReadGuild('');
%GUILD=(alpha=>['Alpha',10,50]);$GUILDIDX_name=0;
%GUILD_DATA=(alpha=>{money=>-1,in=>17,out=>20,atk=>8,def=>9,guild=>'temp'});
my $period=get("$FindBin::Bin/period.cgi");
my $a=index($period,"\tforeach(keys(%GUILD))");my $b=index($period,"\n\tif(defined(\$DT[0]))",$a);
die 'period start drift' unless $a>=0&&$b>$a;
my $start=substr($period,$a,$b-$a);
eval "no strict;no warnings;$start\n1;" or die $@;
my $removed=!-e "$COMMON_DIR/alpha.pl";
my $after={map {$_=>0+$GUILD_DATA{alpha}{$_}} qw(money in out atk def)};
my $tempGone=!exists $GUILD_DATA{alpha}{guild};
MakeGuildFile();
my $stale=get(GetPath($TEMP_DIR,$GUILD_FILE));
ReadGuild('');MakeGuildFile();
my $afterReload=get(GetPath($TEMP_DIR,$GUILD_FILE));
# Exact original inc-turn end mtime block with actual MakeGuildFile.
my $turn=get("$FindBin::Bin/inc-turn.cgi");
my $m=index($turn,'my $guildfilelasttime=0;');
my $end=index($turn,'WriteGuildData();',$m);
die 'mtime source moved' unless $m>=0&&$end>$m;
my $block=substr($turn,$m,$end-$m);
eval "no strict;no warnings;sub mtimeOriginal{\n$block\n}1;" or die $@;
put("$COMMON_DIR/alpha.pl",$config);
put(GetPath($GUILD_FILE),$stale);ReadGuild('');
my @times;
for my $mtime(100,101,99){
  unlink GetPath($TEMP_DIR,$GUILD_FILE) if -e GetPath($TEMP_DIR,$GUILD_FILE);
  utime(100,100,GetPath($GUILD_FILE)) or die $!;
  utime($mtime,$mtime,"$COMMON_DIR/alpha.pl") or die $!;
  mtimeOriginal();
  push @times,{mtime=>$mtime,rebuild=>(-e GetPath($TEMP_DIR,$GUILD_FILE)?JSON::PP::true:JSON::PP::false)};
}
print JSON::PP->new->canonical->utf8->encode({missingCount=>$missingCount,malformed=>$malformed,malformedMoney=>$malformedMoney,malformedInDefined=>$malformedInDefined,invalid=>$invalid,invalidGenerated=>$invalidGenerated,negativeAfter=>$after,removed=>$removed?JSON::PP::true:JSON::PP::false,tempGone=>$tempGone?JSON::PP::true:JSON::PP::false,staleDefinition=>$stale,afterReload=>$afterReload,mtime=>\@times,config=>$config});
