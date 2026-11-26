# R0 第26批：R4 SortDT pre-EVENT 單店排序

固定上批 HEAD `d0091c4aa749146facb174caae95ecbb6b334c94`。兩份固定測試、Perl 排序 probe、Node SortDT projector、共用販售 stage 及原版排序/時間順序逐檔審閱。未本地重跑。

## r4-sorted-pre-event.test.mjs

- L110–118：source phase marker 守門，移除 `SortDT();` 拒絕，review 標記不可提交。
- L119–148：固定 now=1000000，memory initialize/open/60s PLUS → 買 #10 一件 → 以5000上架 → 30m 受控販售回呼；將 R3 已投影的 shop 輸入原版 Perl GetDTPoint/SortDT，與 R4 shop 比對；costtoday 絕對差 <1e-12，其餘欄位深比、index 0、point、draws 與 market 同 R3、無 period、原 world 不變。
- L149–159：錯誤 sort source 拒絕；第二個 `eventState:null` 負例傳 `reviewed` 而非 `reviewedR4`，可能先被 source-review guard 拒絕；未獨立證明 unknown EVENT guard。原斷言保留。
- L162–196：B56 明示反轉 compiled EVENT order，全部 eventDraws=999999；shop/market 與 sorted 結果相同、originalSortApplied/eventHashOrderSupplied、空 EVENT、原 world 不變；不證 Perl hash order 或 callback 命中。
- 分類：有效；Perl Oracle／Node 差分（單店 SortDT）、純 stage/負例。
- 限制：Perl 只接收 Node R3 shop，不是由原版自然販售一路獨立算到排序的整鏈 Oracle；R3/R4 market/draw 比較亦非獨立 Perl PLUS。固定時鐘/RNG、memory，非多店排序、跨期、正式玩家/CAS/HTTP/v2。

## original-r4-sorted-pre-event.t

- L9–24：open2 真 probe；退出0、JSON、rank=5010 不變、id/name index 0、point>0；沒有精確 point 值或多店排序斷言。
- 分類：有效；Perl Oracle（單店排序 smoke）。
- Fixture：人工 id1/status1/rank5010/rankingcount0/profitstock0/sale10000/tax0/pay5000。
- 限制：probe L19–27 擷取 source 函式及檢查 phase markers，L28–42 eval 真函式、單 shop JSON；不執行完整 inc-turn、不跨期或落盤。

## 原版／Node 來源與邊界

- `inc-func.cgi` L301–309：GetDTPoint 的 profitstock*3、當日收益與稅/支出、rankingcount 修正、高低分修正及 int。
- `core-detail.cgi` L4–14：過濾 active shops、算 point、rankingyesterday/point 排序、重建 id/name index；Node solo projector 只接受 id1/status1/named shop，不證原版多店或閉店。
- `inc-turn.cgi` L248–261、L280–289、L322、L351：ITEM cleanup → SortDT → conditional period → PLUS → CheckWholeStore → END/START/NOW。Perl probe 只檢查前四 phase markers；Node review 檢查至 END/START。
- `original-b41-playable-sale.mjs` L418–430、L504–524：callback stage 後 opt-in solo SortDT，才建立 plusWorld；無 boundary 的純 stage 不提交。`original-r4-sorted-pre-event.mjs` L11–45 source guard/非提交。`original-period-solo-sort.mjs` L40–66 只單店 safe numeric projection。
- 受控 buy/sale samples 來自 `original-market-buy10-probe.pl`（L46–51、L123–125）與 `original-b41-real-sale-probe.pl`（L118–138、L212–218）；原版 buy/showcase auth/IO stub；本測試只取 samples，未重新斷言其交易結果。
- 無新增商品／USE／EVENT 個別正向旗標；83 詳細 feature rows 與正式下界不變。未確認正式程式缺陷；負例隔離缺口為測試證據限制。
