use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);

binmode STDOUT,':encoding(UTF-8)';

# B-17: the unchanged ORIGINAL DataRead subroutine body from the frozen
# inc-func.cgi snapshot. Extract it because requiring the entire original
# file executes game initialization, CGI, item loads and live-file hooks.
# Each run uses only File::Temp, a bounded alarm and minimal external stubs.
# No real event require, password validation, CGI, persistent world or commit.
our ($DATA_DIR,$DATA_FILE,$FILE_EXT,$MAX_ITEM,$ITEM_DIR,$DTlasttime,
  $DTpeople,$DTnextid,$DTblockip,$DTTaxrate,$DTState,$STATE,$DTtown,
  $DTusercount);
our (@DT,@DTwholestore,@DTindexnamelist,@STATEnamelist,%DTevent,
  %id2idx,%name2idx,%name2pass);

my $root=tempdir(CLEANUP=>1);
$DATA_DIR=$root;$DATA_FILE='play';$FILE_EXT='.cgi';
$ITEM_DIR='no-event-require';$MAX_ITEM=79;
@STATEnamelist=('leader');
$STATE={};
my @read_error;
sub GetPath {
  return $DATA_DIR.'/'.$_[0].$FILE_EXT if @_ == 1;
  return join('/',@_).$FILE_EXT;
}
sub OutError { push @read_error,$_[0];die "original DataRead error: $_[0]"; }
sub GetDTPoint { return 77; }
{ package AutoVar;
  our @OBSERVED;
  sub TIESCALAR {
    my ($class,$args)=@_;
    push @OBSERVED,[$args->[2],$args->[1]];
    return bless {raw=>$args->[1]},$class;
  }
  sub FETCH { return $_[0]->{raw}; }
  sub STORE { $_[0]->{raw}=$_[1]; }
}
open(my $fh,'<:encoding(UTF-8)','inc-func.cgi') or die $!;
local $/;
my $orig=<$fh>;
close $fh;
my ($body)=$orig=~/(^sub DataRead\n\{.*?^\}\n)(?=\nsub GetDTPoint)/ms;
ok(defined $body,'B-17-A: exact frozen Core DataRead body located');
die 'missing original DataRead body' if !defined $body;
my ($field_text)=$orig=~/@DTindexnamelist=\s*qw\s*\(\s*([\s\S]*?)\s*\);/;
ok(defined $field_text,'B-17-B: exact frozen @DTindexnamelist source located');
die 'missing Core shop header order' if !defined $field_text;
@DTindexnamelist=split(/\s+/,$field_text);
is(scalar(@DTindexnamelist),32,'B-17-C: Core uses 32 ordered shop header fields');
is($DTindexnamelist[2],'name','B-17-D: header name is source field 3');
is($DTindexnamelist[4],'pass','B-17-E: header pass is source field 5');
is($DTindexnamelist[29],'foundation','B-17-F: header foundation is source field 30');

my $loaded=eval "no strict;no warnings;\n$body\n1;";
die "Unable to compile pinned Core DataRead body: $@" if !$loaded;
ok(defined(&DataRead),'B-17-G: unmodified original DataRead sub compiled');

sub header {
  my ($id,$name,$shop)=@_;
  my @f= ('') x 32;
  @f[0,1,2,3,4,5,6,7]=($id,0,$name,$shop,'syntheticPass',100000,0,0);
  return join(',',@f);
}
sub payload { return "1,0:50,0:3,0::::"; }
sub world {
  my (%opts)=@_;
  my $prefix="1700000000\n100000,2,0,10,7\n4,0,3\n\n";
  my $town=exists($opts{town})?$opts{town}:'';
  my $records=$opts{records}//[ [7,'alice','ShopA'] ];
  $prefix.=$town."\n" if defined $town;
  $prefix.="//\n";
  for my $row (@$records) {
    $prefix.=header(@$row)."\n".payload()."\n";
  }
  return $prefix;
}
sub invoke {
  my $text=shift;
  @read_error=();@AutoVar::OBSERVED=();
  @DT=();@DTwholestore=();%DTevent=();%id2idx=();%name2idx=();%name2pass=();
  $STATE={};$DTusercount=undef;
  open(my $out,'>:raw',GetPath($DATA_FILE)) or die $!;
  print {$out} $text;close $out;
  my ($result,$error);
  {
    local $SIG{__WARN__}=sub{};
    local $SIG{ALRM}=sub{die "original DataRead did not terminate in time\n"};
    alarm(2);
    $result=eval{DataRead();1};
    $error=$@;
    alarm(0);
  }
  return ($result,$error);
}

my ($ok,$err)=invoke(world());
ok($ok,'B-17-H: one two-line shop is accepted by original DataRead');
is($DTusercount,1,'B-17-I: original counts one shop');
is($DT[0]{id},'7','B-17-J: Core shop ID is first CSV field');
is($DT[0]{name},'alice','B-17-K: shop player name from third source field');
is($DT[0]{shopname},'ShopA','B-17-L: shop title from fourth field');
is($DT[0]{point},77,'B-17-M: original calls GetDTPoint for each shop');
is($DT[0]{status},1,'B-17-N: original marks read shop active');
is_deeply($DT[0]{showcase},[1,0],'B-17-O: first colon section is showcase');
is_deeply($DT[0]{price},[50,0],'B-17-P: second colon section is price');
is($DT[0]{item},'3,0','B-17-Q: third colon section is opaque AutoVar item text');
is(scalar(@AutoVar::OBSERVED),2,'B-17-R: empty town and item are tied using AutoVar');
is($AutoVar::OBSERVED[0][0],'HASH','B-17-S: original first tie is town hash');
is($AutoVar::OBSERVED[1][0],'ARRAY','B-17-T: shop inventory is tied ARRAY scalar');
is($DT[0]{user} && ref($DT[0]{user}),'HASH',
  'B-17-U: empty final user payload becomes plain empty hash');
is($id2idx{7},0,'B-17-V: Core id-to-index points to first shop');

my ($no_town,$no_town_err)=invoke(world(town=>undef));
ok($no_town,'B-17-W: direct // without town line is accepted by Core');
is(scalar(@AutoVar::OBSERVED),1,'B-17-X: no town AutoVar tie when // immediately follows events');

my ($two,$two_err)=invoke(world(records=>[
  [7,'alice','ShopA'],[8,'bob','ShopB'],
]));
ok($two,'B-17-Y: original DataRead accepts two shop records');
is($DTusercount,2,'B-17-Z: two header-plus-payload groups yield two shops');
is($DT[1]{id},8,'B-17-AA: second shop ID comes from next header line');
is($id2idx{8},1,'B-17-AB: second shop indexed in Core mapping');

my ($dupe,$dupe_err)=invoke(world(records=>[
  [7,'alice','ShopA'],[7,'bob','ShopB'],
]));
ok($dupe,'B-17-AC: original accepts duplicate shop IDs without validation');
is($id2idx{7},1,'B-17-AD: duplicate ID silently overwrites mapping to second shop');

my ($town,$town_err)=invoke(world(town=>'city,opaque'));
ok($town,'B-17-AE: original passes nonempty town to AutoVar stub');
is($AutoVar::OBSERVED[0][1],'city,opaque',
  'B-17-AF: town content is passed unchanged to external AutoVar');

# A header without its second line is NOT a valid reviewed source fixture,
# but original reader still enters the two-line per-shop loop.
my $partial="1700000000\n100000,2,0,10,7\n4,0,3\n\n//\n".header(7,'alice','ShopA')."\n";
my ($incomplete,$incomplete_err)=invoke($partial);
ok($incomplete,'B-17-AG: original may accept a shop header without payload');
is($DTusercount,1,'B-17-AH: original counts truncated shop as present');

done_testing();
