# R4 正常留言板來源包

標準街原版 treebbs 與公會 gd-bbs 作戰室。依凍結 source 移植正常玩家發文/回覆、原 thread bump、reply depth/parent counter、50篇整樹裁切、序號9999循環；公會180字、15分鐘相同訊息拒絕、20篇預設保存、原序號回繞。現行 _config 無 optional SECURE_MODE_BBS/MAX_BBS_MESSAGE 設定，保留預設，不加限制。原版 multipart 的10KB屬D transport；原文字元轉義保留，raw wire 僅內部保存，server addr/host 不進公共 list，不將 raw HTML 注入 DOM。作者、街道、公會由可信現行 context，不接受瀏覽器自行指定，raw handler 原差異留在凍結檔。新增七份 exact source pins、兩組原版直接 edit/helper 差分及真暫存檔，正常功能 scope，原版正式發布與身份為 adapter，CI 待驗。無新增聊天歷史或現代權威。
