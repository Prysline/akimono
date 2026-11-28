use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
my ($handler,$dragon,$reader,$time,$json)=@ARGV;
my $in=JSON::PP->new->utf8->decode($json);
our ($disp,$NOW_TIME,$MYDIR,$DT,%id2idx,$COMMON_DIR,$TB,$TR,$TD,$TDB,$TRE,$TBE);
$NOW_TIME=$in->{now};$MYDIR=$in->{street};$DT={id=>$in->{actorId}};%id2idx=map {$_=>0} @{$in->{activeShopIds}};
($TB,$TR,$TD,$TDB,$TRE,$TBE)=qw([[T]] [[R]] [[D]] [[H]] [[E]] [[B]]);
$COMMON_DIR=tempdir(CLEANUP=>1);$disp='';
if(defined $in->{jockeyFile}){open my $f,'>:encoding(UTF-8)',"$COMMON_DIR/dra-jk.cgi" or die $!;print {$f}$in->{jockeyFile};close $f;}
sub l {my($s,@a)=@_;$s=~s/%(\d+)/$a[$1-1]/ge;return $s;}
sub GetPath {"$_[0]/$_[1].cgi"}
sub GetTagImgKao {''}
sub GetMoneyString {$_[0]}
for my $f($dragon,$reader,$time,$handler){do $f or die "$@ $!";}
my $out={mode=>'jock',committable=>JSON::PP::false,row=>undef,form=>undef,messages=>[]};
my ($data)=$disp=~/\[\[R\]\]\[\[D\]\](.*?)\[\[E\]\]\[\[B\]\]/s;
if($disp=~/\[\[H\]\]名前/){
  my @cells=split /\[\[D\]\]/,$data,-1;for(@cells){s/<\/?(?:small|SPAN|b)>//g;}
  $out->{state}='owned';$out->{row}={cells=>\@cells,imageKey=>undef};
}else{
  my ($first,$second)=$disp=~/<SPAN>騎手仲間<\/SPAN>：(.*?)<br>(.*?)\[\[E\]\]/s;
  $out->{messages}=[$first,$second];
  if($disp=~/<FORM/){
    my ($route,$back,$mode,$code,$size,$submit,$cost,$max)=$disp=~/NAME=key VALUE="([^"]+)".*?NAME=bk VALUE="([^"]+)".*?NAME=mode VALUE="([^"]+)".*?NAME=code VALUE="([^"]+)".*?NAME=name SIZE=(\d+).*?TYPE=SUBMIT VALUE='([^']+)'.*?資金<b>(\d+)<\/b>.*?全体で <b>(\d+)<\/b>/s;
    die 'form parse' unless defined $max;
    $out->{state}='available';$out->{form}={route=>$route,back=>$back,mode=>$mode,code=>$code,nameSize=>0+$size,submit=>$submit,cost=>0+$cost,capacity=>0+$max};
  }else{my ($msg)=$disp=~/<BIG>●騎手雇用<\/BIG>： (.*)$/s;$out->{state}='full';push @{$out->{messages}},$msg;}
}
print JSON::PP->new->utf8->encode($out);
