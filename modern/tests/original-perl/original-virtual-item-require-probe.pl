use strict;
use warnings;
use utf8;
use JSON::PP;
use FindBin;
use lib $FindBin::Bin;
use OriginalVirtualItemLoader;
binmode STDOUT, ':encoding(UTF-8)';

# Each process starts with a fresh Perl package/caches. The only require
# executed is the ORIGINAL operator, serviced by a scalar @INC hook with
# two reviewed local original function bodies. Never requires actual CGI.
my %cases=(
 'work-only' =>['book-work'],
 'showcase-only'=>['edit-showcase'],
 'work-repeat'=>['book-work','book-work'],
 'showcase-repeat'=>['edit-showcase','edit-showcase'],
 'work-then-showcase'=>['book-work','edit-showcase'],
 'showcase-then-work'=>['edit-showcase','book-work'],
 'work-showcase-work'=>['book-work','edit-showcase','book-work'],
 'showcase-work-showcase'=>['edit-showcase','book-work','edit-showcase'],
 'alternating'=>[
   'book-work','edit-showcase','book-work','edit-showcase',
 ],
);
my $selected=$ARGV[0]//'work-only';
die "Unknown approved B-28 scenario $selected"
  unless exists $cases{$selected};
my $observed=OriginalVirtualItemLoader::scenario(@{$cases{$selected}});
print JSON::PP->new->canonical->encode({
  case=>$selected,sequence=>$cases{$selected},observed=>$observed,
}),"\n";
