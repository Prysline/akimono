use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
my ($town,$custom,$json)=@ARGV;
my $input=decode_json($json);
$NOW_TIME=$input->{nowSeconds};
$STATE={develop=>$input->{develop},safety=>$input->{safety},leader=>$input->{leaderId}};
$DTevent{rebel}=$input->{rebel}?1:0;
$GUEST_USER=$input->{guest}?1:0;
$BAL_NAME=$input->{balanceName};
@DT=@{$input->{shops}};
$id2idx{$DT[$_]->{id}}=$_ for 0..$#DT;
$IMAGE_URL='/assets';
$COMMON_DIR=tempdir(CLEANUP=>1);
open(my $fh,'>',"$COMMON_DIR/treelog.cgi") or die $!;
close($fh) or die $!;
utime($input->{boardMtime},$input->{boardMtime},"$COMMON_DIR/treelog.cgi")==1 or die $!;
# Only rendering/framework adapters; actual town.cgi and inc-town.cgi execute.
sub DataRead {}
sub CheckUserPass {}
sub OutSkin {}
sub RequireFile { my $v=do $custom; die($@||$!||'custom source failed') unless $v; }
sub l { my ($s,@v)=@_; $s =~ s/%(\d+)/defined($v[$1-1])?$v[$1-1]:''/ge; return $s; }
sub GetMenuTag { my($route,$body)=@_; return qq|<a data-route="$route">$body</a>|; }
sub GetTagA { my($body,$route)=@_; return GetMenuTag($route,$body); }
sub GetTime2FormatTime { $stamp=$_[0]; return 'STAMP'; }
my $v=do $town; die($@||$!||'town source failed') unless $v;
my @slots;
for my $n (0..$#image){
    my @assets=grep {$_ ne 'dummy.png'} ($image[$n]=~m{/map/([^"]+\.png)}g);
    my ($route)=$image[$n]=~/data-route="([^"]+)"/;
    push @slots,{index=>$n,label=>$Pname[$n],assets=>\@assets,route=>$route};
}
my @bubbles;
for my $n (0..$#chara){
    my $s=$chara[$n]//'';
    while($s=~m{<acronym title="([^"]*)"><IMG class="c" SRC="/assets/map/c-a([^"]+)\.png"></acronym>}g){
        push @bubbles,{slot=>$n,character=>$2,message=>$1};
    }
}
my @road=$tdr=~m{/map/([^\)]+\.png)}g;
my ($palace)=$img_ex[0]=~m{/map/([^"]+\.png)};
my ($palaceRoute)=$img_ex[0]=~/data-route="([^"]+)"/;
my @street=$img_ex[1]=~m{/map/([^"]+\.png)}g;
my ($streetRoute)=$img_ex[1]=~/data-route="([^"]+)"/;
my ($active)=$disp=~m{<small>現在活動中の店</small>.*?<small>(.*?)</small>}s;
die 'missing active list' unless defined $active;
print encode_json({slots=>\@slots,bubbles=>\@bubbles,roadAssets=>\@road,
  palace=>{asset=>$palace,route=>$palaceRoute},
  shoppingStreet=>{assets=>\@street,route=>$streetRoute},
  activeText=>$active,boardMtime=>$stamp});
