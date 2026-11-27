use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
use Encode ();
my ($menu,$config,$time,$json)=@ARGV;
my $in=JSON::PP->new->utf8->decode($json);
our (@DT,$DT,$USER,$NOW_TIME,$COMMON_DIR,$SUBDATA_DIR,$TZ_JST,$DATE_REVISE_TIME,$ONE_DAY_TIME,$DTlasttime,$TOWN_TITLE,$MYNAME,$HOME_PAGE,$HTML_TITLE,$USERPASSURL,%Q,%DISP);
$NOW_TIME=$DTlasttime=$in->{nowSeconds};
open my $cf,'<:encoding(UTF-8)',$config or die $!;
my $c=do{local $/;<$cf>};close $cf;
for my $var(qw(TZ_JST DATE_REVISE_TIME ONE_DAY_TIME)){
  my ($line)=$c=~/(^\s*\$$var\s*=\s*[\d*]+;)/m;die "missing $var" unless $line;
  eval "$line 1;" or die $@;
}
do $time or die "$@ $!";
@DT=@{$in->{shops}};
$USER=$in->{viewerKind} eq 'player'?'fixture':$in->{viewerKind} eq 'admin'?'soldoutadmin':'';
($DT)=grep {$_->{id}==($in->{actorId}//0)} @DT;
$COMMON_DIR=$SUBDATA_DIR=tempdir(CLEANUP=>1);
if($in->{boardMtime}){
  open my $b,'>',"$COMMON_DIR/treelog.cgi" or die $!;close $b;
  utime $in->{boardMtime},$in->{boardMtime},"$COMMON_DIR/treelog.cgi" or die $!;
}
my $mail="$SUBDATA_DIR/".($in->{actorId}//0)."-wis.cgi";
if($in->{mailboxPresent}){open my $m,'>:encoding(UTF-8)',$mail or die $!;print {$m}$in->{mailboxContent};close $m;}
$DISP{MENU}='#SKINMENU# #SKINMENUSUB#';
my @links;
sub l {$_[0]}
sub GetPath {"$_[0]/$_[1].cgi"}
sub GetTagImgJob {''}
sub GetTime2HMS {''} # unrelated settlement formatter is covered by A
sub GetMenuTag {push @links,{route=>$_[0],label=>$_[1],target=>undef};return ''}
sub GetTagA {push @links,{route=>$_[1],label=>$_[0],target=>$_[3]};return ''}
my $out='';
{local *STDOUT;open STDOUT,'>:encoding(UTF-8)',\$out or die $!;do $menu or die "$@ $!";close STDOUT;}
$out=Encode::decode_utf8($out);
my @groups=$out=~/<BIG>(街案内|自店|取引|情報|施設|交流)<\/BIG>/g;
my ($active)=$out=~/<BIG>活動中<\/BIG> &gt; <small>(.*?)<\/small>/s;
my $kind=defined($active)?'active':$USER eq 'fixture'?'wis':undef;
my $mailDeleted=$in->{mailboxPresent}&&!-e $mail?JSON::PP::true:JSON::PP::false;
print JSON::PP->new->utf8->encode({groups=>\@groups,links=>\@links,kind=>$kind,active=>$active,mailDeleted=>$mailDeleted});
