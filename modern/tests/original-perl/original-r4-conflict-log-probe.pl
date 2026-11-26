# Original PushLog / RenewLog / ReadLog with actual source publication.
use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use JSON::PP;
our ($NOW_TIME,$TEMP_DIR,$DATA_DIR,$FILE_EXT,$COMMIT_FILE,$LOG_EXPIRE_TIME,$DT,@LOG,@MESSAGE);
my $root=tempdir(CLEANUP=>1);$DATA_DIR="$root/live";$TEMP_DIR="$root/stage";
mkdir $_ or die $! for($DATA_DIR,$TEMP_DIR);
$FILE_EXT='.cgi';$COMMIT_FILE='commit';$LOG_EXPIRE_TIME=129600;
sub GetPath {return @_==1?"$DATA_DIR/$_[0].cgi":"$_[0]/$_[1].cgi"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck {rename($_[0],$_[1]) or die $!}
sub l {$_[0]}
sub bytes {my($f)=@_;open my $h,'<:raw',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub readText {my($f)=@_;open my $h,'<:encoding(UTF-8)',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub put {my($f,$s)=@_;open my $h,'>:encoding(UTF-8)',$f or die $!;print {$h} $s;close $h or die $!}
my %pins=('pinned-log.cgi'=>'0f9143c49d1552233f27754e3937e1cdc2740f0a',
 'write.cgi'=>'203f33b37511e838800a45b84183af98fcf46e4c');
for my $name(keys %pins){my $s=bytes("$FindBin::Bin/$name");
 die "source drift $name" unless sha1_hex("blob ".length($s)."\0".$s) eq $pins{$name};}
require "$FindBin::Bin/pinned-log.cgi";
my $write=readText("$FindBin::Bin/write.cgi");
my($commit)=$write=~/(^sub DataCommitOrAbort\n\{[\s\S]*?^\}\n)/m;
die 'commit source missing' unless $commit;eval "no strict;no warnings;$commit\n1;" or die $@;
binmode STDIN,':raw';my $in=decode_json(do{local $/;<STDIN>});
$NOW_TIME=$in->{nowSeconds};$DT={id=>1};
for my $i(0..2){put(GetPath("log$i"),$in->{initial}[$i]);}
utime($in->{mtime},$in->{mtime},GetPath('log1')) or die $!;
@LOG=();
for my $call(@{$in->{calls}}){PushLog(@$call)}
my @rows=@LOG;RenewLog();
my $staged=readText(GetPath($TEMP_DIR,'log0'));
my @before=map{-e GetPath("log$_")?readText(GetPath("log$_")):undef}0..2;
DataCommitOrAbort(0);
my @after=map{readText(GetPath("log$_"))}0..2;
ReadLog(1,3,'','');
binmode STDOUT,':raw';print JSON::PP->new->canonical->utf8->encode({rows=>\@rows,staged=>$staged,before=>\@before,after=>\@after,messages=>\@MESSAGE});
