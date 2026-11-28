# R4 F/D HTTP 契約清冊 v0.1（D52 候選，2026-11-28）

固定權威：D47 1dc4f9b465a41fc3a852efcb39baea3c9b2c01ad、tree 22ad02016a29381d228a9ae37add62e4ccc3565d，raw CI 46047264855/job140669526138 checkout be2c8440fb61718d3863b9cc7db3b1df8b26f3a6 同 tree，JS1444/1444，Perl2829/2829 (88 files)。D51 cb3b7034e311c5d53c93bfa25219a5eedbbfa979 的 dev-local.mjs blob 4cd9936436e7e46708bbe747384026f0b6bf4655 與 D47 一致。此為 #27 本機候選契約，不是已合併正式基線。F 已從 D50 啟動，F2 無後端變更；不要求重設。此文件不是新的 API 實作。

## 現有 routes（exact request；JSON body）
| Method / path | Body 或 query | 成功與 gate |
|---|---|---|
| GET /api/state | 無 body | 200 state DTO，未初始化 world/shop 為 null |
| GET /api/library | 無 query 或唯一 t=0..7 | 200 來源 library DTO；非法 query 400；非 GET 405 |
| POST /api/initialize | {} | 初始化單一本機來源世界；已有 live/disk/unreadable 拒絕 |
| POST /api/open-shop | expectedRevision, ownerName, shopName | 現有本機單店 ID1，非原版 registration/login；須先初始化 |
| POST /api/buy | expectedRevision,itemId,requestedCount,marketShelf,expectedPrice | 原版共用 market-buy；報價及庫存以 server 為準 |
| POST /api/use | expectedRevision,itemId,useId,requestedCount | 共用 USE，server RNG；targetShopId 403，其他額外欄拒絕 |
| POST /api/discard | expectedRevision,itemId,count | 共用 discard |
| POST /api/showcase | expectedRevision,itemId，至少 per 或 priceOverride；可選 shelf | itemId 0 清架；per 1–200，priceOverride 受原版上限；shelf 零基、預設 0；非任意商品 |
| POST /api/advance-reviewed-time | expectedRevision,minutes | 已審閱時間/庫存/EVENT 範圍；跨期須 server opt-in |
| POST /api/save | expectedRevision,expectedGeneration | 200 SAVED；顯式 durable two-slot atomic rename/fsync，多店拒絕 |
| POST /api/load | {} | 200 LOADED；live world 已存在拒絕，不覆蓋 |
| POST /api/reset | confirm,expectedGeneration,expectedRevision,expectedWorldId | confirm=RESET_LOCAL_TEST_WORLD；revision/worldId 可為 null；只本機測試維護，需使用者確認；不是玩家 lifecycle |

所有 mutation 同源、本機 127.0.0.1；若提供 Origin 必須精確符合 server origin，否則 403。JSON body 4 KB 限制；數字欄位依 commandNumber safe integer 檢查。現行本機模式不是正式 owner session/auth，禁止把它當作多人安全服務。POST 成功通常 200 {ok:true,code,details,state}；core 拒絕 409 {ok:false,code,details,state}；其他拒絕可能只有 error/state，方法/來源/不存在也可能沒有 state；catch 400 {ok:false,error,state}。不要假定每個錯誤有 code 或 state。成功不等於已保存，只有 save 成功具 durable 界線；拒絕不自動重送，斷線結果不確定，重新 GET state 後由玩家確認。capabilities 是顯示文字而非權限證明。

## State DTO（固定上述 ref）
world,save,nextSettlementAtSeconds,secondsUntilSettlement,settlementMenu,ownerClock,ownerHelp,shop,shopSummary {point,rankPosition},marketOffers,marketPageRows,itemCatalog,useOffers,showcaseEditTimeSeconds,showcaseOffers,capabilities,disabled,reviewedCrossPeriod,reviewedMarketCommerce,reviewedTimeMode,historyCommands,historyCheckpointRevision,memoryOnly,diskSaveAvailable,sourceCityState,sourcePeriodMetadata,eventDefinitionStatus。itemCatalog entries: itemId,name,basePrice,stockLimit,flagRaw,type,costRaw,info。showcaseOffers entries: itemId,name,unitPrice,owned,canShow,source。rankPosition 尚為 null；marketPageRows、ownerHelp、ownerClock、settlementMenu 依來源/能力可 null。不得在 UI 推導未發布排名、交易資格或新狀態；world/shop 是既有本機 snapshot，將來正式 auth/private DTO 由 D 另版定義，不能假設現行 whole-world DTO 可公開。

示意 mock（片段，非完整真 state，不具權威）：成功 { "ok":true,"code":"SAVED","details":{"action":"save-world","generation":2,"revision":7,"durable":"two-slot-atomic-rename-fsync"},"state":{"world":{"revision":7},"save":{"generation":2}} }；拒絕 { "ok":false,"code":"REVISION_CONFLICT","error":"REVISION_CONFLICT","state":{"world":{"revision":8}} }。僅供 isolated fixtures，正式使用 server 真回應，禁止造資產/權限或 mock 退回正式模式。

## 仍拒絕或未發布
POST /api/supply 409、/api/advance-time 409；歷史三個 /api/r2/{advertisement-package-market-preflight,target-advertisement-preflight,open-target-shop} 403。restart-shop/close-shop 候選 POST exact expectedRevision,confirmation（restart/closeshop），尚未發布；正式 registration、login/logout、session/owner ACL、多店存檔、外部公會/龍族/軍隊/領主、街道 public snapshot 等待 D 對應 source/authority。A40 itemCatalog.scale 尚未收錄；不以前端猜測替代。D 的 API 變更須通知 F，明列 ref/blob、欄位/錯誤/能力、測試及不相容指紋；F 回交 exact 差分，D 選擇性收錄，不整支合併。
