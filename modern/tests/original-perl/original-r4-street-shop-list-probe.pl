use utf8;
use JSON::PP;
my ($handler,$pagefile,$config,$json)=@ARGV;
my $x=decode_json($json);
@DT=@{$x->{shops}};
@ITEM=map {undef} 0..79;
$ITEM[$_->{no}]=$_ for @{$x->{catalog}};
@ITEMTYPE=('all','type1','type2','type3');
$DTusercount=scalar @DT;
$DT={id=>$x->{viewerId}};
$GUEST_USER=$x->{guest}?1:0;
$MOBILE=$x->{mobile}?1:0;
%Q=(key=>$x->{mode} eq 'product'?'shop-a':'shop-b',tp=>$x->{tp},itn=>$x->{itn},ds=>$x->{ds},senditem=>$x->{sendItem},pg=>$x->{page});
# Load actual page helper. Read original configured page sizes, not synthetic constants.
open(my $cf,'<:encoding(UTF-8)',$config) or die $!;
my $cfg=do {local $/;<$cf>};close($cf);
($SHOP_PAGE_ROWS)=$cfg=~/\$SHOP_PAGE_ROWS\s*=\s*(\d+);/;
my ($pc)=$cfg=~/\$LIST_PAGE_ROWS_PC\s*=\s*(\d+);/;
my ($mobile)=$cfg=~/\$LIST_PAGE_ROWS_MOBILE\s*=\s*(\d+);/;
die 'page config missing' unless $SHOP_PAGE_ROWS&&$pc&&$mobile;
$LIST_PAGE_ROWS=$MOBILE?$mobile:$pc;
my $loaded=do $pagefile;die($@||$!||'page helper failed') unless $loaded;
my $real=\&GetPage;
{no warnings 'redefine';*GetPage=sub {my @a=$real->(@_);$pageinfo=\@a;return @a;};}
sub DataRead {}
sub CheckUserPass {}
sub OutSkin {}
sub CheckUserID {my $id=$_[0];for(0..$#DT){if($DT[$_]->{id}==$id){$selected=$_;return($id,$_);}}die 'unresolved fixture ID';}
sub l {my ($s,@v)=@_;$s=~s/%(\d+)/defined($v[$1-1])?$v[$1-1]:''/ge;return $s;}
sub GetTagA {return '';}
sub GetTagImgItemType {return @_>1?'C'.$_[1]:'I'.$_[0];}
sub GetTagImgGuild {return 'G'.$_[0];}
sub GetMoneyString {return $_[0];}
$TR='<ROW>';$TRE='</ROW>';$TD='|';$TB='<TABLE>';$TBE='</TABLE>';
my $v=do $handler;die($@||$!||'handler failed') unless $v;
$pageinfo=[0,$selected,$selected,0,0,0] if defined $selected;
print encode_json({html=>$disp,pageInfo=>$pageinfo});
