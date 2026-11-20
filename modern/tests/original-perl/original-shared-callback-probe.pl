use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
binmode STDOUT, ':encoding(UTF-8)';

# B-26: directly invoke only the two Standard Street shared function BODIES
# with recording-only item::UseItem and item::WriteLog. Never load CGI, DSL
# compiler, real logger or world data.
our (@CALLS,@LOGS);
{
  package item;
  our ($USE,$DT,@ITEM,$count);
  sub UseItem {push @main::CALLS,[@_];return 42;}
  sub WriteLog {push @main::LOGS,[@_];return 0;}
}
sub source {
  open(my $f,'<:encoding(UTF-8)',
    "$FindBin::Bin/../../../custom/inc-item-data.cgi") or die "$!";
  local $/;my $s=<$f>;close $f;return $s;
}
my $source=source();
my ($section)=$source=~/(^@@FUNCITEM\b[\s\S]*?)(?=^@@FUNCUPDATE\b)/m;
die 'Missing fixed FUNCITEM' unless defined $section;
my ($lostbook)=$section=~/(^sub lostbook\s*\n\{[\s\S]*?^\}\n)/m;
my ($popup)=$section=~/(^sub popup\s*\n\{[\s\S]*?^\}\n)/m;
die 'Missing exact shared callback source' unless defined($lostbook)&&defined($popup);
my $compiled=eval "package item; no strict; no warnings;\n".
  $lostbook."\n".$popup."\n1;\n";
die "Exact callback compilation: $@" unless $compiled;

sub scenario {
  my($label,$callback,$o)=@_;
  @CALLS=();@LOGS=();
  $item::USE={itemno=>$o->{itemId}//1,
    param1=>$o->{param1},param2=>$o->{param2}//'開了派對',
    result=>{count=>$o->{successfulCount}//7}};
  $item::DT={id=>$o->{shopId}//42,
    shopname=>$o->{shopName}//'原版店',rank=>$o->{rank}//5000,
    money=>70,time=>250,exp=>{1=>120},item=>[10,4]};
  @item::ITEM=(undef,{name=>'書本甲'},{name=>'書本乙'});
  my $draw;
  if($callback eq 'lostbook'){
    srand($o->{seed}//11);$draw=rand(1000);srand($o->{seed}//11);
  }
  my $returned=$callback eq 'lostbook'
    ? item::lostbook():item::popup();
  my $input=$callback eq 'lostbook'
    ?{itemId=>$item::USE->{itemno},
      itemName=>$item::ITEM[$item::USE->{itemno}]{name},
      param1=>$item::USE->{param1},
      randomDraw=>$draw}
    :{shopId=>$item::DT->{id},shopName=>$item::DT->{shopname},
      rank=>$o->{rank}//5000,param1=>$o->{param1},
      param2=>$item::USE->{param2}};
  return {
    case=>$label,callback=>$callback,input=>$input,
    observed=>{
      returned=>$returned,
      rankAfter=>$item::DT->{rank},
      externalCalls=>[@CALLS],logs=>[@LOGS],
      item=>[@{$item::DT->{item}}],
      money=>$item::DT->{money},time=>$item::DT->{time},
      exp=>$item::DT->{exp},
    },
  };
}
my @result=(
 scenario('lostbook-always','lostbook',
   {itemId=>1,param1=>1000,seed=>9,successfulCount=>7}),
 scenario('lostbook-never','lostbook',
   {itemId=>2,param1=>0,seed=>12}),
 scenario('lostbook-negative','lostbook',
   {itemId=>1,param1=>-1,seed=>77}),
 scenario('lostbook-above1000','lostbook',
   {itemId=>2,param1=>1100,seed=>5}),
 scenario('lostbook-seeded-low','lostbook',
   {itemId=>1,param1=>500,seed=>46}),
 scenario('lostbook-seeded-high','lostbook',
   {itemId=>1,param1=>500,seed=>73}),
 scenario('popup-normal','popup',
   {rank=>5000,param1=>1000,param2=>'開了派對'}),
 scenario('popup-cap','popup',
   {rank=>9999,param1=>300000,param2=>'高額派對'}),
 scenario('popup-overcap','popup',
   {rank=>12000,param1=>1000,param2=>'開了派對'}),
 scenario('popup-negative','popup',
   {rank=>3000,param1=>-1000,param2=>'活動'}),
 scenario('popup-limit','popup',
   {rank=>10000,param1=>1000,param2=>'活動'}),
 scenario('popup-from-low','popup',
   {rank=>-500,param1=>1000,param2=>'活動'}),
);
print JSON::PP->new->canonical->encode(\@result),"\n";
