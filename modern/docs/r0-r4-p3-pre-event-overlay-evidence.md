# R0 第27批：R4 P3 pre-EVENT overlay／跨期與記憶體 CAS

基準：正式 08fdd3b31ff130e66d0337360430fda3d73fdc8d；測試 blob 02052c2cdb18a37206810c5302b34df87ec531bc。本批逐檔讀取，未本地重跑；分類不等於新 CI 成功。

## r4-p3-pre-event-overlay.test.mjs

| 行 | 受控證據與邊界 |
|---|---|
| 43–115,119–142 | fixed memory world initialize/open/PLUS、可選 #10 memory buy；人工 stock/exp/job 與 grouped EVENT。原版 natural sale/FUNCTURN/FUNCSALE/SortDT/PLUS/whole cap、shop/account/market sparse CSV/draw 差分；額外五個半價強制售出 cases；costtoday 差 <1e-8。不是商品逐一合法取得。 |
| 143–155 | 九 compiled PARAM EVENT 逐一 expiry=now+1，60m pre-EVENT 持續套用已讀入 overlay；原版 probe 差分。 |
| 156–171 | memory 買入、null/rebel/guildbattle/unknown EVENT、錯 active order、EXP1001、越 boundary 拒絕。本處 inventory overlay 路徑正確傳 reviewedR4；不替代第26批另一介面的錯欄位負例。 |
| 194–247 | normal candidate 的 pre-EVENT 和 EVENT 兩次 Perl process；固定 hash seed/perturb 及 Node tape，17 compiled gate traversal，排除 rebel/guildbattle；人工 stock 與 happy/ore。重投影相等非磁碟重啟。 |
| 249–295 | opt-in normal-time 真記憶體 CAS、rev+1/3600s、17 gate trace，拒絕 forged money、缺 command、額外 draw/now/event、minutes0、舊 rev/legacy command；初始 gift #79 use 0 與續行。固定起始時鐘，不是 HTTP。 |
| 316–357 | 60/20 秒 period prefix，固定 boundary 1026000、3/4 period draws、人口／市場／town／shop 差分，缺 tape 及普通路徑跨期拒絕；人工 blocklogin/dignity/EVENT。 |
| 360–463 | 20+40 秒跨期，原版同一 Perl process，不注入中間 Node shop；初始 overlay 即使 ore expiry 仍保留，PLUS index4=720；preEvent/event state/hash order/ranges/log/market/town 差分，次 command 讀新 wire；rand(0) 原版檢查，WeakMap lineage 拒 clone，公開結果改動不影響後續。初始 fixture 和 tape 仍受控，非真 CGI 整鏈。 |
| 466–495 | 人工 tax321、sales1000，town in/money321，taxtoday reset，tax review 拒絕。 |
| 518–636 | 原版隔離 temp disk DataRead/DataWrite/DataFilesBackup/DataCommitOrAbort 與 guild/log、backup/session；Node memory disk projection 比原版 bytes/parse/mtime，另真隔離四檔 stage；live mismatch 前置拒絕，最後 rename 以目錄阻擋、拒重 stage/pending read、移除障礙後 recovery，比 live/空 stage/marker。不是 rollback、斷電驗收或正式 v2。 |
| 638–679 | fresh 固定 now1025980 開店、1m 第一結算、36×60m 第二期，now1155640、boundary1155600、generation 舊 live bytes、人口與 rankingcount；偽 rev0/改 log bytes initial/propose 拒絕，再1m settled count 不變。真記憶體 CAS，未實際 HTTP/v2 reload。 |

來源核對：
- inc-func.cgi L233–299：DataRead 先解 event wire、require overlay；inc-turn.cgi L248–351：ITEM cleanup、SortDT、period、PLUS、whole cap、EVENT；period.cgi L4–172 與 L174 後：結算及 backup rotation；write.cgi：commit/backup/write/mtime。
- original-r4-p3-pre-event-overlay-probe.pl、OriginalR4PreEventHarness.pm：擷取原版 pre-EVENT、period prefix 與受控樣本；mixed support probe L584–658 分開 normal 與同程序 crossing mode；OriginalR4CrossPeriodDiskHarness.pm：實際 temp disk，人工初始檔、open/rename wrapper、無真公會，CloseShop stub 拒絕。
- Node overlay/normal/crossing candidates 非可提交；r4-time-command-draws.mjs 是由 worldId/revision/now/minutes 等導出 SHA256 的決定性樣本，非原生 Perl PRNG 或真時鐘；reviewed-world-time controller L24–27 exact command、L42–59 provenance、L84–188 reproject/exact CAS；獨立磁碟 projection 不等同實際正式存檔。
- 固定時鐘/人工庫存與 EVENT、明示 tape 或 SHA256 決定性 command draws；純投影、真記憶體 CAS 與隔離 temp disk 分開。非正式 HTTP/真時鐘/正式 v2 磁碟重啟；單店獨立路徑，不含外部公會、龍賽及關店整合。 只補九 PARAM EVENT 的既有 Oracle/differential 層，plusup-tetu 再補跨期 overlay 時點；不把人工 stock、memory use 或 17-key gate 當正式功能。83 詳細列及正式下界不變。未修改 runtime 或既有測試。

固定執行來源 blob 清單與測試斷言定位同步於 canonical manifest。
