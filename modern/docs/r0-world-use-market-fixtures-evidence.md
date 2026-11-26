# R0 第三十七批：人工 world USE 序列／市場與批發來源（未結案）

固定正式 baseline `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；候選父 HEAD `9a8804b82f102017d29a9138f581157de746144a`。三份測試完整讀取，另讀兩個 USE helper 及相應原版來源。全部為受控人工 fixture；R1 逐項下界不增加。

## original-perl/original-world-use-sequence.t

- 測試 blob: `3338080d6fcd95a20a93435901b8cb7adec8a8b6`；Perl Oracle（人工連續 USE／lostbook）。
- 來源／入口：`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/core-inc-item.cgi` @ `bb0244748088be0c5f1d24de7f9f7f05225278cb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`modern/tests/original-perl/OriginalFullUseLostbookHarness.pm` @ `2e84c60cf948011e0f32344dde4ee64299793964`；`modern/tests/original-perl/OriginalItemHelperHarness.pm` @ `d6d9627308f992c92483cdae609e1a7b299d3f2e`。
- 斷言：L14–26 前次 snapshot 手動傳入；L28–81 兩次 USE，stock[9,6,5]、money50→30、pay25→45、time968→986、EXP230→260、callback 前 EXP200→230、wholesale[3,0,-3]；L83–97 skip→hit；L99–113 zero-count 不觸發時間／批發／callback。
- 執行：同 Perl interpreter 反覆 run；原版 UseItem/MakeAmount、UseTime/GetItemUseTime、CheckWholeStore、原版 item helper 及 DSL lostbook（DSL L3174–3182）；RequireFile recorder。
- Fixture：人工 A/B/C、職業 worker、permit、固定 now1000、seed12/14；run 每次重建 @ITEM/@DT 並傳前次部分 state。
- 限制：不是79項真商品、不是完整世界/磁碟或連續 RNG state；originalPerlDraw 是重設 seed 後預計的第一個 rand，不是 callback 內直接截取；非正式 HTTP/CAS/v2/Node 差分。

## original-perl/showcase-market.t

- 測試 blob: `b6c054fe18b5270cdd6a88d1f003444ea5e3c50b`；Perl Oracle（人工市場統計／sc-s CGI）。
- 來源／入口：`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/market.cgi` @ `1aca77e9b373c25e53e445d64c101a7cc2246825`；`modern/tests/original-perl/sc-s.cgi` @ `0bada620cff769bed782707d61b87e48cce0a58c`。
- 斷言：L32–58 兩店 stock20、加權總值5000、均價250、min100/max300、前後期銷量各5、uppoint200及上下限；L60–123 原版 sc-s 標準100、直接175、137%、直接優先、缺貨/flag s/索引拒絕、清架。
- 執行：GetMarketStatus；do ./sc-s.cgi，真 UseTime/CheckCount，Lock/DataRead/CheckUserPass/DataWrite/commit/log/render stubs。
- Fixture：人工 #10 price100/popular80、兩店一架；固定 now1000000、600秒；非真商品宣告/合法取得。
- 限制：sc-s L18 先消耗時間才驗 L20–34；拒絕僅部分驗 commit=0，未斷言時間不變或 rollback；索引拒絕未查 commit；無 HTTP/browser/真鎖/CAS/v2。市場 extrema 跨次 reset、多架同品重算未驗。

## original-perl/whole-store.t

- 測試 blob: `17a353d6650ea58baab83d9ee4dc49ac1786f341`；Perl Oracle（人工批發定價／LIMIT）。
- 來源／入口：`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`。
- 斷言：L11–26 人工三商品 sort、動態50/固定30/最低1、ID-1；L28–44 兩店上限、負 stock 裁0、負 wslimit 絕對10、SetWholeStore；L47–81 #20/#25 手工編譯數值0.5/1.5，1/2/3店上限1/1/2與2/3/5及扣店內存量。
- 執行：真 GetWholeStore/CheckWholeStore/SetWholeStore（whole.cgi L4–75），無 compiler／CGI。
- Fixture：人工 #5/#10/#11 非原版商品屬性；#20/#25 LIMIT 對應 DSL L761/L2279（手填 wslimit），人工店內庫存。
- 限制：僅人工批發規則，無 admin compiler 執行、合法取得、正式市場交易、Node 差分或 v2；不把手填 #20/#25 當新增逐商品 Oracle 層。

## 邊界

本批未執行本機完整測試；第33、34批各自 exact CI 已核對，不替代新候選。無新增 feature refs，既有 87 詳細列、限定與正式下界不變。
