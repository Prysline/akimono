# R4 → P3 共用時間／持久化契約（2026-11-24）

## 優先序與驗收界線

本工作包優先處理合法玩家正常時間片與 B-43 存檔，不要求 P3 合併 R4 進行中的期末、公會或軍隊工作，也不取代 P3 自己的 USE/職業來源審閱。R4 原工作分支仍繼續，P3 與 R2 整合分支不寫入。R4/P3 共同祖先 616c888ec4bfa1c45fdd242748e659298207455d；本輪 R4 起點 e2000adadf3b639c6ef3045eacfbaa692561236a；唯讀對照 P3 087efeb9427739bf1c2217be463b44e522a77437（PR #11）。三者不是互相可直接替換的版本。

**現況：候選整合，尚未發布 P3 固定交接。** 只有以最終 SHA 查到雙 CI 真實成功，才可確認 R4 本身已驗收的狹義能力。獨立交接需另外驗證必要相依閉包與完整回歸，不得以本工作分支 CI 代替。完整 R4 退出、P3 二十配方合法玩家驗收、跨期正向提交均未宣告。

## 來源與正式接點

- `original-b41-playable-sale.mjs` 共用 P3 型 inventory／EXP／技能／職業、單店單展示架驗證；原版原價、庫存上限、EXP 上限保留。不是替 P3 開放所有物品的取得或製作。
- `original-r4-pre-event-item-overlay.mjs` 固定來源 DSL、編譯器與 DataRead 原文 hash，九種 ITEM PARAM 的 popular/point/plus 真正作用於舊 EVENT map；未知 map 不得變成空 map。共用排序及 59 PLUS 流程不另造引擎。
- `original-r4-normal-turn-candidate.mjs` 串接自然販售 → FUNCTURN/FUNCSALE → SortDT → PLUS/CheckWholeStore → 17-key END/START/NOW；10 種持續、5 種即時、2 種 zero-start 特殊 gate。特殊事件 active rebel/guildbattle 仍拒絕，不接外部檔案副作用。候選投影自身仍 committable:false。
- `original-r4-perl-hash-replay.mjs`、`r4-time-command-draws.mjs`：伺服端版本化 deterministic policy，native Perl keys 以指定 seed/perturbation、interpreter fingerprint 重播；不是宣稱原版歷史 CGI hash seed 或原版 PRNG identity。彩券使用完整 6096454 範圍的 typed 整數，並驗證消耗序列。需要可執行的 Perl；無法執行或來源不符即拒絕。
- `original-r4-reviewed-world-time.mjs`：StreetModule factory opt-in `enableReviewedNormalTime:true`，共用 GameCore/CAS 對完整新 WorldState 再做一次來源運算、逐 wire 比對；非法 revision、clock、assets、EVENT 以及 legacy/fixture 指令均不能走這個時間接點。舊預設模式不變。普通市場／USE 只有經驗證且不影響其來源欄位的 active EVENT 才允許，仍須原 registry 實際成功。

Core command：`{kind:'advance-reviewed-world-time',expectedRevision:<整數>,minutes:<1..60整數>}`。無 shopId、絕對時間、RNG、EVENT keys、successor 或資產輸入欄位。單店 Standard Street v2，未跨原版 36h 期界、獨立非公會商店、經驗證城市初始狀態。期界即使只差一秒仍 fail closed；不做假結算。

本機 HTTP：`AKIMONO_REVIEWED_NORMAL_TIME=1` 啟動既有 dev-local.mjs，`POST /api/advance-reviewed-time` 精確 JSON `{expectedRevision,minutes}`；禁用 fixture RNG、legacy advance-time 與 PLUS-only supply HTTP。仍是 127.0.0.1 的本機、同 origin 守門，不提供正式多人帳號/授權/真實時間排程。未按儲存的世界仍在記憶體。

## B-43 歷史重播

`reviewed-world-time-history.mjs` 共用 `beginReviewedWorldHistory`、`appendReviewedWorldHistory`、`verifyReviewedWorldHistory`、`replayReviewedTimeHistoryEntry`、`reviewedHistoryLineageCompatible`。P3 自己的 ordinary command schema / USE registry / source draw verifier 由呼叫端傳入；本模組不複製 P3 專屬 recipe 規則。

沿用 proof `{anchorKind,anchor,commands}`：fresh anchor 重新 source init，legacy 必須有明示來源 validator；任意中間世界不能當 anchor。時間 entry 含 kind/revision/minutes 及 trace（policy、seed、interpreter、active/event/now order、preEventDraws、eventDrawRanges、eventSamples、完整後繼 canonical world SHA256 與 effects SHA256）。彩券 sample 的型別由同索引 range 唯一決定。先驗證 exact trace，再透過 CAS 重播；比較整個 canonical WorldState，不僅資產或時鐘。普通指令不得推進 clock。append 在本機 CAS 之前做容量與 schema 檢查，成功才更新 proof。

`local-world-save-store.mjs` 新增可選 `historyReplay:{requireProof,verify}`，同一 B-43 v1 雙槽 fsync/rename、generation/世界 lineage、canonical wire 與 hash，proof 位於 careerProof 字串，digest 為 SHA256(JSON.stringify([world,careerProof]))。無 proof 舊模式 wire 不變；新 opt-in 要求 verified proof。舊世代可回復；不得以 rehash 的偽造 trace 代替來源 replay。非密碼學帳號認證。

## 128 命令與長期 checkpoint（候選實作，CI 待核對）

保留 128 commands／500000 UTF-8 bytes proof／200000 bytes anchor／2200000 bytes B-43 envelope。HTTP 下一命令若需續接，先由共用 verifier 完整重播現有段，將原 proof 原樣留存於私有 reviewed-history-v1/prefix-<SHA256>.json，才以 HMAC-SHA256 認證 checkpoint。新 proof 使用 anchorKind:checkpoint，anchor 為已驗證的 canonical WorldState；checkpoint 綁定世界／街道／revision／建立時的已載入或已保存 generation／原始 anchor digest／完整前段 proof digest／來源及 runtime fingerprint／Perl interpreter／兩項 RNG/hash policy。B-43 checkpoint envelope 另認證實際外層 generation、world、careerProof。未續接的 v1 wire 不變。

密鑰本機隨機 32 bytes、獨占建立、fsync，POSIX 私有權限；不由 HTTP 提供。缺失、錯誤、來源或 runtime drift、損毀前段拒絕，不以重新計算普通 SHA 取代來源驗證。現行信任模型為可信任本機伺服端帳號、不可信任存檔內容；有權讀密鑰或改程式的帳號不在此模型內。保留前段磁碟證據，雙槽比較需要時沿認證前段向後追蹤；正常 replay 只重新執行當前有界命令段。checkpoint 與下一命令的完整 envelope preflight 在記憶體 CAS 前完成；仍由玩家顯式 save 發布雙槽世代，不改未儲存世界的既有語意。舊 checkpoint 遇程式版本變更需獨立審閱遷移，不默許相容。保留歷史檔案，不做自動清理。Windows 目錄 fsync 沿既有平台界線。

新增長期 HTTP 回歸候選：合法 USE、正常時間、來源展示架操作跨 128、續接失敗原子拒絕、雙世代保存、重啟、再保存、篡改 checkpoint/外層 generation、錯誤或缺失密鑰及前段損毀。尚需以本候選最終同 SHA 真 CI 確認；不是 P3 二十配方或跨期結案。

## 證據與交接門檻

已確認同一 SHA 142155fdbf63529164010bfc25c3682e5b956a8a，Push #45406982700 / PR #45406997838 成功，Node 1176、Perl 2489。真 Perl 先 pre-EVENT 再同 seed 的 EVENT probe，比對 Node 相同輸入/亂數/順序/後繼；混合 P3 stock/EXP fixture 不是玩家合法取得證明。CAS 及 B-43 envelope 後續 2f5b07169646bc420214090c2cad94a0de5cc33a Push #45407938366 / PR #45407949961 成功；新 HTTP 測試 `r4-reviewed-time-http-history.test.mjs` 在 943b46eee6b74e66c3ea43c0ce1e4e328b15578a 加入，需對最終 SHA 實際 CI 驗證，不以測試檔存在當通過。

固定交接：選共同基底、分析 commit 與 import/測試/來源相依閉包；若必要與無關改動混合，獨立 branch 重建最小閉包，不 rewrite R4 或改 P3。重新跑完整 JS、原版 Perl、來源審閱及 persistence；文件列確切 base SHA、head SHA、相依 commits、檔案、CI logs。版本一經驗收不再覆寫，後續修正另發。尚未完成合法 P3 acquisition 的自身整合驗收、128 上限續接之驗收與最小閉包獨立 CI 以前，不標示固定交接已發行。R4 原本期末外部副作用的成果保留，並行續作。
