# R3 共用自然販售／時間：退出驗收狀態（2026-11-23）

**R3 → R4 程式邊界補強：** `src/original-b41-playable-sale.mjs::projectR3PreEventTurn` 現提供**不寫入 period** 的單店已審閱前 EVENT 純投影，且要求 incoming `eventState` 已知；當 EVENT 尚未處理時，不得將 `null` 假充 `{}`。既有 `projectB41Sale` 保留相容玩家測試時間命令、完成後明確標記 EVENT 未知；內部 `original-b56-event-time-slice.mjs` 則改呼叫 R3 前 EVENT 投影，再由事件測試 fixture 負責附上所審閱的事件後繼狀態。此項是**階段責任分離，不是 EVENT 完整實作**。

> **判定：共用販售計算與已審閱來源時間子階段均已通過，R3 整體退出條件仍未滿足。** 此文件記錄可直接驗證的能力與阻塞，不把 EVENT 未知轉換成空事件，也不借用 R4 的 36 小時決算冒充 R3 已完成。

## 已驗證且可重用的能力

| 能力 | 真來源與測試 | 邊界 |
|---|---|---|
| 六商品共用自然販售：#10、#40～#44 | 凍結 `inc-turn.cgi`、`market.cgi`、`item.cgi`；`r3-shared-natural-sale.test.mjs` 對 `original-r3-shared-sale-probe.pl` 24 組直接 Perl 差分 | 單店、單架、已審閱商品、時鐘不跨期 |
| 原版售價／需求與超價附加稅 | `original-r3-price-sale-probe.pl` 真 Perl 24 組（六商品 × 50/100/150/200%）；`shared-natural-sale-core.mjs` 使用來源定價、售量、GetSaleTax，明確分開 gross／net／taxtoday | 來源可設的 1–200% 定價；任意非來源價格、非零基礎稅仍拒絕 |
| ITEM FUNCTURN／FUNCSALE 分派 | `original-r3-item-callback-stage-probe.pl` 七組真 Perl 分派；#70 沒持有者在 60 秒仍抽一次 rand(1)，並在 FUNCSALE 後清除暫存 `_sale_count_` | 有 #70 真持有者的正式世界及其他街道未支援 |
| 自然販售→ITEM 回呼→市場 59 PLUS 的共用執行順序 | `original-r3-integrated-priced-turn-probe.pl` 六商品 × 2 價格 × 60／1800 秒共 24 組，Node 逐欄比較出售、rank、稅、批發庫存與亂數樣本消耗 | **只覆蓋 EVENT/SortDT/期末前的真來源子流程** |
| 真商品取得、上架、HTTP/CAS/存檔 | #14 真 BUY→USE 生成五種劍；`r3-real-sword-http-restart.test.mjs` 檢查單一引擎、百分比上架、稅、原版貨架、雙世代存檔和兩次重啟 | 未完成的 EVENT 狀態會阻止部分後續買入與劍類販售，不宣稱不限次數的完整經營 |
| 既有安全回歸 | B-41／B-42／B-43／B-54／R2-C/E 舊測試保留；原版 Perl／DSL SHA 不可修改 | 人工 fixture 只供算式差分，不算玩家合法取得 |

## R3 尚未達成的退出條件

1. **連續時間的 EVENT 前置語義。** 目前公開 `advance-source-time` 在執行受控自然販售及 PLUS 後，仍將 `period.eventState` 設為 `null`（未知）；不能把事件未執行當成沒有發生。#40～#44 第二次販售會因 EVENT 未知而拒絕。內部 `advance-source-time-reviewed-events` 需要外部提供 17 個 EVENT hash key 排列，是測試 fixture，不是原版 Perl `keys(%EVENT)` 順序。完整事件生命週期與 hash 順序屬 R4，但在正式驗證可連續經營之前不能宣告玩家時間行為已等價。
2. **來源原序的 SortDT／週期邊界。** 真凍結 `inc-turn.cgi` 在 ITEM FUNCSALE 後會 SortDT，必要時進入 36 小時期末，才執行 PLUS／EVENT。現行 R3 來源隔離片段不包含 SortDT／期末；R4 需把來源排序及跨期作為原子命令整合，不可直接略過。
3. **多架／多店與其供需互動、非零基本使用者稅、其他來源回呼、全部 116 USE** 均非六商品受控單店測試覆蓋。這些屬後續共用核心擴充與獨立玩法工作；不能從六商品差分外推全量等價。

## 退出決策

- **可認定完成的子成果**：來源審閱單店單架共用自然販售計算、1–200% 定價／GetSaleTax、空持有商品回呼順序及 59 PLUS 的真原版差分；真 HTTP/CAS/雙代存檔操作。
- **尚不能正式結案 R3 整體**：連續世界時間仍依賴未完的 EVENT 前置語義；受控測試通過不等於完整的時間命令等價。
- **後續接點**：先在 R4 實作真正可辨識的 EVENT 結束／開始／NOWFUNC 與其可重播亂數及 hash 順序，再接 SortDT／跨 36 小時。通過真 Perl↔Node↔HTTP 連續販售、兩代存檔及重啟後，再重新審查 R3／R4 的共同退出條件。每次提交都必須同一 HEAD Push／PR CI 完成成功。

PR #1 必須始終 Open／Draft／未合併，基底 `migration/standard-street-s1`；只修改 `test/task02-baseline-on-s1` 分支中的 `modern/`。本檔是狀態證據，不變更 Notion 正式任務。
