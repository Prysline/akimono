use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
my ($stable,$ranch,$dragon,$readA,$readB,$time,$json)=@ARGV;
my $in=JSON::PP->new->utf8->decode($json);
our ($disp,$COMMON_DIR,$NOW_TIME,$MYDIR,$DT,%id2idx,%Q,$TB,$TR,$TD,$TDB,$TRE,$TBE,$USERPASSURL,$USERPASSFORM,$METHOD,$IMAGE_URL,$IMAGE_EXT,$TZ_JST);
$NOW_TIME=$in->{now};$MYDIR=$in->{street};$DT={id=>$in->{actorId}};%id2idx=map {$_=>0} @{$in->{activeShopIds}};
$Q{mode}=$in->{mode};($TB,$TR,$TD,$TDB,$TRE,$TBE)=qw([[T]] [[R]] [[D]] [[H]] [[E]] [[B]]);
$IMAGE_URL='/assets';$IMAGE_EXT='.png';$USERPASSURL='';$USERPASSFORM='';$METHOD='METHOD=POST';$TZ_JST=32400;
$COMMON_DIR=tempdir(CLEANUP=>1);$disp='';
my %path=(st=>'dra-st',rc=>'dra-rc',dra=>'dra-dr',pr=>'dra-pr');
for my $k(keys %path){my $s=$in->{files}{$k};next unless defined $s;open my $f,'>:encoding(UTF-8)',"$COMMON_DIR/$path{$k}.cgi" or die $!;print {$f}$s;close $f;}
# Identity locale, decimal money formatter and surrounding HTML/auth are test adapters.
sub l {my($s,@a)=@_;$s=~s/%(\d+)/$a[$1-1]/ge;return $s;}
sub GetPath {"$_[0]/$_[1].cgi"}
sub GetMoneyString {$_[0]+0}
sub GetTagImgKao {qq|<IMG class="i" SRC="/assets/$_[1].png">|}
for my $f($readA,$readB,$time,$dragon){do $f or die "$@ $!";}
if($in->{mode} eq 'stable'){do $stable or die "$@ $!";}
elsif($in->{mode} eq 'ranch'){do $ranch or die "$@ $!";}
else {die 'unexpected test mode';}
# Extract actual source tables, including headers, rendered values and links.
my @tables;
for my $t($disp=~/\[\[T\]\](.*?)\[\[B\]\]/gs){
  next unless $t=~/\[\[H\]\]/;
  my ($head)=$t=~/\[\[R\]\]\[\[H\]\](.*?)\[\[E\]\]/s;
  die 'missing table header' unless defined $head;
  my @columns=split /\[\[H\]\]/,$head,-1;
  my @rows;
  for my $part(split /\[\[R\]\]/,$t){
    next unless $part=~/^\[\[D\]\]/;
    my ($data)=split /\[\[E\]\]/,$part,2;
    my @cells=split /\[\[D\]\]/,$data,-1;shift @cells;
    my ($imageKey,$link);
    for my $c(@cells){
      if($c=~s/<a href="action\.cgi\?key=slime&mode=(detail|pr)&dr=(\d+)&">(?:\s*)//){$link={route=>'slime',mode=>$1,dr=>0+$2};$c=~s/<\/a>//;}
      if($c=~s/<IMG class="i" SRC="\/assets\/(dragon\d+)\.png">//){$imageKey=$1;}
    }
    push @rows,{cells=>\@cells,imageKey=>$imageKey,link=>$link};
  }
  push @tables,{columns=>\@columns,rows=>\@rows};
}
my @forms;
for my $body($disp=~/<FORM ACTION="action\.cgi"[^>]*>(.*?)<\/FORM>/gs){
  my ($mode)=$body=~/NAME=mode VALUE="([^"]+)"/;
  my ($code)=$body=~/NAME=code VALUE="([^"]+)"/;
  my ($titleKey)=$body=~/<BIG>●([^<]+)<\/BIG>/;
  my ($submitKey)=$body=~/TYPE=SUBMIT VALUE='([^']+)'/;
  die 'missing form descriptor' unless defined $mode && defined $code && defined $titleKey && defined $submitKey;
  my @fields;
  while($body=~/<SELECT NAME=(\w+) SIZE=1>(.*?)<\/SELECT>|<INPUT TYPE=TEXT NAME=(\w+) SIZE=(\d+)>/gs){
    my ($select,$options,$input,$size)=($1,$2,$3,$4);
    if(defined $select){
      my @opts;
      while($options=~/<OPTION VALUE="(\d+)">([^<]*)/g){my ($v,$label)=($1,$2);$label=~s/^\s+|\s+$//g;push @opts,{value=>0+$v,label=>$label};}
      push @fields,{name=>$select,type=>'select',options=>\@opts};
    }else{push @fields,{name=>$input,type=>'text',size=>0+$size};}
  }
  push @forms,{mode=>$mode,code=>$code,titleKey=>$titleKey,submitKey=>$submitKey,fields=>\@fields};
}
my ($introImage)=$disp=~/<IMG class="i" SRC="\/assets\/(slime[13])\.png">/;
print JSON::PP->new->utf8->encode({tables=>\@tables,forms=>\@forms,introImage=>$introImage,rendered=>$disp});
