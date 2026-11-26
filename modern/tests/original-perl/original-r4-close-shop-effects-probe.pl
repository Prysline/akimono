use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use File::Temp qw(tempdir);
use Storable qw(dclone);
use JSON::PP;
binmode STDOUT,':raw';
our (@DT,%id2idx,%name2idx,@DTindexnamelist,$LOG_DELETESHOP_FILE,
     $SUBDATA_DIR,@SET_USER_CALLS,@ERROR_LOG_CALLS);
sub source {
  my($name)=@_;
  open my $fd,'<:encoding(UTF-8)',
    File::Spec->catfile($FindBin::Bin,$name) or die $!;
  my $text;
  {local $/;$text=<$fd>;}
  close $fd;
  return $text;
}
my $write=source('write.cgi');
my $read=source('inc-func.cgi');
my $detail=source('core-detail.cgi');
my $config=source('../../../_config.cgi');
my $a=index($write,"sub CloseShop\n{");
my $b=index($write,"\n}\n\n1;",$a);
die 'frozen original write.cgi::CloseShop source missing'
  unless $a>=0&&$b>$a;
my $original=substr($write,$a,$b+2-$a);
my($fields)=$read=~/\@DTindexnamelist=\s*qw\(([\s\S]*?)\)\s*;/;
die 'frozen original DTindexnamelist missing'
  unless defined $fields;
@DTindexnamelist=split(/\s+/,$fields);
@DTindexnamelist=grep{length $_}@DTindexnamelist;
die 'real source archive fields drift' unless
  @DTindexnamelist==32&&
  $DTindexnamelist[0] eq 'id'&&
  $DTindexnamelist[-1] eq 'icon';
die 'frozen source delete file drift'
  unless $config=~/\$LOG_DELETESHOP_FILE\s*=\s*'delete';/;
$LOG_DELETESHOP_FILE='delete';
$SUBDATA_DIR=tempdir('akimono-r4-close-effect-XXXX',
  TMPDIR=>1,CLEANUP=>1);
sub SetUserData{
  push @SET_USER_CALLS,{shopId=>0+$_[0]{id}};
  return 1;
}
sub WriteErrorLog{
  push @ERROR_LOG_CALLS,{
    file=>$_[1],content=>$_[0],
  };
  return 1;
}
my $compiled=eval "package main;use utf8;no strict;no warnings;\n".
  $original."\n1;";
die "frozen original CloseShop failed to compile: $@" unless $compiled;
my($sort)=$detail=~/(^sub SortDT\n\{[\s\S]*?^\}\n)(?=\nsub GetRankMessage)/m;
die 'frozen original SortDT callback source moved' unless $sort;
my $sorted=eval "package main;use utf8;no strict;no warnings;\n".
  "sub GetDTPoint{return 0;}\n".$sort."\n1;";
die "frozen original SortDT failed to compile: $@" unless $sorted;
die 'frozen original DataWrite skips inactive shop differently'
  unless index($write,'next if !$DT->{status};')>=0;
my @sessions=(
  '1-alpha.cgi','1-beta.cgi','10-alpha.cgi','1-.cgi',
  '1-a.txt','01-alpha.cgi','1-CAPS.CGI','2-keep.cgi',
  'index.html',
);
sub resetSessions {
  opendir my $handle,$SUBDATA_DIR or die $!;
  while(my $name=readdir($handle)){
    next if $name eq '.'||$name eq '..';
    unlink File::Spec->catfile($SUBDATA_DIR,$name) or die $!;
  }
  closedir $handle;
  for my $name (@sessions){
    open my $fd,'>:encoding(UTF-8)',
      File::Spec->catfile($SUBDATA_DIR,$name) or die $!;
    print $fd "original CGI temporary session";
    close $fd or die $!;
  }
}
sub remaining {
  opendir my $dir,$SUBDATA_DIR or die $!;
  my @names=grep{$_ ne '.'&&$_ ne '..'} readdir($dir);
  closedir $dir;
  return \@names;
}
sub run {
  my(%opts)=@_;
  resetSessions();
  @SET_USER_CALLS=();@ERROR_LOG_CALLS=();
  my $shop=$opts{shop};
  @DT=$shop?(dclone($shop)):();
  %id2idx=$opts{found}?($opts{shopId}=>0):();
  my $before=$shop?dclone($DT[0]):undef;
  my $names=remaining();
  CloseShop($opts{shopId},$opts{reason});
  my $after=@DT?dclone($DT[0]):undef;
  SortDT();
  my @active=map{dclone($_)}@DT;
  my $lookup={%id2idx};
  my $nameLookup={%name2idx};
  my $still=remaining();
  my %has=map{$_=>1}@$still;
  return {
    name=>$opts{name},
    input=>{
      shopId=>$opts{shopId},shop=>$before,
      reason=>$opts{reason},sessionFileNames=>$names,
    },
    output=>{
      shop=>$after,closed=>@SET_USER_CALLS?JSON::PP::true:JSON::PP::false,
      archived=>@ERROR_LOG_CALLS?$ERROR_LOG_CALLS[0]{content}:undef,
      setUserDataCalls=>dclone(\@SET_USER_CALLS),
      writeErrorLogCalls=>dclone(\@ERROR_LOG_CALLS),
      deletedSessions=>[grep{!$has{$_}}@$names],
      remainingSessions=>$still,
      activeShops=>\@active,
      idToIndex=>$lookup,
      nameToIndex=>$nameLookup,
    },
  };
}
my @stock=(0)x79;
$stock[9]=3;
my $shop={
  id=>1,lastlogin=>700,foundation=>300,name=>'SOURCE_OWNER',
  shopname=>'來源原版關店店舖',status=>1,money=>123456,rank=>88,
  time=>2200,showcasecount=>1,showcase=>[10],price=>[3000],
  item=>\@stock,
  itemtoday=>{10=>2},itemyesterday=>{},
  exp=>{10=>900},user=>{source=>'active'},
  costtoday=>17.875,blocklogin=>'',guild=>'',
  saletoday=>4000,saleyesterday=>2000,
};
my @cases=(
  run(name=>'actual-close-archives-before-zero-and-unlinks-only-matching-sessions',
    shopId=>1,found=>1,shop=>$shop,reason=>'経営者不在'),
  run(name=>'unknown-id-source-returns-without-changing-files-or-logs',
    shopId=>2,found=>0,shop=>undef,reason=>'経営者不在'),
  run(name=>'already-inactive-source-still-archives-and-deletes-sessions',
    shopId=>1,found=>1,shop=>{%$shop,status=>0,money=>0,rank=>0},
    reason=>'管理員關閉'),
);
# Additional isolated full-commerce case: observe the actual native
# hash traversal in the frozen archive, not JSON canonical key order.
# Default three historical cases are unchanged.
if (@ARGV && $ARGV[0] eq '--full-commerce') {
  my @wide=(10,30,32,40,45,51,57,0);
  my @prices=(5000,200,300,1200,800,750,1200,0);
  my @wideStock=(0)x79;
  $wideStock[$_-1]=3 for grep {$_} @wide;
  my $wideShop={%$shop,showcasecount=>8,showcase=>\@wide,price=>\@prices,
    item=>\@wideStock,money=>-123456,profitstock=>-22345,
    itemtoday=>{10=>2,30=>7,45=>3},itemyesterday=>{32=>5,40=>9},
    exp=>{12=>895,16=>700,17=>350},user=>{source=>'active',other=>'kept'}};
  my $row=run(name=>'full-commerce-eight-shelves-signed-cash-and-native-multi-key-archive',
    shopId=>1,found=>1,shop=>$wideShop,reason=>'経営者不在');
  my @lines=split(/\n/,$row->{output}{archived},3);
  my @parts=split(/:/,$lines[2],-1);
  die 'full archive seven sections' unless @parts==7;
  my %orders;
  my @names=qw(itemyesterday itemtoday exp user);
  for my $i (0..$#names) {
    my @kv=split(/,/,$parts[$i+3],-1);
    my @keys=map {$kv[$_*2]} 0..(@kv/2-1);
    $orders{$names[$i]}=\@keys;
  }
  $row->{input}{archiveHashOrders}=\%orders;
  @cases=($row);
}
print JSON::PP->new->canonical->utf8->encode({
  source=>'entire unmodified original write.cgi sub CloseShop extracted and executed with true File::Temp session directory, actual unlink, exact inc-func 32 original archive fields',
  scope=>'real CloseShop shop mutation and session file deletion; external SetUserData and WriteErrorLog deliberately call-recorded, no cross-file atomic transaction or live user store',
  cases=>\@cases,
});
