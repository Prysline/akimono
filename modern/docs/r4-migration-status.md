# R4 移植、整合與正式驗證清冊（D1 初始快照）

四維狀態：來源 未審/已審；移植 未做/候選/通過；整合 未接/候選/通過；正式玩家 未測/待證/通過/確認缺陷。未知填「待逐項核對」而不臆測；本表以功能包作索引，不是逐 ITEM/USE/EVENT 的全量稽核，也不計算完成百分比。正式已合併範圍見 current-baseline-status.md。候選不能以舊 CI 或註冊數量提升為通過。

| 功能包 | 來源 | 移植 | 整合至 D | 正式玩家 | 責任/依賴 |
|---|---|---|---|---|---|
| P1–P5 已核准範圍 | 已審 | 通過 | 通過（起始基線） | 依各已驗收範圍通過 | D 保留 |
| R4 正常取得、USE、EXP、上架、販售、回呼 | 待逐項核對 | 候選 | 未接 | 待逐項核對 | A；P1–P5 不重做 |
| R4 多架、EVENT、維持費、決算、關店封存 | 待逐項核對 | 候選 | 未接 | 待逐項核對 | A/D；時間與外部依賴 |
| 宮殿、軍隊、叛亂、領主、稅務及 guard | 待逐項核對 | 候選 | 未接 | 歷史證據保留，待 exact tree 核對 | B/D |
| 多店、公會、龍族、共同/街道交易、完整外部期末 | 待逐項核對 | 候選（含 noncommittable） | 未接 | 待證 | B/D；不得以 sandbox 當正式 |
| #62/1、#62/2、#65/0–2 | 待逐項核對 | 待逐項核對 | 未接 | 待證 | A/B/D；外部能力 |
| R1-HTTP-01 三路由 strict repro | 待逐項核對 | 不適用（缺陷調查） | 不適用 | 待證 | C；未實跑，不宣稱越權 |

A [#22 最新交接](https://github.com/Prysline/akimono/pull/22#issuecomment-7195663984)：靜態 79 acquisition/67 showcase/66 sale/116 USE/19 EVENT 映射，不是執行證據。B [#18 交接](https://github.com/Prysline/akimono/pull/18#issuecomment-7195127441)：領主歷史驗收、guild/dragon/joint/browser 新候選待核。C [#26](https://github.com/Prysline/akimono/pull/26)：233/233 分類（200 有效、33 歷史），190/233 已審閱/覆核、43 待覆核；220 rows×14 層、87 詳細列是稽核範圍，不是功能完成率。

每個後續功能列須附 source SHA/tree、證據路徑/測試類型、CI checkout SHA/tree、失敗/跳過原因、外部依賴、可重現步驟。保留同功能不同版本的歷史證據，不回填無依據的通過。
