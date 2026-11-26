# 《商人物語》正式開發基線與現況（2026-11-26，UTC+8）

本頁為現行 GitHub 開發狀態的統一入口。較早文件中的「最新權威」、未完成條件與舊分支起手提示均以本頁為準；歷史來源與當時的證據保留。不是 Notion 任務狀態更新，也不代表全原版功能結案。

## 正式基線與驗收

- P5 PR [#21](https://github.com/Prysline/akimono/pull/21) 已正式合併 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；驗收 HEAD `fc5dcbe89b2b2890a03013d2fdcebbad0ee5e9f0`、實際 checkout `8f4d70e71151a0d1be0b0a4b5890fc47adfaf9c5`、相同 tree `9a6c0d5837042c276eda13f78394025016d332b5`。[CI 45727603147](https://github.com/Prysline/akimono/actions/runs/45727603147) success：JS 1329/1329（0 失敗、0 跳過）、Perl 2456/2456（85 .t）、DSL/source pins 通過。16 原版市場案例，至少 4821 G 打工收入參與實際支出。

- Repo：[Prysline/akimono](https://github.com/Prysline/akimono)。
- 唯一正式現代化開發基線：[migration/standard-street-s1](https://github.com/Prysline/akimono/tree/migration/standard-street-s1)。P4 PR #20 已正式合併：merge `a9654531c64a82be19c135a9b806ff9ef5fa5a73`、PR HEAD `0aeaca696e533d3616b6f3b517fa47afbf6d1ff6`、tree `7e0e4909cd2569db438bdebc16c435c70f5627ef`。[CI 45653296366](https://github.com/Prysline/akimono/actions/runs/45653296366) exact HEAD、實際 checkout `a39f5f027eccc43997e0824c1af1704c658754d3` 同 tree：JavaScript 1325/1325（0 失敗、0 跳過）、Perl 2456/2456（85 .t）、DSL 與凍結 source blob 稽核成功。 每次開工仍先讀實際最新 HEAD、程式差異及 CI。
- 固定 P3 A–E 驗收版本 `b60c2078a2c63db71490980f0b113b3907d6d483`，[完整退出審計及 86 檔 blob 清冊](https://github.com/Prysline/akimono/pull/15#issuecomment-7143842268)；[正式整合 PR #17](https://github.com/Prysline/akimono/pull/17) 已於 2026-11-25 06:24 UTC+8 合併。原 migration 是 P3 實際祖先，累積 587 路徑，584 新增、3 修改、0 檔刪除。除 modern/ 外僅歷史 .gitignore 與 CI workflow；凍結原版 Core/CGI/DSL 不變。
- [目標 PR CI #45492647525](https://github.com/Prysline/akimono/actions/runs/45492647525) completed/success：JS 1317/1317，Perl 2456/2456（85 .t），DSL/source SHA 審計全部通過。實際 checkout merge `6825bab8cee1887012ef586e5c1fcc34324fe848` 及 #17 實際 merge tree 均等於 P3 驗收 tree；不是 migration push run。
- main `7301b0c2b1e27226d1770e153fa3c68cfeae6d48` 未修改。現代化基線不等於整款正式遊戲發行。

## 現行完成範圍

| 工作 | 判定 |
|---|---|
| R2、P1 進階製藥、P2 職業轉移／乳品 | 已審閱玩家路徑納入；不等於全部原版 USE 或 R0/R1 完成 |
| R3 共用定價與自然販售 | 已審閱來源與原有多架測試納入；正式 reviewed time 仍單架 |
| P3 A–E | 已完成：20/20 配方合法 HTTP、技能／EXP／材料／職業、跨期與 v2 保存 |
| R4 已交付的獨立單店跨期 | 已驗收且納入正式基線 |
| R4 公會／龍族／軍隊／領主／外部 IO／關店等 | 未納入正式玩家能力，研究續作；未審閱邊界 fail-closed |
| P4 | 已驗收並合併 #20；[來源審閱](p4-dairy-persistence-source-review.md)，真玩家七 USE、十牛、補充、販售與 v2 雙世代／checkpoint |
| P5 | 已正式驗收並合併 #21；[來源審閱](p5-book-work-persistence-source-review.md) 為候選歷史，以本頁及 merge commit 為準 |
| R0/R1 全量、R5、其他街道、多人與整款原版 | 不宣告完成 |

R4 固定跨期交接 `eeb96e45d9fe1a1ab5b206872d0ad90f3e807c8b`，#14 [獨立 CI 45476330181](https://github.com/Prysline/akimono/actions/runs/45476330181) 1179 JS / 2452 Perl；P3 #15 [CI 45481087114](https://github.com/Prysline/akimono/actions/runs/45481087114) 1317 JS / 2456 Perl。正式 #17 run 再次實證 #66/3 EXP 515→535、535→555、跨期後 517→537 真 lostbook；#70 自然販售 3 件、positive FUNCTURN=true（#15 run 為 4 件，皆為各自合法伺服器 RNG）。兩次結算 1→2、260 合法普通操作、兩次 checkpoint 輪替、雙世代與 Node 重啟；來源亂數、歷史前綴、HMAC、商品、磁碟篡改／阻塞的負面測試通過。不是無限經營或無限容量，也不是人工操作驗收。

## 本機正式玩家入口

```sh
cd modern
npm run dev:local
```

預設 reviewed normal time，瀏覽器 http://127.0.0.1:4173。跨期須明確 opt-in 並使用新獨立存檔目錄。POSIX shell（先 cd modern）：

```sh
AKIMONO_REVIEWED_CROSS_PERIOD=1 AKIMONO_SAVE_DIR="$HOME/akimono-cross-period-v2" npm run dev:local
```

PowerShell（先 cd modern）：

```powershell
$env:AKIMONO_REVIEWED_CROSS_PERIOD = '1'
$env:AKIMONO_SAVE_DIR = "$HOME/akimono-cross-period-v2"
npm run dev:local
```

上述目錄必須為新／符合 runtime fingerprint 的獨立存檔，勿覆蓋既有檔案。唯一正式玩家格式 `akimono.local-world-save.v2`；fresh 或 HMAC 認證 checkpoint、完整 retained prefix lineage、source/runtime fingerprint、雙世代與不可變來源檔。舊 v1／不相容 v2 拒絕，不自動遷移。顯式 save；未儲存操作不保證重啟保留。單本機程序，不支援多寫者。普通 1–8 展示架，reviewed time 限單店單架及已審閱 inventory/EVENT。未知 EVENT 不當成空。HTTP `/api/advance-reviewed-time` 只接受 expectedRevision/minutes；`/api/supply` 拒絕。不得注入資產、EXP、RNG 或時鐘。

## 分支管理與未完 R4

| 分支／PR | 角色 |
|---|---|
| migration/standard-street-s1 | 唯一正式現代化起點 |
| test/task02-baseline-on-s1 (#1) | R4 原工作線與歷史來源；仍 Draft |
| research/r4-guild-dragon-boundaries-20261125 (#16) | R4 獨立研究，保留原 base 和未完工作 |
| work/r4-on-p3-baseline-20261125 (#18) | 從 #17 正式基線出發的 R4 新續作，僅來源證據入場，尚未合併 |
| integration/p3-r4-cross-period-20261125 (#15) | P3 固定歷史驗收 |
| #11、#13、#15 | P3 祖先已納入 migration；PR 封存 |
| #12、#14 | 選擇性來源交接已納入；PR 封存，不是 Git merge |
| 其他 integration/work/handoff/backup | 保留追溯，不作新正式開發起點 |

本次同步初次查詢開啟 PR 為 #1、#16；再次查詢已新增 #18 R4 正式續作與本文件同步 #19。R4 #1 固定 `d2dccdacb83925b6f0121bd7311f92be2e18d2da`，原 Push 45474510079 / PR 45474525418 成功（1187 JS、2489 Perl），不替代新基線。

#16 的舊研究版本 `b429504e07acfa986642fba3ae964ec3aeb33190`，[CI 45484109364](https://github.com/Prysline/akimono/actions/runs/45484109364) failure：Node 1198/1198；Perl `original-r4-guild-establishment.t` 第 39、40 項帳本斷言失敗（期待 120000、50000，實得 undef）。**本次同步期間已修正：** 新 HEAD `6664d60af29b4974f9386bf5c97ce09cdd477637` 的 [CI 45576804253](https://github.com/Prysline/akimono/actions/runs/45576804253) completed/success，Node 1198/1198、Perl 2774/2774（94 .t），alpha/beta 帳本斷言均通過。修正版仍是獨立來源研究，未納入 migration、非正式 WorldState/CAS。[R4 研究文件（固定 SHA）](https://github.com/Prysline/akimono/blob/6664d60af29b4974f9386bf5c97ce09cdd477637/modern/docs/r4-guild-dragon-transaction-research-20261125.md)。

[#18 R4 新基線續作](https://github.com/Prysline/akimono/pull/18) 由 #17 merge `3b927866b4749aad3ffc583a9cf12bf3fb9eb783` 出發；入場 HEAD `19f35989b659fdfb3279e6cf4770d3fa6b72b322` 選擇性新增 33 份來源／歷史證據及 1 份清單，未覆寫既有檔案、未改 runtime。其 [CI 45577006632](https://github.com/Prysline/akimono/actions/runs/45577006632) 於本次複查時執行中；後續查 exact HEAD 結果。參見[入場清冊](https://github.com/Prysline/akimono/blob/19f35989b659fdfb3279e6cf4770d3fa6b72b322/modern/docs/r4-unified-baseline-intake-20261125.md)。#18 已採正確的新基線方向，仍 Draft，未完外部玩家功能不得宣告完成。

R4 可繼續獨立來源研究；欲納入正式玩家功能，從 migration 最新 HEAD 開新功能分支，選擇性移植已證明成果，重新驗證 v2/CAS/HMAC/source staging/Perl hash 與外部交易權限／副作用。不直接合併 #1/#16 或以舊 registry/存檔取代新架構。P4 已從 migration 出發並合併；P5 已從 #20 正式 HEAD 開隔離 #21 並驗收合併。保留原版、固定交接 refs，不 force push。現行 workflow 以 PR CI 為正式門檻；migration 尚未配置 push 觸發或強制 required checks，治理另開工作。

## R0／R1 稽核（候選，未結案）

[固定清冊](r0-full-baseline-audit.md)。#22 為 #18 上的 Draft 正常經營續作，未納入 migration；其範圍不得視為正式完成。

## 新工作窗起手提示

```text
繼續 Prysline/akimono 標準街現代化。先讀 migration/standard-street-s1 實際最新 HEAD、modern/docs/current-baseline-status.md、相關來源文件及 CI。#17 已提升 P3 A–E／R2、P1、P2 與已驗收 R4 單店跨期為唯一正式基線。新正式功能從 migration 開獨立分支，不用舊 #1/#11/#12/#13/#14/#15 作開發起點。R4 #1/#16 是研究來源，#18 是從正式基線出發的續作；#16 帳本修正版已通過獨立 CI，先查 #18 exact HEAD CI 與入場清冊，按需移植已證明成果，不重做 P3。區分來源 Oracle、fixture、真 HTTP/CAS 和正式驗收；保留唯一 v2、完整重播與安全拒絕。只改相關 modern/ 範圍，不碰凍結 Core/DSL/Perl、main、固定交接 refs 或 Notion；以目標 PR CI 驗收，合併依授權。
```

本次同步只更新文件，不修改程式、測試、workflow、研究分支或 Notion；原歷史正文保留。

## R0/R1 獨立收斂候選（2026-11-26）
正式 HEAD/tree 未變；#23/#24 的既有證據收斂於 [canonical manifest](r0-r1-baseline-manifest.json)，233 既有測試去重分類 51/18/164（有效/歷史/待補），另 3 新測試。#25 為 #22 R4 固定基線 CI 專用 Draft，不納入本線。整合候選尚未取得自身 CI，R0/R1 未結案。
