# R0 第三十六批：UI 靜態回歸／原版 world 讀寫及提交（未結案）

固定正式 baseline `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；候選父 HEAD `bb44e2600e8e021840309bfb2597ab8c30ab7462`。五檔測試完整讀取，核對相應固定來源；只認列限定證據，不增加 R1 逐項下界。

## local-original-ui-layout.test.mjs

- 測試 blob: `76088699f86859e00a14d620ba3e1ab0e0be63d6`；靜態 UI／handler wiring 回歸。
- 來源／入口：`modern/local-ui/index.html` @ `ddca95478eec6bc957d1bd646b07eaf6724fbabf`；`modern/local-ui/app.js` @ `e11a43e604398f636b3aed47c70d7c9afef51f14`；`modern/local-ui/style.css` @ `6fdfb42e08afdb9615a4db11fdd547fa1e301e2c`；`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`。
- 斷言：L14–147 導覽、明細、balance、CSS、狀態列與存讀檔位置；L150–238 展示架、USE、時間及 discard wiring；L241–293 dev-only、返回、售價同步。
- 執行：讀取四檔文字，regex/includes/順序斷言，無瀏覽器執行。
- Fixture：靜態字串、無玩家 fixture。
- 限制：不證明實際渲染、事件、HTTP 成功、CAS 或 v2；L66–69 舊 supply/advance-time 只檢查字串存在，正式 handler 舊時間回409（dev-local L530–531）；不可將標題 live commands 當現行可用能力。

## world-read-safety.t

- 測試 blob: `205dec43ce77014fa380b09c9d18e7af6200c2d6`；Perl Oracle（隔離 DataRead 負例）。
- 來源／入口：`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`。
- 斷言：L54–84 原樣擷取 DataRead 與 alarm；L86–107 missing/empty/最小 world；L109–140 非數字 stock/population、缺 //、CRLF sentinel、空 stock。
- 執行：原版 DataRead L233–299，真暫存檔 read、外部 GetPath/OutError/GetDTPoint/AutoVar stub。
- Fixture：人工 minimal world，無店、無 EVENT。
- 限制：缺 // 或 // CRLF 由外部 1s alarm 截止（來源 L258）；原版非數字資料未驗證；不證正式 Node guard、HTTP/v2 或 rollback。

## world-one-shop.t

- 測試 blob: `e7b33c9a3486aab47c4672b0f337d9c912a8a5ae`；Perl Oracle（隔離 DataRead 店家結構）。
- 來源／入口：`modern/tests/original-perl/inc-func.cgi` @ `e7a8add7b0291901e71fe797783b664dff1568a0`。
- 斷言：L42–60 擷取原版及32 header 欄；L62–98 人工兩行店家；L100–146 單店、無 town、兩店、重複 ID、opaque town、缺 payload。
- 執行：原版 DataRead L233–299，真暫存檔；AutoVar recorder/stub、GetDTPoint 固定77、alarm 2s。
- Fixture：人工 shop header、syntheticPass、payload；無 EVENT。
- 限制：重複 ID 接受且 index 覆蓋（L282），缺 payload 仍計入店家；不驗原版 AutoVar 真解碼、認證、point 計算或正式多店/v2。

## world-data.t

- 測試 blob: `56d6fcf6de5bd0359176f0498ad77f92b81f3d5a`；Perl Oracle（隔離 DataWrite stage）。
- 來源／入口：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`。
- 斷言：L18–63 初始化及 fresh backup；L74–96 兩次 DataWrite，79 stock 槽、ID-1、metadata/event/town/分隔符、人工 #10 7→8。
- 執行：原版 DataWrite L45–89；真隔離 UTF-8 stage file，GetPath/OpenAndCheck/SortDT/AutoVar stand-ins，LOCKED 空。
- Fixture：無店、無 EVENT，固定時間，fresh backup 避開備份；lasttime path 未建立。
- 限制：不執行 DataRead、commit、真鎖、備份或 Node 差分；DataFilesBackup stub 宣稱不應走，但 require 原版 write.cgi 會重定義該 sub，不能當成獨立 guard；未斷言 lasttime utime 結果。

## world-commit.t

- 測試 blob: `4a8fd57c24de341509ba7c06a5684baa95a04f69`；Perl Oracle（隔離多檔 marker／rename）。
- 來源／入口：`modern/tests/original-perl/write.cgi` @ `203f33b37511e838800a45b84183af98fcf46e4c`。
- 斷言：L91–139 normal/abort/recovery/stale marker；L141–164 注入第二次 rename failure 後恢復；L166–181 非字面 .cgi 選擇與空 stage marker。
- 執行：原版 DataCommitOrAbort L4–35，真隔離 stage/live；GetPath/OpenAndCheck/RenameAndCheck stub，正常呼叫 OS rename，第二次注入 die。
- Fixture：人工 world/bags bytes、notes.txt、marker。
- 限制：中途部分提交而非 atomic；原版 L9 regex 未 escape，strangexcgi 也匹配；無真 lock、fsync、斷電、正式 CAS/v2，未驗每一種 readdir 順序。

## 邊界

未重新執行本機完整測試；第31批 CI exact tree 已核對，但不替代新候選。UI 無 per-item 互動證據；四個 Perl 測試為人工 world，未建立任何新 ITEM/USE/EVENT 層引用。R1-HTTP-01 Git DNS 仍失敗，未實跑 strict repro。
