use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
use FindBin;
my $in=decode_json(do {local $/;<STDIN>});
$COMMON_DIR=tempdir(CLEANUP=>1); $MYDIR=$in->{street};
$GUEST_USER=$in->{guest}; @DT=@{$in->{shops}};
$DT=$GUEST_USER?{}:(grep {$_->{id}==$in->{actorId}} @DT)[0];
$GUILDIDX_name=0; $GUILDIDX_dealrate=1; $GUILDIDX_feerate=2;
for my $g (@{$in->{guilds}}) {
  my $c=$g->{code}; $GUILD{$c}=[$g->{name},$g->{dealrate},$g->{feerate}];
  $GUILD_DATA{$c}={money=>$g->{money},in=>$g->{income},out=>$g->{outgo},atk=>$g->{atk},def=>$g->{def}};
  if ($g->{detail}) {my %d=%{$g->{detail}}; $d{$MYDIR}=$d{representative}; $GUILD_DETAIL{$c}=\%d;}
}
if ($in->{boardMtime} && $DT->{guild}) {
  my $p="$COMMON_DIR/bbslog-$DT->{guild}.cgi"; open(my $f,'>',$p) or die $!; close($f);
  utime($in->{boardMtime},$in->{boardMtime},$p) or die $!;
}
$NOW_TIME=$in->{now}; $TZ_JST=32400; $DTlasttime=$in->{lastTime}; $DTevent{guildbattle}=$in->{battleEnd};
$Q{pg}=$in->{page}; $Q{key}='gd'; $USERPASSURL=''; $LIST_PAGE_ROWS=$in->{mobile}?5:25;
$TB='<table>'; $TBE='</table>'; $TR='<tr>'; $TRE='</tr>'; $TD='<td>'; $TDB='<td>'; $IMAGE_URL='img'; $IMAGE_EXT='.gif';
my @order=keys %GUILD; my @menu; my @writes; my $commands=0; my $battle;
sub l {my ($s,@a)=@_;$s=~s/%1/$a[0]/g if @a;return $s;}
sub DataRead {} sub CheckUserPass {} sub ReadGuild {} sub ReadGuildData {}
sub RequireFile {if ($_[0] eq 'inc-gd.cgi') {require "$FindBin::Bin/pinned-inc-gd.cgi";} elsif ($_[0] eq 'inc-guild-cmd.cgi') {$commands=1;} else {die 'unexpected include';}}
sub GetTagImgKao {return '';} sub GetTagImgGuild {return '';}
sub GetMenuTag {push @menu,{route=>$_[0],label=>$_[1],query=>$_[2]//''};return '';}
sub GetTownData {return $in->{dominion};} sub GetMoneyString {return $_[0]+0;}
sub GetTime2HMS {$battle=$_[0];return $_[0];} sub GetTagA {return '';} sub OutSkin {}
sub Lock {push @writes,'Lock';} sub MakeGuildFile {push @writes,'MakeGuildFile';} sub WriteGuildData {push @writes,'WriteGuildData';}
sub DataWrite {push @writes,'DataWrite';} sub RenewLog {push @writes,'RenewLog';} sub DataCommitOrAbort {push @writes,'DataCommitOrAbort';} sub UnLock {push @writes,'UnLock';}
require "$FindBin::Bin/pinned-time.cgi"; require "$FindBin::Bin/pinned-street-shop-page.cgi";
my $pg=\&GetPage; {no warnings 'redefine'; *GetPage=sub {@page=$pg->(@_);return @page;};}
require "$FindBin::Bin/pinned-gd.cgi";
my @rows;
while ($disp=~m!<tr><td>No\.(\d+)<td align=right><A HREF="action.cgi\?key=gd-o&&g=([^"]+)">([^<]*)</a>(.*?)</tr>!sg) {
  my ($rank,$code,$name,$body)=($1,$2,$3,$4);
  my ($money)=$body=~/<SPAN>資金<\/SPAN> (-?\d+)/;
  my ($a,$d)=$body=~m!guild-a\.gif">(.*?)guild-b\.gif">(.*?)<td>!s;
  my ($aw)=$a=~m!b\.gif" width="(-?\d+)"!; my ($dw)=$d=~m!b\.gif" width="(-?\d+)"!;
  my ($income)=$body=~/<SPAN>収入<\/SPAN> (-?\d+)/; my ($outgo)=$body=~/<SPAN>支出<\/SPAN> (-?\d+)/;
  my ($deal)=$body=~/<SPAN>割引増率<\/SPAN> ([\d.]+)%/; my ($fee)=$body=~/<SPAN>会費率<\/SPAN> ([\d.]+)%/;
  my ($member,$n)=$body=~/<td><SPAN>([^<]*)<\/SPAN> (\d+)名/; my ($comment)=$body=~/<br>([^<]*)$/;
  push @rows,{rank=>0+$rank,code=>$code,name=>$name,dominion=>($body=~/guildprize\.gif/?JSON::PP::true:JSON::PP::false),money=>0+$money,deficit=>($body=~/\(赤字\)/?JSON::PP::true:JSON::PP::false),attackWidth=>0+$aw,defenseWidth=>0+$dw,income=>0+$income,outgo=>0+$outgo,dealPercent=>0+$deal,feePercent=>0+$fee,member=>$member,memberCount=>0+$n,homepage=>($body=~/key=jump&guild=/?JSON::PP::true:JSON::PP::false),comment=>$comment};
}
my $mode=$disp=~/ただいま結成中です/?'forming':$commands?'headquarters':'list';
print encode_json({order=>\@order,menu=>\@menu,mode=>$mode,rows=>\@rows,page=>[@page],commands=>$commands,writes=>\@writes,battle=>$battle});
