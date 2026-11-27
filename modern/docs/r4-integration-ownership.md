# R4 共用架構與責任（D1 提案）

延續 [GameCore 契約](game-core-contract-v1.md)、[P3 v2](p3-v2-player-save-convergence.md)、[R4 時間契約](r4-p3-time-persistence-contract.md)，不修改其來源事實。D 是整合分支唯一寫入者；A/B 在各自候選分支可做必要串接，對共用檔案以差分功能包交 D，不是允許多人寫同一分支。

| 路徑/界面 | 提供功能包 | 整合責任 |
|---|---|---|
| modern/src/standard-street-module.mjs、GameCore/StreetModule/WorldState | A/B | D |
| modern/scripts/dev-local.mjs、modern/local-ui/app.js、index.html | A/B | D |
| shared-natural-sale-core.mjs、shared-use-item-core.mjs、shared-use-experience.mjs、market-buy-core.mjs、standard-street-market-buy-registry.mjs | A（外部需求 B） | D |
| original-r4-reviewed-world-time.mjs、original-r4-normal-turn-candidate.mjs、original-r4-cross-period-candidate.mjs、original-period-solo-chain.mjs、original-r4-perl-hash-replay.mjs、r4-time-command-draws.mjs | A/B | D |
| original-r4-period-play-file.mjs、original-r4-independent-world-disk.mjs、r4-independent-period-disk-store.mjs、reviewed-world-time-history.mjs、local-world-save-store.mjs、reviewed-history-checkpoint-store.mjs | A/B | D |
| 關店、封存、正常商品與回呼 | A | D |
| 宮殿、軍隊、領主、公會、龍族、多店 session/ownership、店間交易 | B | D |
| r4-joint-candidate-journal.mjs / r4-joint-source-projection.mjs | B（隔離非正式） | D |
| .github/workflows、測試分類清冊 | D，A/B/C 提供證據 | D |
| #26 稽核及 validation 分支玩家測試 | C | C；正式收錄另審 |

## 契約不變量（不是新遊戲規則）

GameCore 唯一交易/USE 入口；StreetModule 提供已審閱 registry/callback；HTTP/ UI 僅經授權入口及參數，不複製商業公式、不接受任意資產、EXP、時鐘、RNG。共用 WorldState revision CAS 先完整校驗來源轉移、權限及副作用，失敗不能改變已提交狀態或已保存世代。v2 是唯一正式本機存檔格式，保留顯式 save、雙世代、HMAC checkpoint、retained prefix replay、source/runtime fingerprint 與不相容拒絕；不默許跨版本遷移或平行保存權威。多店/共同鎖、文件 bytes、原版鎖序、錯誤回復、重啟與跨期由 B 提供來源，D 審閱後才改正式介面；sandbox journal 不能直接發布。期末、EVENT、RNG/Perl hash replay 必須使用來源確認的順序及完整後繼狀態，不把 unknown/null 當無事件。

## 重疊快照

正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d；A 1780f564c3b5bca3a1d396a6156d280f71fa9b23；B f356c14452537a11167110f5b46709f7a1bb9039。相對正式基線 A 186 路徑/B 212/交集156（非 docs/tests 48）；相對共同祖先 ddd2f441ed5b36b8dcb94deaa193764eab7f2d21，A 107/B 142/交集77。A 相對 B ahead 88/behind 54/diverged。重疊不等於實際內容衝突。逐檔 blob/語義、import 閉包與實際衝突審閱仍待完成，不以此表宣告已解衝突。

## 店舖生命週期（已授權責任分配，2026-11-27）

以 [店舖生命週期唯一施工責任與介面契約](r4-shop-lifecycle-ownership.md) 為準：B 獨占自主 restart/cls 的來源 wrapper、帳號/session/registration/子資料及外部效果候選；D 獨占正式入口、owner ACL、GameCore/CAS、同一 v2/replay、封存與日誌發布及 HTTP/UI；A 重用既有 close 來源、續正常經營，不再寫兩個入口；C 獨立驗證。不將測試 reset 作玩家再出發，不變正式基線或合併授權。

## 2026-11-28｜F 窗前端唯一施工責任（本次交接生效；正式基線待審閱）

本節取代上方舊 A/B/D 一般 UI 作者責任，不刪除歷史證據。F 獨占 work/r4-frontend-ui 的一般玩家 UI：modern/local-ui/app.js、index.html、style.css、前端素材、API client、DOM/layout/互動測試；A/B 不再平行新增正式頁面，保留已有成果及測試、原版來源與隔離 harness。D 獨占 integration/r4-unified-migration-20261126、modern/src/ 共用核心、modern/scripts/dev-local.mjs、HTTP/ACL/CAS/v2/history/replay、正式 CI/必要 E2E；選擇性收錄 F 完整差分，緊急安全修補碰 UI 時先明示最小範圍並同步 F。C 獨立驗證，P 唯讀。F mock/fixture 不得成為正式狀態或授權權威。

F 交付 exact HEAD/tree、base、檔案/blob、原版來源/選單/拒絕、API 版本及前端測試；D 核對後選擇性收錄完整閉包，保留 P1–P5、原拒絕及來源 pins，不整支合併。D API 變更即通知 F；未發布 route/能力維持 disabled，沒有資料即明示未知。F 不寫 D 分支，D 不寫 F 分支。參見 [HTTP 契約清冊](r4-frontend-api-contract.md)。工作窗分工已生效，正式文件收錄待審閱，未變更 CI/正式基線/merge 授權。
