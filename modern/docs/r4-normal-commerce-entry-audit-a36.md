# A36 正常經營入口盤點（部分，非全系統完成宣告）
固定 upstream Core 738d71a2985fd088f2ca90f25145706392ee2365；本輪入口盤點起點 A35.3 f4187ec2d3f690ef90b7e1cb3a7876c000e18e8f。以下只記已實讀的 CGI 與現代對應，不把靜態接入當作測試通過。

| 原版 | 現代對應及分類 |
|---|---|
| main.cgi、inc-main.cgi | 店內、ownerHelp、ownerScene、ownerClock、展示架、店內評論、店內新聞已接入候選。A36 補漏：DevelopImage 金幣與垃圾列、原版展示商品、CharaDefine 空位及新聞/倉庫/垃圾掃除操作入口。郵箱及矮人宅配為 B/D；真 Turn 時鐘亦依 D 統一權威。 |
| inc-info.cgi、inc-html-ownerinfo.cgi | balance、ownerClock、shopSummary、sweep 等已接候選；多人 RANK、公會費依 B/D，不從獨立單店虛構。 |
| stock.cgi | warehouse、庫存分類、熟練度、原版垃圾阻擋及 item 入口已接候選。 |
| item detail/item-m/item-s | 商品明細、表單及提交已接候選；A35.3 原版 USE 揭露與拒絕完整回歸待核證。 |
| shop-m.cgi | 市場、分頁、購買明細已接候選；shop-c.cgi 市價調查單店候選已接；多人 shop-a/shop-b 及共同市場依 B/D。 |
| other.cgi、icon.cgi | 評論及頭像有 HTTP/UI 候選；改名來源包 A33 待 B/D 多人權威；密碼、再出發、閉店為 B/D。 |
| log.cgi | 速報新聞候選已接；排名/爵位/入賞多人權威 B/D。 |
| wis.cgi | 跨店私訊 B/D。 |
| bgm.cgi | 原版 frame 轉接（非經營規則）；實體音樂未提供，不造替代音樂或聲稱播放完成。 |
| item-list.cgi | 管理員專用，禁止擅自開放。 |

A36 來源 inc-main.cgi upstream 與 frozen core-inc-main.cgi 同 blob 5cd020011f6676ec4a8a202ab1bb28b90515ce8d。DevelopImage、CharaDefine 的計數/選擇沿用 A 窗既有差分；新增固定 map 相對路徑、明示寬高與 class（不猜 class CSS 尺寸）。無實體圖，UI 以文字占位，保留重複架及空位；新聞、倉庫、垃圾袋走既有 tab navigation，垃圾入口只在原版產生垃圾袋時顯示，並不取代正式掃除表單或放寬 guard。無 RNG、時間、CAS、保存權威變更。新增原版 Perl 差分延伸、DOM 行為、真 HTTP 唯讀契約；完整 CI 尚待。src blob 改變須通知 D checkpoint fingerprint；不解封歷史存檔。未完成正式玩家驗收。此清冊非完整 CGI/函式盤點，下一輪繼續細查原版剩餘 handler 及 CI。

## A37：已陳列商品直接進入調價表單
實讀 upstream `inc-sc.cgi`（2e328443f3f83bd862f56a540e1357b31917651d，與既有 frozen fixture 內容一致）、`inc-item-show.cgi`（040665122724efadf530bd935ac448c680ec44bd）、`sc-s.cgi`（0bada620cff769bed782707d61b87e48cce0a58c）。原版僅 stock>0 的展示架商品產生 item link，帶 no、sc（1-based）、pr、bk；表單原本選定 sc、比例100、直接價 pr。舊 UI 只提供下架或去倉庫，缺直接操作入口。同品不同架不可用 ITEM ID 選第一架替代。新 full-commerce UI 以現行 snapshot 重新驗證實際架與庫存，導入原架、原售價及返回店內；維持空架選貨延伸、倉庫入口與既有真 /api/showcase CAS。新增實際原版 CGI HTML 差分、DOM/選架契約與受控 HTTP 同品雙架調價、stale CAS、保存重載測試，完整 CI 待核證。未改 src、adapter、凍結資料、交易規則或 fingerprint 輸入；非正式玩家驗收。

## A40：商品計量單位顯示
固定 Core item.cgi 9b4db56d6702d6b3475af0331fdcf1a27ed8d3c8、inc-sc.cgi 2e328443f3f83bd862f56a540e1357b31917651d、inc-item-throw.cgi 714e623b9fd1f40ce7c51b89503d2a801330f1bb、buy.cgi 79ec6f92d873883dddc5e6442dcb4694638515d2、stock.cgi 8465b8dd3c0d2ef8c81078b617806fcc9ed469ae、shop-m.cgi 0f40e0939c5376deb5257632feef39abfdf7a096。原版 item 持有量、展示架三個數量欄（含零及未決算時前期0）、丟棄與購買兩種數量輸入有 ITEM scale；stock.cgi 倉庫數量/上限與本期/前期純數字，不全面添加單位。full-commerce adapter itemCatalog 投影現有 scaleRaw，不新增人工商品表；購買使用現有 detail.scale。舊模式不變。HTTP catalog/reload 和 DOM 測試待完整 CI；無經濟/交易/保存規則變更。
