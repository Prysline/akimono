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
| `period.cgi` | `inc-period.cgi` | `6183e88e9dd69a16606a1064c8084e9a1411dbd5` |
| `use.cgi` | `plug/use.cgi` | `1bf4537cc41e344c144d840d43175c4c232765bb` |
| `core-inc-admin-func.cgi` | `inc-admin-func.cgi` | `2164b7e5abfea7a466235a8deba1543c2cc41515` |

CI 會以 `git hash-object` 核對上述原有14份、後續新增4份商品載入器來源，以及 B-34 的管理員初始化快照，合計**19份固定原版 Core Blob SHA**。快照均未改寫；測試替身僅出現在獨立 Perl harness／`*.t` 中，不會改原版函式本文。

## 執行方式

環境：Perl 5.40 / Test::More、Node.js 22 以上。從本目錄執行：

```sh
prove -v *.t
```

目前已由 GitHub Actions 成功執行 **15 個 Perl 測試檔，416/416 個斷言**：

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
| `world-one-shop.t` | 使用固定 `@DTindexnamelist` 與原版 `DataRead` 函式本體，驗證空城鎮、一／兩店、重複 ID、缺少商店第二行的原版行為 | 34 |
| `world-shop-history.t` | 固定 Core `DataRead` 與**原版 `AutoVar` 套件**的商店歷史雜湊、使用者延遲解碼、奇數／重複鍵及 Tab 分隔符測試 | 43 |
| `period-experience.t` | **擷取固定原版**每日歷史交接／熟練度自然衰退與 `UseItem` 熟練度尾段，在無副作用 Perl 替身中直接執行 | 33 |
| `period-stock-use.t` | **擷取固定原版**每日庫存修正／`UseItem` 使用次數檢查／`CheckUseItem` 材料檢查，並原樣執行 `MakeAmount` | 36 |
| `original-use-outcomes.t` | 從固定 `use.cgi` 擷取原始 `MakeAmount` 及 `UseItem` 生產溢出片段，直接呼叫未修改的 `whole.cgi::CheckWholeStore`，比對大額亂數、負新增量、批發庫存上限 | 27 |
| `original-multi-item-use.t` | 原版 `UseItem` 多材料消耗 → 多產出 → 一次 `CheckWholeStore` 的原樣片段，驗證多店、多商品、重複產出、先後亂數與零新增紀錄 | 25 |
| **合計** | | **416** |

CI：[GitHub Actions](https://github.com/Prysline/akimono/actions) 以目前分支 SHA 為準；第二十二階段累計 **416／416 項 Perl 隔離斷言**。

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

## 第十七階段：原版世界中的商店兩行結構與安全單店子集

新增 `world-one-shop.t` **34項原版 Perl 隔離斷言**。延續前一階段的操作方式，從 SHA 固定、**未修改**的 `inc-func.cgi` 擷取 `sub DataRead` 原始函式本體；另從相同固定快照精確擷取 `@DTindexnamelist=qw(...)` 的**32個欄位順序**，不靠 Node 自行推定。以 `File::Temp` 合成世界文字、最小 `AutoVar::TIESCALAR` 與 `GetDTPoint` 等外部替身執行原版 DataRead，本體仍未修改。不啟動原版 `inc-func.cgi` 頂層初始化、事件 require、任何真正商店／世界資料或 CGI HTTP。

直接核對：
- 原版世界先有時間／世界 metadata／批發庫存／事件行，其後可有一行交給 `AutoVar` 的城鎮原文（若下一行已為 `//`，可沒有城鎮行），接著以精確 `//` 表示商店開始。
- 每間商店使用**兩行**：32欄 `@DTindexnamelist` 順序的 CSV 表頭（第1欄 `id`、第3欄 `name`、第5欄 `pass`、第30欄 `foundation`），之後一行經 `split(/:/,$DATA[$idx],7)` 分段；前兩段是 `showcase`、`price`，第3段交給 `AutoVar` 商品庫存，第4～6段由雜項散列表接收，第7段可能觸發另一個 `AutoVar` 用戶資料。
- 原版對一間或兩間來源結構均可解析；但**重複商店 ID 會覆寫 `id2idx` 映射**，**只剩表頭而缺少第二行時，來源仍可能增加商店數**。此兩項是直接執行原版所確認的容錯／風險，並非應移植的新規則。非空城鎮原文會轉交外部 AutoVar，本測試只觀察它的傳入值，沒有執行真正 AutoVar 的解析語意。

Node 新增 `src/world-one-shop-parser.mjs` 採更嚴格的**獨立唯讀單店**模型，對動態事件／非空城鎮／第二間商店、缺失的商店第二行、32欄之外或尚未審查的欄位、非整數展示／價格／庫存、商品 user 與 yesterday／today／exp 區段均拒絕。不輸出第5欄 `pass` 原文。**第十六階段五行純世界預檢未放寬**，不能把單店示範當作真實商店、認證、交易或存檔支援。

本階段 Perl 從218增加34至 **252／252**；Node 從240增加25至 **265／265**。原版 Core 快照仍是12份，且既有 CGI／正式世界資料均未修改。

## 第十八階段：商店歷史雜湊與原版 AutoVar 延遲解碼

新增 `world-shop-history.t` **43項原版 Perl 隔離斷言**；比第十七階段更進一步，除了擷取**既有 SHA 固定、未修改**的 `inc-func.cgi::DataRead` 函式本體外，這次還精確擷取並直接執行**同一原版檔案**第440行起的 `package AutoVar`，包括 `Get`、`TIESCALAR`、`FETCH`、`STORE`。原版整份 `inc-func.cgi` 的頂層仍未 require，避免觸發原始 CGI、遊戲初始化、任意商品／事件 require。所有檔案 I/O 僅限 `File::Temp` 測試世界；`GetPath`、`GetDTPoint`、`OutError` 等外部依賴是最小替身。

來源精確行為：
- 商店第二行經原版 `split(/:/,$DATA[$idx],7)` 後，`@list[3,4,5]` 分別對應 `itemyesterday`（昨日紀錄）、`itemtoday`（今日紀錄）、`exp`（熟練度），原版以 `map{{split(/,/,$_)}}` **立即建立 Perl HASH 參照**。
- `@list[6]` 若非空，原版 `tie $DT{user},'AutoVar',[...,'HASH','[\t,]']`；`AutoVar::Get` 在尚未取值時會**直接傳回原始字串**，只有第一次 `FETCH` 才以逗號或 Tab 切分出使用者 HASH、並嘗試 untie。空白 `user` 區段則直接建立未綁定的空 HASH。
- 原版對奇數個鍵值元素可建立**值為 undef 的最後一個鍵**；遇到重複鍵，後面的值覆蓋前面的值；這些原版行為已由真正執行的 Perl 測試確認。不可把 `DataRead()` 成功理解為所有 user／歷史資料格式有效。
- `AutoVar::Get(`雜湊參照`)` 會使用 Perl HASH 的順序輸出配對，**沒有固定的序列化順序保證**；Node 子集採排序陣列呈現，僅供穩定測試展示，不能聲稱原文逐位元組往返。

Node `world-shop-history-model.mjs` 為另一個**獨立單店、無 I/O 的保守子集**：先將新增加的四段資料以受限規則檢查，再將其原始區段從**副本**置空交給 B-17 安全解析器完成世界／32欄商店前置檢查；不放寬 B-16 或 B-17 任何既有入口。歷史三雜湊僅接受至多79個、鍵為標準街已核對商品 ID 1～79 的成對非負安全整數；用戶資料只接受不超過8組 ASCII 合成鍵及非負安全整數，允許逗號／Tab 分隔，**但回傳內容只包含人數，不輸出任何使用者名稱、資料值、`pass` 或其他認證秘密**。奇數配對、重複鍵、不安全字元、超出數量、未審查狀態均拒絕。這是比原版嚴格的測試模型，**不應拿來解析、驗證或還原真實使用者資料**。無事件執行、AutoVar 回呼、真實登入、存檔提交或 CGI HTTP。

本階段新增 **43 項 Perl 斷言、28 項 Node 測試**，使 CI 累計 **295／295 Perl、293／293 Node**；原版 Core 快照依舊12份，完整 Git Blob SHA 驗證不變。

## 第十九階段：原版每日歷史轉移、熟練度衰退與使用商品增加經驗

新增兩份**完全未修改的固定 Core 快照**：`period.cgi`（原始 `inc-period.cgi`，Blob `6183e88e9dd69a16606a1064c8084e9a1411dbd5`）、`use.cgi`（原始 `plug/use.cgi`，Blob `1bf4537cc41e344c144d840d43175c4c232765bb`），CI 已新增 `git hash-object` 驗證。由原 12 份增加為 **14份**，來源仍是 `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365`。

新增 `period-experience.t` **33項 Perl 斷言**：`inc-period.cgi` 的**檔案頂層會直接執行**公會結算、商店關閉、隨機事件、檔案備份、session 清理等，`plug/use.cgi::UseItem` 前段也可能更動商品、資金、時間和執行動態回呼，因此**不可 require 或執行整份檔案**。本測試從剛封存的 SHA 固定快照**原文字句**精確擷取歷史交接兩句、熟練度自然衰退迴圈與 `UseItem` 熟練度尾段，只以隔離、明確的合成 `$DT`／`$USE` 與設定值編譯並直接執行這些**未改動來源片段**。沒有真實檔案、事件、商品消耗、交易、隨機、正式世界結算或 CGI HTTP。

標準街 `_config.cgi` 實際 `EXP_DOWN_RATE=60`、`EXP_DOWN_POINT=5`、`LIMIT_EXP=3600`。已用原版片段確認：
- 每期 `itemyesterday=itemtoday`，`itemtoday={}`；昨日舊雜湊被當日舊值取代。
- 每個 `exp`：先減去 `int(exp*60/1000)` 再減5，值小於或等於0時刪掉。測試 `exp100→89`、`6→1`、`5→刪除`、`1000→935`。
- `UseItem` 熟練度尾段以 `USE.exp*result.count` 計算增加，單項最多1000。總熟練度高於3600時，原版依熟練度由低至高排列**其他商品**並逐一以 `int(剩餘超額/剩餘商品數)` 分攤扣減；每次減少後重新計算，故不能以平均扣除處理。已以五項不同經驗的案例實測 `{1:900,2:700,3:800,4:850,5:900}` 對商品1增加100後得 `{1:1000,2:538,3:638,4:687,5:737}`，總和3600。
- 多個其他商品有**相同熟練度**時，Perl `sort` 對比較相等的項目未提供業務定義的固定 tie-break，Node 純模型將在需分攤時拒絕該情況；不聲稱所有原版 HASH 迭代順序可重播。
- 本階段只確定熟練度尾段數值，不宣稱已複製 `UseItem` 成功資格、材料消耗、隨機量、事件回呼、時間／資金扣款或原版每日其他結算效果。

本批 Perl 隔離斷言由 **295增至328項**；Node 增加30項至 **323項**，兩份來源快照固定 SHA 總數為14份。僅測定受限片段；Node 模型詳見 `modern/README.md`。

## 第二十階段：每日庫存上限／UseItem 前置數量與 MakeAmount 原版隔離

新增 `period-stock-use.t` **36項原版 Perl 斷言**。直接從已固定原樣、由 CI 檢查 SHA 的 `period.cgi`（Core `inc-period.cgi`）擷取**每日庫存上限檢查與 `int()` 修正的原始迴圈**；從 `use.cgi`（Core `plug/use.cgi`）擷取**完整 `UseItem` 使用次數前置檢查片段**、`CheckUseItem` 的**材料迴圈**，以及**完整未修改的 `MakeAmount` 函式**。測試只將這些固定來源文字在明確的合成 Perl 環境編譯、執行，沒有 `inc-period.cgi` 頂層執行、公會／備份／session 副作用，也沒有整個 `UseItem` 的商品消耗、時間金錢變動或動態商品／職業回呼。原版 Core 固定快照仍是 **14份**，沒有更改任何一份。

**直接測得：**

- 每日庫存對 `1..MAX_ITEM` 逐項，若原始庫存超過 `ITEM[cnt].limit` 才截至上限，然後用 Perl `int()` 轉整數。合成庫存 `[10.9,7.8,2.9]`、上限 `[10,20,2]` → `[10,7,2]`。**原版不會在這段迴圈將負庫存歸零**：`-1.9` 會變為 `-1`，屬危險原版容忍度。
- `UseItem` 依熟練度、職業、分數、人氣、必要事件逐一判斷不符合時將次數設0；接續依可用金錢、可用時間和材料庫存（按原版條件）重新計算 count，最後在真正商品異動前先記到 `USE.result.count`。材料設定 `proba==0` 時，前置數量檢查使用**單次材料需求**（即使真正 `MakeAmount` 的機率0會回傳0），與正機率使用 `count × 每次需求` 不同。
- 真正執行原版 `MakeAmount` 驗證：`p<=0` 直接0，`p>=1000` 直接回傳要求量；`0<p<1000` 時若 `cnt<20`，每個單位以 `rand(1000)<p` 試一次；`cnt>=20` 轉為另一個以兩個隨機數參與的近似運算。後兩種以相同 `srand` 種子確認可重播，並未聲稱分布已完全驗證。
- 原版 `CheckUseItem` 還包含職業函式與 `functionbefore` 動態回呼，測試**只擷取材料檢查迴圈**，沒有把完整 `CheckUseItem` 宣稱為純函式。

另新增 Node 的 `period-stock-use-model.mjs`，是刻意更嚴格的**合成、無 I/O、未授權執行的來源片段模型**：庫存只允許79格非負有限且安全範圍內的數值與明確整數上限，拒絕原版可保留的負值；使用前置檢查由呼叫端明確聲明已排除動態回呼，僅推算 count；材料 ID／機率／資金時間計算拒絕不安全整數、重複材料或 overflow；小額 `MakeAmount` 才使用顯式提供的 `random()`，並刻意**拒絕 cnt>=20** 的未審查公式。沒有驗證外部宣告的回呼不存在與鎖持有權、沒有商品異動、沒有交易，也沒有正式資料。

**累計：** Perl 從328增加36至 **364／364項**；Node 從323增加38至 **361／361項**；固定 Core 14份完整性核對不變。

## 第二十一階段：以原版為準、不擅自修正問題數值

本階段調整了先前「遇到負數就拒絕」的模型策略，與原版行為保持一致；**異常與風險一律另外列入 [原版問題／風險清單](../../docs/original-behavior-issues.md)**，不能在相容移植中偷偷改變計算結果。

新增 `original-use-outcomes.t` **27項 Perl 斷言**。從既有 Git Blob SHA 固定的**未修改** `use.cgi` 精確擷取完整 `MakeAmount` 函式，以及 `UseItem` 的商品產出／超量片段；並直接 `require` 同樣固定 SHA、只有安全函式宣告的原版 `whole.cgi`，在合成單商品、單／雙商店記憶體狀態上執行**原版 `CheckWholeStore`**。

已證實：
- 大額 `MakeAmount` 以 `cnt>=20` 進入 `sqrt(abs(t)) + ave + 0.5`，小額 `cnt<20` 逐一抽 `rand(1000)`。以相同 `srand` 檢查原版分支的函式輸出和後續亂數狀態，確認**大額恰消耗2次、19單位恰消耗19次**。並非改用一般機率分布。
- 原版商店庫存8、生產5、上限10：商店增加2、市場先加3。若市場原本4、總量上限15，市場先加到7再由 `CheckWholeStore` 修正成5。
- 原版商店**原先已有12**、上限10、生產2：**負新增量 -2** 被記錄，市場取得4，商店降到10。這種看似不合理的原版計算照樣重現，**不自動修正**。
- 原版商品無 `code` 時，`CheckWholeStore` 對該項直接跳過，因此可能留有負市場庫存；`wslimit<0` 的絕對固定上限、正值 `int(wslimit*店數+0.99)`、無產出仍執行庫存檢查，均以原版數值驗證。
- `inc-period.cgi` 中負庫存的 `int()` 語意由原版既有測試直接證明，B-21 的 Node 相容模型現在**保留帶符號庫存**。原版源檔沒有修改。

本階段新增 **27項 Perl**（總計 **391／391**）與 **19項 Node**（總計 **380／380**），沿用14份 Core 原版 SHA 核對。沒有執行真實 CGI、事件、店家物品回呼或正式存檔。

## 第二十二階段：多商品／多商店的原版來源順序

新增 `original-multi-item-use.t` **25項隔離 Perl 斷言**。只從 **Git Blob SHA 固定、完全未修改** 的 `use.cgi` 精確擷取 `#アイテム消費` 至 `#アイテム別関数存在チェック` 之間的**原版材料消耗／產出／全市場檢查片段**，搭配未修改的 `MakeAmount` 函式，並直接執行固定 `whole.cgi` 中的 `CheckWholeStore`。

**原版實際輸出（雙店、三種商品、重複產出）：** 商店初值 `[[8,4,3],[3,4,2]]`、批發市場 `[4,0,-5]`，依序消耗商品1的4件、商品2機率0而未消耗，再以使用次數2依序產出商品1的10件、商品2的8件、商品1的4件、無 `code` 商品3的4件。**全部材料先消耗、再依序產出，最後只呼叫一次 `CheckWholeStore`**。最終商店 `[[10,6,5],[3,4,2]]`；退回溢量後市場暫值 `[12,6,-3]`，總量修正後 `[3,0,-3]`。**原版 `additem` 實際紀錄為 `[[1,6],[2,2],[1,0],[3,2]]`**，顯示商品1第二次產出雖被上限吃掉、仍記錄新增0件。商品3沒有 `code`，負市場庫存保持 `-3`。

另以原版 Perl 固定 `srand` 證實：有機率的**材料消耗先抽完**，才開始有機率的產出；第19個使用次數不是閾值，**抽樣單位數**小於20才使用逐個抽樣，達20單位則使用原版大額兩亂數公式；不可以把每筆生產計算獨立重置 RNG。未產出商品時，原版仍會呼叫市場上限檢查；隔離來源片段也示範材料消耗後不會在本片段中重跑完整 `CheckUseItem` 以清除負值，**這不等於原版完整登入／使用資格一定能允許此狀態**。

Node `original-multi-item-use-model.mjs` 只處理**合成數值**，接受多商店、多商品、依序的材料與產出、明確提供的同一亂數序列，最後一次計算各個有 `code` 商品的全球市場上限。原版的重複記錄、零 `additem`、負市場與超額退貨均不另加修正。未執行完整 `UseItem` 交易、回呼、帳號、實際存檔、RNG 種子相容或 CGI HTTP；JavaScript 參數必須是有限可安全表示的數值，屬模型表示界線而非原版規則。

本階段新增 **25項 Perl 斷言、22項 Node 測試**，總計 **416／416 Perl 與402／402 Node**。來源仍為同一14份未修改 Core Git Blob SHA；原版異常另記於 `modern/docs/original-behavior-issues.md`，不擅自修正遊戲規則。

## 第二十三階段：原版 UseItem 資格／時間／金錢與多商品數值流程

新增 `original-use-transaction.t`：從14份 SHA 固定 Core 快照之一的未修改 `use.cgi`，精確擷取**熟練度、職業、點數、人氣、事件、金錢、時間、材料的使用次數前置檢查**起，直到**材料消耗、逐筆產出、一次 `CheckWholeStore`** 為止的真正原版 Perl 文字並直接執行；同時使用未修改 `calc.cgi::GetItemUseTime / UseTime`、`whole.cgi::CheckWholeStore` 與完整原版 `MakeAmount`。只在合成雙店三商品、固定時鐘、`srand` 亂數及記憶體帳務中執行，不 require 真正 CGI、商品 DSL 或可能有副作用的動態回呼。

驗證點包含：次數4先被現金限制到3、再被時間限制到2；原版先扣時間／金錢，之後多種材料與重複產出，市場最後一次修正；次數0直接返回不修正市場；`proba=0` 的材料雖然實際不消耗，前置仍檢查一份需求；重複材料**逐筆對原始庫存檢查**可能導致負庫存；過期記錄時間直到 `UseTime` 才依上限調整；`status=0` 的來源分支不推進時間；`expold` 覆蓋使用時間；固定 Perl `srand` 證明材料先抽樣、產出後抽樣。異常另外記於 `../../docs/original-behavior-issues.md`，**不修改來源**。

Node 同範圍合成模型為 `../src/original-use-transaction-model.mjs`，測試為 `../tests/original-use-transaction-model.test.mjs`，示範 `npm run demo:transaction`。這次仍**不包含**完整 `CheckUseItem` 的動態職業與前置函式、產出後商品回呼、熟練度尾段、真實存檔、CGI、帳號與安全鎖；不能視為完整 `UseItem` 系統。

## 第二十四階段：UseItem 回呼邊界之後的原版熟練度尾段

在第二十三階段固定來源、合成交易基礎上，新增 `original-use-experience-transaction.t` **48項 Perl 隔離斷言**，與 `original-use-experience-probe.pl` 九案例 JSON 對照。從同一份未修改 SHA 固定 `use.cgi` 擷取資格→費用／時間→材料→產出→`CheckWholeStore` 原文，並擷取其**商品回呼之後**的完整熟練度尾段。將兩個未修改的來源片段接在合成無回呼場景中，配合未修改 `calc.cgi`、`whole.cgi`，不執行真正動態商品／職業 callback、CGI、世界存檔或其他來源頂層副作用。

來源直接驗證：零次使用完全跳過熟練度尾段；若 `USE.exp=0`，即使商品使用成功也不覆寫 `result.expold`；非零則先記錄此前熟練度、計算 `expplus=USE.exp*USE.result.count` 並以 `1000-oldExp` 截斷。**原有熟練度1050會算出負的 expplus=-50，將熟練度降到1000**；負 `USE.exp` 同樣可能扣分；被扣到0的其他熟練度鍵會刪除，只有本次使用商品時總上限的超額可能無法消去。商品有同值熟練度時 `sort { exp[a] <=> exp[b] } keys` 只有值比較、**沒有商品 ID tie-break**。隔離 Perl 輸出實際的 sorted keys，供 Node 模型跟隨同一次排序；不可暗中用升冪商品 ID 代替。

實際九案例 JSON Perl-to-Node 交叉對照驗證同一批合成商品數量、帳務、時間、逐筆商品紀錄及經驗尾段結果；Perl SHA 快照仍14份未修改。完整 CI 仍以 `prove -v *.t` 跑全部原版 Perl 斷言。不授權真實 `UseItem` CGI、回呼執行或資料存檔。

## 第二十五階段：CheckUseItem 原樣職業／前置回呼與商品回呼靜態邊界

新增 `original-use-eligibility.t`，只從14份 Git Blob SHA 固定且完全未修改的 `use.cgi` 提取 `GetUseItemList`、`GetUseItemListSub`、`CheckUseItem`、`GetUseItem` 四個來源原樣子函式。測試的 `package item` 回呼是這份 .t 內定義的**安全合成替身**，不需原版 DSL 編譯器、`inc-item.cgi` 或真實商店。直接執行原版子函式後，核對職業專屬／共用 fallback 的優先順序、回呼更改 `functionbefore` 或材料／庫存、前置函式回傳2（只顯示）／1（拒絕）／其他（檢查材料），以及 `GetUseItem*` 的旗標只設1、不清理舊值。找不到 `functionbefore` 函式的 Perl 原始錯誤亦有明確斷言。測試絕不宣稱已執行編譯後街道任務或真實玩家資格。

新增 `original-use-eligibility-probe.pl`，提供13組合成案例的 **直接原版 Perl** 觀察結果，以 JSON 交由 `../original-use-eligibility-model.test.mjs` 裡的 Node 測試逐案比對（材料／庫存改變、`useok/dispok` 旗標與受控回呼順序）。同時新增 `original-item-callback-contract.t`，用原版固定文字驗證商品產出後的市場調整、`RequireFile('inc-item.cgi')`、商品方法解析、欄位綁定、回傳值寫回以及熟練度尾段順序；**沒有執行這段真正動態回呼**。異常只記入 `../../docs/original-behavior-issues.md` 的 CORE-13／CORE-14，不改原版。

實際測試可使用 `prove -v original-use-eligibility.t original-item-callback-contract.t` 或既有完整 `prove -v *.t`。以上仍不是正式 CGI、已編譯商品任意 Perl 程式或真實世界持久化測試。

## 第二十六階段：標準街實際 `@@FUNCITEM` 兩個共用函式原樣 Perl 隔離

本階段新增 `original-shared-callbacks.t`，僅從本倉庫**未修改**的 `../../../custom/inc-item-data.cgi` 中抓取 `@@FUNCITEM` 的 `sub lostbook` 和 `sub popup` 兩段**原樣子函式本文**（不執行整份 DSL 或具有 `eval`、檔案／鎖操作的 `inc-makeitem.cgi`）。在受控 Perl `package item` 中僅定義測試專用的 `UseItem` 與 `WriteLog` 參數記錄器，確保不會真的扣商品或寫任何記錄。

原版 `lostbook`：每次實際執行 Perl `rand(1000)` 並以 `< USE.param1` 判斷是否**請求**呼叫 `UseItem(itemno,1,ITEM[itemno].name+原版訊息)`；函式返回空字串，不依本次使用次數扣件數。未嘗試推演被呼叫方真正的遊戲副作用。原版 `popup`：直接修改合成人氣，保留 `int(param1*(2-rank/5000))` 的小數截斷、超過10000才截斷與先後兩筆 `WriteLog` 參數；沒有直接修改合成庫存、金錢、時間或熟練度。

`original-shared-callback-probe.pl` 提供12組由原版函式直接執行產生的 JSON，`../original-shared-use-callback-model.test.mjs` 跨語言核對結果。固定來源的完整宣告分類由 `../original-standard-callback-inventory.test.mjs` 測試，詳細見 `../../docs/original-callback-inventory.md`；`_local_1` 必須被當作引用先前定義的別名，不應以每個宣告當成新增函式本文。其他本地或真正動態回呼仍**不執行**。

```sh
prove -v original-shared-callbacks.t
prove -v *.t
```

原版 `popup` 的負值／超額人氣與浮點截斷現象記於 `../../docs/original-behavior-issues.md` 的 CORE-15，只記錄不更動來源算式。沒有真實 CGI、原版商品編譯輸出、日誌檔案或世界資料。

## 第二十七階段：兩份真正標準街本地 `_local_` Perl 本文隔離

新增 `OriginalInlineCallbackHarness.pm`：從未修改 `../../../custom/inc-item-data.cgi` 審閱過的商品13／63 區塊，逐字擷取各自的 `func _local_` 到原版 `_local_` 結束標記；先比對固定 `inc-makeitem.cgi::GetLocalFunction`／`eval(<<'_eval_code_')` 包裝契約，再只將**這兩段**在記憶體 Perl `package item` 編譯與執行。兩個商品最後都使用 `_local_1` 名稱，因此隔離器每次只選定一個來源的函式**重新載入**；不涉及真實 `RequireFile`，也不宣稱原版運行時檔案載入或名稱衝突已驗證。

`OriginalInlineCallbackHarness.pm` 另直接從固定 Core `inc-func.cgi` 擷取原樣 `sub GetMoneyString` 於人工貨幣前後綴下執行；`WriteLog` 僅測試記錄器，不會寫原版的日誌。原始管理員編譯器整份檔案、玩家 CGI、世界檔案及其他回呼均未執行。

- `original-inline-work-showcase.t`：**52項**直接 Perl 斷言，驗證工作 `money+=USE.param1*count`、原版金額格式、兩筆 `WriteLog`，以及展示架的舊數量／新數量比較、`splice`、未補齊洞、未截掉多餘尾端、來源訊息與日誌。
- `original-inline-work-showcase-probe.pl`：**13組**真正原版 Perl 本文執行的 JSON 實測資料，供 `../original-inline-work-showcase-model.test.mjs` 裡的 Node 直接逐案核對。
- 前一批 [B-26 原版共用 `lostbook`／`popup` 隔離](../../docs/original-callback-inventory.md) 測試不變，完整 `prove -v *.t` 仍涵蓋兩批。

```sh
prove -v original-inline-work-showcase.t
prove -v *.t
```

展示架合成狀態不一致的原版保留行為只記於 [CORE-16](../../docs/original-behavior-issues.md)，沒有替原版增加欄位正規化。其他 9 份本地使用後函式與真正前置／商品層級回呼尚未實際執行，完整端到端交易仍未完成。

## 第二十八階段：原版商品入口檔與 in-memory Perl require 符號／路徑快取

從固定 Core `katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365` **新加四份純文字來源快照**：`core-inc-item.cgi`（原 `inc-item.cgi`）、`core-item-detail.cgi`（原 `item.cgi`）、`core-item-form.cgi`（原 `item-m.cgi`）、`core-item-submit.cgi`（原 `item-s.cgi`）。原先14份固定 Core CGI 不修改；四份新增原文由 CI **另外**以 Git Blob SHA 比對，**絕不直接 require 或執行這些完整 CGI 檔案**。

`original-virtual-item-require.t`（**50項 Perl 原始來源／虛擬 require 斷言**）先以靜態文字證實原版 `_config.cgi::RequireFile` 優先查 `custom`、再查內建檔；確認 `inc-item.cgi` 的 `package item`／共用 `UseItem`／`WriteLog`／`funcitem.cgi`，以及 `item.cgi`／`item-m.cgi`／`item-s.cgi` 先 `RequireFile('inc-item.cgi')`、再依商品代碼直接 `require $itemcode`，然後才取得使用清單／使用資格。另確認 `inc-makeitem.cgi` 會把商品分別生成到 `use/<代碼>.cgi`，但同名本地函式仍宣告在 `package item`，`@USE` 採按索引賦值。

`OriginalVirtualItemLoader.pm` 在**不寫入任何實體 CGI 檔案**的前提下，針對 B-27 審查過的商品13工作與商品63展示架原始 Perl 本文產生最小**合成**編譯產物；以 `@INC` hook 回傳 UTF-8 位元組的**記憶體虛擬檔案**，令 Perl 真正執行 `require $itemcode`，觀察 `%INC` 快取與 `item::_local_1` 覆寫。共用 `WriteLog` 仍為記錄參數的測試替身，金額格式沿用原樣 Core `GetMoneyString`。並不執行正式 `inc-makeitem.cgi` 的動態 eval／檔案生成，也不執行 CGI。

`original-virtual-item-require-probe.pl` 對9組不同順序提供**各自新程序的原版 Perl 觀察結果**，供 `../original-item-dynamic-loading-model.test.mjs` 中的 Node 測試逐步比對。對一個**刻意多商品載入的單 Perl 執行環境**，不同虛擬檔案的 `_local_1` 後者覆蓋前者，重新 require 已快取的檔案不會重設函式；而較短的商品人工 `@USE` 索引賦值不清除舊的高序號。**本測試不等於正常單商品 CGI 請求會發生這些碰撞**；請參閱 `../../docs/original-item-loading.md` 及獨立記錄 CORE-17。

```sh
prove -v original-virtual-item-require.t
prove -v *.t
```

本階段不涉及原版正式磁碟 require、使用者驗證、`UseItem` 正式交易、日誌寫檔、世界資料持久化或原版數值規則更改。

## 第二十九階段：四個真正 Core `inc-item.cgi` 商品助手與標準街 `lostbook` 連鎖

`OriginalItemHelperHarness.pm` 會直接讀取先前 B-28 以 Git Blob SHA 固定的**未修改** `core-inc-item.cgi`，逐段精確擷取 `UseItem`、`UseItemSub`、`AddItem`、`AddItemSub` 四個完整 Perl 子函式；再直接讀取原始 `../../../custom/inc-item-data.cgi` 中 `@@FUNCITEM` 的 `sub lostbook` 本文。**僅五段已審閱的原樣 Perl 函式，在受控記憶體的 `package item` 裡實際編譯與執行**；不執行完整 `inc-item.cgi`、正式商品／管理員 CGI、實際日誌、玩家／世界存檔或鎖。

- `original-item-helpers.t`：**82項 Perl 斷言**，核對真正 `UseItemSub`／`AddItemSub` 返回的正／零／負實際數量，以及外層 `UseItem`／`AddItem` 固定回傳0、追加 `USE.result.useitem/usemsg`／`additem/addmsg` 而非覆寫；`lostbook` 真正接到上述 Core helper，直接修改合成庫存、寫入合成 result 陣列。
- `original-item-helper-probe.pl`：**27組**從未修改 Perl 原文執行產出的 JSON，供 `../original-item-helper-model.test.mjs` 裡的 **34項 Node 測試**逐案對照。`lostbook` 的亂數只採用真 Perl `srand`／`rand(1000)` 觀察到的抽樣值，未宣稱 JS 隨機種子等價。
- `src/original-item-helper-model.mjs`（相對 `modern/`）：嚴格限於這四種原版 helper 和這條已審核的 `lostbook` 呼叫鏈；人工安全整數、索引上限是**測試表示限制**，不是原版遊戲規則。仍未串接外層完整 `UseItem`。
- [來源與限制](../../docs/original-item-helpers.md)、[獨立問題 CORE-18／CORE-19](../../docs/original-behavior-issues.md)：人工負數使用量、既有超上限庫存可能產生**負的實際扣除／取得數量**；來源只記錄不修正，不宣稱正常 CGI 一定會遇到。

```sh
prove -v original-item-helpers.t
prove -v *.t
```

固定 Core Git Blob SHA 不改動，Perl 原始回呼的測試操作只有合成資料、沒有真實副作用；`lostbook` 真正呼叫的是本次從 Core 擷取的 `item::UseItem`，不同於 B-26 只記錄參數的替身試驗。

## 第三十階段：固定 Core 完整 `UseItem` 與 `lostbook` 巢狀助手、熟練度

[`OriginalFullUseLostbookHarness.pm`](OriginalFullUseLostbookHarness.pm) 直接抽取**固定原版** `use.cgi::UseItem`（**完整主函式**）、`MakeAmount`、`calc.cgi::UseTime`／`GetItemUseTime`、`whole.cgi::CheckWholeStore` 五段原始程式本文，結合 B-29 已審閱的原始 `inc-item.cgi::UseItem`／`UseItemSub` 與標準街 `sub lostbook`。使用人工記憶體中的店家、商品與市場，**僅 `RequireFile('inc-item.cgi')` 被限制為純記錄型替身，沒有真的載入原版 CGI 或寫實際商店檔案**。此外 `l()` 也是合成文字替身，未宣稱完整原版本地化。

- [`original-full-use-lostbook.t`](original-full-use-lostbook.t)：**75項**原文執行測試，核對真實原版 `UseItem` 完整金錢／時間／商品處理、一次批發修正、真正 `lostbook` 巢狀扣除及熟練度尾段在回呼**之後**。
- [`original-full-use-lostbook-probe.pl`](original-full-use-lostbook-probe.pl)：**13組** Perl 原始函式執行情境，輸出最終庫存、批發、金錢、時間、`USE.result`、熟練度，以及每步觀察順序。
- [`../original-integrated-use-lostbook-model.test.mjs`](../original-integrated-use-lostbook-model.test.mjs)：**25項 Node 驗證**，將13組真正原版 Perl 的所有主要數值與交易結果欄位逐一對照。僅機率0／1000材料，避免在 callback 前造成未核對的 Perl／JS 亂數分歧；`lostbook` 依真正 Perl `rand(1000)` 觀察值提供測試資料。
- [`../../docs/original-integrated-use-lostbook.md`](../../docs/original-integrated-use-lostbook.md) 記錄完整來源、原始 `RequireFile` 替身的嚴格範圍、回呼後**沒有第二次批發庫存修正**的 CORE-20 與其他尚未驗證的情境。

```sh
prove -v original-full-use-lostbook.t
prove -v *.t
```

**沒有**執行實際玩家認證、DSL 編譯器、全原版 CGI、正式 `RequireFile`、真實世界／日誌／鎖／提交，並**不表示**目前已可實際遊玩。

## 第三十二階段：原版商品使用兩次連鎖與 World State 快照

B-30 的 [`OriginalFullUseLostbookHarness.pm`](OriginalFullUseLostbookHarness.pm) 加入**人工測資覆寫**（`stocks`、`otherShopStock`、`wholesale`、`money`、`paytoday`、`storedTimeSeconds`、`exp` 與 `nowSeconds`），但**沒有**改固定 `use.cgi/calc.cgi/whole.cgi/inc-item.cgi` 的任何原版函式本文；每筆依然直接執行原版完整 `UseItem` 與標準街已審閱 `lostbook`。新增：

- [`original-world-use-sequence-probe.pl`](original-world-use-sequence-probe.pl)：三組兩筆交易，**六次真正原版 Perl**，將上一筆庫存／金錢／時間／技能／批發直接回填下一次受控來源函式，再輸出原版結果 JSON。
- [`original-world-use-sequence.t`](original-world-use-sequence.t)：**40項 Perl 直接來源斷言**。觀察人工商店初始金錢70、時間950、熟練度200、商品 `[8,4,3]`；第一次交易 `money=50,time=968,exp=230,stock=[9,6,5]`；第二次 `money=30,time=986,exp=260,stock=[9,6,5]`。兩次 `CheckWholeStore` **各只一次且都在 `lostbook` 之前**，符合來源。第3格批發原始來源在兩次合成交易後仍是 `-3`，不可誤推測成 `-1`。
- [`../reviewed-use-fixture-street.test.mjs`](../reviewed-use-fixture-street.test.mjs)：**23項 Node 檢查**，包括原版 Perl 六次輸出與純記憶體 `WorldState` 每步主要欄位比較；`source-fixture-use` 是**獨立人工街道**，不能當成已移植真實標準街 ITEM #1～3。

完整來源限制與狀態結構見 [`../../docs/reviewed-world-use-sequence.md`](../../docs/reviewed-world-use-sequence.md)。沒有真實 CGI、`RequireFile`、DSL 編譯、持久化、玩家權限、所有隨機場景或正式標準街使用功能；原版18份固定 Core source blob SHA 未改，所有原有 Perl 斷言繼續執行。

## 第三十三階段：真實原版禮物卷 #79 第一筆 USE 與編譯器原文

[`OriginalGiftMapUseHarness.pm`](OriginalGiftMapUseHarness.pm) **原樣擷取執行**固定來源 `inc-makeitem.cgi` 的 `GetBuffer/ClearBuffer/GetTime/GetNumber/GetString/GetItemNumber`（原版**編譯器子函式**，不是帶有刪目錄／建鎖／寫檔的完整頂層），只餵入79項原版 `ITEM PRICE/LIMIT` 與原始禮物卷第一筆 USE 「交換地圖集」資料。接著以同一來源的 `plug/use.cgi::UseItem`／`MakeAmount`、`calc.cgi::UseTime/GetItemUseTime`、`whole.cgi::CheckWholeStore` 在<b>人工79格批發全0測資</b>中**真正執行商品消耗與取得**，對照 Node 首次加入真實標準街的 `gift-exchange-maps` 單一命令。`RequireFile` 仍為只記錄型替身，不啟動完整 CGI 或世界檔案。

- [`original-gift-map-use-probe.pl`](original-gift-map-use-probe.pl)：6種來源情境，含連續三筆的第三筆材料不足，總計8次原版 Perl UseItem 執行，回傳79項來源編譯上限、有效操作次數、庫存、批發、金錢、時間、原始 useitem/additem/usemsg/addmsg 結果。
- [`original-gift-map-use.t`](original-gift-map-use.t)：**53項 Perl 直接來源斷言**，涵蓋原版 2張禮物卷→三張地圖、`ItemUseTimeRate 0.5`→1800秒、原版限額、兩次連續使用、第三次材料不足、三種地圖已滿時仍消耗禮物卷且 `additem` 追加三筆0。
- [`../reviewed-gift-map-use.test.mjs`](../reviewed-gift-map-use.test.mjs)：**27項 Node 測試**，對原版子函式真正編譯的全部79個 ITEM 上限與六組真 Perl 輸出做逐欄核對。原始 USE 沒有個別訊息，Perl 仍保留 `usemsg=[undef]`、`addmsg=[undef,undef,undef]`，Node JSON 以 `null` 保留：已列獨立 [CORE-21](../../docs/original-behavior-issues.md)。
- [詳細來源與嚴格限制](../../docs/reviewed-real-gift-use.md)：批發數量全0是**明示人工市場**，原版完整 compiler 頂層、真正 `RequireFile`、正式玩家資料讀寫／日誌／鎖及其餘115筆 USE 都沒有執行；不能把通過本測試宣稱成全部真實商品已完成。

```sh
prove -v original-gift-map-use.t
prove -v *.t
```

全部固定原始 Core 快照及街道 DSL 均未修改；CI 同時檢查前32階段基準。

## 第三十四階段：原版首次管理員初始化空白市場與 Perl 稀疏 CSV

新增**第19份未修改原版 Core** 快照 [`core-inc-admin-func.cgi`](core-inc-admin-func.cgi)，來源 Git Blob SHA `2164b7e5abfea7a466235a8deba1543c2cc41515`，已加入 GitHub Actions `git hash-object` 審核。真正原版 `sub init` 建立首次新世界檔案時第三行批發庫存為**空行**；`DataRead` 的 `split` 回傳**長度0的 `@DTwholestore`**，不是79個明文 `0`。

- [`OriginalAdminBootstrapHarness.pm`](OriginalAdminBootstrapHarness.pm) **從固定 `inc-admin-func.cgi` 擷取原樣 `print DATA time()...` 陳述式並真正在 Perl scalar 記憶體把手執行**，不呼叫整份 `init`（否則會做檔案 I/O、mkdir、unlink 等）、沒有碰任何真實世界存檔。
- [`original-admin-sparse-market-probe.pl`](original-admin-sparse-market-probe.pl) 使用原版 `OriginalGiftMapUseHarness.pm` 完整 `UseItem/MakeAmount/CheckWholeStore`，第一次將 `@DTwholestore` **設成真空陣列**，第二次真實回填首次交易 Perl 觀察到的批發陣列，第三次材料不足；另測試地圖已滿時原版實際寫入哪些批發位置。真正原版 `join(",",@DTwholestore)` 的稀疏 CSV 與79格數字視圖可逐欄比較。
- [`original-admin-sparse-market.t`](original-admin-sparse-market.t)：**44項 Perl 來源斷言**，包括首次空白世界 `CSV=''`、商品 #79 第一次使用後僅批發索引78被寫成0，來源字串是78個逗號＋`0`，其他78格 `undef`；超限地圖再寫入索引8、11、13的來源真行為。所有原版 CGI 內文未改、不能因此當作完整原始管理員安裝或可用的世界存檔。
- [`../original-admin-sparse-market.test.mjs`](../original-admin-sparse-market.test.mjs)：**27項 Node 命令／真 Perl JSON probe 對照**；[詳細文件](../../docs/reviewed-original-sparse-market-init.md) 與 [新聊天交接](../../docs/next-window-handoff.md)。

```sh
prove -v original-admin-sparse-market.t
prove -v *.t
```

本階段最新測試總計**771／771 Node，1013／1013 Perl，27個 `*.t`**；全部原版 Core 19份固定 Blob SHA、兩份標準街 DSL audit 成功，沒有修改原始程式或 DSL。這些是隔離行為測試，不是正式可玩遊戲或世界讀寫授權。
