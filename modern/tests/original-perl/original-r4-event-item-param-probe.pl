use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use File::Spec;
binmode STDOUT,':raw';
our (@ITEM,@out_item,@errormsg,$g_define);
$g_define={};
sub source{
 my($path)=@_;
 open my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$path)
   or die "Original source missing $path: $!";
 local $/;my $str=<$fh>;close $fh;return $str;
}
my $compiler=source('inc-makeitem.cgi');
my($getNum)=$compiler=~/(^sub GetNumber\n\{[\s\S]*?^\}\n)(?=\nsub GetTypeNumber)/m;
my($getItem)=$compiler=~/(^sub GetItemNumber\n\{[\s\S]*?^\}\n)(?=\nsub GetString)/m;
my($getString)=$compiler=~/(^sub GetString\n\{[\s\S]*?^\}\n)(?=\nsub GetDefineString)/m;
die 'Frozen original compiler functions unavailable' unless $getNum&&$getItem&&$getString;
my $start=index($compiler,'foreach my $param (@{$event->{param}})');
my $stop=index($compiler,'print EOUTSUB "1;\n";',$start);
die 'Frozen OutEventData original generation changed' unless $start>=0&&$stop>$start;
my $snippet=substr($compiler,$start,$stop-$start);
for my $part ('$key=~s/^pop$/popular/i;','$keyitem=int($keyitem/$val);'){
 die 'Frozen compiler PARAM operator drift' unless index($snippet,$part)>=0;
}
my $ok=eval 'no strict; no warnings; '.$getNum."\n".$getString."\n".
 $getItem."\n"."sub real_original_param_compiler { my \$event=shift;\n".
 $snippet."\n}\n1;";
die "Cannot execute frozen original PARAM compiler: $@" unless $ok;
my(%eventParams,@itemEntries);
for my $f('../../../custom/inc-item-data.cgi','../../../custom/inc-rebel-data.cgi'){
 my $dsl=source($f);
 my @items=split /^\s*\@\@ITEM\b[^\r\n]*\r?\n/mi,$dsl;shift @items;
 for my $block (@items){
   my($id)=$block=~/^\s*no\s+(\d+)\b/m;
   my($name)=$block=~/^\s*name\s+([^\r\n#]+?)(?:\s*#.*)?$/m;
   my($code)=$block=~/^\s*code\s+([^\s#]+)/m;
   next unless defined($id)&&defined($name)&&defined($code);
   $name=~s/\s+$//;
   push @itemEntries,{no=>0+$id,name=>$name,code=>$code};
 }
 my @blocks=split /^\s*\@\@EVENT\b[^\r\n]*\r?\n/mi,$dsl;shift @blocks;
 for my $block (@blocks){
   $block=~s/^\s*\@\@(ITEM|USE|EVENT|DEFINE|FUNC[A-Z]+|END)\b[\s\S]*$//mi;
   my($code)=$block=~/^\s*code\s+([^\s#]+)/mi;
   next unless $code;
   die 'Repeated original EVENT code' if exists $eventParams{$code};
   my @rows;
   for my $line (split /\r?\n/,$block){
     push @rows,"$1\t$2" if $line=~/^\s*param\s+([^\s#]+)\s+([^\s#]+)/i;
   }
   $eventParams{$code}=\@rows;
 }
}
@out_item=sort {$a->{no}<=>$b->{no}} @itemEntries;
die '79 real original ITEM declarations required' unless @out_item==79;
for my $i(0..78){die 'original ITEM ID mapping drift' unless $out_item[$i]{no}==$i+1}
my $catalogProbe=File::Spec->catfile($FindBin::Bin,'original-b53-event-catalog-probe.pl');
open my $fh,'-|',$^X,$catalogProbe or die 'B53 original EVENT compiler unavailable';
local $/;my $catalogText=<$fh>;close $fh or die 'B53 original compiler failed';
my $catalog=JSON::PP->new->utf8->decode($catalogText);
my @compiled=grep {$_->{compiled}} @{$catalog->{declared}};
die '17 original runtime EVENTs required' unless @compiled==17;
my @cases;
for my $e (@compiled){
 my $code=$e->{code};
 my $params=$eventParams{$code};
 die 'Original EVENT not found in actual DSL' unless defined $params;
 next unless @$params;
 @ITEM=(undef,map {{
   itemId=>$_,price=>1000+5*$_,
   pricebase=>2000+7*$_,pricehalf=>3000+11*$_,
   popular=>5000+20*$_,plus=>60+$_,point=>100+$_
 }} 1..79);
 my $generated='';
 open my $writer,'>',\$generated or die $!;
 {no strict 'refs';local *EOUTSUB=$writer;
  real_original_param_compiler({param=>$params});}
 close $writer;
 die 'No real source generated overlay' unless length $generated;
 my $result=eval 'no strict; no warnings; '.$generated.'1;';
 die "Frozen original Perl overlay failed for $code: $@\n$generated" unless $result;
 die 'Source ITEM GetItemNumber failed' if @errormsg;
 push @cases,{eventCode=>$code,sourceParamCount=>scalar(@$params),
   generatedSource=>$generated,items=>[map {{%{$_}}} @ITEM[1..79]]};
}
die 'expected 9 source ITEM-param events' unless @cases==9;
print JSON::PP->new->utf8->canonical->encode({
 source=>'frozen OutEventData PARAM code compiles original Perl expressions',
 compiledCount=>scalar(@compiled),overlayCount=>scalar(@cases),
 cases=>\@cases,scope=>'ITEM field overlays only, not the complete EVENT engine',
});
