# R0 補審：LIMIT、世界檔 codec 與舊備份／提交規劃

固定基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。本批逐檔讀取測試原文，來源 SHA 從固定 tree 清冊取得；未重新執行，原版 marker 斷言不等於執行 Perl。無新增正式玩家證據。

## item-limit-model.test.mjs

- 測試 blob: `05be859770d0b4753bc5150068796cd071057fdd`；有效／來源守門／純編譯
- 來源: `modern/tests/original-perl/inc-makeitem.cgi` @ `1da8cce1e76ad6159325a37faec68efaa82c7f69`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`
- Fixture: 固定 DSL 79 ITEM；#1 4000/1000、#40 600、#79 10/0；price/line/lvN 合成輸入；7 個小數批發上限
- 路徑: loadStandardStreetModel → compileLiteralItemLimit / compileOrderedItemLimit
- 斷言: 原版 LIMIT/PRICE/GetNumber marker；#1/40/79 明確值；79 皆 explicit LIMIT；#63 實際 1909/2007 行順序；price default 1..2000、>100 取整、lv 前後順序、0 wholesale、小數 7 IDs 20/21/22/23/25/64/66；拒 unsafe、malicious、缺 source line、invalid number；immutable
- 限制: 不執行 Perl compiler、非全 ITEM registry 或實際購買/庫存驗收；小數批發上限不是小數庫存

## world-one-shop-parser.test.mjs

- 測試 blob: `facad03984038fb22a9eb229e501e3397973b0df`；有效／來源守門／純 parser
- 來源: `modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`
- Fixture: 合成 32 欄店 header、七 colon sections、空 event/town、固定 1700000000；synthetic password
- 路徑: parseReviewedOneShopWorld / parseIsolatedWorldReadEnvelope
- 斷言: 32 header 順序及兩列記錄 marker；單店 #7 money=100000、showcase/price/inventory、79 sparse stock；拒 0/多店、31/33 欄、未審欄、非 ASCII credential、nonempty user/exp/event/town、錯 delimiter、超 80 slots、CRLF/control/1MiB+；deep freeze、不回 password、不給 write auth
- 限制: 只驗證限定原版文字子集，不證明真實玩家或 v2、AutoVar/callback；ASCII 限制不是正式 UI 契約

## world-read-preflight.test.mjs

- 測試 blob: `361c0cfc410080bf2c0bc56c8e14e3d1547c62ce`；有效／來源守門／純 parser
- 來源: `modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`
- Fixture: 合成無事件、無城鎮、無店 world；固定 timestamp 與模擬 read byte observations
- 路徑: parseIsolatedWorldReadEnvelope → reviewIsolatedWorldRead
- 斷言: DataRead unchecked read / unbounded // scan / dynamic require marker；5-line exact envelope、sparse 79 stock；拒缺 separator/CRLF/非法事件、town/shop、metadata/stock overflow/control、>1MiB；readSucceeded/observedBytes/sourceSize 必須明確相等且 UTF8 byte length；immutable、無 live write
- 限制: 沒有真 FS read 或 Perl callback；觀測 bytes 為 fixture，不證明正式 v2 或實際拒絕 route

## world-backup-preflight.test.mjs

- 測試 blob: `80d0831d78354120e49e440fb12d28dbe58a5aae`；歷史／舊備份／鎖純規劃
- 來源: `modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- Fixture: 合成 now=10000、mtime=6400/6399/10001/null、五份 copy boolean、lock depth/recovery flags
- 路徑: reviewWorldBackupAge / reviewWorldWritePreconditions
- 斷言: 原版 unchecked open/lock marker；3600 秒嚴格小於，5 names log0/log1/log2/guildbal/play；missing/future mtime；拒無 ownership/path/depth/recovery、逐檔 read/write/verified false、缺/重複/額外證據；canonical immutable；只許 next isolated step，無 fsync/atomicCommit
- 限制: 沒有實際 lock/backup/copy/fsync；不證明正式 v2/HMAC/rename；保留歷史安全設計

## world-commit-plan.test.mjs

- 測試 blob: `0f7fad027abb6401d6427fba882a74b884bf6517`；歷史／舊 CGI commit 純規劃
- 來源: `modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`_config.cgi` @ `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- Fixture: 合成 staged basename 集合、abort/marker boolean、.cgi/commit config
- 路徑: planWorldCommit
- 斷言: DataCommitOrAbort marker/rename/unlink source；commit/discard/recover/no-staged 各 mode；拒原版寬鬆 selector strangexcgi、traversal/control/duplicate/非 bool；canonical SET、multiple rename partial risk、immutable
- 限制: 沒有真 marker/rename/unlink、fsync、crash recovery 或 v2 generation/CAS；保留舊檔案提交流程風險

## world-wholesale-codec.test.mjs

- 測試 blob: `7b34adc61224632c5fb27b026081fbe3acde8f95`；有效／來源守門／純 codec
- 來源: `modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`；`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`
- Fixture: 合成 world third CSV line、79 slots、sparse/CRLF、opaque shop/event；#10 受控 600s/random=0/2 空店
- 路徑: readWorldWholesaleSnapshot / writeWorldWholesaleSnapshot → projectReviewedWholesaleTurnItem
- 斷言: DataRead/DataWrite 第三列 marker；79-cell roundtrip、只替換第三列、sparse no-op 保持原字串、CRLF/no final LF、拒 malformed/unsafe/80 slots/NUL/mixed newline；#79 index78；#10 stock 3→5 受控 turn；idempotence、opaque sections 不變
- 限制: 合成文字與受控 RNG/時間，不證明實際文件 commit、自然時間或正式市場交易、事件解析

