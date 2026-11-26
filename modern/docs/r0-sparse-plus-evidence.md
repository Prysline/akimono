# R0 第十五批：B-35／B-36／B-37 sparse PLUS 逐檔證據

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。原版 harness 擷取 inc-turn PLUS fragment，編譯前覆寫 rand，呼叫完整凍結 CheckWholeStore 一次；GetTime 由原版編譯函數擷取，不啟動 CGI 頂層。Node memory command 使用明示 draws，並非真時鐘／真 RNG／HTTP/v2。全79槽向量比對不等同79項完整商品交易驗收。僅補鏈具明示狹義差分的 ITEM #1/#10/#40，其他向量證據保留在此，不升格取得或正式能力。

## original-sparse-all-plus.test.mjs
- B-37；blob `4223cad41dbcfffa912eed4d0dd7eb938be025fc`；176 行（含末行）。
- 斷言：48–75：79 槽 GetTime 與59 PLUS／20 absent、編譯漂移拒絕；77–114：三次 memory command 與 Perl 完整 stock/CSV/defined slots/draws 比較；115–161：缺／多／非法 draws、stale、未初始化或錯誤 world 原子拒絕；163–174：合法 gift 後供給。
- 執行：execFileSync Perl probe + Node memory world/command original-sparse-all-plus。
- 邊界：固定 now=1000000；60/600/3600 秒受控 PLUS；所有 79 槽數值比較；非完整 turn、售貨、callback 或正式存檔。
- 分類：有效（受控來源 Oracle／Node 差分），非正式玩家。

## original-sparse-all-plus.t
- B-37；blob `98fb73f44fc9aabc30716c3baece39757bfe7004`；61 行（含末行）。
- 斷言：15–43：59/20、GetTime、負值 cap、#10 stock、CSV 與 RNG；45–59：連續 cap、defined indices、#9/#62 時間值。
- 執行：Perl .t 直接 AllPlusHarness::run。
- 邊界：固定 now=1000000；60/600/3600 秒受控 PLUS；所有 79 槽數值比較；非完整 turn、售貨、callback 或正式存檔。
- 分類：有效（受控來源 Oracle），非正式玩家。

## original-sparse-multi-plus.test.mjs
- B-36；blob `6cc452350295346cf1059a5f55a05e4f9c146dca`；146 行（含末行）。
- 斷言：44–61：#1/#10/#40 固定 seconds 與 source gate；62–99：1/1/2 draws、-1/+1/-1、Perl stock/CSV/defined slots 與重複 cap；100–113：人工正 stock 驗負 PLUS；114–145：非法 span/draw/revision/unknown/uninitialized 原子拒絕。
- 執行：execFileSync Perl probe + Node memory world/command original-sparse-multi-plus。
- 邊界：其餘76 PLUS 人工歸零；人工正 stock 不算合法取得；非完整 turn/clock/CGI/v2。
- 分類：有效（受控來源 Oracle／Node 差分），非正式玩家。

## original-sparse-multi-plus.t
- B-36；blob `b0e69ee586dccea40fb7e8f5a09bb0fa234dbf30`；54 行（含末行）。
- 斷言：10–30：stock [0,1,0,0]、4 draws、defined [0,9,39,78]、79 CSV；31–52：重複／cap 與人工 seed [19,1,9,0]、RNG order。
- 執行：Perl .t 直接 MultiPlusHarness::run。
- 邊界：其餘76 PLUS 人工歸零；人工正 stock 不算合法取得；非完整 turn/clock/CGI/v2。
- 分類：有效（受控來源 Oracle），非正式玩家。

## original-sparse-wholesale-plus.test.mjs
- B-35；blob `4f5ae6ea011475d5e2d06f2b7b233e91223f0a55`；129 行（含末行）。
- 斷言：49–72：#10 optional capability、population 500000、max users 50、pins；73–102：memory reviewed-sparse-plus 與 Perl stock/CSV/defined slots/draw、連續 cap；103–127：非法／額外／重複 draws、stale／未初始化原子拒絕。
- 執行：execFileSync Perl probe + Node memory world/command original-sparse-wholesale-plus。
- 邊界：僅 #10 active PLUS；79槽 cap 是原版 CheckWholeStore，不是全商品合法供給／買入證明。
- 分類：有效（受控來源 Oracle／Node 差分），非正式玩家。

## original-sparse-wholesale-plus.t
- B-35；blob `603162e9c9f4b24b949de874e0594f1c144cda78`；46 行（含末行）。
- 斷言：10–30：#10 60秒 +1、draw 1、槽 [9,78]、CSV 0/empty；31–43：再次 stock2、cap10，保持 sparse indices。
- 執行：Perl .t 直接 WholesalePlusHarness::run。
- 邊界：僅 #10 active PLUS；79槽 cap 是原版 CheckWholeStore，不是全商品合法供給／買入證明。
- 分類：有效（受控來源 Oracle），非正式玩家。

