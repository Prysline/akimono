# R4 正常經營完整性：第一輪來源／能力審計（2026-11-26）

基線 migration a9654531c64a82be19c135a9b806ff9ef5fa5a73；R4 #18 90791047bbe2cc0f0edac5336b4b2165b17a5b4f；多架候選 c5d233d0a6f6ec3a4cc0da361f6745684f316e3e，P5 #21 34b85d018dc7f2e64b8903f078125ed613848866。#18 45724498402 已失敗，宮殿窗負責，勿以本窗改斷言處理。候選 #22 CI 45727278671 初查 in_progress。此提交不改 runtime、guard、歷史或存檔格式。

## 可重複產生逐項矩陣

在 repository root 執行 `node modern/scripts/audit-normal-commerce.mjs`。使用現有 DSL parser、StreetModule、原版 GetBuffer 的既有 Perl harness，枚舉 79 ITEM、116 USE、25 EVENT、7 global FUNC，保留宣告與行號、編譯後 PRICE/POP/POINT/COST、原版 flag、各 ITEM 市場 registry、USE registry、時間庫存／EXP shape probe 及時間販售規則。此處 shape probe 不建立玩家、不提交、不注入正式世界。真正可達性、合法取得／上架、事件、CAS／歷史重播／存檔／重啟仍須逐路徑補證，禁止從 registry 或 probe 宣告通過。新增 Node 測試核對原版編譯器輸出與宣告完整性，不固定 36 項為正式規則。

## 已核對的具體缺口

- original-b41-playable-sale.mjs：P3 目前只有 #10、25–26、30–36、40–61、67–70 共36項時間販售規則。65個明寫正值 POP，另有 #77/#79 由 PRICE 編譯預設，合計67個編譯後正值 POP；31個未納入時間販售規則者為 #1–8、15–17、20–23、27–29、39、62、64、66、71–79。其中 #64 有明示禁上架，故不能當成31個均可售；精確缺口以矩陣輸出為準；#64 正值 POP 但 noshowcase|onlysend，必須與合法上架能力分開。#77、#79 未寫 POP，原版 PRICE 自動給正值（1440000、72000），不能視為0。
- P3_TURN_IDS 缺 #13（P5）、62、65、71–77；#62 原版成本10000，市場 PLUS 5d、BASE 10/50；#62/0 自家廣告原版 EXP 10%，現代化 reviewed-self-advertise-use 編譯固定100 EXP，但 P3_EXP_IDS 未收62。#62/1 跨店與 /2 公會不能從單店授權推論。#65/0–2 尚須重新查實際外部依賴。
- P3 validateP3Inventory 單架；projectSourcePreEventSaleSlice 多架 active EVENT 直接拒絕，即使 DataRead 已產生逐 ITEM saleRules，仍將未覆寫的 saleRules 傳入 R3 shared core。多架 receipt 有 soldByItem 但 controller settlement receipt 仍以 soldItemId 第一架為主。必須接通全商品、逐架、跨期與歷史。
- 現有 OriginalR4PreEventHarness.pm 將全部 ITEM type 設為10，且跨期 oracle 只給前四架 SHOWCASE_COST。不能用這個未修改的 harness 聲稱異類商品多架專門店判定或5–8架跨期已驗。重用 frozen natural_source/compiled ITEM 與原版8階維持費，擴充獨立差分。
- 原版 #70 FUNCTURN 明確只讀第一架，不能在多架擴展時改為任意架。現有 R3 callback stage 核對唯一 ITEM turn callback 及無 ITEM sale callback；保留原版順序。
- 共用修改協調：P5 已改 original-b41-playable-sale 的 #13 holding、market buy、reviewed-ordinary-command-policy、standard-street-module、HTTP/UI 等；不重製。#18 已改 reviewed-world-time、period ledger、disk、UI、ordinary policy 等；本輪新增獨立審計工具與測試，沒有覆寫這些檔案。後續每次修改前重查 diff；同步宮殿修正版後重新驗證。

## 未完成

逐項合法取得和持有、展示架合法上架的全部原版條件、負資金／稅制、技術衰減／過期、跨店／公會等外部依賴；多架自然販售及 EVENT／決算／CAS／雙世代／歷史及真玩家 HTTP 測試。保留現有安全拒絕直到完成來源與玩家證明，非正式原版規則。舊 #1/#16 只作來源重用。

## 追加來源修正：混合類別前段需求掃描

凍結 inc-turn.cgi 48–64 行原版專門店判斷遇第一個不同 type 會在累積該架 buypeoplebase 前 last；後段 GetMarketStatus 及 96 行後逐架販售仍完整執行。R3 既有 shared core 先前對全部架累積分母，混合類別下可能少售。此次只修正前段分母掃描，不更改售價、後段逐架遍歷、維持費或原本16案斷言。額外4案 Perl/Node 精確 RNG 差分含異類有貨／無貨、回到原類別不重新開啟掃描及八架混合。尚待本 PR CI，不等於正式多架玩家能力。P5 HEAD fc5dcbe8 與 #18 e4586a22 的 diff 均無這三個程式／測試檔案重疊。

## 全商品 ITEM 編譯與零 POP 展示來源差分（第二輪）

新增 reviewed-normal-commerce-items.mjs（凍結 DSL、GetBuffer、sc-s.cgi、inc-turn SHA pin）與原版 GetBuffer TYPE/FLAG harness；逐項比對79筆 PRICE/POP/POINT/COST/TYPE/FLAG，不另建販售算法。來源 sc-s.cgi 只禁止 flag s、無貨、非法索引／售價；不要求正 POP。#65 禁斷之書可展示但原版 inc-turn 跳過 buypeople 設定；GetMarketStatus 的零 POP uppoint=100；仍參與專門店／陳列維持費。共用 R3 core 對精確來源 #65 零 POP 新規則作零自然需求處理，保留舊無來源證明零 POP 拒絕。67種原版可展示商品（66正 POP + #65 零 POP）、另兩案混合多架原版 natural 差分，共69案；不是 HTTP、CAS、EVENT 或 v2 驗收。全量 source metadata 待接既有 R4 正式控制器（P5 同時改 B41，不能覆蓋）。原版候選 c5d233d0 CI 45727278671 runner checkout ab63927，1372 JS / 2778 Perl/94 檔全通過（16案多架決算隔離）；本輪新增候選尚待CI。另已確認 B57 支援 EVENT 仍固定單架、正常/跨期 pre-event RNG 上限121/125只夠單架（8架自然最多24 draw + rank + #70 + 118 PLUS，必須擴充而不改既有 tape prefix），後續正式整合必須逐接點修正。

## 多架 EVENT 來源回呼接點

新增明確 full ITEM review 的共用 shape validation（1–8架、原版上架flag與價格、79持有上限、全部canonical ITEM EXP key/1000個別/3600總量、職業），不授權取得或跳過CAS/history。保留原 P3 受控 guard。B55 manbiki/goutou 改為原版逐架扣除，重複商品用前架扣後庫存與各架價格累計，不去重；機器人仍整店保護、RNG與return不變。B57 getmoney/getpop 依相同新review接多架，既有舊呼叫行為不變。既有 source oracle 支援獨立 --multi-shelf 選項，8個偷竊/強盜案例、1–8架×2補助/人氣16案例；未刪除或降低舊斷言。R4 EVENT fixture 傳相同 reviewedInventory 至支援 callback，未開啟正式 runtime full review。待 CI。#13取得/打工仍由P5主責，shape接受不代表另行實作；CAS/HTTP/UI仍未開放多架時間。
