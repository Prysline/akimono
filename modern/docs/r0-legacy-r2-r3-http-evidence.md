# R0 第十四批：R2/R3 歷史 HTTP、B43 v1 與兩店診斷

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。8 檔都實際 spawn `tests/support/legacy-dev-local.mjs`（不是 scripts/dev-local.mjs），fixed now 1000000、deterministic RNG；legacy save store 明定 `akimono.local-world-save.v1`。原版 source/HTTP/CAS/磁碟證據保留，但分類為歷史，不計入正式玩家正向旗標。歷史不代表無用或刪除。未在本機重跑。

## r2-gathering-http-save.test.mjs

- 固定 blob：`ad292f867a3da84a3132a81580b8c8e27c03472a`。
- 斷言：55–64 USE CAS helper；65–99 初始化/開店、5券→3、#79/0 取圖、#12/0 #9/0 產出與 EXP20；100–123 兩代舊存檔/restart，#12/1 EXP40。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：合法舊入口 gift 後採集；fixed now、deterministic RNG、legacy v1。
- 限制：保留 #79/0、#12/0–1、#9/0 歷史路徑，不把 offer #9/2 #12/3 當執行。
- 結論：歷史，僅 舊 HTTP／CAS／v1 fixture。

## r2-potion-lostbook-http.test.mjs

- 固定 blob：`7cac215dcd9221f55aa3ce17794807c7293ed740`。
- 斷言：54–100 初始化/gift、#12/0兩次、舊 supply、買#15、缺 EXP 409 unchanged；101–119 #15/0 count10 EXP200、#15/1 EXP220 產出、保書，#15/3 gate 不變。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：舊 /api/supply 與固定 RNG；無保存重啟。
- 限制：25 permille 名稱不等於本檔真機率實測；只觀察 controlled keep-book branch，非 v2。
- 結論：歷史，僅 舊 HTTP／CAS／v1 fixture。

## r2-showcase-resize-discard-http.test.mjs

- 固定 blob：`cbba749f220309f1a5d4b7203f06fcfff04178f1`。
- 斷言：64–80 HTML/JS 字串；81–114 初始#63、8 offers、實際#63/1 二格耗材/20000G/3600s、重用拒絕；115–160 舊 supply/buy#10、slot0/1、非法 index、save/load；165–193 零時間丟棄、拒絕過量、二代 restart。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：固定 clock/RNG、legacy server/UI source strings、v1；初始工具非市場再取得。
- 限制：僅歷史 #63/1 正向；其餘 offer 不代表施工；UI regex 非瀏覽器互動。
- 結論：歷史，僅 舊 HTTP／CAS／v1 fixture。

## r2-source-manufacturing-http-save.test.mjs

- 固定 blob：`95de908033ef66a573ac1715c9f545432ac43e47`。
- 斷言：60–88 buy/use/save helper；89–142 gift→#12 採集→supply→買#15/16/17→各第一配方（#30/#45/#40）及拒絕；143–162 restart、#17/1 木杖、EXP、二代；166–182 偽造 newest #45 stock100 與 world-only SHA 後回退。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：固定 clock/RNG、legacy supply/save v1；故意寫 tampered slot。
- 限制：歷史 B43 回退；world-only checksum 非 v2 envelope/inner HMAC 隔離證據。
- 結論：歷史，僅 舊 HTTP／CAS／v1 fixture。

## r2-target-advertisement-local-http.test.mjs

- 固定 blob：`035a43e10ce853005a2c4741e2cf77d1d583aad5`。
- 斷言：60–96 default audit off、target 禁止；98–181 market read-only preflight 無資源、來源 quote/現金不足/stale/extra/multishop；183–240 target preflight 無持有且 no commit/no auth/no persistence；243–439 舊供貨、#14 劍售出但仍現金不足、EVENT unknown、test-only 第二店、禁普通 action/target/stale、拒絕多店 save，回到一店 v1。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：legacy server audit env 開關、fixed time/RNG、只測 projected failure；實際未取得#62。
- 限制：歷史診斷並非正式多店授權、交易或持久化；不得將 readiness/read-only approval 誤升格。
- 結論：歷史，僅 舊 HTTP／CAS／v1 fixture。

## r2c-unified-market-http.test.mjs

- 固定 blob：`30d96496be17d1425dc6579108e145656463e6f8`。
- 斷言：58–82 Perl GetWholeStore 與 HTTP shelf IDs；83–147 HTML/JS strings、79 catalog、source supply、#10/11/14/39 quote；148–205 missing/legacy/stale price、逐 BUY money/paytoday/stock/revision/CSV；210–234 B43 save/load/rebuy。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：fixed now/RNG 與 legacy /api/supply；Perl shelf oracle 合成 catalog sort/wholesale。
- 限制：混合舊 HTTP/CAS＋Perl shelf 差分，不證現行 market-buy runtime v2 或瀏覽器 UI。
- 結論：歷史，僅 舊 HTTP／CAS＋Perl 差分。

## r2e-source-buy-use-http-save.test.mjs

- 固定 blob：`d626e647284848de430d15c8a24fe9803ff3c081`。
- 斷言：134–291 legacy BUY#10/11/14/39、#79/0/#14 Perl receipts、save2/rebuy、tampered fallback；293–328 double-create/lostbook；331–346 draw policy pure；349–412 repeat #14 time/EXP、二代重啟；416–484 gift#79/4/3；487–589 gift#79/3→舊 PLUS#8×30→#37/1 magic knowledge/EXP50、二代及 forged latest fallback。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：固定時鐘/deterministic scenario、legacy HTTP/v1、source probes；world-only SHA 重算。
- 限制：混合真原版差分與舊 HTTP；保留有效差分於專門 source tests，不能當現行真玩家/正式 RNG/v2。
- 結論：歷史，僅 舊 HTTP／CAS＋Perl 差分。

## r3-real-sword-http-restart.test.mjs

- 固定 blob：`906ab533c78eb7c52e5537cc6da54cd770ad6e94`。
- 斷言：60–160 #14→#40–44，展示#41、首次舊 sale、EVENT unknown 後拒絕、雙代；163–209 一分鐘 callback draw/cleanup；212–274 #10 150% tax；277–356 7501G direct price 與非法價不變、二代；358–443 二格#63/1；445–524 四格；526–606 八格、各 slot、拒第九、一次安全舊 turn 與 EVENT unknown。
- 執行：spawn tests/support/legacy-dev-local.mjs → HTTP legacy routes → legacy-world-save-store v1（若本檔有保存）。
- Fixture：legacy fixed time/RNG、/api/supply、/api/advance-time、B43 v1；原版初始#63。
- 限制：歷史銷售與欄位行為；normal economy #22，不能以一次舊 slice 宣稱正式連續世界時間可用。
- 結論：歷史，僅 舊 HTTP／CAS／v1 fixture。

## 區分歷史與現行

現行正式 dev-local 拒絕 legacy supply/time/target，採 v2 envelope；本批保存與重啟不算 v2，HTML/JS regex 不算完整瀏覽器互動，read-only preflight 不算批准。先前合法路徑與原版數字仍作 R0/R5 參考；不改任何正式 flags，不接管 #22/#18/#16。
