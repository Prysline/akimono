use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
use FindBin;
my $input=decode_json(do {local $/; <STDIN>});
my $dir=tempdir(CLEANUP=>1);
for my $name ('log0','log1') {
  open(my $f,'>:encoding(UTF-8)',"$dir/$name") or die $!;
  print $f $input->{$name}; close($f);
}
@DT=@{$input->{shops}};
for my $i (0..$#DT) {$id2idx{$DT[$i]->{id}}=$i;}
$DT=$DT[$id2idx{$input->{actorId}}];
$GUILDIDX_name=0;
$GUILD{$input->{guild}->{code}}=[$input->{guild}->{name}];
$GUILD_DATA{$input->{guild}->{code}}={money=>$input->{guild}->{money}};
$LIST_PAGE_ROWS=$input->{mobile}?5:25;
$TZ_JST=32400;
$Q{lpg}=$input->{page}; $Q{key}='gd-i'; $USERPASSURL='';
sub DataRead {} sub CheckUserPass {} sub RequireFile {}
sub OutError {die $_[0];} sub GetTagImgGuild {return '';}
sub GetPath {return "$dir/$_[0]";} sub GetTagA {return '';}
sub l {my ($s,@a)=@_; $s =~ s/%1/$a[0]/g if @a; return $s;}
sub OutSkin {}
require "$FindBin::Bin/pinned-time.cgi";
require "$FindBin::Bin/pinned-street-shop-page.cgi";
my $pageFn=\&GetPage;
{ no warnings 'redefine'; *GetPage=sub {@page=$pageFn->(@_); return @page;}; }
require "$FindBin::Bin/pinned-gd-i.cgi";
my ($level)=$disp=~/現在の情報収集レベルは(\d+)です/;
my @rows;
while ($disp=~m!<small>(.*?)</small> <SPAN>(.*?)</SPAN>：(.*?)<BR>!sg) {
  push @rows,{time=>$1,shopName=>$2,message=>$3};
}
print encode_json({level=>0+$level,page=>[map {0+$_} @page],rows=>\@rows});
