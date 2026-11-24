use strict;
use warnings;
use utf8;
use Test::More;

binmode STDOUT, ':encoding(UTF-8)';

# B-21 only original source extracts from SHA-locked plug/use.cgi and
# original CheckWholeStore from unmodified plug/whole.cgi are executed.
# Synthetic arrays in memory; no real Perl CGI, files, sessions, events,
# authentication, item plugins, payment, or persistent market operations.
our ($DT,$MAX_ITEM,@ITEM,@DT,@DTwholestore);
$MAX_ITEM=1;
sub l { return join(' ',@_); }
sub source {
  my $name=shift;
  open(my $fh,'<:encoding(UTF-8)',$name) or die $!;
  local $/;
  my $s=<$fh>;close($fh);return $s;
}
my $source=source('use.cgi');
my ($make)=$source=~/(^sub MakeAmount\n\{[\s\S]*?^\}\n)(?=\nsub AddItem)/m;
ok(defined $make,'B-21-P1: exact original MakeAmount body extracted');
my $start=index($source,"\t#アイテム取得\n");
my $end=index($source,"\n\t#市場在庫チェック＆補正\n",$start);
ok($start>=0 && $end>$start,
  'B-21-P2: exact original UseItem creation block extracted');
my $create=$start>=0&&$end>$start?substr($source,$start,$end-$start):'';
like($create,qr/\$DTwholestore\[\$itemno-1\]\+=\$itemcount/,
  'B-21-P3: original puts discarded quantities into wholesale before check');
my $whole=source('whole.cgi');
like($whole,qr/sub CheckWholeStore\n\{/,
  'B-21-P4: original wholesale cap routine pinned');
like($whole,qr/\$DTwholestore\[\$cnt-1\]=0 if \$DTwholestore\[\$cnt-1\]<0/,
  'B-21-P5: wholesale check clamps negatives only on coded items');
die 'original source extraction changed' unless defined($make)
  && $start>=0 && $end>$start;
my $compiled=eval "no strict; no warnings;\n".
  $make."\n".
  "sub run_original_create {\nmy (\$USE,\$count)=\@_;\n".
  $create."\nCheckWholeStore();return 1;\n}\n1;\n";
die "original block failed to compile: $@" unless $compiled;
require './whole.cgi';
ok(defined(&MakeAmount),'B-21-P6: unmodified MakeAmount compiled');
ok(defined(&CheckWholeStore),'B-21-P7: unmodified whole.cgi loaded');

my $count=20;my $permille=500;
srand(44);my $r1=rand();my $r2=rand();my $r3=rand();
my $p=$permille/1000;
my $average=$count*$p;
my $sigma=$average*(1-$p);
my $t=(-2*$sigma*$r1)*sin(2*3.1415926535*$r2);
my $expected=int(sqrt($t<0?-$t:$t)+$average+0.5);
srand(44);
is(MakeAmount($count,$permille),$expected,
  'B-21-P8: original >=20 branch equals literal sqrt(abs(t)) formula');
is(rand(),$r3,
  'B-21-P9: original >=20 branch consumes exactly two rand draws');
srand(44);
my @smallDraws=map{rand(1000)}(1..19);
my $expectedSmall=scalar grep {$_ < 500} @smallDraws;
my $nextAfterSmall=rand();
srand(44);
is(MakeAmount(19,500),$expectedSmall,
  'B-21-P10: original count19 uses one Bernoulli draw per unit');
is(rand(),$nextAfterSmall,
  'B-21-P11: original 19-unit path consumed 19 random draws');
is(MakeAmount(20,-1),0,'B-21-P12: original <=0 probability returns zero');
is(MakeAmount(20,1001),20,'B-21-P13: original >=1000 returns full count');

sub setup {
  my (%o)=@_;
  $DT={item=>[$o{shop}//8]};
  @DT=($DT);
  if(defined $o{other}){
    push @DT,{item=>[$o{other}]};
  }
  @ITEM=(undef,{
    code=>exists($o{code})?$o{code}:'product',
    limit=>$o{limit}//10,
    wslimit=>$o{wslimit}//15,
  });
  @DTwholestore=($o{market}//0);
  my $USE={result=>{
    create=>[{
      no=>1,count=>exists($o{produced})?$o{produced}:5,
      proba=>1000,message=>'synthetic',
    }],
    trashmsg=>[],additem=>[],addmsg=>[],
  }};
  run_original_create($USE,1);
  return $USE;
}
my $u=setup();
is($DT->{item}[0],10,'B-21-P14: shop8+produced5 retained up to cap10');
is($DTwholestore[0],3,'B-21-P15: original discarded3 go to market');
is_deeply($u->{result}->{additem},[[1,2]],
  'B-21-P16: source additem records 2 retained items');
is(scalar(@{$u->{result}->{trashmsg}}),1,
  'B-21-P17: overflow message created in source block');

$u=setup(market=>4);
is($DTwholestore[0],5,
  'B-21-P18: after discard market7 is recapped to5 by CheckWholeStore');

$u=setup(shop=>12,produced=>2);
is($DT->{item}[0],10,
  'B-21-P19: original over-cap pre-existing shop is reduced to10');
is($DTwholestore[0],4,
  'B-21-P20: source incorrectly calls 4 discarded when only 2 produced');
is_deeply($u->{result}->{additem},[[1,-2]],
  'B-21-P21: original additem records negative retained quantity');

$u=setup(code=>'',market=>-5);
is($DTwholestore[0],-2,
  'B-21-P22: missing item code skips market correction, leaves negative stock');

$u=setup(wslimit=>-11,market=>10);
is($DTwholestore[0],1,
  'B-21-P23: original negative wslimit means fixed absolute total capacity');

$u=setup(wslimit=>0.5,other=>10);
is($DTwholestore[0],0,
  'B-21-P24: fractional cap with 2 shops follows original int(*2+.99)');

$u=setup(shop=>10,produced=>0,market=>10);
is($DTwholestore[0],5,
  'B-21-P25: original CheckWholeStore runs even without production');

$u=setup(shop=>-2,produced=>5);
is($DT->{item}[0],3,
  'B-21-P26: original negative pre-existing shop stock remains arithmetic input');
is($DTwholestore[0],0,
  'B-21-P27: no overflow, wholesale remains zero');

done_testing();
