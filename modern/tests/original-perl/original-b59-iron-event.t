use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use Test::More;
use JSON::PP qw(decode_json);
my $file=File::Spec->catfile($FindBin::Bin,'original-b59-iron-event-probe.pl');
my $raw=qx{perl "$file"};
is($?,0,'B-59 executes original Perl iron EVENT combined expiry/start and wholesale fragments');
my $rows=eval{decode_json($raw)};
ok(!$@&&ref($rows)eq'HASH','source-executed B-59 oracle decoded');
if(ref($rows)eq'HASH'){
  my $meta=$rows->{originalCompiler};
  is($meta->{assignment},'$ITEM[5]->{plus}=720;',
    'fixed compiler EVENT param produces original ITEM5 plus overwrite');
  is($meta->{itemId},5,'actual fixed compiler resolves iron ingot to ITEM5');
  is($meta->{basePlus},-1200,'real ITEM5 baseline negative 20 minutes');
  is($meta->{ironPlus},720,'active source iron EVENT sets plus to 720 seconds');
  is($meta->{startProba},100,'source 10% compiles to 100');
  is($meta->{baseTimeSeconds},43200,'original event baseline 12 hours');
  is($meta->{plusTimeSeconds},43200,'original event random up to 12 hours');
  is(scalar(@{$rows->{cases}}),5,
    'Perl source lifecycle cases: activation, suppression, equality, expiry, retrigger');
  my %cases=map {$_->{name}=>$_->{output}} @{$rows->{cases}};
  is($cases{'start-12h-and-random-plus'}{activeState}{'plusup-tetu'},
    1054060,'source formula start+rand(span)+12h+rand(12h)');
  is($cases{'start-12h-and-random-plus'}{drawsUsed},3,
    'source activation consumes one gate and two duration draws');
  is_deeply($cases{'start-12h-and-random-plus'}{logs},
    [[2,0,'發現新的鐵礦脈']], 'source startmsg log');
  is($cases{'active-blocks-gate'}{drawsUsed},0,
    'active group suppresses new source start RNG');
  is($cases{'active-blocks-gate'}{activeState}{'plusup-tetu'},
    1054060,'same source event expiration retained if active');
  is($cases{'strict-end-equality-occupied'}{drawsUsed},0,
    'equal-to-end stays active, no source gate');
  is($cases{'strict-end-equality-occupied'}{activeState}{'plusup-tetu'},
    1000120,'strict Perl event expiry comparator does not expire on equality');
  is(scalar(keys %{$cases{'expired-then-gate-miss'}{activeState}}),0,
    'expired source event no longer in DTevent if restart gate misses');
  is($cases{'expired-then-gate-miss'}{drawsUsed},1,
    'source expiry followed by one event gate');
  is_deeply($cases{'expired-then-gate-miss'}{logs},
    [[2,0,'新的鐵礦脈已經關閉了']], 'source expiry endmsg log');
  is($cases{'expired-and-retrigger'}{activeState}{'plusup-tetu'},
    1043200,'source endmsg then newly started event new duration formula');
  is($cases{'expired-and-retrigger'}{drawsUsed},3,
    'expired immediate retrigger consumes gate and both duration draws');
  is_deeply($cases{'expired-and-retrigger'}{logs},[
    [2,0,'新的鐵礦脈已經關閉了'],
    [2,0,'發現新的鐵礦脈'],
  ],'source endmsg precedes new startmsg in same turn');
  my $b=$rows->{wholesale}{baseline};
  my $a=$rows->{wholesale}{withIron};
  is($b->{plusItem5},-1200,'original no-event iron PLUS remains negative');
  is($a->{plusItem5},720,'source event ITEM field assigned before original PLUS');
  cmp_ok($a->{wholesale5},'>',$b->{wholesale5},
    'source iron event increases real wholesale output in original Perl loop');
  is($a->{drawsUsed},$b->{drawsUsed},
    'both directions still consume same number of actual original rand calls');
  is(scalar(@{$a->{wholesale79}}),79,
    'full source CheckWholeStore preserves complete ITEM79 numeric slots');
}
done_testing();
