use utf8;
# ドラゴンレース レース展開 2005/03/30 由來

if ($NOW_TIME > $DRTIME[2]) { $rcode=1; } else { $rcode=0; }

ReadRace($rcode);

@MYRACE=@{$RACE[$rcode]};
@R=@{$MYRACE[$RDS[1]]};
undef $RACELOG;
if (!$RDS[0])
	{
	Entry();
	}
	else
	{
	my $functionname="Race".$RDS[0];
	&$functionname;
	}
WriteRaceLog($rcode,$RACELOG) if $RACELOG;
WriteRace($rcode);
WriteDrLast();
RenewDraLog();
CoDataCA();
CoUnLock();
1;


sub WriteRaceLog
{
	my($f,$message)=@_;
	$f||=0;
	my $fn=GetPath($COMMON_DIR,"dra-rlog$f");
	open(OUT,">>:encoding(UTF-8)","$fn") or return;
	print OUT $message;
	close(OUT);
}

sub Entry
{
	# 出走スライム確定処理
	ReadDragon();
	ReadJock();

	if (scalar @RD < 3)
		{
		# 出走数が３つに満たない場合は全部落選しお流れ
		foreach(0..$#RD)
			{
			my $id=$RD[$_]->{dr};
			$DR[$id2dra{$id}]->{race}=1 if (defined $id2dra{$id});

			$id=$RD[$_]->{jock};
			$JK[$id2jk{$id}]->{race}=1 if (defined $id2jk{$id});

			undef $RD[$_];

			}
		PushDraLog($rcode+1,l("%1は出走竜不足のため開催が見送られました。",$R[0]));
		$DRTIME[$rcode+1]+=86400*2;
		$RDS[1]++;
		$RDS[1]=0 if ($RDS[1] > $#MYRACE);
		$RDS[2]=int(rand(2));
		}
		else
		{
		PushDraLog($rcode+1,l("%1の出走登録が締め切られました。",$R[0]));
		# 出走数が定員を超える場合は抽選
		if (scalar @RD > $R[9])
			{
			foreach(0..$#RD) { $RD[$_]->{rnd}=($RD[$_]->{prize} * 10000) + int(rand(10000));}
			if ($rcode)
				{
				@RD=sort{$b->{rnd}<=>$a->{rnd}}@RD;	#重賞レースは大きい順
				}
				else
				{
				@RD=sort{$a->{rnd}<=>$b->{rnd}}@RD;	#登竜レースは小さい順
				}
			foreach($R[9]..$#RD)
				{
				#落選
				my $id=$RD[$_]->{dr};
				$DR[$id2dra{$id}]->{race}=1 if (defined $id2dra{$id});

				$id=$RD[$_]->{jock};
				$JK[$id2jk{$id}]->{race}=1 if (defined $id2jk{$id});
				undef $RD[$_];
				}
			PushDraLog($rcode+1,l("出走竜多数のため，抽選が行われました。"));
			}

		#出走処理
		my $num=$R[9] - 1;
		foreach(0..$num)
			{
			next if !$RD[$_]->{name};
			$RD[$_]->{no}=$_ + 1;	#枠番振り直し
			my $id=$RD[$_]->{dr};
			$DR[$id2dra{$id}]->{race}=3 if (defined $id2dra{$id});

			$id=$RD[$_]->{jock};
			$JK[$id2jk{$id}]->{race}=3 if (defined $id2jk{$id});
			}

		$DRTIME[$rcode+1]+=3600*2;
		$RDS[0]++;
		}
	my $fn=GetPath($COMMON_DIR,"dra-rlog$rcode");
	unlink $fn if -e $fn;				#過去の実況ログ消去
	WriteDragon();
	WriteJock();
}

