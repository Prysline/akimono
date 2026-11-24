use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use JSON::PP;
binmode STDOUT,':raw';
our (%GUILD,%GUILD_DETAIL,%GUILD_DATA,@DT,$COMMON_DIR,$DATA_DIR,$TEMP_DIR,$GUILD_FILE,$GUILDBAL_FILE,$COMMIT_FILE,$FILE_EXT,$GUILDIDX_name,$GUILDIDX_dealrate,$GUILDIDX_feerate,@logs);
my $root=tempdir(CLEANUP=>1);
$COMMON_DIR="$root/common";$DATA_DIR="$root/live";$TEMP_DIR="$root/stage";
mkdir $_ or die $! for($COMMON_DIR,$DATA_DIR,$TEMP_DIR);
$GUILD_FILE='guild.cgi';$GUILDBAL_FILE='guildbal.cgi';$COMMIT_FILE='commit.cgi';$FILE_EXT='.cgi';
sub GetPath {return @_==1?"$DATA_DIR/$_[0]":join('/',@_)}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
my $calls=0;my $failAt=0;
sub RenameAndCheck {$calls++;die 'injected rename failure' if $failAt==$calls;rename($_[0],$_[1]) or die $!}
sub PushLog {push @logs,[@_]}
sub l {my($s,@v)=@_;$s=~s/%1/$v[0]/g;return $s}
sub put {my($p,$s)=@_;open my $f,'>:encoding(UTF-8)',$p or die $!;print $f $s;close $f or die $!}
sub get {my($p)=@_;open my $f,'<:encoding(UTF-8)',$p or die $!;local $/;my $s=<$f>;close $f;return $s}
sub source {get("$FindBin::Bin/$_[0]")}
for my $n(qw(pinned-guild.cgi pinned-guildsub.cgi)){
  eval 'no strict;no warnings;'.source($n) or die $@;
}
for my $pair(['pinned-config.cgi','ReadConfig'],['pinned-sub.cgi','GetString'],['write.cgi','DataCommitOrAbort']){
  my $s=source($pair->[0]);my($fn)=$s=~/(^sub $pair->[1]\n\{[\s\S]*?^\}\n)/m;
  die 'source function missing' unless $fn;
  eval "no strict;no warnings;$fn\n1;" or die $@;
}
my $initialDef="use utf8;\n".'$GUILDIDX_name=0;$GUILDIDX_dealrate=1;$GUILDIDX_feerate=2;%GUILD=('."'alpha'=>['原公會',10,50,],'old'=>['舊公會',20,30,],);1;";
my $initialBal="alpha\tmoney\t1000\tin\t7\tout\t8\tatk\t90\tdef\t80\nold\tmoney\t300\tin\t0\tout\t0\tatk\t20\tdef\t10\n";
my %configs=(alpha=>"shortname = 新<公會> # comment\ndealrate=15\nfeerate=50\n",beta=>"shortname=新公會B\ndealrate=25\nfeerate=60\n");
put("$COMMON_DIR/$_.pl",$configs{$_}) for keys %configs;
put(GetPath($GUILD_FILE),$initialDef);put(GetPath($GUILDBAL_FILE),$initialBal);
eval $initialDef or die $@;
ReadGuild('');ReadGuildData();
my @shops=({guild=>'old',user=>{_so_e=>1,keep=>2}},{guild=>'alpha',user=>{keep=>3}});
@DT=map {{guild=>$_->{guild},user=>{%{$_->{user}}}}} @shops;
EditGuildMoney('alpha',120);EditGuildMoney('alpha',-40);EditGuildMoney('old',0);
MakeGuildFile();WriteGuildData();
my $def=get("$TEMP_DIR/$GUILD_FILE");my $bal=get("$TEMP_DIR/$GUILDBAL_FILE");
my @oldKeys=sort keys %GUILD;
$failAt=2;my $ok=eval{DataCommitOrAbort(0);1};
die 'expected partial commit' if $ok||! -e GetPath($COMMIT_FILE);
opendir my $d,$TEMP_DIR or die $!;my @pending=grep {/\.cgi$/} readdir($d);closedir $d;
die 'expected one staged file' unless @pending==1;
$failAt=0;DataCommitOrAbort(1);
die 'marker retained' if -e GetPath($COMMIT_FILE);
die 'recover failed' unless get(GetPath($GUILD_FILE)) eq $def && get(GetPath($GUILDBAL_FILE)) eq $bal;
eval $def or die $@;
ReadGuildData();
my %decoded=map {$_=>{shortname=>$GUILD{$_}[0],dealrate=>0+$GUILD{$_}[1],feerate=>0+$GUILD{$_}[2]}} keys %GUILD;
my %ledger=map {my $id=$_;($id=>{map {$_=>0+$GUILD_DATA{$id}{$_}} qw(money in out atk def)})} keys %GUILD_DATA;
print JSON::PP->new->canonical->utf8->encode({initialDef=>$initialDef,initialBal=>$initialBal,configs=>\%configs,shops=>\@shops,afterShops=>\@DT,oldKeys=>\@oldKeys,definitions=>\%decoded,ledger=>\%ledger,definitionBytes=>$def,ledgerBytes=>$bal,logs=>\@logs,partialPending=>\@pending,recovered=>JSON::PP::true});
