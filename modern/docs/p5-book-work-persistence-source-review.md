# P5 #13 資金賺取方法：合法取得、收入及 v2 來源審閱（2026-11-26）

**狀態：Draft PR #21 候選，尚未驗收／尚未合併。** 開工基線 `a9654531c64a82be19c135a9b806ff9ef5fa5a73`，tree `7e0e4909cd2569db438bdebc16c435c70f5627ef`。P4 PR #20 已正式合併：merge `a9654531c64a82be19c135a9b806ff9ef5fa5a73`、PR HEAD `0aeaca696e533d3616b6f3b517fa47afbf6d1ff6`、tree `7e0e4909cd2569db438bdebc16c435c70f5627ef`。[CI 45653296366](https://github.com/Prysline/akimono/actions/runs/45653296366) exact HEAD、實際 checkout `a39f5f027eccc43997e0824c1af1704c658754d3` 同 tree：JavaScript 1325/1325（0 失敗、0 跳過）、Perl 2456/2456（85 .t）、DSL 與凍結 source blob 稽核成功。

本輪 GitHub 連接器已寫入候選；執行環境不能解析 github.com 進行本機 checkout，故未在本機執行 Perl 或 Node。P5-A 的獨立 Oracle 先提交並觸發 Actions；其執行結果尚未取得，後續程式及測試仍屬候選，不是已通過 A 再提升的版本。只從正式 migration 開 `work/p5-book-work-persistence-20261126`；不修改 main、R4 研究分支、固定交接 refs、凍結來源或 Notion。合併須另經授權與 exact HEAD 完整 CI。

## A. 凍結來源及差分

- [custom/inc-item-data.cgi](https://github.com/Prysline/akimono/blob/a9654531c64a82be19c135a9b806ff9ef5fa5a73/custom/inc-item-data.cgi#L1860)，blob `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`。DEFINE NewShopMoney=100000、NewShopTime=12h、NewShopItem #63×1、#79×5。無初始 #13；在標準街 DSL 已搜尋 #13 名稱／code，未發現其他直接取得宣告。不能把未審閱的其他街道或事件視為合法贈書。
- #13 book-work：price 0、limit 1/1、pop 0、plus 10h、noshowcase；兩項 USE param 3000／10000、time 4h／8h，原版 ItemUseTimeRate=.5，peddle rate 1.5，因此每次普通 7200／14400 秒、peddle 4800／9600 秒。收入乘的是原版 effectiveCount，不消耗書或產出商品、不新增 EXP；原版兩筆 WriteLog 以 B-27 格式化結果呈現（受控 ¥ 格式，不等同所有部署幣別）。
- #63 edit-showcase：price 0、limit 1/1、pop 0、plus 1d、noshowcase|norequest，初始有一組；其市場再取得尚未獨立完成，不放行。#24 skill-mekiki 是原版運輸 FUNCINIT 修正的來源。
- 凍結 [whole.cgi](https://github.com/Prysline/akimono/blob/a9654531c64a82be19c135a9b806ff9ef5fa5a73/modern/tests/original-perl/whole.cgi) blob `778badaf157326bcfd1f8fa1e310d94f94995eb3`：GetWholeStore 保留在庫固定零價，依 ITEM sort 排架；CheckWholeStore 計入全部店舖持有，單店 #13 上限 int(1+0.99)=1，持有一本後市場應為 0。inc-turn 原版 PLUS 依人口、時間、RNG 計算；10h 不是固定補貨時刻。
- [buy-s.cgi](https://github.com/Prysline/akimono/blob/a9654531c64a82be19c135a9b806ff9ef5fa5a73/modern/tests/original-perl/buy-s.cgi)：CheckCount 先裁切持有上限，再按 shelf/item/price/stock 驗證，資金裁切只在 price>0；市場 TimeSendItem 除二，GetTimeDeal、UseTime、GetSaleTax、庫存與 money/paytoday、PushLog、全域 FUNCBUY、SetWholeStore 依原序執行。0 G 不送禮券（全域 threshold 500000）。
- [item.cgi](https://github.com/Prysline/akimono/blob/a9654531c64a82be19c135a9b806ff9ef5fa5a73/modern/tests/original-perl/item.cgi)：GetTimeDeal 零／零倍率1、GetSaleTax base=0 的稅率及稅額分支；[calc.cgi](https://github.com/Prysline/akimono/blob/a9654531c64a82be19c135a9b806ff9ef5fa5a73/modern/tests/original-perl/calc.cgi) blob `586354a9a300e26d0e12a4efa512fa25760e3197`：UseTime 既有 72h cap、拒絕未來 shop time。未轉職、無 #24 預期 #13 買入 600 秒。來源 @@FUNCINIT（inc-func.cgi:385 CheckUserPass 路徑）先對 #24 ×3/4、peddle ×1/2；只為新審閱零價路徑加入相同順序，預期 #24=450 秒、peddle=300 秒、兩者=225 秒。現有正價市場 FUNCINIT 時間語義不在本次改動，不能把其現行 receipt 視為該修正的 Oracle 證據。
- 新 `modern/tests/original-perl/p5-book-work-market-oracle.pl` 重用原版編譯器 GetBuffer、PLUS/CheckWholeStore、真 buy-s.cgi、GetTimeDeal/GetSaleTax、原版 FUNCINIT 與 FUNCBUY，採隔離 I/O stub 及受控全零供貨抽樣（**只用於 Oracle**）。16 個候選案例含零現金、超請求裁切、持有、缺貨、負／錯價、錯架、錯商品、非法數量、future clock、72h cap、三種運輸修正；擷取購買 PushLog 呼叫與 FUNCBUY/寫入順序。原版幣別/時間格式在這個交易 harness 是數字／秒 stub，不宣稱 CGI 登入或本地化日誌逐字相同。原版 #13 打工回呼另沿用已存在的 `r2-book-work-source.test.mjs` 與 `original-r2-book-work-use-probe.pl`。

## B. 共用市場交易候選

- `standard-street-market-buy-registry.mjs` 只授權明確審閱 #13 的 source row、固定 0、limit/PLUS/POP/flag、無 ITEM FUNCB 與 BASE，以及已知 FUNCINIT；不因 price=0 自動開放其他商品。quote 不執行 price/base；0 有效報價仍須正 transport time。
- `market-buy-core.mjs` 沿用同一 market-buy、shelf/price/CAS/庫存轉移、global threshold。只有來源規則允許 0；正價商品報價 0 拒絕；0 不使用 money/price；零價總街道持有＋市場量上限。沒有新免費 endpoint。
- `dev-local.mjs` HTTP 允許 expectedPrice 非負安全整數，精確欄位與 GameCore 仍裁決；`reviewed-ordinary-command-policy.mjs` 僅已審閱零價規則允許歷史 expectedPrice=0。正價與其他命令維持原條件。
- `original-b41-playable-sale.mjs` 將 #13 加入 P3 持有物品 cost（0）、無可售規則；現行 reviewed time 仍單店單架，未開放 EVENT 或其他商品。前端 0 與 null 原本分開，保留現行 market/UI；共用 USE receipt 增加 moneyEarned，只顯示已計算的原版收入，不接受客戶端收入。不改原版 log disk adapter 的一般 local 訊息，也不宣稱完整 CGI 日誌落盤。

## C–E. 玩家、持久化與安全驗收候選

- `p5-book-work-market-source.test.mjs` 對上述真 Perl Oracle 結果做斷言；`market-buy-core.test.mjs` 新增同源受控 Node 差分，含未知零價、正價偽零、超街道 cap 拒絕。受控 fixture 不算玩家。
- `p5-book-work-v2-player-http.test.mjs` 兩個實際 HTTP 測試，使用 `genuinePlayer(t,{now:null,crossPeriod:true})`、新獨立目錄、伺服器 RNG；從初始空市場、真開店、正式 advance-reviewed-time 有界等待、既有 /api/buy 取得 #13，再兩種打工及超請求裁切，買 #78 /12 行腳商人，驗證 7200/14400→4800/9600。實際市場正價 #8 消費與合法丟棄累積 checkpoint；不注入收入、庫存、EXP、RNG 或假時鐘。消費驗證現行共用正價 receipt 的實際扣款，不宣稱正價 FUNCINIT 另已移植。
- 第一代、第二代及兩次 Node restart，來源歷史 / retained prefix 逐段核對 #13 買入 expectedPrice=0、USE 只含原版命令欄位，完整 WorldState、revision、generation、money/stock/time/job、HMAC/fingerprint。沿用唯一 `akimono.local-world-save.v2`；不改 save envelope、checkpoint store、history replayer 或增加 moneyProof/workProof。source/runtime fingerprint 仍會令不相容 v2 拒絕。
- 負面案例涵蓋未持有、缺貨／持有上限、錯價／錯架、額外欄位／RNG／收入、非法 count、過期 revision／generation、時間不足、不能陳列、fresh history checksum 正確但現金／書／命令不符、HMAC/fingerprint/prefix 錯誤、v1、損毀與舊世代回復。既有 R0–R4/P1–P4 回歸仍須完整 CI。
- 驗收關卡：目標 PR exact HEAD / checkout merge tree、source blob、DSL、完整 JS/Perl CI 以及 P5 diagnostics。現在只完成候選寫入，沒有實際 P5 passing count、玩家收入數字、重啟通過或合併結論。任何失敗必須讀 logs 再修正；不能用 P4 成功結果冒充 P5。

## 剩餘範圍

P5 未通過前維持候選。P1–P4 已審閱範圍保留；未認證 #63 再取得、其他市場 FUNCINIT 修正、其餘 R2 USE（#62/2、#65/0–2 等）、#62/1 多店授權與持久化、全量 R0/R1/R3、R4 多架／公會／龍族／軍隊／領主／外部 IO／關店、R5、其他街道及多人皆不能因 P5 候選而宣稱完成。只在本輪工作分支；不接管 R4。
