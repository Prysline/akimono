# R0 第三十二批：R4 關店封存磁碟／B50 串接

正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；候選審閱 `afce18b527f3af777d4fdadfd8d968656b3a5aa5`。三份固定測試 SHA 核對，靜態逐檔審閱；本機 Git DNS 失敗，未本地重跑，候選 CI 不繼承。R1 各功能層不變。

## r4-source-close-shop-archive-file.test.mjs

- 測試 blob：`3b278eece56f1c50071b6286edf3d76385b15e60`；Perl Oracle／Node 差分（真隔離封存磁碟）。
- 原版來源：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/pinned-error.cgi` @ `16b619dffd91a3b67095177b7da464de264f1aa3`；`modern/tests/original-perl/pinned-user.cgi` @ `46fe3b13e68ee83997aa919125ab210372af2822`。
- 執行來源：`modern/tests/original-perl/original-r4-close-shop-archive-file-probe.pl` @ `6310534c78aed2ed774edc621e15129fbda5c296`；`modern/src/original-r4-close-shop-archive-file.mjs` @ `3ad6e474644c188163284ef904f448e54016177b`；`modern/src/original-r4-close-shop-effects.mjs` @ `8ba642520d76dd9115acde71028554f24ece1261`。
- 入口：完整 frozen CloseShop/SetUserData/WriteErrorLog Perl probe；Node CloseShop 純投影＋隔離 append/rename。
- Fixture：人工 shop 12345 G/rank20、32 fields、79 slots、固定 NOW900001/IP/host/user、兩 session；既有 UTF-8 行或 30001 X。
- 斷言：L33–87 四 cases、完整 shop、session 名稱投影、live/old log 解碼文字相等、pre-zero archive、missing ENOENT；L89–117 source drift、committable、TSV newline、tmp root 拒絕及無 live 檔。
- 限制：Perl 真 session unlink；Node session 僅投影；GetPath/GetTrueIP 注入，文字 UTF-8 decode 比對非 raw Buffer；未測 30000 bytes 等值、舊檔已存在、rename/append 中途錯誤或競爭。writer L80–92 先 rename 再驗證 context，現負例只在空目錄，無全失敗原子性證據。非正式玩家/時鐘/RNG/HTTP/CAS/v2。

## original-r4-close-shop-archive-file.t

- 測試 blob：`f49436f2cfb2f5f75fd5757c7064c1528f737d0b`；原版 Oracle（真隔離封存磁碟）。
- 原版來源：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/pinned-error.cgi` @ `16b619dffd91a3b67095177b7da464de264f1aa3`；`modern/tests/original-perl/pinned-user.cgi` @ `46fe3b13e68ee83997aa919125ab210372af2822`。
- 執行來源：`modern/tests/original-perl/original-r4-close-shop-archive-file-probe.pl` @ `6310534c78aed2ed774edc621e15129fbda5c296`。
- 入口：完整 frozen write.cgi / pinned-user.cgi / pinned-error.cgi require；隔離檔案真 append/rename/unlink。
- Fixture：同四案例，GetPath/GetTrueIP 注入、固定 NOW900001、人工 shop/stock/EXP/session。
- 斷言：L11–25 probe 成功、四案例、status/money/rank=0、保留非匹配 session；L26–40 12345 pre-zero、UTF-8 shop 名稱、既有前綴、30001 bytes 輪替、missing log 仍關店。
- 限制：SetUserData 原版 no-op；原版 WriteErrorLog open 失敗直接 return，CloseShop 仍清零及 unlink；不證 30000 bytes 等值、錯誤回復、跨檔原子性、正式玩家/HTTP/CAS/v2。

## r4-source-b50-archive-disk-chain.test.mjs

- 測試 blob：`979996f47565aedc764caf2731b02ce90483385a`；Perl Oracle／Node 差分＋Node 真隔離封存（非兩期原版磁碟差分）。
- 原版來源：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`；`modern/tests/original-perl/pinned-error.cgi` @ `16b619dffd91a3b67095177b7da464de264f1aa3`；`modern/tests/original-perl/pinned-user.cgi` @ `46fe3b13e68ee83997aa919125ab210372af2822`；`modern/tests/original-perl/period.cgi` @ `6183e88e9dd69a16606a1064c8084e9a1411dbd5`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/core-detail.cgi` @ `9a83d26fb29edee4032958f1e6de837a250f3384`；`modern/tests/original-perl/core-inc-admin-func.cgi` @ `2164b7e5abfea7a466235a8deba1543c2cc41515`。
- 執行來源：`modern/tests/original-perl/original-r4-close-shop-archive-file-probe.pl` @ `6310534c78aed2ed774edc621e15129fbda5c296`；`modern/tests/original-perl/original-r4-period-real-close-chain-probe.pl` @ `161244a68aa1fd20ee5fec659a1cd09bb0b71b7c`；`modern/src/original-r4-close-shop-archive-file.mjs` @ `3ad6e474644c188163284ef904f448e54016177b`；`modern/src/original-r4-close-shop-effects.mjs` @ `8ba642520d76dd9115acde71028554f24ece1261`；`modern/src/original-period-solo-chain.mjs` @ `0c83f75a8a4090c0fa8318ab1f5f2f37c846c37d`；`modern/src/standard-street-model.mjs` @ `c624fbb9f2c141bd539b7dfec86a48d3ba373efc`；`modern/src/reviewed-gift-map-use.mjs` @ `c0cb84e0c45727d4a0f0129b5fc00734f7e733d0`。
- 入口：同一 Perl process 兩期 source prefix，WriteErrorLog recorder；Node 每期 Oracle input 純投影後獨立 sandbox writer。
- Fixture：B50 人工 stock/EXP/guild、固定 NOW/rand tape；獨立 archive probe 的首例 context（非第二期實際 NOW）。
- 斷言：L53–92 二期 shop exact、首期無 close payload、第二期 archive payload exact、Node 真 append、非 committable/worldStateWritten、正 bytes、包含 payload、首行七 TSV 欄、單次封存。
- 限制：兩期 Perl WriteErrorLog/SetUserData recorder；Node 實際 log context 取獨立 probe NOW900001，非第二期 NOW；不比對整個兩期原版 log bytes，不證首期磁碟不存在（僅 payload null），不證 Node 自行續接、完整 backup/session/MakeGuildFile tail、正式玩家/HTTP/CAS/v2。

## 共用來源與缺口

`write.cgi` L103–138：SetUserData→序列化→WriteErrorLog→status/money/rank 清零→session unlink；`pinned-user.cgi` L29–32 為 no-op；`pinned-error.cgi` L65–89 以 stat > LOG_SIZE_MAX 嘗試 rename，open 失敗 return，七 TSV 欄，payload 含內嵌換行。Probe L17–24 require 原版與注入 context，L27–51 讀 config/index，L66–122 真隔離檔案四例。Node writer L23–38 source SHA guard，L39–61 contract/path/context guard，L74–98 lstat/rename/append；rotate 在 context 驗證之前，非交易，未證 symlink race 或錯誤 rollback。原版 missing directory partial failure 已有測試斷言；Node 拒絕不等於正式 runtime 安全修正。B50 probe L48–55 僅 recorder，不能將 Node 實檔升格為原版兩期完整真封存。保留現行測試；不改 runtime；R5 未啟動。
