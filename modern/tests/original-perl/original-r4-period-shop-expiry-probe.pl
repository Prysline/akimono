use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use JSON::PP;
binmode STDOUT,':raw';
our ($NOW_TIME,$EXPIRE_TIME,@CLOSE_CALLS,@LOG);
$EXPIRE_TIME=3600*24*7;
sub read_source{
  my($file)=@_;
  open my $in,'<:encoding(UTF-8)',
    File::Spec->catfile($FindBin::Bin,$file) or die $!;
  my $s;
  {local $/;$s=<$in>;}
  close $in;
  return $s;
}
my $original=read_source('period.cgi');
my $start=index($original,'#経営者不在');
my $end=index($original,'#ドラゴンレース清算',$start);
die 'frozen actual original owner expiration source not found'
  unless $start>=0&&$end>$start;
my $fragment=substr($original,$start,$end-$start);
for my $check(
  'if ($NOW_TIME-$DT->{foundation} > 43200 && $DT->{blocklogin} ne \'stop\')',
  'if ($DT->{lastlogin}+$EXPIRE_TIME<$NOW_TIME)',
  "CloseShop(\$DT->{id},l('経営者不在'));",
  'PushLog(1,0,l("%1が経営者不在のため閉店しました。",$DT->{shopname}));',
){
  die 'frozen expiry source drift '.$check
    unless index($fragment,$check)>=0;
}
sub CloseShop{push @CLOSE_CALLS,[@_];return 1;}
sub PushLog{push @LOG,[@_];return 1;}
sub l{
  my($format,@args)=@_;
  $format=~s/%([1-9]\d*)/
    defined($args[$1-1]) ? $args[$1-1] : ''
  /gex;
  return $format;
}
my $compiled=eval
  "package main;use utf8;no strict;no warnings;\n".
  "sub OriginalSourceR4CloseCheck{my \$DT=shift;\n".
  $fragment."\nreturn 1;}\n1;";
die "actual original close source compile failed $@" unless $compiled;
sub run{
  my(%input)=@_;
  my $shop={
    id=>1,shopname=>'原版無人店',foundation=>$input{foundation},
    lastlogin=>$input{lastlogin},blocklogin=>$input{blocklogin},
  };
  $NOW_TIME=$input{now};
  @CLOSE_CALLS=();@LOG=();
  OriginalSourceR4CloseCheck($shop);
  return {
    name=>$input{name},
    input=>{shop=>{%$shop},nowSeconds=>$input{now}},
    output=>{
      shop=>{%$shop},
      expiredOwner=>@CLOSE_CALLS?JSON::PP::true:JSON::PP::false,
      closeCalls=>[map{{
        shopId=>0+$_->[0],reason=>$_->[1],
      }}@CLOSE_CALLS],
      logs=>[map{[@$_]}@LOG],
    },
  };
}
my @cases=(
  run(name=>'exact-12h-foundation-is-not-old-enough',
    now=>700000,foundation=>656800,lastlogin=>0,blocklogin=>''),
  run(name=>'one-second-beyond-12h-with-expired-login-closes',
    now=>700000,foundation=>656799,lastlogin=>0,blocklogin=>''),
  run(name=>'stopped-login-skips-otherwise-expired-close',
    now=>700000,foundation=>1,lastlogin=>0,blocklogin=>'stop'),
  run(name=>'last-login-exactly-seven-days-ago-does-not-close',
    now=>700000,foundation=>1,lastlogin=>95200,blocklogin=>''),
  run(name=>'seven-day-strict-inequality-plus-one-second-closes',
    now=>700000,foundation=>1,lastlogin=>95199,blocklogin=>''),
  run(name=>'young-shop-never-closes-despite-stale-login',
    now=>700000,foundation=>698000,lastlogin=>0,blocklogin=>''),
  run(name=>'just-logged-in-skips-shop-close',
    now=>700000,foundation=>1,lastlogin=>699999,blocklogin=>''),
  run(name=>'non-stop-login-block-code-is-not-protected',
    now=>700000,foundation=>1,lastlogin=>0,blocklogin=>'warning'),
  run(name=>'zero-time-and-fresh-shop-no-effect',
    now=>0,foundation=>0,lastlogin=>0,blocklogin=>''),
);
print JSON::PP->new->canonical->utf8->encode({
  source=>'actual frozen period.cgi absent-owner if block, original CloseShop and PushLog call capture',
  scope=>'only original expiry invocation and log; CloseShop real durable file/city/guild effects deliberately NOT simulated',
  cases=>\@cases,
});
