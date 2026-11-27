# R4 城鎮風景來源包（B／2026-11-28 UTC+8）

來源：Standard Street custom/inc-menu.cgi（53e8e64f1b3c1d0eeb67104cc3377b50996c4187）啟用 guest/player 風景；原版 Core town.cgi（katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365，blob 07cf4cf8fe3b3c9ada166d0f75bdf76c884b8244）；本 repo frozen custom/inc-town.cgi（d579a5bec7ae71706ba8161790d2760033fd2f93）。未改凍結原版，Core pin 僅放 oracle 目錄。

來源規則：固定街景十個格位及兩個固定建築；發展度嚴格 >4500 建築，>5500／>6500 道路，>6500 樹；叛亂領主邸與台詞優先，否則 int(NOW_TIME/3600)%4、治安<4000 時相應台詞、leader owner name／balance name。以原 @DT 順序顯示活動中店舖，lastlogin >= NOW_TIME-600，保留原文字分隔。不是選單 LoginMember 的 120 秒／最多四家。留言板時間取原 common/treelog.cgi mtime（不存在原取 0）；D 供可信 metadata 及既有時間格式化，不接受玩家設定。guest 格位 route 差異保留，兩個固定 GetMenuTag 為來源 link intent，不是正式授權；D 負責 GetMenuTag policy／HTTP／UI／可信 session／clock／ordered snapshot。台詞、名稱、路由、asset basename 為結構化資料，不輸出來源 HTML 或直接插入 DOM。缺可信領主時拒絕候選，不新增原版遊戲規則。純讀取，不改 RNG、金錢、EXP、存檔、CAS。

測試：Node 執行真 frozen town.cgi + custom/inc-town.cgi，在隔離 temp common/treelog.cgi 真 stat，以最小 framework/render adapter 擷取原 HTML 的路徑、asset、台詞、活動店舖及時間參數。測試正規發展邊界、四時段、叛亂、治安、guest/player 及 source drift；不是實際 HTTP 或正式玩家證據。原版日期格式、整體 HTML/CSS 與正式介面整合由 D 接入。本批 source candidate，CI 需以 actual checkout tree 核對後才宣告通過。

查重：起點 B 0d802c0、A d1738f4、D 66fa1895，recursive tree 及各窗 dev-local/local-ui 未見對應 scenery module 或畫面。#62/1 已有 reviewed-target-advertise-use.mjs、r2-target-advertisement-source.test.mjs（真 UseItem、兩店同一記憶體 CAS）；不重做，D 負責正式跨店授權與 v2。
