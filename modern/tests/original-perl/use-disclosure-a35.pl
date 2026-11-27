use utf8;
use JSON::PP;
use File::Temp qw(tempdir);
use File::Path qw(make_path);
use Cwd qw(abs_path);
use Storable qw(dclone);
no strict;
no warnings;
sub read_text {
  my($p)=@_;open my $fh,'<:encoding(UTF-8)',$p or die "$p: $!";
  local $/;return <$fh>;
}
sub l {return $_[0]}
my $compiler=read_text('inc-makeitem.cgi');
my $start=index($compiler,'sub GetTime');
die 'compiler subroutines missing' if $start<0;
eval substr($compiler,$start);die $@ if $@;
my $use=read_text('use.cgi');
my $end=index($use,'sub UseItem');
die 'USE gate missing' if $end<0;
eval substr($use,0,$end);die $@ if $@;
$CUSTOM_DIR=abs_path('../../../custom');
$INCLUDE_DIR=$CUSTOM_DIR;
$ITEM_DIR=tempdir(CLEANUP=>1);
$IMAGE_DIR=$ITEM_DIR;
$FILE_EXT='.cgi';$IMAGE_EXT='.png';
$g_define={itemusetimerate=>1,function=>{},localfuncmark=>'_local_',cmdhead=>'@@',cmdfoot=>'',dirname=>'street'};
make_path(map {"$ITEM_DIR/$_"} qw(use use-s item-t item-s item-b));
AnalyzeItemData("FH00","inc-item-data.cgi");
OutItemData();
my $fixtures=decode_json(do {local $/;<STDIN>});
my @all=map {[]} @$fixtures;
for my $file (sort glob("$ITEM_DIR/use/*.cgi")){
  for my $sym (keys %item::){
    undef &{"item::$sym"} if $sym=~/^(?:_job_use_|_local_)/;
  }
  @item::USE=();
  do $file or die "$file: $@ $!";
  my $template=dclone(\@item::USE);
  for my $i (0..$#$fixtures){
    $DT=dclone($fixtures->[$i]);$item::DT=$DT;
    @item::USE=@{dclone($template)};
    my @list=GetUseItemList();
    for my $row (@list){
      my $ok=$row->{useok}?1:0;
      my $disp=$row->{dispok}?1:0;
      @item::USE=@{dclone($template)};
      my $one=GetUseItem($row->{no});
      die 'list vs single eligibility mismatch' if $ok!=($one->{useok}?1:0)||$disp!=($one->{dispok}?1:0);
      push @{$all[$i]},{itemId=>0+$row->{itemno},useId=>0+$row->{no},sourceUseOk=>$ok?JSON::PP::true:JSON::PP::false,sourceDispOk=>$disp?JSON::PP::true:JSON::PP::false,sourceNameVisible=>($ok||$disp)?JSON::PP::true:JSON::PP::false,sourceDisplayName=>($ok||$disp)?$row->{name}:'？？？？？？？？'};
    }
    die 'disclosure mutated stock' unless join(',',@{$DT->{item}}) eq join(',',@{$fixtures->[$i]{item}});
  }
}
for my $rows (@all){@$rows=sort {$a->{itemId}<=>$b->{itemId}||$a->{useId}<=>$b->{useId}} @$rows;die 'expected 116 generated USE rows' unless @$rows==116}
print encode_json(\@all);
