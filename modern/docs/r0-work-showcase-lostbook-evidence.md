# R0 第九批：打工、展示架與完整 USE／lostbook 隔離證據

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。本批逐檔審閱 4 份既有測試；前候選 exact tree CI 1350 JS、2456 Perl 全通過。本批未在本機重跑。原版函式隔離執行與 Node 差分不等於現行正式玩家端到端驗收。

## original-inline-work-showcase-model.test.mjs

- 固定 blob：`16b80d49c4b22b28b57c49ac2dcb3ff497ab37fc`。
- 來源：`custom/inc-item-data.cgi`、`modern/tests/original-perl/inc-makeitem.cgi`、`modern/tests/original-perl/inc-func.cgi`。
- 斷言：32–81 來源順序、Core formatter、local alias；82–143 打工收入、回傳／雙 log、負數與零、無庫存時間 EXP；144–242 展示架擴縮、holes/tail、不可變及非法 fixture；244–282 13 個隔離 Perl 結果逐欄比較。
- 執行：projectOriginalBookWorkCallback／projectOriginalShowcaseResizeCallback → execFileSync Perl probe → source-extracted _local_1。
- Fixture：人工 money/count/param、展示架陣列與價格，WriteLog 記錄 stub；Perl 缺失可 skip。
- 限制：不執行完整 USE gate、費用、材料、時間、職業倍率、合法取得、真正 log/CGI/HTTP/v2；負數只屬原版 callback 邊界。
- 結論：有效，僅 Perl Oracle／Node 差分（純 callback 投影）。

## original-inline-work-showcase.t

- 固定 blob：`3ccc811e7b743d071898ac5f3fa336133e72a426`。
- 來源：`custom/inc-item-data.cgi`、`modern/tests/original-perl/inc-makeitem.cgi`、`modern/tests/original-perl/inc-func.cgi`。
- 斷言：14–43 owner 13/63、2/8 USE 與 alias、原文 wrapper；44–93 打工金額、格式、雙 log 及負數；95–160 展示架擴縮、等長不修尾、undef hole、原有 tail 保留。52 項斷言。
- 執行：OriginalInlineCallbackHarness::bootstrap / select_callback / fixture / run → eval exact body＋GetMoneyString。
- Fixture：合成 $DT/$USE/$count；WriteLog 僅記錄；未執行完整 compiler。
- 限制：callback 本身不消耗資源不代表整個 USE 免費；原版時間／職業／費用／取得／正式世界存檔未驗證。
- 結論：有效，僅 Perl Oracle（原版隔離 callback）。

## original-integrated-use-lostbook-model.test.mjs

- 固定 blob：`6d93500b23e652e57ac3a2551c644c4484bbea19`。
- 來源：`custom/inc-item-data.cgi`、`modern/tests/original-perl/use.cgi`、`modern/tests/original-perl/calc.cgi`、`modern/tests/original-perl/whole.cgi`、`modern/tests/original-perl/core-inc-item.cgi`。
- 斷言：20–56 source gate→材料→產出→市場→callback→EXP；57–184 交易結果、單次市場修正、錢／時間／EXP、0 gate、零庫存、重複材料負數、inactive、嚴格 < RNG；185–202 fixture 防護；203–229 13 個原版執行逐欄比較。
- 執行：projectOriginalIntegratedUseLostbook → Perl probe → source-extracted UseItem/MakeAmount/time/wholesale/helper/lostbook。
- Fixture：synthetic A/B/C slots、兩店、人工 recipe、fixed seed/observed Perl draw；RequireFile stub；Perl 缺失可 skip。
- 限制：非任一正式 ITEM/USE 的原始配方或實際玩家取得，不能把 A/B/C 當正式 item ID；未執行真正 loader、HTTP、CAS、v2、正式 clock/RNG。
- 結論：有效，僅 Perl Oracle／Node 差分（合成完整 USE 順序）。

## original-full-use-lostbook.t

- 固定 blob：`d891c5245e3d0741ca2737fb8ae91bdc1df4edbb`。
- 來源：`custom/inc-item-data.cgi`、`modern/tests/original-perl/use.cgi`、`modern/tests/original-perl/calc.cgi`、`modern/tests/original-perl/whole.cgi`、`modern/tests/original-perl/core-inc-item.cgi`。
- 斷言：22–52 exact routine/source order；53–108 count4→2、錢70→30、時間950→986、market [3,0,-3]、nested use 後 stock [9,6,5]、EXP200→260、skip/absent；110–177 金錢/EXP gate、cap、stale expold、空 stock、inactive、duplicate materials 負數。
- 執行：OriginalFullUseLostbookHarness::bootstrap / run → main::UseItem 與 item::lostbook。
- Fixture：合成 A/B/C recipe、seed 12/17 等、人工另一店；RequireFile recording-only；trace wrappers。
- 限制：真正原版函式隔離，不是完整 CGI；重複材料負數是人工 recipe 的原版行為，不宣稱現行 runtime 可觸發；不升格到正式 RNG/時間/存檔。
- 結論：有效，僅 Perl Oracle（合成完整 USE 順序）。

## 功能補鏈與不升格界線

來源 #13/0、#13/1 param 3000/10000，source USE 編號 1/2 對應矩陣 zero-based 0/1。#63/0–3 param 1–4 在 probe 13 cases 直接有值域；#63/4–7 的 param 5–8 共享 callback，但本批未有逐參數 Perl probe，維持既有 null（只保留 alias metadata 的測試層證據）。#63 的 1–8h、10000–80000G、自耗工具與 nocount 屬宣告，不因 callback 不直接扣款而判定正式施工免費。ITEM #63 只補共享 callback 語義，不是市場取得。B-30 的合成 A/B/C 非任何具體正式 item，故不硬連特定 USE；原版 negative material count 不宣稱現行可利用。
