# R0 開店、展示、PLUS、熟練度與 USE 前置條件補審

正式 base `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。8 檔逐檔完整讀取；固定測試／來源／入口 blob。Node 來源片段或 fixture 不升格正式玩家，Perl 只算實際執行的隔離片段。已確認前一候選 exact CI 全綠；本次僅證據清冊修訂，仍需自己的 CI。

## standard-init.test.mjs

- 測試 blob: `89b13f886f9c1be4e630b0968e81e457263a63c4`；來源宣告／靜態 parser
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`
- 執行入口: modern/src/parse-dsl.mjs；`1e81a659e8f24ef0e4aa1124adb37e2c47aec234`
- Fixture: 直接 parse frozen item DSL；DEFINE/FUNCNEW/ITEM
- 斷言: NewShopMoney100000、NewShopTime12*60*60、初始工具63×1／券79×5、FUNCNEW raw Perl split 與 id-1 寫入、timeeditshowcase10m
- 限制: 只檢查 raw declaration，未執行 FUNCNEW、開店 CAS、合法取得或 HTTP

## standard-street-model.test.mjs

- 測試 blob: `b0bb0111e39285b453cf72ff71f3017f4b109746`；來源守門／純模型
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- 執行入口: modern/src/standard-street-model.mjs；`c624fbb9f2c141bd539b7dfec86a48d3ba373efc`
- Fixture: 固定 now1000000、shop42、icon3；直接填 stock/showcase/time；2 店價格/人氣 fixture
- 斷言: 79 ID unique、source order非ID、初始資金100000/12h/63與79 grant、rank5010/1 shelf/79 slots/ledger0、獨立 inventory；72h cap、600s edit、maxMoney999999999；安全數字 parser；price override/比例 clamping、清架、拒非法 shelf/stock/ID/時間、300s 時可欠時間；市場 weighted 250、stock20、sale5、uppoint200，10/1000/100 clamps、缺人氣 fixture拒絕
- 限制: 純模型合成庫存、兩店市場 fixture；展示價裁切不是現行 HTTP 嚴格拒絕契約，未驗多店／自然販售／v2

## wholesale-turn-model.test.mjs

- 測試 blob: `9c59c03b9d78ce90e5fb20aa90bfbe7bf755accd`；來源守門／純 PLUS 投影
- 原版來源: `custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-turn.cgi` @ `b8a4980275f475a952846a8d6072fad45f8dff50`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- 執行入口: modern/src/standard-street-model.mjs → modern/src/wholesale-turn-model.mjs；`c624fbb9f2c141bd539b7dfec86a48d3ba373efc`；`7b111421c5b03b4667b3fc909d7335a696dbb2a4`
- Fixture: 合成兩店空庫存、600s/pop100000/MAX_USER50、明確 RNG 0/.9/0.99
- 斷言: 固定 #1 -20m、#10 +20m、#40 -1h 與 wslimit/source line；原版 PLUS RNG/cap markers；#10 stock3→5 draw1、較高 draw→8，負 PLUS 向零、低量第二 draw 0/0.99 分支；held17 剩cap3、over cap→20、zero pop 不抽樣但 cap；拒零/負 span、非法 RNG、其他 item inventory、source drift、unsafe shapes；immutability
- 限制: 僅三 ITEM isolated PLUS，不是全59/正常時間、正式合法入手或市場交易；未實跑 Perl in JS

## period-experience-model.test.mjs

- 測試 blob: `ba864c5b2501a3de750e3f891000e0d614378fad`；來源守門／純 EXP 投影
- 原版來源: `modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- 執行入口: modern/src/period-experience-model.mjs → modern/src/world-shop-history-model.mjs；`c4d6944409c3e2fbe72b7c3a4c8149532d7e63b8`；`0776032a81120940c8505bf79f0adba30e60faab`
- Fixture: 合成 EXP/history pair；32-field 舊 world fixture
- 斷言: rotation today→yesterday、clear today；decay floor(60/1000)+5、100→89、17→11、1000→935、刪<=0；gain80×3=240、cap1000、total3600、distinct excess redistribution 1000/538/638/687/737；tie overflow fail closed、selected protected、拒 invalid counts/coefficients/IDs/duplicate/unsafe maps；canonical order、immutable；parser→roll→gain
- 限制: 不執行全部 period、USE、callbacks、guild、CAS 或持久化；tie 拒絕屬現代安全限制

## period-stock-use-model.test.mjs

- 測試 blob: `92f8935b352f244180170a5827ccc398e67f4b1c`；來源守門／純 stock/USE preflight
- 原版來源: `modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`
- 執行入口: modern/src/period-stock-use-model.mjs；`ba16fab527fdbe8b7b4e877e6d11ab05a35e6dcb`
- Fixture: 79 slots 合成 stock/limits、farmer/permit、money120/time100/EXP10、callbacksConfirmedAbsent、注入 RNG
- 斷言: period cap then Perl int；10.9/7.8/2.9→10/7/2，保留負 stock/cap風險；USE EXP/job/point/pop/event gates、money/time/material count floor、proba0 NEED一份、其他 full count；拒 callback/zero time/unsafe arithmetic/duplicate/material fields；small MakeAmount proba0/1000不抽，500時6 draws=3，0.5 excluded，>=20 未支援；input/nested immutable
- 限制: 無實際扣資、callback 或 commit，負值保留僅原版行為證據、非正式 WorldState 允許；小量 RNG 不是現行全 MakeAmount

## new-store.t

- 測試 blob: `3e48f8624ac824b6497ee7ff9b17492c7e51e5fd`；Perl Oracle（隔離 new.cgi）
- 原版來源: `modern/tests/original-perl/new.cgi` @ `9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7`
- 執行入口: isolated Perl Test::More, fixed source fragments/entrypoint
- Fixture: 固定 NOW1000000、nextid42、MAX_ITEM79；FUNCNEW disabled；DataRead/Write/commit/lock/log/render stub
- 斷言: 原版 do new.cgi 至 OutSkin、ID42/status1/money100000/12h/1 shelf/rank5010/79 slots/lastlogin/foundation/IP；#63/#79均0（未編譯 FUNCNEW）；DataWrite/commit/UnLock 各一次
- 限制: 沒有執行 FUNCNEW grant，沒有真 IO/auth/lock；不可用此 Oracle 宣稱初始工具或券已由原版回呼執行

## period-experience.t

- 測試 blob: `c6978b4ee60cdd01532b80bc9d5fa6712ddf13a0`；Perl Oracle（固定片段）
- 原版來源: `modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`
- 執行入口: isolated Perl Test::More, fixed source fragments/entrypoint
- Fixture: 讀取原版原文，抽 rotation/decay/gain 編譯隔離 sub，設定60/5/3600；合成 hashes
- 斷言: 抽取 marker/compile；today reference 移轉、fresh today、100→89、6→1、刪5/1、1000→935；gain100→340、990→1000、missing→10、zero exp bypass；distinct total overflow=3600 selected保留、expold、rate0固定5仍扣
- 限制: 非完整 period 或 USE；配置常數是測試設定，hash tie 未測，不宣稱正式重播或持久化

## period-stock-use.t

- 測試 blob: `1ad66050b194e66a4df87c1ad23af1680f254904`；Perl Oracle（固定片段）
- 原版來源: `modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`
- 執行入口: isolated Perl Test::More, fixed source fragments/entrypoint
- Fixture: 抽原版 period stock/UseItem gate/CheckUseItem material loop/完整 MakeAmount；MAX_ITEM3、syntheticUseTime stub、srand44
- 斷言: cap/int 10.9→10等；-1.9→-1；EXP/job/point/pop/event不足0、money/time floor2、material count4→2、CheckUseItem 1/0；MakeAmount p<=0→0、>=1000→10、small seed replay/range、>=20 seed replay、zero count0
- 限制: 3-slot fixture，不執行完整 USE/period；固定種子僅 Perl reproducibility 非 JS 同亂數流；未測真 callback/扣款/IO

