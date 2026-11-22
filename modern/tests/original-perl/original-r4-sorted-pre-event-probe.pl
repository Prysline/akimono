use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDIN,':raw';
binmode STDOUT,':raw';
our (@DT,%id2idx,%name2idx);
sub source {
  my($file)=@_;
  open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$file)
    or die "Missing frozen $file: $!";
  local $/;my $value=<$fh>;close $fh;return $value;
}
my $read=source('inc-func.cgi'),$detail=source('core-detail.cgi');
my $turn=source('inc-turn.cgi');
my($get)=$read=~/(^sub GetDTPoint\n\{[\s\S]*?^\}\n)(?=\nsub CheckUserPass)/m;
my($sort)=$detail=~/(^sub SortDT\n\{[\s\S]*?^\}\n)(?=\nsub GetRankMessage)/m;
die 'original Core rank extraction missing' unless defined($get)&&defined($sort);
my $a=index($turn,'foreach(@DT){delete $_->{_sale_count_}}');
my $b=index($turn,'SortDT();',$a);
my $c=index($turn,"RequireFile('inc-period.cgi')",$b);
my $d=index($turn,'foreach my $cnt (1..$MAX_ITEM)',$c);
die 'original turn phase order drift'
  unless $a>=0&&$a<$b&&$b<$c&&$c<$d;
my $compiled=eval 'no strict; no warnings; '.$get."\n".$sort."\n1;";
die "Cannot execute real original Core sort: $@" unless $compiled;
my $encoded=do{local $/;<STDIN>};
die 'missing JSON shop' unless defined($encoded)&&length($encoded);
my $shop=JSON::PP->new->utf8->decode($encoded);
die 'one real shop required' unless ref($shop)eq'HASH';
@DT=($shop);
SortDT();
die 'original sort removed shop' unless @DT==1;
print JSON::PP->new->utf8->canonical->encode({
  source=>'frozen real Core GetDTPoint and SortDT executed',
  shop=>$DT[0],
  idIndex=>$id2idx{$DT[0]{id}},
  nameIndex=>$name2idx{$DT[0]{name}},
});
