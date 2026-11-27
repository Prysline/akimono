use strict;
use warnings;
use utf8;
use FindBin;
use lib $FindBin::Bin;
use JSON::PP;
use OriginalNormalCommerceItemHarness;
use OriginalGiftMapUseHarness;
use OriginalFullUseLostbookHarness;
our (@DRAWS,@RANGES,@LOGS);
BEGIN {
  no warnings 'redefine';
  *CORE::GLOBAL::rand=sub (;$){
    die 'missing target callback sample' unless @main::DRAWS;
    my $n=shift @main::DRAWS;my $range=$_[0]//1;
    die 'sample range' unless $n>=0&&$n<1000000;
    push @main::RANGES,$range;return $range*$n/1000000;
  };
}
sub item::WriteLog {push @main::LOGS,[@_];1}
sub item::GetMoneyString {main::GetMoneyString(@_)}
binmode STDIN,':raw';binmode STDOUT,':raw';
local $/;my $in=decode_json(<STDIN>);
my $numeric=OriginalNormalCommerceItemHarness::compiled_items();
my $dsl=OriginalGiftMapUseHarness::original_dsl();
my $itemId=$in->{itemId};my $useId=$in->{useId};
die 'callback id' unless ($itemId==62&&$useId==2)||($itemId==65&&$useId>=0&&$useId<=2);
my ($owner)=grep {/^\s*no\s+$itemId(?:\s|$)/m} split(/(?=^\@\@ITEM\b)/m,$dsl);
die 'source owner' unless defined $owner;
my @uses=split(/^\s*\@\@USE[^\n]*\n/mi,$owner);
my $block=$uses[$useId+1];
my ($body)=$block=~/^\s*func\s+_local_\s*\n([\s\S]*?)^\s*_local_\s*$/m;
die 'source body' unless defined $body;
$body=~s/\@\@ITEMNO\s*"([^"]+)"/main::GetItemNumber($1)/ge;
my $fn=eval "package item;use utf8;no strict;no warnings;sub original_target_commerce {eval(<<'_eval_code_');\n".$body."\n_eval_code_\n}\n1;";
die $@ unless $fn;
my $read=OriginalGiftMapUseHarness::source('inc-func.cgi');
my $money=OriginalFullUseLostbookHarness::section($read,'GetMoneyString');
eval "package main;use utf8;no strict;no warnings;\n".$money."\n1;" or die $@;
# The frozen _config.cgi uses a literal backslash prefix and no suffix.
@main::term=('\\','');
for my $row(@$numeric){$main::ITEM[$row->{id}]{type}=$row->{type};}
@item::ITEM=@main::ITEM;
for my $line(split /\n/,$dsl){if($line=~/^\s*type(\d+)\s+([^\s#]+)/){$main::ITEMTYPE[$1]=$2;}}
$main::g_item={code=>$itemId==62?'cm':'badgossip',no=>$itemId,scale=>'個'};
$main::g_use={no=>$useId-1,exptime=>0};
main::ClearBuffer('use');
for my $line(split /\n/,$block){
  next unless $line=~/^\s*(?:time|exptime|exp|price|needpoint|arg|use)\s/i;
  main::GetBuffer('use',OriginalGiftMapUseHarness::line_for_compiler($line));
}
my $u=$main::g_use;
die 'USE compiler identity' unless $u->{itemno}==$itemId&&$u->{no}==$useId;
my @shops=@{$in->{shops}};
@item::DT=@shops;@main::DT=@shops;
$item::DT=$shops[$in->{actorIndex}];$item::DTS=defined($in->{targetIndex})?$shops[$in->{targetIndex}]:undef;
$main::STATE=$in->{town};$main::NOW_TIME=$in->{nowSeconds};
%main::DTevent=%{$in->{events}};
$item::GUILDIDX_name=0;
%main::GUILD=map {$_=>[$in->{guildNames}{$_}]} keys %{$in->{guildNames}};
@DRAWS=@{$in->{randomDraws}};@RANGES=();@LOGS=();
my $returned=item::original_target_commerce();
die 'unused source draws' if @DRAWS;
die 'callback undefined' unless defined $returned;
print encode_json({compiled=>{time=>0+$u->{time},exptime=>0+$u->{exptime},money=>0+($u->{money}//0),exp=>0+($u->{exp}//0),needPoint=>0+($u->{needpoint}//0)},
  shops=>\@shops,town=>$main::STATE,events=>\%main::DTevent,returned=>$returned,logs=>\@LOGS,drawRanges=>\@RANGES});
