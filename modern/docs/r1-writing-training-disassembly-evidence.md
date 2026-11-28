# R1 第52批：寫書、修行、解體／打包 31 USE 詳細證據

被覆核候選 `1b5ea7b1a4fb802fd6937066ce89939919879a88` / tree `b376709e715e313e03f6e0e346e79dab30f94acd`；固定基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。沿用 R0 第39批已覆核測試，未重跑、不重分類、不變更 runtime。

- 原版宣告：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`，以下行號逐筆對應 canonical source declarations。
- Node 測試：`modern/tests/r2-declarative-use-effects.test.mjs` @ `4eca57d066fd6ce9da8689fe7aa2ae58326f1037`，L61–112 fixture／Perl probe，L114–163 編譯欄位、完整庫存／市場／EXP／時間／金錢／paytoday／receipt／draw 數差分；L185–191 逐項執行 8+4+19。L192–197 僅 #39/0 缺 NEED 負例；L198–202 僅 #10/0、#39/0、#39/1、#39/12 指定職業差分。
- Perl probe：`modern/tests/original-perl/original-r2-declarative-use-probe.pl` @ `9ad1b09823edee54a25201949596063169553d91`，L63–114 擷取實際 DSL、GetBuffer；L136–145 GetItemNumber；L146–175 人工 world；L176–196 手套職業公式及原版 UseItem。原版時間／前置條件 scope 不是完整 CGI。
- 人工材料／EXP／job、固定時鐘與 draw；原版 GetBuffer/GetItemNumber + UseItem/MakeAmount/CheckWholeStore；Node 共用 use-item memory CAS；逐值比較編譯、庫存、市場、EXP、時間、金錢、paytoday、receipt 與 draw 數。非正式 HTTP/v2、合法取得、自然 RNG 或完整生成 CGI。 不將單一成功 fixture 或固定 500000 draw 升格為所有分支／全機率驗證；formalCommand、cas 等正式玩家 gate 不升格。源宣告與前置條件另保留，並非所有負例均測。
- 31 列由無詳細引用變為有詳細引用，87→118/220；USE Perl/Node 下界 39→70。ITEM/EVENT 與正式取得、HTTP/v2 下界不變；102 列仍未詳細覆核。R0 233/233 不重做。

| USE ID | 原版行號 | 原版宣告節錄（保留來源值） |
|---|---|---|
| 10/0 | 84–99 | time 3h；exp 2%；job 書屋 times/job_book_time_rate；name 寫作『藥劑調和入門』；use 1 書本寫作工具；use 30 藥草；use 10 治療劑；use 10 乙太；get 5 藥劑調和入門 40% |
| 10/1 | 100–110 | time 3h；exp 2%；name 寫作『皮革加工入門』；use 1 書本寫作工具；use 50 野獸皮革；get 5 皮革加工入門 40% |
| 10/2 | 111–122 | time 3h；exp 2%；name 寫作『木工入門』；use 1 書本寫作工具；use 50 樹枝；use 10 木材；get 5 木工加工入門 40% |
| 10/3 | 123–137 | time 6h；exp 2%；name 寫作『裝飾品加工入門』；use 1 書本寫作工具；need 1 皮革加工入門；need 1 木工加工入門；use 20 鐵塊；use 5 秘銀塊；use 5 奧利哈鋼塊；get 5 裝飾品加工入門 40% |
| 10/4 | 138–151 | time 6h；exp 2%；name 寫作『劍的鍛造方法』；needexp 20%；need 1 鐵匠的技術；use 1 書本寫作工具；use 20 鐵塊；use 1 木刀；get 5 劍的鍛造方法 40% |
| 10/5 | 152–165 | time 6h；exp 2%；name 寫作『盾的製作方法』；needexp 20%；use 1 書本寫作工具；need 1 鐵匠的技術；use 20 鐵塊；use 1 皮盾；get 5 盾的製作方法 40% |
| 10/6 | 166–179 | time 6h；exp 2%；name 寫作『鎧的製作方法』；needexp 20%；need 1 鐵匠的技術；use 1 書本寫作工具；use 20 鐵塊；use 1 皮胸甲；get 5 鎧的製作方法 40% |
| 10/7 | 180–193 | time 6h；exp 2%；name 寫作『杖的製作方法』；needexp 20%；need 1 魔法的知識；use 1 書本寫作工具；use 20 鐵塊；use 1 木杖；get 5 杖的製作方法 40% |
| 37/0 | 208–220 | time 12h；exp 5%；name 成為鐵匠學徒；use 1 修行套組；use 20 鐵塊；use 5 秘銀塊；use 3 奧利哈鋼塊；get 1 鐵匠的技術 |
| 37/1 | 221–231 | time 12h；exp 5%；name 魔法的基礎講座；use 1 修行套組；use 30 魔石；get 1 魔法的知識 |
| 37/2 | 232–250 | time 12h；exp 5%；name 成為知道差異的男人(女人)；needexp 20%；use 1 修行套組；use 3 藥草；use 3 野獸皮革；use 3 樹枝；use 3 木材；use 3 鐵塊；use 3 秘銀塊；use 3 奧利哈鋼塊；use 3 魔石；get 1 行家的精隨 |
| 37/3 | 251–264 | time 12h；exp 5%；name 學習解體的精髓；use 1 修行套組；use 20 皮胸甲；use 20 皮盾；use 20 木杖；use 20 木刀；get 1 解體屋之魂 |
| 39/0 | 277–287 | name 將木刀/木杖解體；time 4h；exp 1%；job 武器屋 times/job_weapon_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 木刀；use 10 木杖；get 50 樹枝 80% |
| 39/1 | 288–298 | name 將皮盾/胸甲解體；time 4h；exp 1%；job 防具屋 times/job_armor_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 皮盾；use 10 皮胸甲；get 50 野獸皮革 80% |
| 39/2 | 299–309 | name 將木盾/胸甲解體；time 4h；exp 1%；job 防具屋 times/job_armor_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 木盾；use 10 木胸甲；get 50 樹枝 80% |
| 39/3 | 310–321 | name 將鐵劍/杖解體；time 4h；exp 1%；job 武器屋 times/job_weapon_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 鐵劍；use 10 鐵杖；get 50 鐵塊 80%；get 10 魔石 50% |
| 39/4 | 322–332 | name 將鐵盾/鎧解體；time 4h；exp 1%；job 防具屋 times/job_armor_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 鐵盾；use 10 鐵鎧；get 50 鐵塊 80% |
| 39/5 | 333–344 | name 將鋼鐵劍/杖解體；time 5h；exp 1%；job 武器屋 times/job_weapon_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 鋼鐵劍；use 10 鋼鐵杖；get 100 鐵塊 80%；get 10 魔石 50% |
| 39/6 | 345–355 | name 將鋼鐵盾/鎧解體；time 5h；exp 1%；job 防具屋 times/job_armor_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 鋼鐵盾；use 10 鋼鐵鎧；get 100 鐵塊 80% |
| 39/7 | 356–367 | name 將秘銀劍/杖解體；time 6h；exp 1%；job 武器屋 times/job_weapon_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 秘銀劍；use 10 秘銀杖；get 50 秘銀塊 70%；get 20 魔石 50% |
| 39/8 | 368–378 | name 將秘銀盾/鎧解體；time 6h；exp 1%；job 防具屋 times/job_armor_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 秘銀盾；use 10 秘銀鎧；get 50 秘銀塊 70% |
| 39/9 | 379–390 | name 將奧利哈鋼劍/杖解體；time 7h；exp 1%；job 武器屋 times/job_weapon_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 奧利哈鋼劍；use 10 奧利哈鋼杖；get 50 奧利哈鋼塊 60%；get 30 魔石 50% |
| 39/10 | 391–401 | name 將奧利哈鋼盾/鎧解體；time 7h；exp 1%；job 防具屋 times/job_armor_time_rate；use 1 拆解/打包工具；need 1 解體屋之魂；use 10 奧利哈鋼盾；use 10 奧利哈鋼鎧；get 50 奧利哈鋼塊 60% |
| 39/11 | 402–413 | name 將機器人解體；time 12h；use 1 拆解/打包工具；need 1 解體屋之魂；use 1 看門機器人；get 300 鐵塊；get 50 秘銀塊；get 10 奧利哈鋼塊；get 30 魔石；get 1 禁斷之書；get 1 木材 |
| 39/12 | 414–423 | name 將一套皮製裝備打包；time 4h；exp 1%；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 10 皮盾；use 10 皮胸甲；get 10 皮製裝備一套 |
| 39/13 | 424–435 | name 將一套木製裝備打包；time 5h；exp 1%；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 10 木刀；use 10 木盾；use 10 木胸甲；use 10 木杖；get 10 木製裝備一套 |
| 39/14 | 436–447 | name 將一套鐵製裝備打包；time 6h；exp 1%；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 10 鐵劍；use 10 鐵盾；use 10 鐵鎧；use 10 鐵杖；get 10 鐵製裝備一套 |
| 39/15 | 448–459 | name 將一套鋼鐵製裝備打包；time 7h；exp 1%；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 10 鋼鐵劍；use 10 鋼鐵盾；use 10 鋼鐵鎧；use 10 鋼鐵杖；get 10 鋼鐵製裝備一套 |
| 39/16 | 460–471 | name 將一套秘銀製裝備打包；time 8h；exp 1%；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 10 秘銀劍；use 10 秘銀盾；use 10 秘銀鎧；use 10 秘銀杖；get 10 秘銀製裝備一套 |
| 39/17 | 472–483 | name 將一套奧利哈鋼製裝備打包；time 9h；exp 1%；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 10 奧利哈鋼劍；use 10 奧利哈鋼盾；use 10 奧利哈鋼鎧；use 10 奧利哈鋼杖；get 10 奧利哈鋼製裝備一套 |
| 39/18 | 484–492 | name 慶祝用品を梱包する；time 8h；job 道具屋 times/job_tool_time_rate；use 1 拆解/打包工具；use 1 整隻烤火雞；use 1 挑剔的朗姆酒；use 1 時髦的靴子；get 1 慶祝用套組 |

環境：Node 22.16.0、Perl 5.40.1 可用；本容器 `git ls-remote` 報 `Could not resolve host: github.com`。本批為來源證據索引，不是新執行結果。CI 45857315261 最近查詢 in_progress，不沿用舊綠燈；新提交待 CI。
