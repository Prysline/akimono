use strict;
use warnings;
use utf8;
use FindBin;
use JSON::PP;
use Digest::SHA qw(sha1_hex);
our (%Q,%DTevent,%id2idx,@DT,@image,$DT,$STATE,$DTTaxrate,$disp,$count);
my (@trace,@logs);
sub l {my($s,@args)=@_;$s=~s/%([1-9][0-9]*)/defined($args[$1-1])?$args[$1-1]:""/ge;return $s;}
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
my $path="$FindBin::Bin/pinned-lord-s.cgi";
open my $h,'<:raw',$path or die $!;
my $bytes=do{local $/;<$h>};close $h;
die "source drift" unless sha1_hex("blob ".length($bytes)."\0".$bytes) eq '8754dabf130a521aa243fc0568910d5f52523362';
binmode STDIN,':raw';binmode STDOUT,':raw';
my $input=decode_json(do{local $/;<STDIN>});
my $f=$input->{fixture};my $c=$input->{command};
$DTTaxrate=$f->{taxRate};$STATE={%{$f->{town}}};$DT={%{$f->{actor}}};
@DT=($DT);%id2idx=($DT->{id}=>0);%DTevent=%{$f->{eventState}};$disp='';
%Q=(mode=>'inside',map {$_=>$c->{$_}} qw(taxrate devem safem));
my $ok=do $path;my $err=$@;
die "unexpected original error: $err $!" if !defined($ok)&&$err!~/^SOURCE_REFUSAL:/;
print encode_json({ok=>defined($ok)?1:0,fixture=>{%$f,taxRate=>0+$DTTaxrate,town=>$STATE,actor=>$DT},
  logs=>\@logs,trace=>\@trace});
