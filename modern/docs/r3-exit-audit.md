# R3 共用自然販售／時間：退出驗收狀態（2026-11-23）

**R3 → R4 程式邊界補強：** `src/original-b41-playable-sale.mjs::projectR3PreEventTurn` 現提供**不寫入 period** 的單店已審閱前 EVENT 純投影，且要求 incoming `eventState` 已知；當 EVENT 尚未處理時，不得將 `null` 假充 `{}`。既有 `projectB41Sale` 保留相容玩家測試時間命令、完成後明確標記 EVENT 未知；內部 `original-b56-event-time-slice.mjs` 則改呼叫 R3 前 EVENT 投影，再由事件測試 fixture 負責附上所審閱的事件後繼狀態。此項是**階段責任分離，不是 EVENT 完整實作**。

> **R3 正式退出判定：已審閱的標準街單店單架／六商品來源範圍完成。** 原版售價／需求、自然販售、商品回呼、59 PLUS 與時間片已收斂至共用核心，並有實際 Perl 差分及真 HTTP/CAS／重啟證據。R4 才負責 EVENT／SortDT／36 小時期末；本判定不代表完整原版回合、玩家不限次數續營或整款遊戲完成。

## 已驗證且可重用的能力

| 能力 | 真來源與測試 | 邊界 |
|---|---|---|
| 六商品共用自然販售：#10、#40～#44 | 凍結 `inc-turn.cgi`、`market.cgi`、`item.cgi`；`r3-shared-natural-sale.test.mjs` 對 `original-r3-shared-sale-probe.pl` 24 組直接 Perl 差分 | 單店、單架、已審閱商品、時鐘不跨期 |
| 原版售價／需求與超價附加稅 | `original-r3-price-sale-probe.pl` 真 Perl 24 組（六商品 × 50/100/150/200%）；`shared-natural-sale-core.mjs` 使用來源定價、售量、GetSaleTax，明確分開 gross／net／taxtoday | 來源可設的 1–200% 定價；任意非來源價格、非零基礎稅仍拒絕 |
| ITEM FUNCTURN／FUNCSALE 分派 | `original-r3-item-callback-stage-probe.pl` 七組真 Perl 分派；#70 沒持有者在 60 秒仍抽一次 rand(1)，並在 FUNCSALE 後清除暫存 `_sale_count_` | 有 #70 真持有者的正式世界及其他街道未支援 |
| 自然販售→ITEM 回呼→市場 59 PLUS 的共用執行順序 | `original-r3-integrated-priced-turn-probe.pl` 六商品 × 2 價格 × 60／1800 秒共 24 組，Node 逐欄比較出售、rank、稅、批發庫存與亂數樣本消耗 | **只覆蓋 EVENT/SortDT/期末前的真來源子流程** |
| 真商品取得、上架、HTTP/CAS/存檔 | #14 真 BUY→USE 生成五種劍；`r3-real-sword-http-restart.test.mjs` 檢查單一引擎、百分比上架、稅、原版貨架、雙世代存檔和兩次重啟 | 未完成的 EVENT 狀態會阻止部分後續買入與劍類販售，不宣稱不限次數的完整經營 |
| 既有安全回歸 | B-41／B-42／B-43／B-54／R2-C/E 舊測試保留；原版 Perl／DSL SHA 不可修改 | 人工 fixture 只供算式差分，不算玩家合法取得 |

## R3 既定受控範圍以外的 R4 前置工作與後續擴充

1. **連續時間的 EVENT 前置語義。** 目前公開 `advance-source-time` 在執行受控自然販售及 PLUS 後，仍將 `period.eventState` 設為 `null`（未知）；不能把事件未執行當成沒有發生。#40～#44 第二次販售會因 EVENT 未知而拒絕。內部 `advance-source-time-reviewed-events` 需要外部提供 17 個 EVENT hash key 排列，是測試 fixture，不是原版 Perl `keys(%EVENT)` 順序。完整事件生命週期與 hash 順序屬 R4，但在正式驗證可連續經營之前不能宣告玩家時間行為已等價。
2. **來源原序的 SortDT／週期邊界。** 真凍結 `inc-turn.cgi` 在 ITEM FUNCSALE 後會 SortDT，必要時進入 36 小時期末，才執行 PLUS／EVENT。現行 R3 來源隔離片段不包含 SortDT／期末；R4 需把來源排序及跨期作為原子命令整合，不可直接略過。
3. **多架／多店與其供需互動、非零基本使用者稅、其他來源回呼、全部 116 USE** 均非六商品受控單店測試覆蓋。這些屬後續共用核心擴充與獨立玩法工作；不能從六商品差分外推全量等價。

## 退出決策

- **R3 受控範圍正式完成**：標準街單店單架六商品、1–200% 定價與 GetSaleTax、ITEM FUNCTURN／FUNCSALE 空持有者分派、59 PLUS、可檢驗的前 EVENT 時間片，三組各 24 案真 Perl 差分、HTTP/CAS/雙世代存檔與關服重啟。
- **原版完整時間命令尚未完成**：公開 B-41 仍將未執行的 EVENT 後繼標記為 `null`，部分劍類無法連續販售。這是 R4 EVENT／SortDT／跨期及 R5 完整經營閉環的阻塞，不能描述為原版時間已全面移植。
- **明確 R3→R4 接點**：`projectR3PreEventTurn` 只回傳 R3 已審閱的來源狀態，不覆寫 `period`，拒絕未知 incoming EVENT；B-56 內部事件 fixture 已使用該入口，但不是完成的 EVENT 引擎。R4 應補真正的事件結束／開始／NOWFUNC、17-key Perl hash 順序、SortDT／36 小時，再用原版 Perl↔Node↔HTTP 驗證連續營業。
- **驗收約束**：所有提交都需由同一 HEAD 的 Push／PR Actions `completed/success` 證明；PR #1 保持 Open／Draft／未合併，未修改 Notion。

PR #1 必須始終 Open／Draft／未合併，基底 `migration/standard-street-s1`；只修改 `test/task02-baseline-on-s1` 分支中的 `modern/`。本檔是狀態證據，不變更 Notion 正式任務。

## 2026-11-24｜雙展示架來源增量（獨立 PR #7，不能當作完整 R4）

在已合併的單架原版直接售價／B-43 存檔與玩家 UI PR #6 之上，新增對**單一商店、恰好兩架**的 R3 原版自然販售增量。來源必須由原版 ITEM #63 `use-item` 真正消耗初始擴建工具，不能把來源單架世界的 `showcasecount` 直接偽造成兩架；多店與第三架以上仍拒絕。

- 由凍結 `inc-turn.cgi` 原文取得兩架進行順序：第一架需求指數 4、第二架指數 3；同商品在兩架時共用一次 ITEM `buypeoplebase` 分母、原版 `market.cgi::GetMarketStatus` 需求與價格、來源庫存、`_sale_count_`；無條件人氣下降按兩架計算，商品維持費對有上架庫存仍按原版 1/10。
- `original-r3-multi-shelf-sale-probe.pl` 直接執行凍結 Perl 原始自然販售 + 59 PLUS，包含兩架同商品不同直接 G 售價、兩種劍、跨商品類型、首尾空架、共用僅一件庫存、雙空架、交換架位八類 source oracle。`r3-shared-natural-sale.test.mjs` 與同一共用計算器逐欄檢查 RNG 消耗、現金、稅、人氣、商品與原始臨時銷售計數。
- 真 HTTP 證明：開店→原版 #63/1 擴建 2 架→PLUS→真 #14 地圖市場購買與 USE 造劍→兩個索引架位上架（包含直接價格）→原版第一次 B-41 自然販售→拒絕未知 EVENT 第二時間片→B-43 兩代保存與 Node 重啟載入。只有相同提交 CI 成功後才可稱雙架受控來源驗收成立。
- 本增量**不**處理三至八架、多玩家／跨店自然販售、完整 `SortDT`、17-key EVENT／RNG 或 36h 期末；任何一次已發生但尚未審閱 EVENT 的時間片後繼仍 `null`、不得補空 `{}`。原 R4 PR #1、main、凍結 Core／DSL／Perl 不修改。
