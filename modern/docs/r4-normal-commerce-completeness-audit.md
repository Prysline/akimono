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
