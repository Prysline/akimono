# A43 — 正常經營功能交付與移植收尾（2026-11-28）

依使用者本輪指示：優先補真正缺少的原版功能，不再將已有功能的細部經濟差分、長程、低機率或正式玩家驗收當作 A 施工門檻。無需為了維持工作窗而持續製造新測試。A42 已提交修正保留；後續只修確定影響 A 既有交付的缺陷或明確未移植功能。不是改變遊戲平衡、放寬 source guard 或修改歷史驗收定義。

## 固定交付版本與已核證 CI

- A42 runtime HEAD 32fa13df5209168e58002425fcf8aaadf3088de4 / tree 1e00dc3ea6d6bc6f4d43c24ed630fbf1c7309007；#22/#25 同一 A 分支 work/r4-normal-commerce-completeness，#25 固定 CI-only base ddd2f441ed5b36b8dcb94deaa193764eab7f2d21，永不合併。
- 正式基線 08fdd3b31ff130e66d0337360430fda3d73fdc8d；D #27 05738aa85652354469b780e0b9f76adb28be1954、B #18 aa388be9be5dfd6bdefc5638dd94d62fa31df64d、C #26 b6c1fe8c1050251d327be4a8946b75ef7fcea162（本輪觀測，不是要求其他窗固定）。
- 最新已核證 A41 6a15f516ec9b82f68b950a29a22c2e9758622133 / tree 073c798fe316c26a851a08822279fe8d642f782b，run46062001418/job140718234673，actual checkout b242f2f809da85a78b910d14862611c7f6ff4a71 同 tree，JS1609/1609，Perl2778/2778、94 files，fail/skip/cancel/todo0。
- A40 69106427122828263d3a18e85ae876e21e4602a3 / tree 42102fe19a989a1b1327472b68c626ea2a51a514，run46061534836/job140716712674，actual checkout 004cbd30f95d32e05f1ff5f5ecbc36c5f80a62a2 同 tree，JS1608/1608，Perl2778/2778、94 files，fail/skip/cancel/todo0。
- A42 run46072247384/job140751695747 in_progress，不能借用 A41 綠燈。A43 僅文件，不宣告新 runtime 或新 CI 通過。

## 實際功能清冊（不是平衡性或全玩家驗收）

A41 raw TAP 中的 auditNormalCommerce 真 full-commerce registry：79 ITEM；116/116 USE registered/listed；67 可展示商品（含零 POP #65）；fullCommerceHoldingRejected=[]、fullCommerceExpRejected=[]、fullCommerceStaticDependencyMissing=[]。後者只是靜態依賴閉包，不證明所有玩家路徑。25 EVENT 宣告，17 自動 catalog（15 natural-start、2 external-zero-start），4 manual #65/2，4 disabled/no-reviewed-trigger。禁止把宣告數、形狀可接受或靜態依賴誤作全部操作已驗。

| 原版功能領域 | A 候選交付及必要證據 |
| --- | --- |
| 初始開店資產、進貨、市場供貨、批發價格、#13/#63 零價、FUNCINIT、FUNCBUY | P1–P5 保留，A 擴充 source registry；A41 TAP ok251/1112/1113/1153/1201；原版市場之外玩家商店交 B/D |
| 地圖採集、劍市、打工、寫書、修行、製藥、皮革、木工、鍛造、裝飾、乳製、拆解、打包、慶祝用品、轉職 | A41 TAP ok646/1098/1099/1135–1139/1151/1154–1156/1173–1177；真受控 HTTP 合法取得及操作，非正式玩家驗收 |
| 展示架 1–8、同商品多架、上/下架、直接調價、自然販售、稅、維持費、垃圾、負現金 | A41 TAP ok1123/1125–1132 及 source showcase/item tests；A37/A40 已交 F；多人稅與商會 margin 屬 B/D |
| 倉庫、丟棄、清掃、收支、市價調查、商品明細/USE 表單、揭露及點數、店內場景、評論、頭像 | A05–A41 來源包及現有 HTTP/read/DOM tests；A41 TAP ok218/1108/1162/1163；A41 point HTTP 新測全回歸通過；F 後續一般 UI 獨占 |
| 36h 決算、排名獎品、技術自然衰減/遺忘、自然與手動 EVENT、期限閉店/封存、保存/重啟 | A41 TAP ok1109/1115–1118/1144/1145/1151/1208/1209/1239/1246；獨立單店 source-reviewed CAS/v2 候選；A42 同命令需求分母修正待 CI；外部城市、公會、多人與共同存檔權威交 D |
| 圖書館 | 已有 original-library-view.mjs e082192f6406044d4c6b0ebbe3de240233949349；原版 custom/library.cgi b2f6bd867fb87fd3bd7153b0fdb173de97726e76 八篇完整來源章節；D frontend API contract 已列 GET /api/library；不重做或改寫原版攻略 |

## 真正尚未接通的功能與唯一責任

- #62/1 其他店廣告：A full-commerce 只保證 local self-target rejection callback，早期 two-shop memory rule 不能當正式多人。#62/2 無公會分支已接；正向公會效果須 B/D 真成員與資金權威。
- #65/0–2：單店 self-target 已有候選（/1 為原版 self rejection、/2 為手動 EVENT）；對其他店執行仍須 B/D 共用世界與授權。5 個 limited USE 不是完整外部功能通過；不得以 test target grant 取代。
- A33 店名/店長改名來源計畫已交，尚未啟用正式命令；B/D 名稱索引、帳號/session、重入及保存。
- 自主再出發、閉店、開店註冊、密碼、登入/登出，依已授權 B source wrapper / D 唯一正式 command、ACL、CAS、v2、HTTP；不重做 P1–P5 或製造第二 authority。
- FUNCSHOPIN/FUNCSHOPOUT 跨街遷移，依現有 acceptance 清冊 blocked/cross-street migration。原版交易/設施/交流的其他店 shop-a/b、依賴所 req、宮殿、領主、公會、軍隊、競技場、住宅/婚姻、郵局/宅配、留言/私訊、街景與多人排行，屬外部工作線；不是 A 獨立單店尚欠的新功能。音樂/素材未供應、不補假資產；管理員 item-list 不開放。
- 原版選單 custom/inc-menu.cgi 與固定 Core root CGI 清冊已重新檢查；不宣稱整個遊戲所有 CGI/未公開功能已完成。D/F 仍須實際整合及核對可操作入口，C 仍須獨立正式驗收。

## 交付與停止擴張測試

A 的獨立單店正常經營主要功能候選已可交 D 選擇性整合；A41 綠燈可作已核證基準，A42 單列待核證。並非所有跨店/公會/外部功能已完成，亦不宣告 phaseComplete=true 或改動 acceptance script。保留所有舊測試與歷史缺陷，C 正式玩家、低機率及長程驗收不阻塞其他移植。A 只處理明確新缺口/必要修復，沒有證據支持再開新數值差分批次。D 核對 source/runtime fingerprints、API/CAS/ACL/v2/replay 閉包與 F read contracts；禁止整支合併 #25、force push 或解封舊存檔。A43 不寫 runtime、其他工作窗、CI workflow 或正式基線，無新增平衡測試。完整本機 checkout/其他窗未推送內容不可核對；本次依 exact GitHub source/log/trees。
