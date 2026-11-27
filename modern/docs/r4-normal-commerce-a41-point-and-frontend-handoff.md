# A41｜來源點數刷新與 A36–A40 前端交付

起點 A40 69106427122828263d3a18e85ae876e21e4602a3 / tree 42102fe19a989a1b1327472b68c626ea2a51a514；固定 Core 738d71a2985fd088f2ca90f25145706392ee2365。F 新分工下保留歷史 UI，不增加一般頁面。

## needpoint

原版 inc-func.cgi e7a8add7b0291901e71fe797783b664dff1568a0 L233–315：DataRead 讀 DTindexnamelist 後立刻 GetDTPoint。item-m.cgi 7ec2c01829c20e78feec53a1ed410ad7254b21c7 L5/123 及 item-s.cgi bf895cb9c4672fe984cc9be352d52a856d3ac4e3 L6–8/31–32/63：展示與提交分別讀取資料；plug/use.cgi 1bf4537cc41e344c144d840d43175c4c232765bb L76 使用 DT.point。現行 shared-use-item-core / listUseOffers / HTTP RNG preflight 都讀 shop.point。跨期 disk.finalize 已呼叫 projectOriginalSoloSort 每次刷新（original-r4-independent-world-disk.mjs fcef6566b3ce477f93681c043964f6d3ec3edc38 L84–102）；非跨期 full-commerce 的 finalizer 只有 cash cap，開店無 point、操作後可能舊值，但 shopSummary 另計算即時點數，確定來源差分。A41 僅修改非跨期 full-commerce finalizer，共用 projectOriginalSoloSort，原 CAS exact replay 路徑同一函式；跨期與 prior-commerce 不改、needpoint 條件不改、不建立第二權威。D 收錄須核對 fingerprint/replay，不解封舊存檔。

既有公式差分 r4-palace-source-point.test.mjs（384 cases）保留；新增固定時鐘、初始合法 #63、付費 USE #63/1、初始5010→4817、stale CAS、顯式保存重啟 HTTP 回歸。局部 V8 實際 frozen review + 摘錄新 finalizer + 真 projectOriginalSoloSort；現金 cap stub；檢查5010/4817、無原地變更、舊模式相同物件，通過。非完整 HTTP/CI/Perl 或玩家驗收；新增 HTTP 尚待 CI。

## F 交付（選擇性收錄，不改 A 歷史）

固定 A40 tree：modern/local-ui/app.js 6aa654cdadd740b2113a287e1a18ffa50801efd7、index.html 2037a3f79dde767cab9b95486f294187c316e680；modern/scripts/dev-local.mjs b6c9e750df31aa5f64532f3605c53dddb50d5add（D read projection/fingerprint）。modern/tests/local-original-ui-layout.test.mjs c5a00af2af26c9d22438307d8abb2727d56561af。詳見 r4-normal-commerce-entry-audit-a36.md。

| 批次 | 原版操作契約 | 現代來源包（modern/src/）/測試（modern/tests/） |
|---|---|---|
| A36 86f97267b50c2cb90188d79e8d0d7a92368d9a15 | inc-main.cgi 5cd020011f6676ec4a8a202ab1bb28b90515ce8d：金幣、垃圾、展示商品、空位；news/stock/sweep 三個 owner scene 入口，垃圾袋顯示依原版，不取代掃除 guard；郵箱宅配 B/D。 | original-r4-owner-help.mjs 8dd6d80aa492c05fbac4b54146c135ffe85deb3e；r4-normal-commerce-owner-scene-http.test.mjs fa2f9d27b01e48e45a4673b5d361120d8c138da8 |
| A37 4329653d6538ebbac6e44dd2adb3adcf61a36762 | inc-sc.cgi 2e328443f3f83bd862f56a540e1357b31917651d、inc-item-show.cgi 040665122724efadf530bd935ac448c680ec44bd、sc-s.cgi 0bada620cff769bed782707d61b87e48cce0a58c：stock>0 連結、no/sc(1-based)/pr/bk；同 ITEM 不同架 target 不混；現代 snapshot revalidate /api/showcase CAS、比例100、原架售價預填。 | original-r4-showcase-view.mjs 5d95208a9326cdae1a7ebe393781cd5747007c4d；r4-normal-commerce-showcase-entry.test.mjs 7148743f6e5d9ad130e897e51cbf83d13e1742da |
| A38 e890f43df00a4d05cdb90f672865e3b90dfc3446 | 三 scene 捷徑允許，其餘店內區仍禁止重複 data-go-tab。A36 歷史紅燈保留。 | local-original-ui-layout.test.mjs（A40 blob 上列） |
| A39 f8046acd349f9d569f0c3bdb2d746f7be7c1c6a6 | item.cgi 9b4db56d6702d6b3475af0331fdcf1a27ed8d3c8、inc-item-throw.cgi 714e623b9fd1f40ce7c51b89503d2a801330f1bb、zh_TW.po a512f6887cee214e66828769a382ad2b18bcd5b3：t 不顯示表單，h 解雇；切回普通商品恢復。 | original-r4-discard.mjs 76ae05c8b61b3d8f76be8b91f68a4ae758adf678；r4-normal-commerce-discard-http.test.mjs 03a8d247f4ab24ab8104ac40ee214b4f8bec4a8d；DOM test 上列 |
| A40 69106427122828263d3a18e85ae876e21e4602a3 | item.cgi、inc-sc、inc-item-throw、buy.cgi 79ec6f92d873883dddc5e6442dcb4694638515d2、stock.cgi 8465b8dd3c0d2ef8c81078b617806fcc9ed469ae、shop-m.cgi 0f40e0939c5376deb5257632feef39abfdf7a096：明細/架/購買丟棄輸入用 scale；架的0與前期未結算0保留，倉庫量/上限/售出純數字。 | itemCatalog.scale 來自既有 scaleRaw，offer.detail.scale；r4-normal-commerce-read-views-http.test.mjs 715454e4d9c8bbb66a4c3e8decaa48b7086f66f2；DOM test 上列 |

news/warehouse/sweep 依賴 original-r4-news-view.mjs 9b136348a1d56f144fc1e03fd778217fc120ab18、original-r4-warehouse-view.mjs ac2b63fbb1ad1b9a605a8b7b8511b5c97438faee、original-r4-sweep.mjs d8d368b99731e6beb9ea6b2ad3a20a28aaa97a38；測試 r4-normal-commerce-news-view.test.mjs c667d03b58cf3a087a289e34176415fcf9b84c84、r4-normal-commerce-warehouse-view.test.mjs 3e876c7e538def3542cede63230ef84c207b6582、r4-normal-commerce-sweep-http.test.mjs d1d315c5fcd28521db5030dfa1a99f928e2fe3f7。sweep.cgi 720d950c288c44b2ac664193a7c9e96c5a2b18d0、sweep-s.cgi cecf6b31bfb231ca4b98b37082076171b1e9577c。F 需由 D 正式契約供應 read models，不從 UI 自行計算交易或假成功；不直接插入 CGI HTML。

A36 raw job140671594280 JS1602/1603，fail1/skip0；Perl 未執行；A37–40 查詢時 in_progress，沒有完成 raw log，不宣告通過。所有候選與正式基線收錄、C 正式玩家驗收分列。無本機 checkout/stash/unpushed 可核對；GitHub DNS 不可用，connector 施工。
