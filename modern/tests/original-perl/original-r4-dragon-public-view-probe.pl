use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
my ($list,$status,$dragon,$readA,$readB,$readC,$page,$time,$config,$json)=@ARGV;
my $in=JSON::PP->new->utf8->decode($json);
our ($disp,$COMMON_DIR,$LIST_PAGE_ROWS,$LIST_PAGE_ROWS_PC,$LIST_PAGE_ROWS_MOBILE,$TZ_JST,$NOW_TIME,$MYDIR,$DT,%id2idx,%Tname,%Q,$TB,$TR,$TD,$TDB,$TRE,$TBE,$USERPASSURL,$IMAGE_URL,$IMAGE_EXT,@DRTIME);
our ($DRcount,$PRcount,$RCcount,$STcount,$JKcount);
open my $c,'<:encoding(UTF-8)',$config or die $!;my $src=do{local $/;<$c>};close $c;
for my $v(qw(TZ_JST LIST_PAGE_ROWS_PC LIST_PAGE_ROWS_MOBILE)){
  my ($line)=$src=~/(^\s*\$$v\s*=\s*[\d*]+;)/m;die "missing $v" unless $line;eval "$line 1;" or die $@;
}
$LIST_PAGE_ROWS=$in->{mobile}?$LIST_PAGE_ROWS_MOBILE:$LIST_PAGE_ROWS_PC;
$NOW_TIME=$in->{now};$MYDIR=$in->{street};$DT={id=>1};%id2idx=map {$_=>0} @{$in->{activeShopIds}};%Tname=%{$in->{townNames}};
$Q{mode}=$in->{mode};$Q{key}='slime-l';$Q{pg}=$in->{page};$Q{rcode}=$Q{code}=$in->{code};
($TB,$TR,$TD,$TDB,$TRE,$TBE)=qw([[T]] [[R]] [[D]] [[H]] [[E]] [[B]]);
$IMAGE_URL='/assets';$IMAGE_EXT='.png';$COMMON_DIR=tempdir(CLEANUP=>1);$disp='';
my %path=(dra=>'dra-dr',pr=>'dra-pr',rc=>'dra-rc',st=>'dra-st',jk=>'dra-jk',race=>'dra-rd'.$in->{code},commentary=>'dra-rlog'.$in->{code});
for my $k(keys %path){my $s=$in->{files}{$k};next unless defined $s;open my $f,'>:encoding(UTF-8)',"$COMMON_DIR/$path{$k}.cgi" or die $!;print {$f}$s;close $f;}
if(defined $in->{drTime}){ @DRTIME=@{$in->{drTime}} if $in->{mode} eq 'status';open my $f,'>:encoding(UTF-8)',"$COMMON_DIR/dr-last.cgi" or die $!;print {$f} '@DRTIME=('.join(',',@{$in->{drTime}}).');'."\n1;\n";close $f; }
sub l {my($s,@a)=@_;$s=~s/%(\d+)/$a[$1-1]/ge;return $s;}
sub GetPath {"$_[0]/$_[1].cgi"}
sub GetTagImgKao {''}
sub GetTagA {$_[0] eq '≪'?'[[P]]':''}
sub DataRead {}
sub CheckUserPass {}
sub OutSkin {}
sub RequireFile {die 'unexpected require' unless $_[0] eq 'inc-dragon.cgi';do $dragon or die "$@ $!";}
for my $f($readA,$readB,$readC,$page,$time){do $f or die "$@ $!";}
if($in->{mode} eq 'status'){RequireFile('inc-dragon.cgi');do $status or die "$@ $!";}
elsif($in->{mode}=~/\A(?:sche|dra|pr|rc|st|jk|rd)\z/){do $list or die "$@ $!";}
else {die 'unexpected mode';}
# Read the real rendered cells (including actual original dragon image keys).
# The stable handler does not close every row, so both row-start and row-end
# delimiters are recognized. Headers use a different marker than data cells.
sub extract_rows {
  my($html,$clock)=@_;my @rows;
  for my $part(split /\[\[R\]\]/,$html){
    next if $part !~ /\[\[D\]\]/;
    my ($data)=split /\[\[E\]\]|\[\[B\]\]/,$part,2;
    my @cells=split /\[\[D\]\]/,$data,-1;
    if($clock){next unless $cells[0]=~/^\[\[H\]\](.*)$/s;$cells[0]=$1;}
    else {next unless $cells[0] eq '';shift @cells;}
    my $imageKey;
    for my $cell(@cells){if($cell=~s/<IMG class="i" SRC="\/assets\/(dragon\d+)\.png">//){$imageKey=$1;}$cell=~s/<\/?(?:small|SPAN|b)>//g;}
    push @rows,{cells=>\@cells,imageKey=>$imageKey};
  }
  return \@rows;
}
my $out={mode=>$in->{mode},committable=>JSON::PP::false};
if($in->{mode} eq 'sche'){
  my @tables=$disp=~/\[\[T\]\](.*?)\[\[B\]\]/gs;die 'schedule tables' unless @tables==3;
  $out->{clockRows}=extract_rows($tables[0],1);
  my @terms=$disp=~/<BIG>●([^<]*)開催日程<\/BIG>/g;
  $out->{raceGroups}=[map {{term=>$terms[$_],rows=>extract_rows($tables[$_+1],0)}} 0..1];
} elsif($in->{mode} eq 'status'){
  my ($term)=$disp=~/<BIG>●ドラゴンレース：(.*?)<\/BIG>/;
  my ($label,$next)=$disp=~/<SPAN>レース受付<\/SPAN>：(.*?)<br>(.*?)\[\[E\]\]/s;
  my ($name,$rank,$field,$distance,$weather,$capacity,$handicap,$prize,$rcode,$target,$width,$height)=$disp=~/<b>(.*?)<\/b> \((.*?)\) (.*?)(\d+)km<IMG class="i" SRC="\/assets\/(dragonw\d+)\.png"> 定員 (\d+) ハンデ(.*?)<br><IMG class="i" SRC="\/assets\/guildprize\.png">賞金 (.*?) <input[^>]*mode=rd&rcode=(\d+)','([^']+)','width=(\d+),height=(\d+),scrollbars'/s;
  die 'race view parse' unless defined $height && defined $label;
  my ($clock)=$next=~/ (.*?) です。/;
  @$out{qw(term phase statusLabel nextTimeLabel nextLabel race weatherImageKey detail)}=($term,$label eq 'ただいまレースが行われています。'?'running':$label eq '出走ドラゴンは以下のとおり決定いたしました。'?'scheduled':'registration',$label,$clock,$next,{name=>$name,rank=>$rank,field=>$field,distance=>0+$distance,capacity=>0+$capacity,handicapLabel=>$handicap,prizeLabel=>$prize},$weather,{route=>'slime-l',mode=>'rd',rcode=>0+$rcode,target=>$target,width=>0+$width,height=>0+$height});
  my @tables=$disp=~/\[\[T\]\](.*?)\[\[B\]\]/gs;
  $out->{rows}=extract_rows($tables[1],0);
  my ($commentary)=$disp=~/<SPAN>実況アナウンサー<\/SPAN><br>(.*?)\[\[E\]\]\[\[B\]\]/s;
  $out->{sourceCommentary}=$commentary;
}else{
  $out->{rows}=extract_rows($disp,0);
  if($in->{mode} eq 'rd'){my ($term)=$disp=~/<BIG>●ドラゴンレース：出走竜詳細<\/BIG>/;die 'detail title' unless defined $term;}
  else {my %count=(dra=>$DRcount,pr=>$PRcount,rc=>$RCcount,st=>$STcount,jk=>$JKcount);$out->{pageInfo}=[GetPage($in->{page},$LIST_PAGE_ROWS,$count{$in->{mode}}+1)];$out->{pageParam}='pg';$out->{pageControlCopies}=0+(()=$disp=~/\[\[P\]\]/g);}
}
print JSON::PP->new->utf8->encode($out);
