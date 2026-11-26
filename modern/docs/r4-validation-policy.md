# R4 CI 與玩家驗證分層（D1 提案，未改 workflow）

現行 .github/workflows/verify-modernization.yml 仍執行完整 npm test、npm run audit、既有 demos、source blob pins 與 prove -v *.t；不變更或繞過既有 CI/保護。現行 npm test = node --test tests/*.test.mjs（Node >=22）。以下分層需先逐測試/子測試審查、明確清冊及審閱提交後才生效。

| 類型 | 通過條件 | 阻擋範圍 |
|---|---|---|
| 凍結原版 source pins/DSL | 全部一致 | 受影響功能與整合 |
| 確定性單元/原版 Perl 差分 | 公式、條件、RNG 消耗、成功/拒絕/副作用一致 | 對應功能 |
| 必要整合 | 真共用入口、HTTP、CAS、保存、權限及故障回復（依影響） | 對應功能與依賴 |
| 完整確定性回歸 | exact tree 全部必要測試通過 | 正式基線收錄 |
| 正式玩家/長程 | 合法取得、真 RNG/時鐘、自然販售、EVENT、持久化、重啟等原標準 | 待證不阻擋無關移植；確認缺陷阻擋相關交付 |

分層清冊須精確列每個 test path/name、必要 gate/玩家/混合、來源、依賴及原因，確保全集覆蓋、混合檔不可整檔排除必要測試、未知分類留在現行 gate；不得降低斷言、刪除歷史、靜默 skip、把紅燈變綠。保留原完整測試入口與原始 log；新增獨立玩家專項 job 須有明確候選 SHA/tree、可重現環境、原始 artifacts。已確認產品失敗必須回報及阻擋相關交付；未命中需記機會數及未觀察結果，不重選世界、不改機率。CI 未完成/環境障礙不可宣稱通過。

基礎命令：從 modern/ 執行 npm test、npm run audit、(cd tests/original-perl && prove -v *.t)；完整 workflow 所有 demos/pins 保留。每次收錄檢查 git diff --name-status、git rev-parse HEAD HEAD^{tree}，保存實際 checkout tree，不能僅用 PR head/merge preview 或過往綠燈替代。C 可在確切候選的 validation 分支新增測試，但不發布正式 runtime。

初始 CI 快照（重啟時）：#18 full 45841029509 in_progress、R4 45841029451 queued；#25 45844618603 in_progress；#26 45844865477 in_progress。動態結果以最新實際查詢為準，不是通過。
