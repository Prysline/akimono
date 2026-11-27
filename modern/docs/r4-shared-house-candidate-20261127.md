# R4 住宅區／結婚／共同倉庫正常功能來源包

標準街原 menu 啟用住宅地，custom/inc-hometown.cgi 0c05ed554306830c78262e7f7ce71ee49fd6e671 定義101–110可建地，_config HouseMax=5。原版求婚扣500萬，接受扣對方500萬共用1000萬；撤回原提案者返500萬，拒絕無返還（原版規則），離婚刪除共同資產。共同現金 mode*2000萬，物品 limit*5，每槽一物品，原 SearchBstock 先既有後空槽，空數量最大、norequest 不可正常存入。建屋1500萬、mode3；正常 Reform form mode3/5、money嚴格大於 mode*1000萬，升至5/7（raw handler mode2..7且資金>=，不視為正常 UI）。費用不寫 paytoday、無 UseTime。會員與求婚雙方依原正常表單選擇；raw handler 權限缺口不當作正式玩家授權。不新增費用、維持費或財產分割，D 同一權威負責存檔和穩定 actor。源碼 ReadBride/WriteBride 10 CSV 欄，stock/cnt colon、原版活躍 ID 消除；候選不對 malformed/duplicate rows 猜修。

五份上游原版 exact blob，新 source projector 和兩個代表性 source differential（正常結婚、存取、建屋、擴建、離婚，以及撤回/拒絕），實際 wrapper/edit/calc/ReadBride/WriteBride 及 log key/args；原版展示/身份/正式發布 adapters。CI 待驗，無正式玩家驗收聲明。
