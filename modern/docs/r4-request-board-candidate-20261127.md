# R4 依賴所／委託交易正常功能來源包

凍結 Standard Street custom/inc-menu.cgi 53e8e64f1b3c1d0eeb67104cc3377b50996c4187 明列依賴所。B/D 當前樹未見 request 功能包。移植 req-s new/plus/end/thank、inc-req ReadReq/WriteAuc、正常 req/req-l/req-f 表單。正常玩家以可信 actor 建立本人委託，別店達成、本人取回或取消未達成委託；原 raw end 無 owner check、plus 無 self check、thank 無 mode check，保留差異而不新增越權入口。money=-1，最多一筆委託，48h，過期嚴格小於 NOW，標準價兩倍範圍、norequest/onlysend、稅、收貨 cap、先扣獎勵再收貨、撤回不退稅/不退 paytoday；不耗時間。原版 cash reward plus 的未賦值 package $id 額外 paytoday 只有存在該 id 才執行，normal action.cgi 不設定此變數；不自行把它換成 requester ID。候選不處理 malformed legacy rows、缺活躍收件者的安全政策或原版任意直接 handler 呼叫。正常 request 檔按原 8 CSV 欄位，新到舊順序。無權威寫檔；D 接唯一 CAS/save/HTTP。

固定五份 upstream CGI blob，既有 calc/config/action/DSL pins。必要差分直接執行原版 req-s、inc-req、CheckCount、真 temp request stage；sale/buy/barter 各自 new→plus→thank、withdraw；街道 read/auth/commit/render 為 adapter。CI 尚待執行，不作玩家正式驗收。
