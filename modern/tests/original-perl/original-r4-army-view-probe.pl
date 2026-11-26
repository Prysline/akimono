# Executes the original full facility view with controlled, isolated context.
# Identity, DataRead, ReadArmy and presentation helpers are adapters, not
# player actions. Real GetStockTime comes from the pinned calc.cgi.
use utf8;
use strict;
use warnings;
use FindBin;
use JSON::PP qw(decode_json encode_json);
our ($DT,$STATE,$NOW_TIME,$MAX_STOCK_TIME,$disp,$TB,$TR,$TD,$TRE,$TBE,$TDB,
     $METHOD,$USERPASSFORM,@image,@DIGNITY,%ARMY,%RIOT,%DTevent);
my $row=decode_json($ARGV[0]);
$NOW_TIME=$row->{nowSeconds};$MAX_STOCK_TIME=72*60*60;
$DT={id=>1,status=>1,dignity=>$row->{dignity},money=>$row->{money},
     time=>$row->{time},shopname=>'fixture'};
$STATE={leader=>0};%ARMY=(1=>$row->{army});
%RIOT=$row->{riot}?(1=>1):();
%DTevent=$row->{rebel}?(rebel=>$NOW_TIME+86400):();
$disp=$TB=$TR=$TD=$TRE=$TBE=$TDB=$METHOD=$USERPASSFORM='';
@DIGNITY=('base');
sub l {$_[0]}
sub GetTagImgKao {''}
sub DataRead {1}
sub CheckUserPass {1}
sub ReadArmy {1}
sub RequireFile {die 'unreviewed include' unless $_[0] eq 'inc-html-ownerinfo.cgi';1}
sub DignityDefine {'fixture-title'}
sub GetMoneyString {$_[0]}
sub GetTime2HMS {$_[0]}
sub OutSkin {1}
require "$FindBin::Bin/calc.cgi";
my $ok=do "$FindBin::Bin/pinned-army-view.cgi";
die "original army view: $@ $!" unless $ok;
sub options {
  my($mode)=@_;
  for my $form(split /<FORM\b/,$disp){
    next unless $form=~/NAME=mode VALUE="$mode"/;
    my @numbers=grep {$_>0} map {0+$_} $form=~/<OPTION VALUE="(\d+)"/g;
    return [JSON::PP::true,\@numbers];
  }
  return [JSON::PP::false,[]];
}
my $hire=options('plus');my $fire=options('fire');
print encode_json({canHire=>$hire->[0],hireOptions=>$hire->[1],canFire=>$fire->[0],fireOptions=>$fire->[1],
  stockTimeSeconds=>GetStockTime($DT->{time})});
