# B｜商店通り：商品別／店名別來源包

原版 Standard Street 正常 menu 的 shop-a（Core blob 31bddddcfacfd91f7d778c3341b8b7f63d1aa6eb）及其 shop-b（82ee6a3794393608dd99a761f1cbe3b5d99bca33）、plug/page.cgi（aa8b04dcec124276cb5b4eeeba650137b4449779）、凍結 _config.cgi（87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0）。Core pins 只新增 oracle 複本。A 已用 shop-c 市場相場來源作 normal commerce overlay，B 不複製其計算。B/A/D 最新樹與 UI/HTTP 查重，已有 peer purchase engine、A market shop-m/form、D integration，但未見 shop-a/b 跨店來源清單；本包僅提供 read-only view。

商品別：原 DT 順序產生排名，展示架 0..showcasecount inclusive；按 price*DTusercount+(DTusercount-rank) 升序，等價同價較後排名先顯示、同店同價按 source slot。商品 type/filter、item dropdown（原 compiler 每 item 唯一 sort）、mobile 無 type 時隱藏下拉、PC 25 / mobile 5 rows；售罄照列但無 buy link，guest 同樣無買入 link。店別：下拉仍掃 inclusive，顯示 0..showcasecount-1、逐店 5、已選 ds 指定 index、closed status 跳過在分頁後；itemtoday 銷售量顯示，重複架保留。店下拉排除當前店，原選中值 senditem 而非 ds。原 purchase buy=shopId!slot!itemNo 與 bk=p2!page!itn／p!page 為 link intent，不能作正式權限或價格來源。

trusted D adapter 供 canonical query ints、server guest/viewer、原 DT 順序及 compiled catalog，現代拒絕不可信 id/sort，不設新玩法。沒有交易、CAS、存檔、價格調整。D 負責正式 UI/HTTP、權限及 peer purchase 校驗，A/D market survey 不變。真 source oracle 直接 do shop-a/b + actual GetPage，config 讀原頁數、最小 HTML helper adapters；比對完整 row 表示、filter、選單、同價、分頁、售罄與購買連結，不宣告正式玩家驗收。新包完整 CI 待證。
