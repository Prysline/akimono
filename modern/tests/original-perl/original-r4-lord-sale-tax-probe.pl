use strict;
use warnings;
use FindBin;
use JSON::PP;
use Digest::SHA qw(sha1_hex);
our (@ITEM,%DTevent);
my %pins=('core-detail.cgi'=>'9a83d26fb29edee4032958f1e6de837a250f3384',
 'item.cgi'=>'b39400d7dc0ab80062c392ae2bbc923e24ecacf8');
for my $file(sort keys %pins){
 my $path="$FindBin::Bin/$file";
 open my $h,'<:raw',$path or die $!;
 my $b=do{local $/;<$h>};close $h;
 die "source drift $file" unless sha1_hex("blob ".length($b)."\0".$b) eq $pins{$file};
 require $path;
}
binmode STDIN,':raw';binmode STDOUT,':raw';
my $input=decode_json(do{local $/;<STDIN>});
my @results;
for my $row(@$input){
 %DTevent=%{$row->{eventState}};
 $ITEM[1]={price=>$row->{basePrice}};
 my $shop=exists($row->{taxMode})?{taxmode=>$row->{taxMode}}:{};
 my $user=GetUserTaxRate($shop,$row->{townTaxRate});
 my($rate,$tax)=GetSaleTax(1,$row->{count},$row->{gross},$user);
 push @results,{userTaxRate=>0+$user,taxRate=>0+$rate,tax=>0+$tax};
}
print encode_json(\@results);
