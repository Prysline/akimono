# B-39｜真正標準街 ITEM #70 FUNCTURN 回呼銜接自然販售與全部 PLUS

> **本階段不是完整原版 `inc-turn.cgi`。** 本輪直接執行原版自然銷售區段，接著只放入真正標準街 ITEM #70「那由多的項鍊」的原版 **`FUNCT _local_` 行內 Perl 主體**及原版 `inc-turn.cgi` 的 **`FUNCTURN` 逐項派送迴圈**，最後再直接執行 B-37 固定原版 59 項 `PLUS` 迴圈與完整 `CheckWholeStore`。仍刻意略過其他商品回呼、原版 FUNCSALE、`SortDT`、期末決算、真時間與世界資料 IO。

## 原版與隔離邊界

- 標準街固定 `custom/inc-item-data.cgi` 的79項商品中，**僅 ITEM #70** 宣告 `funct _local_`：`no 70`、`code sousyoku-nayuta`、`name 那由多的項鍊`、`price 50000`、`limit 1/0`、`pop 2d`、`cost 200`。原版 `inc-makeitem.cgi::GetBuffer` 編譯後人氣周期172800秒、`point=20000`；#70 沒有 `PLUS`，因此原編譯器預設0，來源批發限額0。
- 原版行內 `FUNCT` 真正計算：`my $rankup=$TIMESPAN/86.4;`；當值小於1，以原版 `rand(1)<$rankup` 決定進位，否則取整。若傳入的店家在**第一個展示架**展示ITEM #70 且標價**不高於50000**，加上人氣並上限夾至10000，並生成原版 `DebugLog` 文字。只有**在店家確實擁有 #70 庫存**時，原版 `FUNCTURN` 派送迴圈才將該店放入 `@item::TURN_DT`。以上條件直接以原版 Perl 執行核對，**沒有自行重新定義回呼**。
- 使用固定原版 `inc-turn.cgi` Blob `b8a4980275f475a952846a8d6072fad45f8dff50` 直接抽取 `#@@item funct 処理` 至 `#@@item funcs 処理` 的原文迴圈。沿用 B-38 的原版自然販售與 `GetMarketStatus/GetSaleTax/GetUserTaxRate`，B-37 的原版完整59項 PLUS 迴圈與原版 `CheckWholeStore`。來源 `GetLocalFunction` 產生檔案的原版形式為 `package item; sub _local_ { eval(<<'_eval_code_'); ... }`；隔離測試器在記憶體重建其包裝、直接使用固定 DSL 的原文主體，不執行原編譯器的頂層輸出檔與刪檔副作用。來源產生的 Perl 回呼檔本身不啟用 `strict`；B-39 測試器也不讓外層 `use strict` 誤繼承到這段原始行內回呼。原版程式／DSL 完全不改。
- 所有20份 SHA 鎖定的原版 Core 快照、兩份標準街 DSL 維持不變。固定 `DTpeople=500000`、`MAX_USER=50`、`SALE_SPEED=12`、`POP_DOWN_RATE=5`，只有一間真正新店、世界時鐘1000000、原版初始空白批發 CSV。外部明示的 rand 百萬分位樣本共用於自然販售、回呼和 PLUS，**不是** Node 及 Perl 偽亂數種子同步。

## 為何採固定8640秒

B-38 的1728秒測資若人工持有並展示商品 #70，原版維持費是 `(禮物卷5×10 + #70展示中的200/10)×1728/86400 = 1.4`。此值不符合 B-31 僅接受安全整數的 WorldState JSON 契約，**不可悄悄取整**。因此新 B-39 模型只接受經原版 Perl 對照的 **8640秒**（維持費變7；真空展示架僅持有禮物卷時為5）；B-37 對外 `reviewed-sparse-all-plus` 指令仍維持原本的**最多3600秒**。B-39 的固定8640秒僅透過程式內部明確限定的來源審核路徑呼叫 PLUS 數值核。

## 跨語言可重現的兩條情境

| 原始來源情境 | 真正新店、空展示架 | 人工持有並展示 #70 |
| --- | ---: | ---: |
| 首筆批發來源 | 原版空白 CSV | 原版空白 CSV |
| 起始商品 | #63工具1、#79禮物卷5 | 真新店基礎上，**人工加 #70 一件** |
| 第一展示架／價格 | 0／0 | 70／50000 |
| 原版自然銷售 | 0 | 0（來源 rand=0 的保留庫存測資） |
| 自然銷售後人氣 | 5007 | 5007 |
| 原版 FUNCTURN 派送 | #70無庫存、不對此店加人氣 | #70有庫存，真實行內回呼+100 |
| FUNCTURN 後人氣 | **5007** | **5107** |
| 本期維持費／`trush` | 5／5 | 7／7 |
| 此來源序列 `rand` 次數 | **60次** | **61次**（自然銷售先1次，PLUS後60次） |
| 原始批發 CSV 真有定義欄數 | 60 | **61**（含額外商品 #70 庫存上限修正） |

原始 Perl 和 Node 的現金、人氣、維持費、銷售件數、**全部79格批發數值**、原始稀疏 CSV、定義欄位與亂數消耗數量逐項一致。B-39 **直接在原版 Perl 執行** `FUNCT` 小於1的進位分支：60秒抽樣0時人氣+1，999999時+0；展示價格50001時不加，初始人氣9980而符合回呼條件時加到上限10000。Node 純函式亦與四個原版分支逐項對照。原版 DebugLog 的參數文字在測試器內被收集；**沒有啟用真正日誌持久化**。

## 新增檔案與 CI

- `modern/tests/original-perl/OriginalNayutaFuncturnHarness.pm`：精確取出原文 ITEM70 行內回呼、原版 FUNCTURN loop，並於 Perl 隔離環境依原版先自然銷售、後真回呼、再原版59項 PLUS 派送。
- `modern/tests/original-perl/original-nayuta-functurn.t`、`original-nayuta-functurn-probe.pl`：來源控制迴圈、回呼觸發／不觸發、原版亂數分支、人氣上限及來源 CSV。
- `modern/src/original-nayuta-functurn.mjs`、`modern/tests/original-nayuta-functurn.test.mjs`：明確來源門檻、兩種固定世界狀態、`expectedRevision` 和拒絕不變更、跨語言全部狀態對照、單獨回呼隨機分支。
- `modern/src/standard-street-module.mjs` 新增選用 `reviewed-nayuta-functurn`，僅在完整來源且 B-38 與 B-37 審核完成時暴露，保持 B-37 對外3600秒上限。新增 `npm run demo:original-nayuta-functurn`，納入 GitHub Actions。

**實作 SHA：** `0265bd0a632b6567ebbfbfd33e9ff6c27f15fcd3` 的 [Push CI](https://github.com/Prysline/akimono/actions/runs/44878580737)、[PR CI](https://github.com/Prysline/akimono/actions/runs/44878586451) 皆 success：**807／807 Node、1138／1138 真來源 Perl（32個 `*.t`）**；20份原始 Core Blob SHA、兩份原版 DSL audit 與原有回歸全部通過。文件提交後仍須再次確認**同一最新 HEAD**雙 CI 才能宣稱完整驗證。

## 仍未完成／B-40 候選

本階段**只驗證原版 #70 一筆 FUNCTURN**，不代表已完成其它商品回呼或 `FUNCSALE`。真正原版 `inc-turn.cgi` 還有 `RequireFile('inc-item.cgi')`、其餘商品／事件回呼、`SortDT`、期末決算、時間分割與人口／事件步驟，均未實作；沒有真正購買／進貨 #70 或 #10，也沒有持久化、登入、HTTP／UI、麵店與多人。因此正式 Notion 02／04／05 仍應保持「進行中」。

**B-40 建議：** 檢查原版 `inc-turn.cgi` 真正排序 `SortDT` 及 `FUNCSALE` 空／非空分支的清理效果，或優先從原版 `buy-s.cgi`／`whole.cgi` 審核真正 ITEM #10 市場購買，逐步替代 B-38 的人工進貨測資；任一新步驟仍需嚴格原版 Perl／Node 對照及同 SHA CI。
