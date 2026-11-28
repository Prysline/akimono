# R4 B — 雙店公會交易與 DragonBalance 失敗窗口（2026-11-25）

僅研究分支，正式 runtime 不改。前段 4efba003e37796e86fe571448a253b0514ea4d04 的 CI 45479027923 已完成 success（1187 JS、2507 Perl、88 .t、來源檢查）。本段需獨立 CI 確認，不以先前結果代替。

- 原版 buy-s.cgi blob 6ba8df9a733ed16c490389414cd94934fe1185ca。新 Perl probe 直接擷取自 self-purchase guard 到售罄 rank block 結束，執行 frozen CheckCount、CheckShowCaseNumber、CheckItemNo、CheckGuild、GetTimeDeal、UseTime、GetUserTaxRate、GetSaleTax、EditGuildMoney。五個原版檔案 blob 完整 SHA 驗證，未修改原版。#79 price=10000 limit=10 是明示已審閱商品 fixture，雙店、公會及持有量是隔離測資而非真玩家獲得路徑。沒有執行登入、全 CGI、FUNCBUY、真交易寫檔或 CAS。
- 11 案涵蓋普通售罄、補助不足、負金庫、異公會加價現金裁切、同公會折扣現金裁切、零 margin、過期報價、無錢、庫存上限及 taxmode。Perl 檢查資產守恆及拒絕無變化；Node 使用既有 quoteUnguildedPurchase 計算賣方基礎稅與時間，測試內計算公會差額並比較完整雙店/公會帳本，不新增正式交易引擎。未涵蓋 fractional rank RNG（本批 rank=1000）、全 DSL callback、正式多店。
- DragonBalance failure 專項以 exact period blob 擷取原版函式，正常路徑實際 File::Temp 檔案 unlink；失敗路徑於隔離 Perl process 注入 unlink 回傳 0/EACCES（非真 OS 權限失敗）。比較原版記憶體累加及實際檔案是否仍在。模擬未發布記憶體丟棄/再次呼叫；不是完整 DataRead、DataCommitOrAbort 或玩家重啟。付款 producer 仍未確定。
- 下一步：獨立研究 B43 發布之前付款 receipt 的 identity/bytes、已發布但尚未清除的重入復原、外部 producer 競爭防線及真 DataRead/commit oracle。不可直接用檔案 digest 當全域付款 identity（不同合法付款可有相同內容），也不可在正式 runtime 啟用未證明的公會/龍族效果。
