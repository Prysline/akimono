# R5 同世界整合驗收準備（未啟動）
全新獨立 v2 目錄、正式 npm run dev:local、明確跨期 opt-in、真伺服器時鐘及 RNG；同一 worldId/revision lineage，不改檔、不注入資產、EXP、clock、draws。
| 階段 | 客觀驗收 | 正式基線／依賴 |
|---|---|---|
| 開店、取得 | 真初始資產、PLUS 報價、市場買入、#13 零價與 #78、資金與 revision 一致 | 受控 P5；全商品 #22 |
| 製作、職業、打工 | P1–P4 配方及職業／EXP，P5 真收入超過非工作收入上界的實際支出；同一世界 | 各自已驗收，不等於整合 |
| 展示、自然販售 | 合法擴建 1→2→8 架、逐架售出、商品回呼、稅、維持費、禁止上架仍拒絕 | 普通多架已受控；完整多架時間 #22 |
| EVENT、跨期 | EVENT 生命週期、SortDT、PLUS、36h 決算、收入支出，未知 EVENT 原子拒絕 | 單架受控；全量 #22，外部 #18/#16 |
| 保存、重啟、續營 | v2 A/B、lineage、HMAC、checkpoint 輪替、兩次重啟後繼續交易與跨期；偽造與 revision 衝突拒絕 | 受控 P3–P5；完整同世界 #22/R5 |
退出：全數合法操作實際發生，記錄 receipt、revision、source proof、RNG/時間重播、exact HEAD/checkout tree/CI。此 PR 只定義門檻，不啟動 R5。
