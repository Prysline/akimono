# F 前端移植清單 — F1（候選，非整合或正式玩家驗收）

## 固定起點與權威

正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d / 9a6c0d5837042c276eda13f78394025016d332b5；P5 原始 CI 45727603147/job139601279098 JS1329/1329、Perl2456/2456、actual checkout tree 相同。
D50 #27 6440e6b371881be102e21eac0c0552d167d7ef7c / efc7533224860eb962998fa4cc9c17cfaf9d8f84；run46047734854/job140671101920 原始 JS1446/1447，not ok1062 registration state reuses initializer，Perl 未到。不是 F 缺陷，不能稱起點綠燈。
A39 #22 f8046acd349f9d569f0c3bdb2d746f7be7c1c6a6 / fbd60aa681e5db7a8cb1f28436c2faf972436a7a；B #18 90513578681edecbabbe145654d9c0f90ff5630c / 4ce64744f86eb659bb2a3187dc58b5f71024955d；C #26 f39457c5b333c12c7e106c3b1227871d4395e4b6 / 7d9a0dee7fd95bff00644e60880dd229537002a0。不是 A/B 完成度或 CI 宣告。
F 唯一工作分支 work/r4-frontend-ui；Draft 對 D integration branch，以便隔離差分。D 挑選整合，F 不合併。D 後端、CAS、session、v2、正式基線不改。F1 只更動 UI 與測試/文件；不引入瀏覽器保存權威。

## 第一輪頁面及契約對照（逐步補完，不是全面原版審核）

| 原版來源/選單 | D50 UI | D50 HTTP 依賴 / 進度 |
|---|---|---|
| sindex.html / index.cgi 登記登入與街案內 | setup，本機初始化/開店，不是原版帳號 | POST initialize {} / open-shop {expectedRevision,ownerName,shopName}; 待 D 真 session/registration |
| custom/inc-menu.cgi 自店 main | shop，店主、展示架、行動時間、小幫手 | GET state；F1 補 stocked shelf link |
| stock / item / inc-sc.cgi / sc-s.cgi | stock、item、USE 與結果 | POST showcase {expectedRevision,itemId,per?,priceOverride?,shelf?}; discard {expectedRevision,itemId,count}; use {expectedRevision,itemId,useId,requestedCount} |
| sweep / other / LogOut | disabled/缺入口 | A 有候選；D 尚無正式端點，待接線，不冒用 reset |
| balance | 收支 | GET state；更多圖表/稅額 A 候選待整合 |
| shop-m | 市場 | POST buy {expectedRevision,itemId,requestedCount,marketShelf,expectedPrice} |
| shop-a / req / palace | disabled | B 有外部候選；D 未接 |
| town / log | disabled | B 風景、A 新聞候選；D GET 尚缺 |
| custom/library.cgi | library | GET library 或 ?t=0..7；D29 原版文字，唯讀 |
| lord / gd / slime / army / hometown | disabled | B 候選；D 未開正式端點 |
| letter / dwarf / treebbs / wis | disabled | 原版選單存在，待逐頁來源/契約 |
| 現代本機維護（非原版流程） | save/load/reset；快轉開發區 | POST save {expectedRevision,expectedGeneration}, load {}, reset {confirm,expectedWorldId,expectedRevision,expectedGeneration}, advance-reviewed-time {expectedRevision,minutes}；原 /api/supply、/api/advance-time D50 拒絕，待整理提示 |

所有路由沿用 D50，未發明 API。GET state 是顯示權威；POST 回傳 ok/code/details/state，拒絕需呈現且不自行提交、重試或調整 revision。C 歷史 R1-HTTP-01 已在 D13 獨立驗證修正，B41 時間拒絕歷史保留；F 不改 guard。C 最新全留言和原版各頁尚待逐項審。

## F1 施工：展示架商品連結

實讀 A39 app.js、A 來源差分測試、凍結來源測試副本 core-inc-sc.cgi blob 2e328443f3f83bd862f56a540e1357b31917651d：只有有庫存的商品生成 no/sc/pr/bk link，sc 為一基；D UI 零基。移植 A 的連結及同商品兩架價格、返回店內、空架選擇一次性保留。D 無 reviewedFullCommerce flag，故依既有 server snapshot 的合法陳列資料產生只讀連結，不擴大交易能力；既有 showcase offer / POST / CAS 仍原樣。使用 D 原版 skin、CSS 不動。新測試為實際 Perl 產生 HTML 差分及 JS 函式受控測試；不是瀏覽器或正式玩家。CI 待驗。A 完整模式的 HTTP 測試不直接移植，D 尚未啟用同契約。

## 素材清單與導入規範（F 建議，尚未匯入）

D50 tree 無 PNG/GIF/JPG/WebP 遊戲素材；index.html portrait-placeholder 是文字。sindex.html 引用 logo.gif/bg.gif/mark.png；skin.pl 明列背景提供者，不代表再散布授權。A39 已有 owner-icon projection/HTTP tests，須核對實際 IDs 與 D 的私有身分契約，不能自行假設新增 ID 可被接受。
每個素材建議記錄 kind、原版語意 ID（字串且不重排）、來源/作者、授權及證據、檔名、尺寸、透明/裁切、hash、公開許可、後端允許的 ID、fallback、對應測試。新增玩家頭像只可採經確認的新 ID，不覆用或位移舊 ID；不以陣列位置當身分、存檔或權威。頭像可保持原尺寸或等比縮放，透明 PNG；缺圖安全文字替代，不影響存檔與遊戲資格。不導入未授權原版圖，不假造角色 ID，不改原版素材語意。D 權威未接前只可做隔離素材/預覽。

## 狀態 / 後續

F1 來源已核對（限展示架連結）；前端候選；受控 CI 待驗；沿用既有 API（未新增）；瀏覽器、整合回歸、D 收錄、C 驗證、正式玩家驗收均待。尚需 F2 共用提交鎖與拒絕提示；續作來源對照、A/B UI 選擇性整合、待接線頁面與素材。
容器 git DNS 無法解析 GitHub；Node22/Perl5.40 可用但未有完整 repo；GitHub connector 可讀寫，CI 為完整驗證。無法核對使用者本機 worktree；不宣稱本機全測。

## F2 — 共用提交與錯誤呈現（候選）
D50 app.js 原 call 未限制同時 POST，reset 另有獨立 handler；初次 GET 可和操作競跑，catch 亦將已提交但畫面失敗當普通失敗。F2 增加全頁 single-flight（含 reset）、初次讀取防競跑、revision conflict 明示重新確認、斷線/JSON 未確認結果不誤判已拒絕、不自動重試、已確認提交但畫面失敗另提示。沿用全部原請求欄位、CAS、state 及確認 reset；不修改後端權限、不創建新儲存。新增受控函式測試：並發、初讀、stale、斷線、render failure，reset wiring。此為前端保護，不代表 server transaction 成功率或正式玩家驗收。F1 run46061544570 最後查詢 in_progress；F2 CI 待查。

## F3 — 原版丟棄／解雇表單（限 D50 bounded discard contract）
實讀 D50 core-item-detail.cgi 及 A39 pinned core-inc-item-throw.cgi 714e623b9fd1f40ce7c51b89503d2a801330f1bb：t/notrash 禁止表單、h/human 解雇、1/10/100/1000/10000/全部或全員及零預設。前端依 server catalog/owned 呈現選項；不自行改庫存、金錢、垃圾或批發。維持 D50 POST discard {expectedRevision,itemId,count} 及 count<=owned，沒有模擬原版超量裁切、垃圾、批發、log 或 lastlogin。A 已有完整 source runtime/quote，D 尚未接，整合後應採 D projection 而非平行權威。新增原版 Perl 頁面選項差分與 t/h 呈現測試；CI 待驗。F1/2 受控實跑結果見 PR28 留言；非完整 Node/HTTP/browser。

## F4 — 市場進貨成功的後續入口（候選）
實讀 pinned buy-s.cgi 6ba8df9a733ed16c490389414cd94934fe1185ca，DataCommitOrAbort 後原版市場回 stock 或 shop-m（其他商店是 shop-a，尚未接線）。F4 在既有回饋區補前往倉庫／繼續進貨，僅 /api/buy 成功且 state 已呈現、玩家仍在市場時可見；拒絕、未確認或新操作／離開頁面不留舊連結。不改 API、回饋收據或交易權威。測試來源 pin 與顯示/導航契約，瀏覽器待驗。
F3 原版 Perl pin 在本機 git hash-object 核對，18/18 stock × human 差分與遠端 JS V8 投影一致；不代表 HTTP runtime 完成。
