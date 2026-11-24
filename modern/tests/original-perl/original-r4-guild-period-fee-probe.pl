use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDOUT,':raw';
our (%GUILD,%GUILD_DATA,$GUILDIDX_feerate,@GUILD_EDIT_CALLS);
sub source{
  my($name)=@_;
  open my $in,'<:encoding(UTF-8)',
    File::Spec->catfile($FindBin::Bin,$name) or die $!;
  local $/;my $s=<$in>;close $in;return $s;
}
my $period=source('period.cgi');
my $a=index($period,'#ギルド会費');
my $b=index($period,'$DT->{costyesterday}=$cost;',$a);
die 'frozen original guild fee section missing' unless $a>=0&&$b>$a;
my $body=substr($period,$a,$b-$a);
for my $needle(
  'if($DT->{guild} ne \'\')',
  'EditGuildMoney($DT->{guild},$money);',
  '$DT->{money}-=$money;',
  'int($GUILD_DATA{$DT->{guild}}->{atk} *24 /25)',
  'int($GUILD_DATA{$DT->{guild}}->{def} *9 /10)',
  '$GUILD_DATA{$DT->{guild}}->{def}+=int($money/800);',
  '$GUILD_DATA{$DT->{guild}}->{def}=1000 if ($GUILD_DATA{$DT->{guild}}->{def}>1000);',
){
  die "frozen original guild dues drift $needle" unless
    index($body,$needle)>=0;
}
sub EditGuildMoney{
  push @GUILD_EDIT_CALLS,[@_];return 1;
}
my $ok=eval "package main;use utf8;no strict;no warnings;\n".
  "sub OriginalR4GuildFee{my \$DT=shift;\n".$body.
  "\nreturn 1;}\n1;";
die "original guild fee section failed to eval: $@" unless $ok;
sub run{
  my(%in)=@_;
  my $shop={%{$in{shop}}};
  my $g=$in{guild};
  %GUILD=();%GUILD_DATA=();@GUILD_EDIT_CALLS=();
  $GUILDIDX_feerate=0;
  if($g){
    $GUILD{$g->{id}}=[$g->{feeRate}];
    $GUILD_DATA{$g->{id}}={
      atk=>$g->{atk},def=>$g->{def},
    };
  }
  OriginalR4GuildFee($shop);
  my $updated=$g?{
    id=>$g->{id},feeRate=>$g->{feeRate},
    atk=>$GUILD_DATA{$g->{id}}{atk},
    def=>$GUILD_DATA{$g->{id}}{def},
  }:undef;
  return {
    name=>$in{name},
    input=>{shop=>$in{shop},guild=>$in{guild}},
    output=>{
      shop=>{%$shop},guild=>$updated,
      editGuildMoneyCalls=>[map{{
        guildId=>$_->[0],amount=>0+$_->[1],
      }}@GUILD_EDIT_CALLS],
    },
  };
}
my @cases=(
  run(name=>'no-guild-no-dues-no-mutation',
    shop=>{guild=>'',money=>1000,saleyesterday=>50000},guild=>undef),
  run(name=>'guild-zero-sales-still-attrition-and-EditGuildMoney-zero',
    shop=>{guild=>'guild-a',money=>1000,saleyesterday=>0},
    guild=>{id=>'guild-a',feeRate=>50,atk=>1000,def=>500}),
  run(name=>'guild-medium-source-fee-and-defense-growth',
    shop=>{guild=>'guild-a',money=>100000,saleyesterday=>800000},
    guild=>{id=>'guild-a',feeRate=>50,atk=>940,def=>480}),
  run(name=>'guild-fractional-fee-is-original-int',
    shop=>{guild=>'guild-a',money=>10000,saleyesterday=>12345},
    guild=>{id=>'guild-a',feeRate=>37,atk=>999,def=>999}),
  run(name=>'guild-large-fee-caps-defense-at-1000',
    shop=>{guild=>'guild-b',money=>1500000,saleyesterday=>2000000},
    guild=>{id=>'guild-b',feeRate=>1000,atk=>998,def=>1000}),
  run(name=>'guild-zero-rate-still-drains-attack-defense',
    shop=>{guild=>'guild-z',money=>1000,saleyesterday=>99999},
    guild=>{id=>'guild-z',feeRate=>0,atk=>1,def=>1}),
  run(name=>'guild-dues-can-make-shop-money-negative-original',
    shop=>{guild=>'guild-a',money=>10,saleyesterday=>800000},
    guild=>{id=>'guild-a',feeRate=>50,atk=>48,def=>10}),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'frozen original period.cgi complete guild dues per-store block with explicit EditGuildMoney call stub, real Perl source attack/def defense formulas',
  cases=>\@cases,
  scope=>'single guild member accounting source only; EditGuildMoney real file IO unknown and not simulated, no period/world commit',
});
