use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
use Storable qw(dclone);
binmode STDOUT, ':raw';
our ($STATE,$DTpeople,$DTusercount,$NOW_TIME,$BAL_JOB,$BAL_NAME);
our (%id2idx,%DTevent,@DT,@B46_DRAWS,$B46_USED);
BEGIN{
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub{
    die 'Unexpected original territory RNG max' unless @_ && $_[0]==200;
    die 'Unexpected original territory random draw' unless @main::B46_DRAWS;
    $main::B46_USED++;
    return shift(@main::B46_DRAWS)*200;
  };
}
sub PushLog{return 1;}
sub l{return $_[0];}
sub load{
  my($name)=@_;
  my $fn=File::Spec->catfile($FindBin::Bin,$name);
  open(my $fh,'<:encoding(UTF-8)',$fn) or die $!;
  local $/;my $data=<$fh>;close $fh;return $data;
}
my $src=load('period.cgi');
my $start=index($src,'#領土データ調整');
my $end=index($src,'#決算時のカスタム処理（リセット後）',$start);
die 'Pinned Core territory area moved' unless $start>=0&&$end>$start;
my $body=substr($src,$start,$end-$start);
my($rebel)=$src=~/(^sub RebelRobin\n\{[\s\S]*?^\}\n)(?=\nsub DragonBalance)/m;
die 'Missing frozen RebelRobin unled early return' unless
  defined($rebel)&&index($rebel,'return if !defined($id2idx{$STATE->{leader}});')>=0;
my $ok=eval 'no strict; no warnings; '.$rebel.
  "\nsub b46_original_town { my \$taxin=0;\n$body\nreturn 1; }\n1;";
die "Compiling frozen original territory failed: $@" unless $ok;
my @fields=qw(leader money in out develop devem safety safem army robina robinb);
my @init=(0,0,0,0,5001,0,5001,0,0,2000,0);
sub town{ return { map {$fields[$_]=>$init[$_]} 0..$#fields}; }
sub run {
  my($name,$state,$beforePeople,$draws)=@_;
  $STATE=dclone($state);
  $DTpeople=$beforePeople;
  $DTusercount=1;
  @DT=({id=>1});
  %id2idx=(1=>0);
  %DTevent=();
  $NOW_TIME=1000000;
  @B46_DRAWS=map {$_/1000000} @$draws;
  $B46_USED=0;
  my $inputTown=dclone($STATE);
  b46_original_town();
  die "Incorrect Core RNG sequence for $name" unless $B46_USED==2&&!@B46_DRAWS;
  return {
    name=>$name,
    input=>{town=>$inputTown,dtPeople=>$beforePeople,
      drawMillionths=>$draws},
    output=>{town=>dclone($STATE),dtPeople=>$DTpeople},
  };
}
my $first=run('initial-unled',town(),500000,[250000,750000]);
my $second=run('following-unled',$first->{output}{town},
  $first->{output}{dtPeople},[500000,500000]);
my $adverse=town();
$adverse->{money}=-5;
$adverse->{army}=8000;
$adverse->{robina}=0;
my $third=run('insolvent-treasury',$adverse,500000,[0,0]);
print JSON::PP->new->canonical->utf8->encode({
  cases=>[$first,$second,$third],
  scope=>'exact frozen original unled-town territory block and early-return RebelRobin, no period prize/ledger or disk',
});
