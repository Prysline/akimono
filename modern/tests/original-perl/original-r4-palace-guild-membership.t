use strict;
use warnings;
use utf8;
use FindBin;
use File::Temp qw(tempdir);
use Digest::SHA qw(sha1_hex);
use Test::More;
our (%Q,%DTevent,%GUILD,%GUILD_DETAIL,%id2idx,@DT,$DT,$DTtown,
    @ENTRY,@MYENTRY,@ENTRYnamelist,@OtherDir,$Ecount,$MYDIR,$NOW_TIME,
    $COMMON_DIR,$COTEMP_DIR,$FILE_EXT,$COMMIT_FILE,$GUILDIDX_name,
    @msg,@itemno,@count,@ITEM,@DIG_POINT,@DIGNITY,@image,
    $deny_point,$IMAGE_URL,$IMAGE_EXT,$disp,$TRE,$TBE,
    $draw,$draws,@TRACE,$fail_common_rename,$ckeckok);
BEGIN { *CORE::GLOBAL::rand=sub {$main::draws++;return $main::draw*($_[0]//1)}; }
my $root=tempdir(CLEANUP=>1);
$COMMON_DIR="$root/common";$COTEMP_DIR="$root/stage";
mkdir $_ or die $! for ($COMMON_DIR,$COTEMP_DIR);
$FILE_EXT='.cgi';$COMMIT_FILE='commit';
sub GetPath {return "$_[0]/$_[1]$FILE_EXT"}
sub OpenAndCheck {open(OUT,'>:encoding(UTF-8)',$_[0]) or die $!}
sub RenameAndCheck {
    die "INJECTED_COMMON_RENAME\n" if $fail_common_rename;
    rename($_[0],$_[1]) or die $!;
    push @TRACE,'common-rename';
}
sub l {$_[0]}
sub GetTagImgKao {''}
sub GetTagImgItemType {''}
sub GetMoneyString {$_[0]}
sub GetMenuTag {''}
sub OutError {die "SOURCE_REFUSAL:$_[0]\n"}
sub Lock {push @TRACE,'lock';1}
sub DataRead {push @TRACE,'read-adapter';1}
sub CheckUserPass {push @TRACE,'auth-adapter';1}
sub ReadGuild {1} # reviewed fixture definitions, not cross-town discovery
sub PushLog {push @TRACE,'log';1}
sub RenewLog {push @TRACE,'renew';1}
sub DataWrite {push @TRACE,'street-stage-adapter';1}
sub DataCommitOrAbort {push @TRACE,'street-commit-adapter';1}
sub UnLock {push @TRACE,'street-unlock';1}
sub CoUnLock {push @TRACE,'common-unlock';1}
sub OutSkin {push @TRACE,'render';1}
sub bytes {my($f)=@_;open my $h,'<:raw',$f or die $!;my $s=do{local $/;<$h>};close $h;return $s}
sub put {my($f,$s)=@_;open my $h,'>:raw',$f or die $!;print {$h} $s;close $h or die $!}
my %sha=(
 'pinned-palace-s.cgi'=>'f3a918d6fcffd435e478dce53b812a89c1429ef2',
 'pinned-gd-m.cgi'=>'b18dd3166709e270e5cb2d525ce404bca80551ca',
 'pinned-inc-gd-entry.cgi'=>'f28cdcc1778534cbf1c84195df7ab749519be5a6',
 'pinned-gd-e.cgi'=>'5580c540934d04316ea4f37f9ea80aa213f2d628',
 'pinned-membership-user.cgi'=>'8e817c535d4cd17e68d65f0e2f67846a344b5094',
 'pinned-custom.cgi'=>'93d7f77df648df0c46e5dca4763afd3d2c48654b',
 'pinned-colock.cgi'=>'99ff12db08135879e1a570cef1424f6dd5bec151',
 '../../../custom/inc-palace.cgi'=>'d8ccf91ccb8978c2de542d5a19db59ca168ec47e');
for my $name(sort keys %sha){
 my $s=bytes("$FindBin::Bin/$name");
 is(sha1_hex("blob ".length($s)."\0".$s),$sha{$name},"exact $name");
}
require "$FindBin::Bin/pinned-custom.cgi";
# Only real CoDataCA, not CoLock/CoUnLock (single isolated process).
my $co=bytes("$FindBin::Bin/pinned-colock.cgi");
my $ci=index($co,"sub CoDataCA\n");die 'missing CoDataCA' if $ci<0;
eval "package main; no strict; no warnings;\n".substr($co,$ci) or die $@;
my $gm=bytes("$FindBin::Bin/pinned-gd-m.cgi");
my $ri=index($gm,"sub ReadEntry\n");die 'missing ReadEntry' if $ri<0;
eval "package main; no strict; no warnings;\n".substr($gm,$ri)."\n1;" or die $@;
sub RequireFile {
    return 1 if $_[0] eq 'inc-gd.cgi'; # preloaded guild fixture
    die "unreviewed include $_[0]" unless $_[0] eq 'inc-palace.cgi';
    return require "$FindBin::Bin/../../../custom/inc-palace.cgi";
}
sub run {
 my($name,%q)=@_;%Q=%q;@TRACE=();$ckeckok=0;
 my $r=do "$FindBin::Bin/pinned-$name.cgi";my $err=$@;
 die "unexpected $name: $err $!" if !defined($r) && $err!~/^(SOURCE_REFUSAL:|INJECTED_COMMON_RENAME)/;
 return defined $r;
}
$NOW_TIME=1000000;$MYDIR='alpha';$GUILDIDX_name=0;
@ENTRYnamelist=qw(no tm town id guild);@OtherDir=qw(alpha beta);
@DIG_POINT=(0,3,10);@DIGNITY=('base','first','second'); # label fixtures only
$IMAGE_URL='fixture';$IMAGE_EXT='.png';$TRE=$TBE='';
@ITEM=map {{name=>'fixture item',scale=>''}} 0..79;
sub shop {my($id,$guild)=@_;return {id=>$id,name=>"Owner$id",shopname=>"Shop$id",guild=>$guild,
    point=>20000,dignity=>0,item=>[(0)x79],user=>{}}}
my $a=shop(1,'');my $b=shop(2,'');@DT=($a,$b);%id2idx=(1=>0,2=>1);
$DT=$a;$DTtown={};$draw=.2;$draws=0;
RequireFile('inc-palace.cgi');
is_deeply(\@itemno,[57,68,31,41,53,47],'actual six tasks');
is_deeply(\@count,[300,50,2000,200,200,200],'actual six counts');
is($deny_point,20000,'actual UI point threshold');
$a->{item}[56]=299;
ok(run('palace-s'),'insufficient items renders normally');
is_deeply([$a->{item}[56],$a->{dignity},$draws],[299,0,0],'no inventory/dignity/RNG changes');
ok(!grep($_ eq 'street-commit-adapter',@TRACE),'insufficient items no commit');
$a->{item}[56]=300;
ok(run('palace-s'),'default town quest exact quantity');
is_deeply([$a->{item}[56],$a->{dignity},GetTownData('evt'),$draws],[0,1,1,1],'default quest consumes and advances town evt');
$DT=$b;$b->{item}[67]=50;$draw=0;
ok(run('palace-s'),'second shop uses changed town quest');
is_deeply([$b->{item}[67],$b->{dignity},GetTownData('evt'),$draws],[0,1,0,2],'second shop shares quest; zero remains valid');
$DT=$a;
for my $i(0..5){
 SetTownData('evt',$i);my $id=$itemno[$i];my $n=$count[$i];
 $a->{item}[$id-1]=$n+1;my $d=$a->{dignity};
 ok(run('palace-s'),"task $i source completion");
 is_deeply([$a->{item}[$id-1],$a->{dignity}],[1,$d+1],"task $i exact deduction and dignity");
}

%GUILD=(red=>['Red'],blue=>['Blue']);
%GUILD_DETAIL=(red=>{leadt=>'alpha',leader=>1,alpha=>1,member=>'member'},blue=>{member=>'member'});
my $live=GetPath($COMMON_DIR,'entry');my $stage=GetPath($COTEMP_DIR,'entry');
my $marker=GetPath($COMMON_DIR,$COMMIT_FILE);
sub read_entries {$Ecount=-1;ReadEntry()}
sub entries {my($s)=@_;put($live,$s);read_entries()}
$DT=$a;$a->{guild}='red';$b->{guild}='';
entries("1,999999,alpha,9,red\n2,1000000,alpha,8,red\n3,1000001,beta,8,blue\n");
ok(!defined($ENTRY[0]),'expired invite filtered');
is($ENTRY[1]{tm},$NOW_TIME,'equality still valid');
is_deeply(\@MYENTRY,[1],'only current guild own retained entry');
entries('');
ok(run('inc-gd-entry',edit=>'new',alpha=>2),'authorized invitation');
is(bytes($live),"1,1172800,alpha,2,red\n",'exact common invitation row and 48h lifetime');
read_entries();
ok(!run('inc-gd-entry',edit=>'new',alpha=>2),'duplicate denied');
is(bytes($live),"1,1172800,alpha,2,red\n",'duplicate does not publish');
%DTevent=(guildbattle=>1100000);
read_entries();
ok(run('inc-gd-entry',edit=>'new',beta=>2),'invitation handler during battle (isolated fixture)');
like(bytes($live),qr/2,1172800,beta,2,red/,'other street same ID distinct row');
$DT=$b;read_entries();
ok(!run('inc-gd-entry',edit=>'join',guild=>'red'),'actual join refuses active guildbattle');
is($b->{guild},'','membership unchanged');
ok(!grep($_ eq 'street-commit-adapter',@TRACE),'no street commit');
%DTevent=();
entries("4,1000000,alpha,2,blue\n3,1000001,alpha,2,red\n2,1000001,beta,2,red\n1,1000001,alpha,8,blue\n");
ok(run('inc-gd-entry',edit=>'join',guild=>'red'),'join from live invitation');
is($b->{guild},'red','selected guild assigned');
is(bytes($live),"2,1000001,beta,2,red\n1,1000001,alpha,8,blue\n",'all own-town own-ID invitations consumed; others remain');
is_deeply([grep(/^(street-commit-adapter|street-unlock|common-rename|common-unlock)$/, @TRACE)],[qw(street-commit-adapter street-unlock common-rename common-unlock)],'source street commit precedes common publication');

# Explicit failure injection at actual common rename; street commit is an adapter.
$b->{guild}='';entries("1,1000001,alpha,2,red\n");$fail_common_rename=1;
ok(!run('inc-gd-entry',edit=>'join',guild=>'red'),'injected common rename failure');
is($b->{guild},'red','handler membership already assigned');
ok(grep($_ eq 'street-commit-adapter',@TRACE),'street commit adapter already called');
is(bytes($live),"1,1000001,alpha,2,red\n",'old common invitation still live');
ok(-e $stage && -e $marker,'actual common staged file and marker retained');
$fail_common_rename=0;CoDataCA(1);
is(bytes($live),'','actual common recovery consumes pending invitation');
ok(!-e $stage && !-e $marker,'recovery clears common stage and marker');

$DT=$a;$a->{guild}=$b->{guild}='red';
%DTevent=(guildbattle=>1100000);
ok(run('gd-e',edit=>'name',id=>2,name=>'將'x20),'authorized 20-character title during battle');
is($b->{user}{_so_e},'將'x20,'title exact Unicode text');
ok(!run('gd-e',edit=>'name',id=>2,name=>'將'x21),'21-character title refused');
is($b->{user}{_so_e},'將'x20,'title unchanged on refusal');
ok(!run('gd-e',edit=>'fire',id=>1,guild=>'leave'),'cannot expel headquarters leader');
ok(run('gd-e',edit=>'fire',id=>2,guild=>'leave'),'expulsion handler during battle (isolated fixture)');
is($b->{guild},'','expulsion clears membership');
ok(!exists($b->{user}{_so_e}),'expulsion clears title');
$DT=$b;$b->{guild}='red';$b->{user}{_so_e}='member';
ok(run('membership-user',mode=>'guild',guild=>'leave'),'voluntary leave handler during battle (isolated fixture)');
is($b->{guild},'','voluntary leave clears membership');
ok(!exists($b->{user}{_so_e}),'voluntary leave clears title');
done_testing();
