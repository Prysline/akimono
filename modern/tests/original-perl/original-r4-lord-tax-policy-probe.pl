use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use Digest::SHA qw(sha1_hex);
our (%Q,%DTevent,%id2idx,@DT,@image,$DT,$STATE,$DTTaxrate,$disp,$count,@DTindexnamelist);
my (@trace,@logs);
sub l {my($s,@a)=@_;$s=~s/%([1-9][0-9]*)/defined($a[$1-1])?$a[$1-1]:""/ge;return $s;}
sub GetTagImgKao {''}
sub Lock {push @trace,'lock';1}
sub DataRead {push @trace,'read-adapter';1}
sub CheckUserPass {push @trace,'auth-adapter';1}
sub PushLog {push @logs,[@_];push @trace,'log';1}
sub RenewLog {push @trace,'renew';1}
sub DataWrite {push @trace,'stage-adapter';1}
sub DataCommitOrAbort {push @trace,'commit-adapter';1}
sub UnLock {push @trace,'unlock';1}
sub OutSkin {push @trace,'render';1}
sub OutError {die "SOURCE_REFUSAL:$_[0]\n"}
my %pins=('pinned-lord-s.cgi'=>'8754dabf130a521aa243fc0568910d5f52523362',
 'inc-func.cgi'=>'e7a8add7b0291901e71fe797783b664dff1568a0',
 'write.cgi'=>'203f33b37511e838800a45b84183af98fcf46e4c');
my %src;
for my $f(keys %pins){
 open my $h,'<:raw',"$FindBin::Bin/$f" or die $!;
 my $b=do{local $/;<$h>};close $h;
 die "source drift $f" unless sha1_hex("blob ".length($b)."\0".$b) eq $pins{$f};
 $src{$f}=$b;
}
# Execute exact frozen scalar column join/split expressions (not full DataRead).
my($manifest)=$src{'inc-func.cgi'}=~/(\@DTindexnamelist=\s*qw\([^)]*\);)/;
my($write)=$src{'write.cgi'}=~/(print OUT join\(",",map\{\$DT->\{\$_\}\}\@DTindexnamelist\),"\\n";)/;
my($read)=$src{'inc-func.cgi'}=~/(\@DT\{\@DTindexnamelist\}=split\(\/,\/,\$DATA\[\$idx\+\+\]\);)/;
die 'exact scalar wire fragments missing' unless $manifest&&$write&&$read;
my $ok=eval 'no strict; no warnings; '.$manifest.' sub originalWriteRow { my $DT=shift; my $row=""; local *OUT; open(OUT,">",\$row) or die $!; '.$write.' close(OUT);return $row;} sub originalReadRow {my @DATA=(shift);my $idx=0;my %DT;'.$read.' return \%DT;} 1;';
die "wire source compile $@" unless $ok;
binmode STDIN,':raw';binmode STDOUT,':raw';
my $input=decode_json(do{local $/;<STDIN>});
my $f=$input->{fixture};my $c=$input->{command};
$DTTaxrate=$f->{taxRate};$STATE={leader=>$f->{leader}};
@DT=map{{%$_}}@{$f->{shops}};%id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
$DT=$DT[$id2idx{$f->{actorId}}];%DTevent=%{$f->{eventState}};$disp='';
%Q=$c->{kind} eq 'lord-tax-reset'?(mode=>'treset'):(mode=>'taxside',tg=>$c->{targetId},md=>$c->{mode});
my $done=do "$FindBin::Bin/pinned-lord-s.cgi";my $err=$@;
die "unexpected original error: $err $!" if !defined($done)&&$err!~/^SOURCE_REFUSAL:/;
my @wire;
for my $shop(@DT){
 my %full=map{$_=>0}@DTindexnamelist;
 delete $full{taxmode};
 for my $k(keys %$shop){$full{$k}=$shop->{$k}}
 # ASCII fixture only; explicit nonempty trailing icon keeps Perl split intact.
 my $row=originalWriteRow(\%full);
 my $loaded=originalReadRow($row=~s/\n$//r);
 push @wire,{row=>$row,mode=>defined($loaded->{taxmode})?"$loaded->{taxmode}":undef};
}
print encode_json({ok=>defined($done)?1:0,fixture=>{%$f,shops=>\@DT},logs=>\@logs,trace=>\@trace,wire=>\@wire});
