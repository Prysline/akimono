use strict;
use warnings;
use utf8;
use Test::More;
use File::Temp qw(tempdir);

binmode STDOUT, ':encoding(UTF-8)';

# B-18: direct execution of the EXACT frozen Core DataRead subroutine plus
# the unchanged original AutoVar package, extracted from one pinned
# inc-func.cgi SHA (verified by CI). NEVER require its top-level CGI loader.
# All world input is synthetic in a File::Temp folder. No user authentication,
# event require, shop callbacks, live world data or actual persistence.
our ($DATA_DIR,$DATA_FILE,$FILE_EXT,$MAX_ITEM,$ITEM_DIR,$DTlasttime,
  $DTpeople,$DTnextid,$DTblockip,$DTTaxrate,$DTState,$STATE,$DTtown,
  $DTusercount);
our (@DT,@DTwholestore,@DTindexnamelist,@STATEnamelist,%DTevent,
  %id2idx,%name2idx,%name2pass);

my $root=tempdir(CLEANUP=>1);
$DATA_DIR=$root;$DATA_FILE='play';$FILE_EXT='.cgi';
$ITEM_DIR='no-event-require';$MAX_ITEM=79;
@STATEnamelist=('leader');$STATE={};
sub GetPath {
  return $DATA_DIR.'/'.$_[0].$FILE_EXT if @_==1;
  return join('/',@_).$FILE_EXT;
}
sub OutError { die "original DataRead error: $_[0]"; }
sub GetDTPoint { return 77; }

open(my $fh,'<:encoding(UTF-8)','inc-func.cgi') or die $!;
local $/;
my $source=<$fh>;
close($fh);
my ($readbody)=$source=~/(^sub DataRead\n\{.*?^\}\n)(?=\nsub GetDTPoint)/ms;
my ($autovar)=$source=~/(^package AutoVar;\n[\s\S]*?^1;\n?\z)/m;
my ($field_text)=$source=~/@DTindexnamelist=\s*qw\s*\(\s*([\s\S]*?)\s*\);/;
ok(defined($readbody),'B-18-A: exact frozen DataRead subroutine found');
ok(defined($autovar),'B-18-B: exact frozen AutoVar package found');
ok(defined($field_text),'B-18-C: frozen shop header list found');
die 'fixed Core extraction changed' unless defined($readbody)
  && defined($autovar) && defined($field_text);
@DTindexnamelist=split(/\s+/,$field_text);
my $loaded=eval "no strict;no warnings;\n$readbody\n1;";
die "Cannot execute frozen DataRead source: $@" unless $loaded;
my $loadedAuto=eval "no strict;no warnings;\n$autovar\n1;";
die "Cannot execute frozen AutoVar source: $@" unless $loadedAuto;
ok(defined(&DataRead),'B-18-D: Core DataRead subroutine compiled');
ok(defined(&AutoVar::Get),'B-18-E: original AutoVar::Get compiled');
ok(defined(&AutoVar::TIESCALAR),'B-18-F: original AutoVar tie compiled');
ok(defined(&AutoVar::FETCH),'B-18-G: original AutoVar lazy FETCH compiled');

sub header {
  my @fields=('')x32;
  @fields[0,1,2,3,4,5,6,7]=
    (7,0,'alice','ShopA','syntheticPass',100000,0,0);
  return join(',',@fields);
}
sub world {
  my (%o)=@_;
  my $y=exists $o{yesterday} ? $o{yesterday} : '1,5,3,7';
  my $t=exists $o{today} ? $o{today} : '1,2';
  my $exp=exists $o{exp} ? $o{exp} : '4,100';
  my $users=exists $o{user} ? $o{user} : 'alice,1,bob,2';
  return "1700000000\n100000,2,0,10,7\n4,0,3\n\n\n//\n"
    .header()."\n1,0:50,0:3,0:$y:$t:$exp:$users\n";
}
sub invoke {
  my ($text)=@_;
  untie($DTtown) if tied($DTtown);
  @DT=();@DTwholestore=();%DTevent=();
  %id2idx=();%name2idx=();%name2pass=();
  $STATE={};
  open(my $out,'>:raw',GetPath($DATA_FILE)) or die $!;
  print {$out} $text;
  close $out;
  my ($result,$error);
  {
    local $SIG{__WARN__}=sub{};
    local $SIG{ALRM}=sub{die "bounded original DataRead timeout\n"};
    alarm(2);
    $result=eval {DataRead();1};
    $error=$@;
    alarm(0);
  }
  return ($result,$error);
}

my ($success,$error)=invoke(world());
ok($success,'B-18-H: original DataRead loads synthetic three history maps + user payload');
is($DTusercount,1,'B-18-I: source reads exactly one shop');
ok(ref($DT[0]{itemyesterday}) eq 'HASH',
  'B-18-J: itemyesterday becomes hash reference immediately');
is($DT[0]{itemyesterday}{1},'5',
  'B-18-K: previous-day key 1 value 5');
is($DT[0]{itemyesterday}{3},'7',
  'B-18-L: previous-day key 3 value 7');
is($DT[0]{itemtoday}{1},'2',
  'B-18-M: current-day hash key 1 value 2');
is($DT[0]{exp}{4},'100',
  'B-18-N: exp hash key 4 value 100');
ok(tied($DT[0]{item}),
  'B-18-O: inventory remains an AutoVar-tied scalar before FETCH');
ok(tied($DT[0]{user}),
  'B-18-P: nonempty user payload remains AutoVar-tied scalar before FETCH');
is(AutoVar::Get(\$DT[0]{user}),'alice,1,bob,2',
  'B-18-Q: original AutoVar::Get returns raw payload when still tied');
ok(tied($DT[0]{user}),
  'B-18-R: AutoVar::Get does not force user hash parsing');
my $users=$DT[0]{user}; # original AutoVar::FETCH
ok(ref($users) eq 'HASH',
  'B-18-S: first read of user tied scalar produces a hash');
is($users->{alice},'1','B-18-T: user hash first comma pair');
is($users->{bob},'2','B-18-U: user hash second comma pair');
my $inventory=$DT[0]{item};
is_deeply($inventory,['3','0'],
  'B-18-V: original lazy inventory FETCH becomes array');
my $todaytext=AutoVar::Get(\$DT[0]{itemtoday});
my %todayPairs=split(/,/,$todaytext);
is_deeply(\%todayPairs,{1=>2},
  'B-18-W: DataWrite-style AutoVar::Get of hash preserves values');
ok(!tied($DT[0]{user}),
  'B-18-X: original lazy FETCH unties user scalar after parsing');

my ($blank,$blankErr)=invoke(world(
  yesterday=>'',today=>'',exp=>'',user=>'',
));
ok($blank,'B-18-Y: original DataRead accepts blank history and user strings');
is_deeply($DT[0]{itemyesterday},{},
  'B-18-Z: blank yesterday section yields empty hash');
is_deeply($DT[0]{itemtoday},{},
  'B-18-AA: blank today section yields empty hash');
is_deeply($DT[0]{exp},{},
  'B-18-AB: blank exp section yields empty hash');
is_deeply($DT[0]{user},{},
  'B-18-AC: blank final user section becomes untied empty hash');
ok(!tied($DT[0]{user}),
  'B-18-AD: blank user section does not install AutoVar tie');

my ($odd,$oddErr)=invoke(world(
  yesterday=>'1,5,3',user=>'alice,1,bob',
));
ok($odd,'B-18-AE: original DataRead can accept odd history/user pair lists');
is($DT[0]{itemyesterday}{1},'5',
  'B-18-AF: valid first pair survives odd yesterday list');
ok(exists($DT[0]{itemyesterday}{3}),
  'B-18-AG: unpaired yesterday key is still inserted');
ok(!defined($DT[0]{itemyesterday}{3}),
  'B-18-AH: unpaired yesterday key gets undefined value');
ok(tied($DT[0]{user}),
  'B-18-AI: malformed user remains unchecked until first FETCH');
my $oddUsers=$DT[0]{user};
ok(exists($oddUsers->{bob}),
  'B-18-AJ: after FETCH, unpaired user key is inserted');
ok(!defined($oddUsers->{bob}),
  'B-18-AK: after FETCH, unpaired user value is undefined');

my ($duplicate,$duplicateErr)=invoke(world(
  today=>'1,2,1,9',exp=>'3,4,3,8',
));
ok($duplicate,'B-18-AL: source accepts repeated history map keys');
is($DT[0]{itemtoday}{1},'9',
  'B-18-AM: duplicate today key takes later value');
is($DT[0]{exp}{3},'8',
  'B-18-AN: duplicate exp key takes later value');

my ($tabs,$tabsError)=invoke(world(user=>"alice\t1,bob\t2"));
ok($tabs,'B-18-AO: Core DataRead accepts tab-delimited user pairs');
my $tabUsers=$DT[0]{user};
is($tabUsers->{alice},'1',
  'B-18-AP: AutoVar user split accepts tabs as delimiters');
is($tabUsers->{bob},'2',
  'B-18-AQ: mixed tab/comma user string becomes two pairs');

done_testing();
