# R0 逐檔語義補件：來源守門、經濟公式與舊檔鎖

正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；以下 6 份均讀取固定 blob 測試全文及相關被測入口，不把 fixture 當正式玩家證據。

## local-source-text.test.mjs
- Blob: `00a1bdd65d5153f97c7abc8b0f14839c15189a18`
- 有效／來源守門／記憶體負向
- 來源：`custom/inc-item-data.cgi` (`7a18185e98b32aee82ca1ce30d6f3c395157dbcb`)；`custom/inc-rebel-data.cgi` (`923634e58a05beca9ab004515fc7669d53a1ba3a`)；`modern/tests/original-perl/core-inc-admin-func.cgi` (`2164b7e5abfea7a466235a8deba1543c2cc41515`)；`modern/tests/original-perl/inc-func.cgi` (`e7a8add7b0291901e71fe797783b664dff1568a0`)；`modern/tests/original-perl/write.cgi` (`203f33b37511e838800a45b84183af98fcf46e4c`)；`modern/tests/original-perl/inc-turn.cgi` (`b8a4980275f475a952846a8d6072fad45f8dff50`)；`modern/tests/original-perl/whole.cgi` (`778badaf157326bcfd1f8fa1e310d94f94995eb3`)；`_config.cgi` (`87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`)；`modern/tests/original-perl/inc-makeitem.cgi` (`1da8cce1e76ad6159325a37faec68efaa82c7f69`)；`modern/tests/original-perl/buy-s.cgi` (`6ba8df9a733ed16c490389414cd94934fe1185ca`)；`modern/tests/original-perl/item.cgi` (`b39400d7dc0ab80062c392ae2bbc923e24ecacf8`)；`modern/tests/original-perl/calc.cgi` (`586354a9a300e26d0e12a4efa512fa25760e3197`)
- 入口：normalizeLocalSourceText → createStandardStreetModule → createMemoryWorldAdapter / executeMemoryCommand
- 斷言：實際 LF 轉 CRLF 再正規化相等；lone CR/null 拒絕；改 admin init 來源標記拒絕；初始化開店資金 100000、市場空、revision=2
- 限制／不能證明：固定 now=1000000、memory world、歷史 reviewed-sparse-all-plus capability；無 HTTP/v2
- 風險：跨平台換行誤拒或實質漂移被隱藏
- 處置：保留來源守門，正式完整 wiring 另證；R1

## economy-model.test.mjs
- Blob: `f6f7d9bd3623217741fd13c264e8190407c6d5d3`
- 有效／純投影／來源公式
- 來源：`custom/inc-item-data.cgi` (`7a18185e98b32aee82ca1ce30d6f3c395157dbcb`)；`custom/inc-rebel-data.cgi` (`923634e58a05beca9ab004515fc7669d53a1ba3a`)；`_config.cgi` (`87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`)；`modern/tests/original-perl/item.cgi` (`b39400d7dc0ab80062c392ae2bbc923e24ecacf8`)；`modern/tests/original-perl/whole.cgi` (`778badaf157326bcfd1f8fa1e310d94f94995eb3`)；`modern/tests/original-perl/inc-turn.cgi` (`b8a4980275f475a952846a8d6072fad45f8dff50`)
- 入口：projectWholeStore/checkWholeStockCaps/quoteUnguildedPurchase/segmentAccountingPeriods/rollShopLedgerSubset/compiledFractionalWholesaleById
- 斷言：排序價格 50/30/1、庫存可逆且不變；多店限額與負絕對 cap；報價 count/cash/tax/time、拒 stale/self/guild；36h 邊界含零尾、時間守恆；profit 950、EXP 465、維持費順序；七 fractional IDs、0.5/1.5 cap、metadata drift 拒絕
- 限制／不能證明：手製 compiled map、直接庫存現金、固定 now；peer quote 與 ledger 子集不提交
- 風險：價格排序、限額取整、稅／時間、帳本次序
- 處置：保留純投影；#22 與 #18/#16 正式交易另證

## original-perl/baseline.t
- Blob: `a400acd7749408733a1697f7a63fdb5f4c0358c9`
- 有效／原版 Perl Oracle
- 來源：`modern/tests/original-perl/calc.cgi` (`586354a9a300e26d0e12a4efa512fa25760e3197`)；`modern/tests/original-perl/item.cgi` (`b39400d7dc0ab80062c392ae2bbc923e24ecacf8`)
- 入口：require calc.cgi/item.cgi → GetStockTime/UseTime/EditTime/EditMoney/GetItemUseTime/GetTimeDeal/GetSaleTax/CheckCount/CheckItemNo
- 斷言：31 斷言：時間上限 259200、負耗時拒絕、EXP 折扣與 expold 優先；交易時間倍率 0.5–2、溢折價稅及 99% cap；金錢 0..999999999、int、數量 clamp、非法／無庫存商品拒絕
- 限制／不能證明：Perl globals、固定 NOW_TIME、OutError/l stub、直接 DT/ITEM；無 CGI server/v2
- 風險：原版時間、現金、稅、商品檢查公式漂移
- 處置：保留 Oracle；R1 schema/atomicity 與 #22 定價另證

## original-perl/backup-safety.t
- Blob: `3cef1da29c92c9744c1595079deecaa42406503a`
- 有效／原版 Perl Oracle／不安全歷史語義
- 來源：`modern/tests/original-perl/write.cgi` (`203f33b37511e838800a45b84183af98fcf46e4c`)
- 入口：require write.cgi → CheckLockStatus/DataFilesBackup/DataWrite
- 斷言：空 LOCKED 可通過；失去 owned path 拒絕且無 staging；五類備份複製；缺來源截斷舊備份，缺目的地不 abort；fresh mtime 跳過；staged 第一行 lasttime
- 限制／不能證明：File::Temp、固定 NOW_TIME、OpenAndCheck/SortDT/AutoVar/log stub；非完整原版交易或 v2
- 風險：把原版不安全備份當可靠恢復、誤改 staging 順序
- 處置：保留不安全 Oracle；R4 外部 IO #18，不當 v2 安全保證

## original-perl/lock-safety.t
- Blob: `5f7c1b95ffa2eb1a9062ef5f209f0a03a5d35635`
- 有效／原版 Perl Oracle／歷史鎖
- 來源：`modern/tests/original-perl/lock.cgi` (`84382170f1b7f70348c4e2a91bf30b1d1043b964`)
- 入口：require lock.cgi → Lock/UnLock/RenameAndCheck/OpenAndCheck
- 斷言：實際 rename ownership、巢狀 depth、只一次 recovery；過期鎖接管、近期 busy；checked rename/open 成功與失敗；失敗 unlock 保留 path/depth=0、不重造 anchor
- 限制／不能證明：File::Temp、固定 1000/60、REMOTE_ADDR、DataCommitOrAbort/log/OutError stub；無跨程序競爭
- 風險：誤解原版 lock recovery、失敗釋鎖或重試
- 處置：保留 Oracle；現行 v2 CAS/generation 非原版檔鎖；#18

## world-lock-contract.test.mjs
- Blob: `755ba39992f95192f63f0c47dc7d3b3b4d1c2f2a`
- 歷史／純投影／歷史檔鎖 fixture
- 來源：`modern/tests/original-perl/lock.cgi` (`84382170f1b7f70348c4e2a91bf30b1d1043b964`)；`modern/tests/original-perl/write.cgi` (`203f33b37511e838800a45b84183af98fcf46e4c`)；`_config.cgi` (`87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`)
- 入口：reviewStaleWorldLocks/projectWorldLockTransition/projectCheckedRenameAttempts/projectCheckedOpenAttempts
- 斷言：5 rename/6 open、200ms 等待；首鎖 recovery、nested 不 rename、失敗 release depth=0 保 path；60s inclusive；拒 traversal/重複/不安全 timestamp、矛盾 probe；immutable
- 限制／不能證明：固定 now/timeout、字串 lock 名、布林 rename/open probe；無磁碟或多程序；非 v2
- 風險：把舊檔鎖投影當現行互斥或實際 FS 成功
- 處置：保留歷史 contract；#18 外部 IO，R1 v2 負例獨立
