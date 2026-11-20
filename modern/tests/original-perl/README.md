# 任務 02｜原版 Core 隔離行為測試

此目錄從既有 `migration/standard-street-s1` 建立，使用原版 Core 真實 Perl 程式，搭配固定世界狀態與 I/O 替身執行，**不取代** `modern/src/parse-dsl.mjs` 的標準街 DSL 靜態來源稽核，亦不修改原版 CGI。

## 固定來源與完整性

Core commit：[738d71a2985fd088f2ca90f25145706392ee2365](https://github.com/katelynn620/akimono-core/tree/738d71a2985fd088f2ca90f25145706392ee2365)。

| 本目錄的固定快照 | 原始 Core 路徑 | Git Blob SHA |
| --- | --- | --- |
| `calc.cgi` | `plug/calc.cgi` | `586354a9a300e26d0e12a4efa512fa25760e3197` |
| `item.cgi` | `plug/item.cgi` | `b39400d7dc0ab80062c392ae2bbc923e24ecacf8` |
| `new.cgi` | `new.cgi` | `9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7` |
| `sc-s.cgi` | `sc-s.cgi` | `0bada620cff769bed782707d61b87e48cce0a58c` |
| `market.cgi` | `plug/market.cgi` | `1aca77e9b373c25e53e445d64c101a7cc2246825` |
| `whole.cgi` | `plug/whole.cgi` | `778badaf157326bcfd1f8fa1e310d94f94995eb3` |
| `buy-s.cgi` | `buy-s.cgi` | `6ba8df9a733ed16c490389414cd94934fe1185ca` |
| `inc-makeitem.cgi` | `inc-makeitem.cgi` | `1da8cce1e76ad6159325a37faec68efaa82c7f69` |
| `inc-turn.cgi` | `inc-turn.cgi` | `b8a4980275f475a952846a8d6072fad45f8dff50` |
| `inc-func.cgi` | `inc-func.cgi` | `e7a8add7b0291901e71fe797783b664dff1568a0` |
| `write.cgi` | `plug/write.cgi` | `203f33b37511e838800a45b84183af98fcf46e4c` |
| `lock.cgi` | `plug/lock.cgi` | `84382170f1b7f70348c4e2a91bf30b1d1043b964` |

CI 會以 `git hash-object` 核對以上十二個固定快照。快照檔案未改寫；所有測試替身只出現在 `*.t` 內。

## 執行方式

環境：Perl 5.40 / Test::More、Node.js 22 以上。從本目錄執行：

```sh
prove -v *.t
```

目前已由 GitHub Actions 成功執行 **9 個 Perl 測試檔，218/218 個斷言**：

| 檔案 | 原版函式／流程 | 斷言 |
| --- | --- | ---: |
| `baseline.t` | 計算插件：時間／資金／交易／商品編號 | 31 |
| `new-store.t` | 真正執行 `new.cgi` 的 Core 預設開店初始化 | 18 |
| `showcase-market.t` | `sc-s.cgi` 陳列操作、`GetMarketStatus` 市場統計 | 26 |
| `whole-store.t` | `GetWholeStore`／`CheckWholeStore`／`SetWholeStore`（含 0.5、1.5 的批發供貨係數） | 21 |
| `world-data.t` | 真正執行原版 `DataWrite()` 至隔離暫存世界檔（不用 CGI 或正式 commit） | 11 |
| `world-commit.t` | 真正執行原版 `DataCommitOrAbort()`，驗證提交／取消／復原／中途失敗（只用隔離暫存目錄） | 27 |
| `lock-safety.t` | 原版 `Lock`／`UnLock`／`LockSub`／`RenameAndCheck`／`OpenAndCheck` 的隔離檔案測試 | 36 |
| `backup-safety.t` | 原版 `CheckLockStatus`／`DataFilesBackup`／`DataWrite` 鎖與備份錯誤路徑（隔離暫存目錄） | 24 |
| `world-read-safety.t` | 擷取**未修改**的固定 Core `DataRead` 函式，在隔離世界檔驗證缺失、損壞與缺少 `//` 的有界中止 | 24 |
| **合計** | | **218** |

CI：[GitHub Actions](https://github.com/Prysline/akimono/actions) 以目前分支 SHA 為準；第十六階段累計 **218／218 項 Perl 隔離斷言**。

原既有 Node 測試與來源稽核繼續由下列指令驗證：

```sh
cd ../../
npm test
npm run audit
```

新建 `modern/tests/standard-init.test.mjs` 用讀取原版 DSL 的方式核對 `NewShopMoney=100000`、`NewShopTime=12*60*60`、`NewShopItem=展示架擴建拆卸工具:1:禮物卷:5` 與原版商品 ID `63`、`79`，**不代表已執行編譯後的 `@@FUNCNEW`**。

## 隔離測試的範圍

- `new.cgi` 和 `sc-s.cgi` 的原版主要流程有實際執行，但 `Lock`、`DataRead`、`DataWrite`、`DataCommitOrAbort`、`OutSkin`、使用者授權等外部依賴以替身代替，不會讀寫正式世界資料。
- `sc-s.cgi` 用固定商品庫存、價格、貨架和模擬時間；失敗操作檢查無呼叫資料 commit，不能宣稱完成真實資料庫交易。
- `market.cgi`、`whole.cgi` 的原版市場函式使用固定多店資料，驗證數字與邊界，尚未跑完整每日週期。
- **仍待**商品 DSL 由原版編譯器產出資料並執行商品使用、真實銷售、隨機事件、決算與實際檔案 round-trip（B-01 商品注入、B-02、B-06～B-14）。
- 獨立 S1 v0.2.0 TypeScript 舊 ZIP 未出現在此儲存庫中，未宣稱已整合；Core 的 `feat/req` 是獨立且已分叉的委託所功能，未合併。
- 請在 [Notion 任務 02](https://app.notion.com/p/41db4185273f818f97d4fce172db36f8) 追蹤已跑與待跑案例。

## 2026-11-20｜目前無 CGI 環境的開發限制

使用者已確認目前沒有可用的 CGI 執行環境。**不要要求啟動原版 CGI 伺服器，也不要把這一需求設成 Node.js 現代化開發的前置依賴。**

- 本目錄的 `*.t` 是 **GitHub Actions 上使用 Perl + Test::More，搭配檔案讀寫、畫面輸出與登入等替身** 執行的局部／主要流程測試；**未使用 CGI HTTP 伺服器**。第十階段新增8項斷言後，最新數量為96／96；更早的88／88屬於歷史紀錄。
- 接下來的主開發路徑為 `modern/` 的 Node.js DSL 來源稽核、固定測資、可重現規則模型（含開店初始商品、陳列、市場、跨期與決算）；保留原始程式碼 SHA、商品 ID、來源行號與原版覆寫規則。Node 模型通過測試不等於原版 CGI 實機相容。
- `@@FUNCNEW`、`_local_` 與任意 Perl 回呼在既有 Node DSL parser 中目前僅保留原始片段；除非有可執行、已驗證的精確規則，不將它們當成可直接執行的 JS 或推定已編譯。
- 完整 CGI HTTP、原版 `inc-makeitem.cgi` 在 CGI 管理入口的執行結果、真實世界存讀檔及完整跨期遊戲端到端測試均標記 **受環境限制、未驗證**。不因此停止目前不依賴 CGI 的開發。
- [任務 02 Notion](https://app.notion.com/p/41db4185273f818f97d4fce172db36f8) 維持「進行中」。

- `buy-s.cgi` 是為了 Node.js B-06 玩家交易移植保留的**原版只讀來源快照**。它不是新增的 Perl 執行測試：現有 88 項 Perl 斷言數量不因此改變；新增的狀態轉移由 `modern/tests/peer-trade-model.test.mjs` 以 Node.js 驗證。

- `inc-makeitem.cgi` 是第八個**完全未修改** Core 原始碼快照，供 Node.js `item-limit-model.test.mjs` 核對 `LIMIT` 文字拆分、`limit` 與 `wslimit` 的來源語意；它**不是**額外一份 Perl 執行測試。第十階段於原有 `whole-store.t` 新增8項小數批發上限斷言，因此最新原版 Perl 隔離測試總數為96項。

## 第十階段：小數批發係數的原版 Perl 驗證

原始 `plug/whole.cgi::CheckWholeStore` 仍直接以 `require './whole.cgi'` 引入，由 `whole-store.t` 使用手動固定的已編譯 `wslimit` 數值執行；新增 8 項斷言覆蓋 `0.5`、`1.5` 在 1／2／3 家商店及商店既有存量抵扣之後的市場整數庫存。這些數值來自固定標準街 DSL，但此處**沒有執行管理用商品編譯器，也沒有真正補貨或批發交易**。最新 CI 驗證為 96／96 項 Perl 斷言通過，與新 Node 小數解析模型獨立核對。

## 第十一階段：批發庫存 PLUS 流程的固定來源

新增原版 Core `inc-turn.cgi` 完整**未修改**快照（Git Blob `b8a4980275f475a952846a8d6072fad45f8dff50`）作為第九份 SHA 固定來源。`modern/tests/wholesale-turn-model.test.mjs` 靜態核對原版 PLUS 計算行、亂數處理、`CheckWholeStore()` 與略過零長度時間片段的原文，並以純 Node 單商品固定測資重建可重現的時序子集。

這項新增**不等於 Perl `inc-turn.cgi` 已在隔離測試裡完整執行**：其前半部仍有自然售賣、商品回呼、市場需求與公會等相依處理；現有直接執行的原版 Perl 斷言仍是 96 項，不因此增加。世界檔 `@DTwholestore` 的讀取與寫回來源也已在 `inc-func.cgi::DataRead` 與 `plug/write.cgi::DataWrite/DataCommitOrAbort` 核對，但尚無實際檔案往返驗收。此模型不會寫入正式世界存檔。

## 第十二階段：原版世界資料第三行的隔離 I/O

新增兩份完整原版 Core 快照：`inc-func.cgi`（SHA `e7a8add7b0291901e71fe797783b664dff1568a0`）與 `plug/write.cgi`（在本測試目錄存為 `write.cgi`，SHA `203f33b37511e838800a45b84183af98fcf46e4c`）。因此 CI 現有**十一份**固定來源檔，繼續以原樣 Git Blob 核對。

Node `modern/tests/world-wholesale-codec.test.mjs` 已直接核對 `DataRead` 的前3行、`DataWrite` 的欄位次序及提交碼；但這不代表執行了完整的原版 `DataRead`（它還會載入城鎮、事件、商店、AutoVar 等）。為取得實際格式證據，本階段新增 `world-data.t`，**直接 require 原版未修改的 `write.cgi` 並執行 `DataWrite()`**；以 `File::Temp` 的測試用暫存目錄、明確初始化的世界變數，以及鎖定／備份／輸出替身，核對生成資料第1行時間、第2行世界資訊、第3行79格庫存、第4行事件、第5行城鎮與 `//` 分隔符，並確認重寫庫存只更動對應值。

這是**局部原版 Perl 寫檔函式的隔離執行**，不是 CGI HTTP、正式遊戲世界檔、原版 `DataCommitOrAbort`、真正寫入交易鎖或全部世界資料的往返。既有 96 項 Perl 斷言增加11項後為 **107／107**；Node 從136項增加19項後為 **155／155**。

## 第十三階段：原版 DataCommitOrAbort 的隔離提交流程

新增 `world-commit.t`，**真正載入既有未修改的原版 `write.cgi`（原 Core `plug/write.cgi`）並執行 `DataCommitOrAbort()`**。使用 `File::Temp` 建立獨立的 `stage/`、`live/` 及提交標記，`GetPath`、`OpenAndCheck`、`RenameAndCheck` 為限制在測試根目錄內的可觀察替身。只對測試自建的暫存檔更名／刪除，沒有任何正式世界存檔、CGI HTTP、跨程序鎖或備份變動。

新增 **27項 Perl 斷言**：正常提交創建並清除 marker；無 marker 時 abort 刪除 stage、保持 live；有 marker 時即使 `abort=1` 仍恢復提交；無 stage 時清除殘留 marker；第2個檔案更名注入錯誤導致第1個已移動、marker 尚存，之後 `abort=1` 恢復剩餘檔案；原始正規表示式 `grep(/.$FILE_EXT$/, ...)` 對 `FILE_EXT='.cgi'` 有**未跳脫的兩個點**，可能選中類似 `strangexcgi` 的名稱（此項僅為相容性風險的來源行為驗證）。

本階段同時新增純 Node `world-commit-plan.mjs` 與測試，僅產生**建議處理的動作清單**，不對實體檔案執行任何操作；**刻意拒絕**原版寬鬆 regex 會錯誤選中的檔名，這一點是安全範圍與原版的明確差異。原版提交是逐檔更名，故**不是原子交易**，意外失敗可能有部分 live 資料已被取代；即使依 marker 恢復，也不等於已驗證真正的跨程序鎖、斷電安全、目錄持久性或可完整回滾。相關真正部署風險尚未解決。

原版固定 Core 快照繼續維持**11份**，本批沒有改寫任何原始快照；原版 Perl 斷言新增27項後總計 **134項**。

## 第十四階段：原版鎖、重試、檔案錯誤的隔離契約

新封存**第12份原版未修改快照** `lock.cgi`（來源 `plug/lock.cgi`，Git Blob `84382170f1b7f70348c4e2a91bf30b1d1043b964`），CI 已追加 `git hash-object` 驗證。實際設定依標準街 `_config.cgi`：`LOCK_FILE='lockfile'`，`AUTO_UNLOCK_TIME=60`，**不是**前幾階段合成範例的 `lock`。

新增 `lock-safety.t` **36項 Perl 斷言**，透過 `File::Temp` 建立並銷毀獨立測試資料目錄，真正載入並執行原版 `Lock`／`UnLock`／`LockSub`／`RenameAndCheck`／`OpenAndCheck`。僅將 `DataCommitOrAbort(1)`、`OutError`、`WriteErrorLog`、語系文字以最小替身記錄：取得首層鎖會呼叫恢復；巢狀鎖只增加層數；外層解鎖才將擁有者檔案更名回 `lockfile`；當超時舊鎖超過60秒時可嘗試搶回，仍很新的舊鎖會回報 busy；錯誤更名／開檔耗盡重試後會記錄並呼叫原始錯誤出口。另直接驗證原版 `UnLock` 更名失敗後，深度已遞減至0，但 `LOCKED` 路徑仍非空；**不應把此情況當成釋放成功**。

原版重試次數需精確區分：`LockSub` 的基礎更名最多5次；`RenameAndCheck` 最多5次，成功後檢查來源消失與目標存在；`OpenAndCheck` 的 `count=5` 搭配後置遞減，**在連續失敗情形，第6次開檔失敗才觸發錯誤**，此前5次各等待0.2秒。`OpenAndCheck` 採 `>:encoding(UTF-8)` 開檔模式，成功開啟可能截斷舊內容，並沒有額外證實 fsync／原子替換。

此原版 Perl 測試有真正檔案更名／開檔，**但僅在 GitHub Actions 測試暫存目錄**，沒有動正式世界資料，也沒有測跨程序競爭、鎖與檔案同步時的競態、斷電、實際 CGI HTTP。另見 Node `modern/tests/world-lock-contract.test.mjs` 的無 I/O 純狀態結果。現已累計 **170／170 原版 Perl 隔離斷言**；前幾階段的88、96、107、134為歷史值，不表示現在只執行那些數量。

## 第十五階段：原版寫入前鎖檢查與備份的錯誤分支

新增 `backup-safety.t` **24項 Test::More 隔離斷言**，直接 require 前述未改動的原版 `write.cgi` 並執行 `CheckLockStatus()`、`DataFilesBackup()`、`DataWrite()` 的相關路徑。所有資料檔／暫存檔／備份只建於自動清理的 `File::Temp` 資料夾；`GetPath()` 按固定 Core `inc-func.cgi` 原式為檔案加上 `.cgi`；正式專案的 `_config.cgi` 備份五個基底名稱為 `log0`、`log1`、`log2`、`guildbal`、`play`，檢查間隔為3600秒。

直接確認的**原版缺陷／風險**：
- `CheckLockStatus()` 的 `return if $LOCKED eq '' || -e $LOCKED`，所以 `LOCKED` 空字串**也會通過**；若非空但鎖檔已遺失，則先記錄錯誤，再呼叫 `OutError`。
- `DataFilesBackup()` 的 `open(IN)`、`open(OUT)`、`while(<IN>) { print OUT }`、`close` **不檢查成功與否**。當來源缺失時，原版可將既有正確備份**截斷為空檔**而正常返回；當目的地不存在或無法開啟時，原版也可能直接返回而沒有實際備份。
- `DataWrite()` 首先檢查鎖，再讀取備份的 mtime；當備份過期／不存在時會呼叫上述備份流程。原版可能在 **`LOCKED` 空字串**情況下仍輸出暫存世界檔；缺少備份 mtime 會觸發複製，但**呼叫過不表示成功備份**。
- 原版程式並沒有證明跨進程鎖擁有者、資料同步／fsync、安全備份或原子提交。

新增的 Node `world-backup-preflight.mjs` 是**純、非 I/O 的保守寫入前審查**，拒絕未經明確確認的擁有權、解鎖異常／持有層數0、待提交復原未完成，以及備份到期時五份檔案任一份讀寫或內容核對未成功。這是刻意比原版安全、但不代表真的做了備份或存檔。與新 Node 測試和示範詳見 `modern/README.md` 第十五階段。

原版 Perl 斷言總計 **194／194**（原170增加24）；原版 Core SHA 快照仍為12份，本階段沒有改動原始碼，也不涉及 CGI HTTP 或正式世界存檔。

## 第十六階段：原版 DataRead 的資料缺失、損壞與分隔符風險

新增 `world-read-safety.t` **24項 Perl Test::More 隔離斷言**。與 `write.cgi`、`lock.cgi` 不同，完整 `inc-func.cgi` 的頂層程式會**立即載入設定、世界、商品、皮膚、CGI 與交易恢復**，故不能直接 `require` 全檔。此測試從**已固定 SHA 的未修改 `inc-func.cgi` 快照中**精確擷取 `sub DataRead` 至下一個 `sub GetDTPoint` 前的原文字句，在隔離的 Perl 執行環境編譯、執行**原版函式本體**。只有 `GetPath`／`OutError`／`GetDTPoint`／空 AutoVar tie 等外部依賴由安全替身提供；所有讀取只限 `File::Temp` 內的測試世界檔。不啟動原版頂層初始化、CGI HTTP、事件 require、商店同步或正式世界檔。原版快照仍是 **12份**，沒有改動任何一份。

**來源／實測差異：**
- 原版 `DataRead()` 用未檢查回傳值的 `open(IN,'<:encoding(UTF-8)')` 與 `read(IN,my $buf,-s $datafile)` 讀檔；空檔與不存在的檔案在本隔離案例會觸發 `OutError('no data')`。
- 原版 `@DTwholestore=split(/,/,$DATA[$idx++],$MAX_ITEM)` **沒有數值驗證**：例如 `garbage` 商品庫存可以直接保留成 Perl 字串；人口為 `NOT_A_NUMBER` 也可直接寫入記憶體。
- 原版 `while($DATA[$idx++] ne '//'){}` **沒有檔案結尾上限**；隔離測試只在外層加 `alarm(1)` 保護，才能確定缺少 `//` 或只有 `//\r` 的情況可能持續迴圈，而不讓 CI 卡住。**原版函式內容未修補**。這不是聲稱每一種 CRLF 世界資料都會走同一故障分支；事件鍵或 AutoVar 的處理順序仍可能先觸發其他副作用／錯誤。
- 原版可接受空白庫存列、稀疏 `@DTwholestore`；不因此保證異常數字、缺行或動態區段的安全。

為避免把原版的不安全容忍度視為現代化讀取契約，新增純 Node `world-read-preflight.mjs`，只檢查**五行、LF、無動態事件／城鎮／商店、商品庫存最多79格**的保守子集，且要求輸入文字位元組數與外部明示的檔案大小／讀取量一致。缺少分隔符、CRLF、資料欄位／數字損壞、事件 require、未知商店段、未讀完、超過1MiB 合成測試上限等情況拒絕。它不進行任何真實開檔、檔案鎖、原版 Perl 執行、資料修改或持久化提交。即使通過也只代表**可以進行隔離範圍內的檢查**，不是准許讀寫正式世界資料、完整相容原版世界檔或保證任何交易安全。

此次 Perl 從194增至 **218／218項**；Node 新增22項，累計 **240／240項**。原版 Core 12份 blob SHA 驗證不變。
