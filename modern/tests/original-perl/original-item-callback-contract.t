use strict;
use warnings;
use utf8;
use Test::More;
binmode STDOUT, ':encoding(UTF-8)';

# B-25 callback BOUNDARY CONTRACT ONLY. Read two SHA-pinned untouched Core
# sources; never require inc-item.cgi, compile a DSL, or run item callbacks.
sub pinned {
  my($file)=@_;
  open(my $fh,'<:encoding(UTF-8)',$file) or die "$file: $!";
  local $/;my $s=<$fh>;close($fh);return $s;
}
my $src=pinned('use.cgi');
my $compiler=pinned('inc-makeitem.cgi');
my $whole=index($src,'CheckWholeStore();');
my $require=index($src,"RequireFile('inc-item.cgi');",$whole);
my $exp=index($src,"\t#熟練度処理\n",$require);
ok($whole>=0&&$require>$whole&&$exp>$require,
  'B-25-C01 whole store precedes unconditional require and skill tail');
die 'Source callback fragment changed' unless
  $whole>=0&&$require>$whole&&$exp>$require;
my $part=substr($src,$require,$exp-$require);
like($part,qr/RequireFile\('inc-item\.cgi'\);/,
  'B-25-C02 source always requests inc-item.cgi before searching method');
like($part,qr/my \$itemfunc="item::"\.\$USE->\{result\}->\{function\}/,
  'B-25-C03 function selected by current USE.result.function');
like($part,qr/\$itemfunc="" if !defined\(\&\$itemfunc\)/,
  'B-25-C04 missing function symbol becomes empty call target');
like($part,qr/if\(\$itemfunc ne ''\)/,
  'B-25-C05 dynamic item callback conditional on resolved symbol');
like($part,qr/\@item::DT=\@DT;/,
  'B-25-C06 callback receives all shops in item namespace');
like($part,qr/\$item::DTS=\$DT\[\$USE->\{arg\}->\{targetidx\}\]/,
  'B-25-C07 callback receives specific target shop index');
like($part,qr/\$item::count=\$USE->\{result\}->\{count\}/,
  'B-25-C08 callback count uses the completed effective count');
like($part,qr/\$item::USE=\$USE;/,
  'B-25-C09 callback receives original mutable USE reference');
like($part,qr/\$item::DT=\$DT;/,
  'B-25-C10 callback receives active mutable shop reference');
like($part,qr/\@item::ITEM=\@ITEM;/,
  'B-25-C11 callback receives original item table');
like($part,qr/\$USE->\{result\}->\{function_return\}=\&\$itemfunc\(\);/,
  'B-25-C12 callback return stored verbatim in USE.result.function_return');
my $dispatch=index($part,'$USE->{result}->{function_return}=&$itemfunc();');
my $target=index($part,'$item::DTS=$DT[$USE->{arg}->{targetidx}]');
ok($dispatch>$target,'B-25-C13 namespace bindings precede callback invocation');
like($compiler,qr/'functionbefore'=>'\$use->\{funcbefore\}'/,
  'B-25-C14 DSL compiler stores functionbefore as separate field');
like($compiler,qr/'function'=>'\$use->\{func\}'/,
  'B-25-C15 DSL compiler stores post-use function separately');
my $dynamic=()=$part=~/\&\$itemfunc\(\);/g;
is($dynamic,1,'B-25-C16 one dynamic invocation site within selected block');
done_testing();
