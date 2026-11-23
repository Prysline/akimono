use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use JSON::PP;
binmode STDOUT,':raw';
our (@DT,%id2idx,$COMMON_DIR,$MYDIR,@LOG);
my $temp=tempdir('akimono-r4-dragon-XXXX',TMPDIR=>1,CLEANUP=>1);
$COMMON_DIR=$temp;
$MYDIR='street';
sub GetPath{
  die 'unexpected DragonBalance external payout path'
    unless @_==2&&$_[0] eq $COMMON_DIR&&$_[1] eq 'drapay-street';
  return "$COMMON_DIR/drapay-street";
}
sub GetMoneyString{return $_[0];}
sub l{return $_[0];}
sub PushLog{push @LOG,[@_];1;}
my $original=File::Spec->catfile($FindBin::Bin,'period.cgi');
open my $reader,'<:encoding(UTF-8)',$original or die $!;
local $/;my $text=<$reader>;
close $reader;
my $fnStart=index($text,"sub DragonBalance\n");
die 'original full DragonBalance source not found' unless $fnStart>=0;
my $fn=substr($text,$fnStart);
for my $fragment(
  'my $fn=GetPath($COMMON_DIR,"drapay-".$MYDIR);',
  'open(IN,"<:encoding(UTF-8)",$fn) or return;',
  'chop $req[$_];',
  'my @buf=split(/\t/,$req[$_]);',
  'next if !defined($id2idx{$buf[0]});',
  '$DT[$i]->{dragon}+=$buf[1];',
  'unlink $fn;',
){
  die "original DragonBalance drift $fragment" unless index($fn,$fragment)>=0;
}
my $compiled=eval "package main;use utf8;no strict;no warnings;\n".$fn."\n1;";
die "actual original DragonBalance compilation failed $@" unless $compiled;
my $from=index($text,"\t\t#ドラゴンレース清算\n");
my $to=index($text,"\t\t#前期の情報を保存",$from);
die 'original per-shop dragon payout source moved'
  unless $from>=0&&$to>$from;
my $shopBody=substr($text,$from,$to-$from);
for my $fragment(
  '$DT->{money}+=$DT->{dragon};',
  '$DT->{drmoney}+=$DT->{dragon};',
  '$DT->{saletoday}+=$DT->{dragon} if ($DT->{dragon} > 0);',
  '$DT->{paytoday}-=$DT->{dragon} if ($DT->{dragon} < 0);',
){
  die "original dragon shop source drift $fragment"
    unless index($shopBody,$fragment)>=0;
}
$compiled=eval "package main;use utf8;no strict;no warnings;\n".
  "sub OriginalR4DragonShop{foreach my \$DT (\@DT){\n".
  $shopBody."\n}return 1;}\n1;";
die "original shop dragon section failed to eval $@" unless $compiled;
my @base=(
  {id=>1,money=>1000,dragon=>0,drmoney=>0,saletoday=>20,paytoday=>10},
  {id=>2,money=>2000,dragon=>0,drmoney=>0,saletoday=>0,paytoday=>30},
);
sub run{
  my(%o)=@_;
  @DT=map{{%$_}}@{$o{shops}//\@base};
  %id2idx=map{($DT[$_]{id}=>$_)}0..$#DT;
  @LOG=();
  my $filename=GetPath($COMMON_DIR,'drapay-'.$MYDIR);
  unlink $filename if -e $filename;
  if(defined $o{file}){
    open my $out,'>:encoding(UTF-8)',$filename or die $!;
    print $out $o{file};
    close $out or die $!;
  }
  my $present=-e $filename;
  DragonBalance();
  my $consumed=$present&&!(-e $filename);
  OriginalR4DragonShop();
  return {
    name=>$o{name},
    input=>{
      shops=>$o{shops}//\@base,
      payoutText=>$o{file},
    },
    output=>{
      payoutFilePresent=>$present?JSON::PP::true:JSON::PP::false,
      payoutFileConsumed=>$consumed?JSON::PP::true:JSON::PP::false,
      shops=>[map{{%$_}}@DT],
      logs=>[map{[@$_]}@LOG],
    },
  };
}
my @cases=(
  run(name=>'source-positive-and-negative-two-store-payout',
    file=>"1\t500\n2\t-300\n"),
  run(name=>'source-duplicate-id-accumulates-and-unknown-id-is-skipped',
    file=>"1\t200\n1\t300\n99\t200\n"),
  run(name=>'original-absent-payout-file-keeps-existing-dragon',
    shops=>[
      {%{$base[0]},dragon=>250},{%{$base[1]}},
    ]),
  run(name=>'source-empty-file-is-still-unlinked',
    file=>''),
  run(name=>'source-chop-without-final-newline-truncates-last-digit',
    file=>"1\t500"),
  run(name=>'original-crlf-payout-uses-perl-numeric-coercion',
    file=>"1\t200\r\n"),
  run(name=>'source-unmatched-shop-id-no-dragon-cash-change',
    file=>"99\t600\n"),
  run(name=>'source-negative-payout-to-existing-negative-dragon',
    shops=>[
      {%{$base[0]}},{%{$base[1]},dragon=>-100},
    ],file=>"2\t-700\n"),
  run(name=>'source-initial-dragon-and-payout-combine-before-ledger',
    shops=>[
      {%{$base[0]},dragon=>300},{%{$base[1]}},
    ],file=>"1\t-100\n"),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'true frozen period.cgi DragonBalance sub opens/unlinks temp payout file and same original per-shop dragon settlement source, with only l/GetMoneyString/GetPath test IO adapters',
  cases=>\@cases,
  scope=>'source reviewed dragon file and ledger stage only; not full inc-period/world commit',
});
