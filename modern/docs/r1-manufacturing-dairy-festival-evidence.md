# R1 第53批：製作、鍛造、乳製品、節慶 USE

被覆核候選 `c5220eb0e31502bb91ef7ec45662f3ae04021c0c` / tree `0e6cd005b21b614cdcbcad9633160ca49473022d`。既有 R0 第39批已覆核測試逐項回連；不重跑、不修改原版/runtime/測試。

- 原版宣告：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`。38列原文索引與固定 DSL 行號逐一比對相等。
- Node `modern/tests/r2-declarative-use-effects.test.mjs` @ `4eca57d066fd6ce9da8689fe7aa2ae58326f1037`：共用 L61–163，配方個別 loop/負例詳 canonical manifest；Perl probe `modern/tests/original-perl/original-r2-declarative-use-probe.pl` @ `9ad1b09823edee54a25201949596063169553d91`，L63–196 原版 compiler/UseItem，職業公式手套，非完整生成 CGI。
- 受控原版 GetBuffer/GetItemNumber、UseItem/MakeAmount/CheckWholeStore 與 Node 共用 use-item memory CAS；比對 compiler、stock、wholesale、EXP、time、money、paytoday、receipt、draws；人工材料/EXP/job、固定時鐘及指定 draw；非正式 HTTP/v2、合法取得、自然 RNG 或完整 CGI。 lostbook 的保留/遺失為固定 500000 / 0 draw 受控分支，不表示自然命中；缺書與 nocount>1 僅 Node 拒絕；#26/0 飲用僅 metadata/drift，不納入本批。現有 #26/1–2/#35/0/#36/0 的其他正式證據保持。
- 34 新詳細列 + 4 既有詳細列補 Oracle/Node，118→152/220；USE Oracle/Node 70→108，尚68列無詳細引用。ITEM/EVENT/正式取得/HTTP/v2 下界不變；不將受控 CAS 改列正式 CAS。R0 233/233 不變。

| USE ID | DSL 行號 | 原版宣告節錄 | 限定執行證據 |
|---|---|---|---|
| 15/0 | 509–521 | time 30m；exp 2%；job 藥屋 times/job_drug_time_rate；name 製作治療劑；use 10 藥草；get 20 治療劑 80% | 受控成功差分；職業時間差分 |
| 15/1 | 522–534 | time 30m；exp 2%；name 製作高級治療劑；func lostbook；param 25；needexp 20%；use 10 治療劑；get 20 高級治療劑 80% | lostbook 保留/遺失，人工 EXP 門檻與指定 draws |
| 15/2 | 535–545 | time 30m；exp 2%；name 製作乙太；needexp 20%；use 20 藥草；get 20 乙太 64% | 受控成功差分；EXP metadata 非獨立拒絕 |
| 15/3 | 546–558 | time 30m；exp 2%；name 製作高級乙太；func lostbook；param 25；needexp 40%；use 10 乙太；get 10 高級乙太 90% | lostbook 保留/遺失，人工 EXP 門檻與指定 draws |
| 15/4 | 559–572 | time 30m；exp 2%；name 製作艾利草；func lostbook；param 50；needexp 60%；use 10 高級治療劑；use 10 高級乙太；get 5 艾利草 | lostbook 保留/遺失，人工 EXP 門檻與指定 draws |
| 16/0 | 585–597 | time 1h；exp 2%；job 防具屋 times/job_armor_time_rate；name 製作皮盾；use 24 野獸皮革；get 30 皮盾 80% | 受控成功差分；職業時間差分；缺書僅 Node 拒絕 |
| 16/1 | 598–609 | time 1h；exp 2%；name 製作皮胸甲；use 24 野獸皮革；get 32 皮胸甲 80% | 受控成功差分 |
| 17/0 | 623–635 | time 1h；exp 2%；job 武器屋 times/job_weapon_time_rate；name 製作木刀；use 20 樹枝；get 20 木刀 80% | 受控成功差分；職業時間差分 |
| 17/1 | 636–645 | time 1h；exp 2%；name 製作木杖；use 20 樹枝；get 20 木杖 80% | 受控成功差分 |
| 17/2 | 646–656 | time 2h；exp 2%；job 防具屋 times/job_armor_time_rate；name 製作木盾；use 10 木材；get 20 木盾 80% | 受控成功差分；職業時間差分 |
| 17/3 | 657–667 | time 2h；exp 2%；job 防具屋 times/job_armor_time_rate；name 製作木胸甲；use 10 木材；get 24 木胸甲 80% | 受控成功差分 |
| 66/0 | 681–695 | time 90m；exp 2%；job 道具屋 times/job_tool_time_rate；name 製作鐵耳環；need 1 鐵匠的技術；need 1 魔法的知識；use 20 鐵塊；get 20 鐵耳環 80% | 成功與指定職業差分；指定 NEED 缺失差分 |
| 66/1 | 696–713 | time 3h；exp 2%；name 製作秘銀戒指；func lostbook；param 50；needexp 25%；need 1 鐵匠的技術；need 1 魔法的知識；use 20 秘銀塊；use 2 魔石；get 20 秘銀戒指 60% | lostbook 保留/遺失兩受控分支 |
| 66/2 | 714–731 | time 4h；exp 2%；name 製作奧利哈鋼手鐲；func lostbook；param 50；needexp 50%；need 1 鐵匠的技術；need 1 魔法的知識；use 20 奧利哈鋼塊；use 2 魔石；get 20 奧利哈鋼手鐲 40% | lostbook 保留/遺失兩受控分支 |
| 66/3 | 732–752 | time 6h；exp 2%；name 製作那由多的項鍊；func lostbook；param 200；needexp 50%；need 1 鐵匠的技術；need 1 魔法的知識；need 1 行家的精隨；use 20 鐵塊；use 20 秘銀塊；use 20 奧利哈鋼塊；use 6 魔石；get 1 那由多的項鍊 | lostbook 保留/遺失兩受控分支；指定 NEED 缺失差分 |
| 20/0 | 766–779 | time 90m；exp 2%；job 武器屋 times/job_weapon_time_rate；name 鍛造鐵劍；need 1 鐵匠的技術；use 20 鐵塊；get 20 鐵劍 80% | 鐵/鋼成功差分；缺 NEED、職業時間差分 |
| 20/1 | 780–790 | time 3h；name 鍛造鋼鐵劍；needexp 20%；need 1 鐵匠的技術；use 40 鐵塊；get 20 鋼鐵劍 80% | 鐵/鋼成功差分 |
| 20/2 | 791–803 | time 3h；name 鍛造秘銀劍；func lostbook；param 50；needexp 40%；need 1 鐵匠的技術；use 20 秘銀塊；get 20 秘銀劍 60% | lostbook 保留/遺失兩受控分支 |
| 20/3 | 804–816 | time 4h；name 鍛造奧利哈鋼劍；func lostbook；param 50；needexp 60%；need 1 鐵匠的技術；use 20 奧利哈鋼塊；get 20 奧利哈鋼劍 40% | lostbook 保留/遺失兩受控分支 |
| 21/0 | 829–842 | time 90m；exp 2%；job 防具屋 times/job_armor_time_rate；name 製作鐵盾；need 1 鐵匠的技術；use 20 鐵塊；get 20 鐵盾 80% | 鐵/鋼成功差分；缺 NEED、職業時間差分 |
| 21/1 | 843–853 | time 3h；name 製作鋼鐵盾；needexp 20%；need 1 鐵匠的技術；use 40 鐵塊；get 20 鋼鐵盾 80% | 鐵/鋼成功差分 |
| 21/2 | 854–866 | time 3h；name 製作秘銀盾；func lostbook；param 50；needexp 40%；need 1 鐵匠的技術；use 20 秘銀塊；get 20 秘銀盾 60% | lostbook 保留/遺失兩受控分支 |
| 21/3 | 867–879 | time 4h；name 製作奧利哈鋼盾；func lostbook；param 50；needexp 60%；need 1 鐵匠的技術；use 20 奧利哈鋼塊；get 20 奧利哈鋼盾 40% | lostbook 保留/遺失兩受控分支 |
| 22/0 | 892–905 | time 120m；exp 2%；job 防具屋 times/job_armor_time_rate；name 製作鐵鎧；need 1 鐵匠的技術；use 20 鐵塊；get 20 鐵鎧 80% | 鐵/鋼成功差分；缺 NEED、職業時間差分 |
| 22/1 | 906–916 | time 210m；name 製作鋼鐵鎧；needexp 20%；need 1 鐵匠的技術；use 40 鐵塊；get 20 鋼鐵鎧 80% | 鐵/鋼成功差分 |
| 22/2 | 917–929 | time 210m；name 製作秘銀鎧；func lostbook；param 50；needexp 40%；need 1 鐵匠的技術；use 20 秘銀塊；get 20 秘銀鎧 60% | lostbook 保留/遺失兩受控分支 |
| 22/3 | 930–942 | time 270m；name 製作奧利哈鋼鎧；func lostbook；param 50；needexp 60%；need 1 鐵匠的技術；use 20 奧利哈鋼塊；get 20 奧利哈鋼鎧 40% | lostbook 保留/遺失兩受控分支 |
| 23/0 | 956–970 | time 90m；exp 2%；job 武器屋 times/job_weapon_time_rate；name 製作鐵杖；need 1 魔法的知識；use 20 鐵塊；use 2 魔石；get 20 鐵杖 80% | 鐵/鋼成功差分；缺 NEED、職業時間差分 |
| 23/1 | 971–982 | time 3h；name 製作鋼鐵杖；needexp 25%；need 1 魔法的知識；use 40 鐵塊；use 4 魔石；get 20 鋼鐵杖 80% | 鐵/鋼成功差分 |
| 23/2 | 983–996 | time 3h；name 製作秘銀杖；func lostbook；param 50；needexp 50%；need 1 魔法的知識；use 20 秘銀塊；use 6 魔石；get 20 秘銀杖 60% | lostbook 保留/遺失兩受控分支 |
| 23/3 | 997–1010 | time 4h；name 製作奧利哈鋼杖；func lostbook；param 50；needexp 70%；need 1 魔法的知識；use 20 奧利哈鋼塊；use 10 魔石；get 20 奧利哈鋼杖 40% | lostbook 保留/遺失兩受控分支 |
| 26/1 | 2377–2387 | time 72m；job 酪農家 times/job_cow_time_rate；name 輕微發酵；need 5 米諾陶洛斯♀；use 15 米諾牛乳；get 2 米諾優格 | 發酵、缺 NEED/牛乳負例及職業差分；不涵蓋 #26/0 飲用 |
| 26/2 | 2388–2398 | time 144m；job 酪農家 times/job_cow_time_rate；name 大量發酵；need 10 米諾陶洛斯♀；use 15 米諾牛乳；get 1 米諾起司 | 發酵、缺 NEED/牛乳負例及職業差分；不涵蓋 #26/0 飲用 |
| 35/0 | 2411–2420 | time 10m；job 酪農家 times/job_cow_time_rate；name 食用；use 1 米諾優格 | 食用及指定職業差分 |
| 36/0 | 2433–2442 | time 20m；job 酪農家 times/job_cow_time_rate；name 食用；use 1 米諾起司 | 食用及指定職業差分 |
| 27/0 | 2456–2464 | time 1h；name 食用；arg nocount；use 1 整隻烤火雞 100% 肚子真飽 | 單次差分；nocount>1 僅 Node 拒絕 |
| 28/0 | 2477–2485 | time 1h；name 喝；arg nocount；use 1 挑剔的朗姆酒 100% 感覺很好 | 單次差分；nocount>1 僅 Node 拒絕 |
| 29/0 | 2498–2506 | time 1h；name 穿著出門；arg nocount；use 1 時髦的靴子 100% 獨占了所有人的視線 | 單次差分；nocount>1 僅 Node 拒絕 |

第52批 CI 45861136133 queued；第51批 45857315261 in_progress（最近查詢），未將其當作新候選通過。R1-HTTP-01 未執行。
