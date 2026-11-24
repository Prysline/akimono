package OriginalAdminBootstrapHarness;
use strict;
use warnings;
use utf8;
use FindBin;
use File::Spec;
use lib $FindBin::Bin;
use JSON::PP;
use OriginalGiftMapUseHarness;

# B-34 runs only the EXACT original Perl 'print DATA time()."..."'
# world-initialization STATEMENT into a scalar memory filehandle.
# Never runs inc-admin-func.cgi::init, CheckLock, mkdir, unlink,
# actual DataRead CGI, DataWrite file or real world installation.
sub source {
  my($p)=@_;
  open(my $fh,'<:encoding(UTF-8)',File::Spec->catfile($FindBin::Bin,$p))
    or die "B-34 fixed source missing $p: $!";
  local $/;my $s=<$fh>;close $fh;return $s;
}
sub print_source_statement {
  my $s=source('core-inc-admin-func.cgi');
  die 'B-34 original init missing' unless $s=~/^sub init\n\{/m;
  die 'B-34 source must preserve no-overwrite gate'
    unless index($s,'if(!-e "$DATA_DIR/$DATA_FILE$FILE_EXT")')>=0;
  my($stmt)=$s=~/(^\s*print DATA time\(\)\."(?:\\.|[^"\\])*";)\s*#初期状態/m;
  die 'B-34 source init print statement missing or drifted' unless $stmt;
  my $expected='print DATA time()."\\n500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0\\n\\n\\n//\\n";';
  $stmt=~s/^\s+//;
  die 'B-34 unexpected init statement' unless $stmt eq $expected;
  return $stmt;
}
sub run {
  my $statement=print_source_statement();
  my $reader=source('inc-func.cgi');
  my $writer=source('write.cgi');
  die 'B-34 original DataRead sparse wholesale parser drift'
    unless index($reader,'@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM);')>=0;
  die 'B-34 original DataWrite sparse wholesale writer drift'
    unless index($writer,'print OUT join(",",@DTwholestore)."\\n";')>=0;
  my $memory='';
  open(my $output,'>:encoding(UTF-8)',\$memory)
    or die 'B-34 unable to create scalar-only output';
  {
    no warnings 'once';
    local *DATA=$output;
    my $ok=eval "package OriginalAdminBootstrapHarness; no strict; no warnings; $statement\n1;";
    die "B-34 original print DATA failed: $@" unless $ok;
  }
  close($output);
  my @lines=split(/\n/,$memory,-1);
  die 'B-34 source initial world format drift' unless @lines==6&&
    $lines[0]=~/^\d+$/&&
    $lines[1] eq '500000,100,,0,0:0:0:0:5001:0:5001:0:0:2000:0'&&
    $lines[2] eq ''&&$lines[3] eq ''&&$lines[4] eq '//'&&$lines[5] eq '';
  my @raw_wholesale=split(/,/,$lines[2],79);
  die 'B-34 original empty third line must yield sparse empty Perl array'
    if @raw_wholesale;
  return {
    initTime=>0+$lines[0],
    initialMetadata=>$lines[1],
    wholesaleCsv=>$lines[2],
    eventCsv=>$lines[3],
    shopDelimiter=>$lines[4],
    trailingLine=>$lines[5],
    wholeSlots=>scalar(@raw_wholesale),
    originalWorldText=>$memory,
    source=>'verbatim original admin init print DATA statement, scalar filehandle only; DataRead CSV rule verified; no real disk/CGI',
  };
}
1;
