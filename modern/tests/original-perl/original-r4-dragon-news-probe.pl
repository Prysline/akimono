use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
my ($info,$page,$time,$config,$json)=@ARGV;
my $in=JSON::PP->new->utf8->decode($json);
our ($disp,$COMMON_DIR,$LIST_PAGE_ROWS,$LIST_PAGE_ROWS_PC,$LIST_PAGE_ROWS_MOBILE,$TZ_JST,$TB,$TR,$TD,$TRE,$TBE,$USERPASSURL,%Q,@MESSAGE);
open my $c,'<:encoding(UTF-8)',$config or die $!;my $src=do{local $/;<$c>};close $c;
for my $v(qw(TZ_JST LIST_PAGE_ROWS_PC LIST_PAGE_ROWS_MOBILE)){
  my ($line)=$src=~/(^\s*\$$v\s*=\s*[\d*]+;)/m;die "missing $v" unless $line;eval "$line 1;" or die $@;
}
$LIST_PAGE_ROWS=$in->{mobile}?$LIST_PAGE_ROWS_MOBILE:$LIST_PAGE_ROWS_PC;
$Q{key}='slime';$Q{lpg}=$in->{page};
$COMMON_DIR=tempdir(CLEANUP=>1);
for my $n(0..2){my $s=$in->{'log'.$n};next unless defined $s;open my $f,'>:encoding(UTF-8)',"$COMMON_DIR/dra-log$n.cgi" or die $!;print {$f}$s;close $f;}
sub l {$_[0]}
sub GetPath {"$_[0]/$_[1].cgi"}
sub GetTagImgKao {''}
sub GetTagA {''}
do $page or die "$@ $!";do $time or die "$@ $!";do $info or die "$@ $!";
my @popups;
while($disp=~/value="([^"]+)" onclick="javascript:window\.open\('action\.cgi\?key=slime-l&mode=(\w+)','(_blank)','width=(\d+),height=(\d+),scrollbars'\)"/g){push @popups,{label=>$1,mode=>$2,route=>'slime-l',target=>$3,width=>0+$4,height=>0+$5};}
my @entries;
while($disp=~/<small>(.*?)<\/small> (.*?)<BR>/gs){
  my ($date,$msg)=($1,$2);my $category;
  if($msg=~s/^<SPAN>\[登竜\](.*)<\/SPAN>$/$1/s){$category='登竜';}
  elsif($msg=~s/^<BIG>\[重賞\](.*)<\/BIG>$/$1/s){$category='重賞';}
  push @entries,{dateLabel=>$date,category=>$category,sourceMessage=>$msg};
}
my @pg=GetPage($Q{lpg},$LIST_PAGE_ROWS,scalar @MESSAGE);
print JSON::PP->new->utf8->encode({popups=>\@popups,entries=>\@entries,pageInfo=>\@pg});
