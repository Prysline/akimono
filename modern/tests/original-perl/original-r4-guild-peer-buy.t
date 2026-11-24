use strict;
use warnings;
use FindBin;
use JSON::PP;
use Test::More;
open my $p,'-|',$^X,"$FindBin::Bin/original-r4-guild-peer-buy-probe.pl" or die $!;
binmode $p,':raw';
my $raw=do {local $/; <$p>};
close $p or die 'guild peer probe failed';
my $o=JSON::PP->new->utf8->decode($raw);
is(scalar @{$o->{cases}},11,'eleven frozen buy numeric cases');
my %c=map {$_->{spec}{name}=>$_} @{$o->{cases}};
for my $case (@{$o->{cases}}){
    my ($s,$b,$a,$r)=@$case{qw(spec before after receipt)};
    if($s->{reject}){
        ok(!$r,"$s->{name} rejected");
        is_deeply($a,$b,"$s->{name} leaves both shops and guilds unchanged");
        next;
    }
    ok($r,"$s->{name} accepted");
    is($a->{buyer}{item}[78]+$a->{seller}{item}[78],
       $b->{buyer}{item}[78]+$b->{seller}{item}[78],"$s->{name} stock conservation");
    my $sum=sub {my($x)=@_;$x->{buyer}{money}+$x->{seller}{money}+
        $x->{ledgers}{alpha}{money}+$x->{ledgers}{beta}{money}};
    is($sum->($a)+$r->{tax},$sum->($b),"$s->{name} cash plus tax conservation");
}
is($c{'same-bulk-negative'}{after}{ledgers}{alpha}{money},-2000,'actual buy segment overdraws treasury');
is($c{'same-bulk-negative'}{after}{seller}{rank},1000,'same guild skips sold-out rank penalty');
is($c{'same-low-treasury'}{receipt}{type},-1,'insufficient subsidy type');
is($c{'same-low-treasury'}{after}{seller}{rank},1000,'insufficient subsidy also skips rank penalty');
is($c{'neutral-soldout'}{after}{seller}{rank},999,'neutral sold-out rank penalty');
is($c{'other-cash-cap'}{receipt}{count},2,'surcharge limits by adjusted buyer price');
is($c{'same-discount-cash-cap'}{receipt}{count},2,'discount permits more than base-price affordability');
is($c{'same-discount-cash-cap'}{receipt}{tax},2000,'tax calculated from seller base');
is($c{'same-discount-cash-cap'}{receipt}{usetime},1200,'time calculated from seller base');
is($c{'other-taxmode-double'}{receipt}{taxrate},23,'source double tax plus markup');
done_testing();
