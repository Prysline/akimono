use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use Storable qw(dclone);
binmode STDOUT, ':raw';

our ($B45_PICK,@DT,@ITEM);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub {
    die 'Unexpected original callback randomness' unless @_ && $_[0]==9;
    return $main::B45_PICK;
  };
}
sub source {
  my($filename)=@_;
  my $p=File::Spec->catfile($FindBin::Bin,$filename);
  open(my $fh,'<:encoding(UTF-8)',$p) or die $!;
  local $/;my $s=<$fh>;close $fh;return $s;
}
my $dsl=source('../../../custom/inc-item-data.cgi');
my $core=source('period.cgi');
my $use=source('use.cgi');
my %name2id;my %limits;
for my $block (split /^\@\@ITEM[ \t]*\r?\n/m,$dsl) {
  my($id)=$block=~/^\s*no\s+(\d+)\s*$/m;
  my($name)=$block=~/^\s*name\s+([^\r\n#]+?)(?:\s*#.*)?$/m;
  my($limit)=$block=~/^\s*limit\s+(\d+)(?:\/[\d.]+)?\s*(?:#.*)?$/m;
  next unless defined($id)&&defined($name);
  $name=~s/\s+$//;
  $name2id{$name}=$id;
  $limits{$id}=$limit if defined($limit);
}
for my $required (
  ['禮物卷',79,10],['看門機器人',64,1],
  ['整隻烤火雞',27,1],['挑剔的朗姆酒',28,1],['時髦的靴子',29,1]
){
  my($name,$id,$limit)=@$required;
  die "Source item $name changed" unless
    ($name2id{$name}//-1)==$id && ($limits{$id}//-1)==$limit;
}
my $from=index($dsl,'sub UpdateResetBefore');
my $to=index($dsl,'sub UpdateResetAfter',$from);
die 'original FUNCUPDATE not found' unless $from>=0&&$to>$from;
my $award=substr($dsl,$from,$to-$from);
die 'exact top prize selection absent' unless
  index($award,'TopGetItem($DT[0],$TOP123[0],"本次優勝")')>=0 &&
  index($award,'rand($#list+1)')>=0;
$award=~s/\@\@ITEMNO\s*"([^"]+)"/
  exists($name2id{$1})?$name2id{$1}:die("Unreviewed ITEMNO: $1")
/gex;
die 'other preprocessor directive in prize callback' if
  $award =~ /\@\@(ITEMNO|VALUE|FUNC)/;
my($add)=$use=~/(^sub AddItem\n\{[\s\S]*?^\}\n)(?=\nsub GetBackUrl)/m;
die 'frozen Core AddItem body not found' unless defined $add;
my($rankLine)=$core=~/(\$DT\[0\]->\{rankingcount\}\+\+;)/;
die 'frozen Core winner ranking counter missing' unless defined $rankLine;
@ITEM=(undef,map {{limit=>9999,name=>''}} 1..79);
for my $id (keys %limits){$ITEM[$id]->{limit}=$limits{$id};}
for my $name (keys %name2id){$ITEM[$name2id{$name}]->{name}=$name;}
sub WriteLog {return 1;}
my $compiled=eval 'no strict; no warnings; '.$award."\n".$add.
  "\nsub b45_apply_original { $rankLine UpdateResetBefore(); return 1; }\n1;";
die "Cannot compile unmodified original prize callback: $@" unless $compiled;

my @cases;
for my $choice (0..8,9){
  $B45_PICK=$choice==9?0:$choice;
  my @item=(0)x79;
  $item[62]=1;
  $item[78]=$choice==9?9:5;
  my $s={id=>1,status=>1,shopname=>'單店原版',
    item=>\@item,rankingcount=>0};
  @DT=($s);
  my $before=dclone($s);
  b45_apply_original();
  my @changed=grep {$before->{item}[$_ - 1]!=$s->{item}[$_ - 1]} 1..79;
  push @cases,{
    name=>$choice==9?'prize-overflow':"prize-$choice",
    choice=>$B45_PICK,input=>$before,output=>dclone($s),
    changedItems=>\@changed,
  };
}
print JSON::PP->new->canonical->utf8->encode({
  cases=>\@cases,source=>'frozen original Standard Street @@FUNCUPDATE callback plus Core AddItem',
  scope=>'single-top-store reward only; no complete inc-period, town events or file IO',
});
