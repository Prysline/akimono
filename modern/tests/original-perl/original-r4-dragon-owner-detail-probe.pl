use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
my ($handler,$dragon,$readA,$readB,$time,$config,$json)=@ARGV;
my $in=JSON::PP->new->utf8->decode($json);
our ($disp,$NOW_TIME,$MYDIR,$DT,%id2idx,%Q,$COMMON_DIR,$TB,$TR,$TD,$TDB,$TRE,$TBE,$TZ_JST,$IMAGE_URL,$IMAGE_EXT);
$NOW_TIME=$in->{now};$MYDIR=$in->{street};$DT={id=>$in->{actorId}};%id2idx=map {$_=>0} @{$in->{activeShopIds}};$Q{dr}=$in->{dr};
($TB,$TR,$TD,$TDB,$TRE,$TBE)=qw([[T]] [[R]] [[D]] [[H]] [[E]] [[B]]);
$IMAGE_URL='/assets';$IMAGE_EXT='.png';$COMMON_DIR=tempdir(CLEANUP=>1);$disp='';
open my $c,'<:encoding(UTF-8)',$config or die $!;my $src=do{local $/;<$c>};close $c;
my ($tz)=$src=~/^\s*\$TZ_JST\s*=\s*([\d*]+);/m;die 'missing TZ' unless defined $tz;
$TZ_JST=1;$TZ_JST*=$_ for split /\*/,$tz;
my %path=(dra=>'dra-dr',pr=>'dra-pr',st=>'dra-st',jk=>'dra-jk');
for my $k(keys %path){my $s=$in->{files}{$k};next unless defined $s;open my $f,'>:encoding(UTF-8)',"$COMMON_DIR/$path{$k}.cgi" or die $!;print {$f}$s;close $f;}
sub l {my($s,@a)=@_;$s=~s/%(\d+)/$a[$1-1]/ge;return $s;}
sub GetPath {"$_[0]/$_[1].cgi"}
sub GetMoneyString {$_[0]}
sub OutError {die "BAD REQUEST\n"}
for my $f($dragon,$readA,$readB,$time){do $f or die "$@ $!";}
my $ok=do $handler;
if(!$ok){if($@ eq "BAD REQUEST\n"){print '{"error":"bad request"}';exit 0;}die "$@ $!";}
my ($title)=$disp=~/<BIG>●ドラゴンレース：(.*?)<\/BIG>/;
my ($columns,$data)=$disp=~/\[\[T\]\]\[\[R\]\]\[\[H\]\](.*?)\[\[E\]\]\[\[R\]\]\[\[D\]\](.*?)\[\[E\]\]\[\[B\]\]/s;
die 'summary parse' unless defined $data;
my @columns=split /\[\[H\]\]/,$columns,-1;$columns[-1]=~s/\n$//;
my @cells=split /\[\[D\]\]/,$data,-1;my $image;
for(@cells){if(s/<IMG class="i" SRC="\/assets\/(dragon\d+)\.png">//){$image=$1;}s/<\/?(?:b|SPAN)>//g;}
my ($abilityTitle)=$disp=~/<BIG>●([^<]+)<\/BIG><br><br>\[\[T\]\]\[\[R\]\]\[\[H\]\][^\[]+\[\[D\]\]<nobr>/;
my @bars;
while($disp=~/\[\[R\]\]\[\[H\]\]([^\[]+)\[\[D\]\]<nobr>(.*?)<\/nobr>\[\[E\]\]/gs){my($key,$bar)=($1,$2);my @segments;while($bar=~s/^<img src="\/assets\/([brt]\.gif)" width="(-?\d+)" height="(\d+)">//){push @segments,{imageKey=>$1,width=>0+$2,height=>0+$3};}$bar=~s/^ //;push @bars,{key=>$key,segments=>\@segments,label=>$bar};}
my @forms;
while($disp=~/(<FORM ACTION="action.cgi".*?<\/FORM>)\s*<br>\s*\[\[T\]\]\[\[R\]\]\[\[D\]\]\s*(.*?)\s*\[\[B\]\]/gs){
 my ($html,$advice)=($1,$2);my %h=$html=~/NAME=(key|bk|mode|code|dr) VALUE="([^"]*)"/g;
 my ($title)=$html=~/<BIG>●([^<]+)<\/BIG>/;my ($submit)=$html=~/TYPE=SUBMIT VALUE='([^']+)'/;
 my @fields;
 while($html=~/<SELECT NAME=(\w+) SIZE=1>(.*?)<\/SELECT>|<INPUT TYPE=TEXT NAME=(\w+) SIZE=(\d+)(?: VALUE="([^"]*)")?>/gs){
  if(defined $1){my($name,$s)=($1,$2);$s=~s/^\n//;$s=~s/\n$//;my @options;
   while($s=~/<OPTION VALUE="([^"]*)">([^<]*)/g){my($id,$label)=($1,$2);push @options,$id eq ''?{value=>undef,label=>$label,disabled=>JSON::PP::true}:{value=>0+$id,label=>$label};}
   push @fields,{name=>$name,type=>'select',options=>\@options};
  }else{my $field={name=>$3,type=>'text',size=>0+$4};$field->{value}=$5 if defined $5;push @fields,$field;}
 }
 my @advice=split /<br>\s*/,$advice;for(@advice){s/^・//;}
 my $f={route=>$h{key},backRoute=>$h{bk},mode=>$h{mode},code=>$h{code},hidden=>{dr=>0+$h{dr}},titleKey=>$title,submitKey=>$submit,fields=>\@fields,advice=>\@advice};
 if($h{code} eq 'retire'){my($hint)=$html=~/\((retireと入力)\)/;die 'confirmation parse' unless defined $hint;$f->{confirmation}={field=>'check',value=>'retire',hintKey=>$hint};}
 push @forms,$f;
}
print JSON::PP->new->utf8->encode({mode=>$in->{mode},committable=>JSON::PP::false,titleKey=>$title,summary=>{columns=>\@columns,cells=>\@cells,imageKey=>$image},abilityTitleKey=>$abilityTitle,bars=>\@bars,forms=>\@forms});
