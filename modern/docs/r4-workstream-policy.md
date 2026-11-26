# R4 四窗工作政策（D1 審閱候選，2026-11-26 UTC+8）

本文件為 D 窗整合分支的政策提案；正式基線及既有 CI 保護未變更。經審閱及授權收錄後成為正式工作政策。舊文件的證據與原有正式玩家驗收標準保留；舊的全量玩家驗收先於任何無關移植之排程限制不再作為本候選工作線的開工原則。

## 目標與證據

忠實移植原版，而非重設平衡性。凍結 Perl/CGI/DSL/Core；來源歧義標記、研究，不自訂規則。機率、成本、收益、難度、EXP、事件條件與 RNG 消耗順序皆依來源。受控測試可用人工世界/庫存/EXP、固定 RNG/時鐘、隔離磁碟、故障注入，必須走真共用實作並核對原版；不可把 fixture、stub、registry、純投影、sandbox 升格為正式玩家證據。正式入口禁止測試注入，未審閱安全邊界維持拒絕。

移植最低門檻：來源對照、相關單元/Perl 差分、成功/拒絕/副作用、實際介面及必要 HTTP/CAS/存檔整合。確定性完整回歸及 source pins 是正式基線整合門檻。正式玩家合法取得、真 RNG/時鐘、自然低機率、長程與完整流程獨立驗證；缺證不阻擋無關移植，已知來源差分、原子性、遺失、權限、必要整合或真玩家產品缺陷阻擋相關功能與依賴者。低機率未命中記待證，不是通過或已確認產品缺陷。環境/CI 障礙與產品缺陷分列。

## 分支與責任

唯一正式基線 migration/standard-street-s1；D 唯一寫入 integration/r4-unified-migration-20261126。A 獨占 #22 head，#25 共用同 head、固定 base ddd2f441ed5b36b8dcb94deaa193764eab7f2d21，CI-only 永不合併。B 獨占 #18。C 獨占 #26；另需測試分支時由 D 協調從 exact 被測候選建立 validation/r4-player-acceptance-*。#23/#24 保留到逐項語義證據移交完成且經授權才考慮關 PR；#1/#16 唯讀研究歷史；所有 main、歷史 work/integration/handoff/backup refs 保留。禁止 force push、未授權 merge、刪分支、重設其他工作樹。每次開工重查 exact HEAD、tree、CI、最新交接；本機 status/stash/untracked/unpushed 必須由能存取本機者確認。遠端物件可讀不等於永久備份。

A：正常取得、USE、EXP、上架、售出、回呼、EVENT、維持費、決算、關店封存的來源與必要整合；#62/1、#62/2、#65/0–2 等外部依賴由 B/D 協調，不造替代規則。B：宮殿、軍隊、領主、叛亂、稅務、多店、店間交易、公會、龍族、外部 EVENT、共同/街道交易與完整期末，保留未發布候選。C：來源稽核、證據去重、獨立玩家驗證及缺陷回報，不寫 A/B runtime。D：唯一正式整合權威、共用契約與版本/CI；不承接長程玩家驗收。A/B/C 不等 D 完成全部整合或 C 完成全部驗收；先確認各自本機保全與唯一寫入。

## 收錄與交接

每功能包列 exact source SHA/tree、來源路徑/原版預期、檔案與 import 閉包、測試路徑/類型、成功/拒絕/副作用、CI checkout SHA/tree、失敗/跳過原因、外部依賴、四維狀態、未提交/未推送狀況。D 從正式基線逐批選擇性適配，不整支合併 #18/#22、不覆蓋 P1–P5。合併正式基線另需授權。C 保留真玩家原測試、原斷言、原始失敗及缺證，不重選世界或修改 RNG/機率求通過。

參見 [整合責任](r4-integration-ownership.md)、[狀態清冊](r4-migration-status.md)、[收錄紀錄](r4-integration-manifest.md)、[驗證政策](r4-validation-policy.md)、[正式基線](current-baseline-status.md)。
