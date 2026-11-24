use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use Storable qw(dclone);
binmode STDOUT, ':raw';
our (@DT,%id2idx,%name2idx);
sub read_source{
  my $name=shift;
  open(my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$name))
    or die $!;
  local $/;my $s=<$fh>;close $fh;return $s;
}
my $read=read_source('inc-func.cgi');
my $detail=read_source('core-detail.cgi');
my($get)=$read=~/(^sub GetDTPoint\n\{[\s\S]*?^\}\n)(?=\nsub CheckUserPass)/m;
my($sort)=$detail=~/(^sub SortDT\n\{[\s\S]*?^\}\n)(?=\nsub GetRankMessage)/m;
die 'Pinned GetDTPoint/SortDT original extraction missing' unless
  defined($get)&&defined($sort);
my $code='no strict; no warnings; '.$get."\n".$sort."\n1;";
my $compiled=eval $code;
die "Cannot compile real original Core sort: $@" unless $compiled;
sub shop {
  my(%arg)=@_;
  return {id=>1,name=>'單一店主',shopname=>'一家商店',
    status=>1,rank=>$arg{rank}//5010,
    rankingcount=>$arg{count}//0,rankingyesterday=>$arg{yesterday}//'',
    profitstock=>$arg{profit}//0,saletoday=>$arg{sales}//0,
    taxtoday=>$arg{tax}//0,paytoday=>$arg{expenses}//0,
  };
}
my @cases=(
  ['opened',shop()],
  ['two-sales',shop(rank=>5050,sales=>10000,expenses=>10000)],
  ['positive',shop(rank=>9000,count=>4,yesterday=>1,
     profit=>1500000,sales=>1000000,expenses=>100000)],
  ['loss',shop(rank=>4000,count=>1,yesterday=>99,
     profit=>-1000000,sales=>0,expenses=>250000)],
);
my @rows;
for my $fixture (@cases) {
  my($name,$raw)=@$fixture;
  my $input=dclone($raw);
  @DT=($raw);
  SortDT();
  die "Unexpected source one-shop state" unless @DT==1&&$DT[0]->{id}==1;
  push @rows,{
    name=>$name,input=>$input,output=>dclone($DT[0]),
    idIndex=>0+($id2idx{1}//-1),nameIndex=>0+($name2idx{'單一店主'}//-1),
  };
}
print JSON::PP->new->utf8->canonical->encode({
  cases=>\@rows,
  scope=>'original Core GetDTPoint + SortDT for one active store; no full period',
});
