# R4 統一整合收錄紀錄

D1 文件候選；尚未收錄任何 A/B runtime。起點 migration/standard-street-s1 @ 08fdd3b31ff130e66d0337360430fda3d73fdc8d，tree 9a6c0d5837042c276eda13f78394025016d332b5。P5 exact tree [CI 45727603147](https://github.com/Prysline/akimono/actions/runs/45727603147) 既有記錄 JS1329/1329、Perl2456/2456（85檔）、pins/DSL 通過；不是本文件提交的 CI。

| PR | 重新核對 HEAD（快照） | 處置 |
|---|---|---|
| #18 | f356c14452537a11167110f5b46709f7a1bb9039 | B，保留 |
| #22/#25 | 1780f564c3b5bca3a1d396a6156d280f71fa9b23 | A；#25 不合併 |
| #26 | 50528dd28d184f7110e4b364f956a62f7e5bbca7 | C |
| #23 | 988c310ceb5dbcbb4e89d5f22d7b9b9590017433 | 暫停，待證據移交 |
| #24 | 08526633a81b6c0474599e70b9846cf7e021ef41 | 同上 |
| #16 | 6664d60af29b4974f9386bf5c97ce09cdd477637 | 唯讀來源 |
| #1 | d2dccdacb83925b6f0121bd7311f92be2e18d2da | 唯讀歷史 |

雙店 wire 82101a4f37c6839b0b94341488b265cd5bce5247 已確認 Git object 可讀；[交接](https://github.com/Prysline/akimono/pull/18#issuecomment-7195147369)。未永久備份、未發布、未 CI；B 依最新 HEAD 檢查三檔差分後重建，不移動 #18 ref 指向候選。

## 批次計畫（依賴閉包優先，不是全域開工門檻）

1. D1 文件與責任；D2 逐檔三方 blob/語義差分與現有介面、測試相依清冊。
2. 正常商品取得/USE/EXP/販售/回呼小批閉包（A），保護 P1–P5，核對 B 共享變更。
3. 多架、時間、EVENT、排序、維持費、決算、關店與存檔共用閉包（A/B/D）。
4. 宮殿、軍隊、領主、稅務等獨立閉包（B）；無依賴可提前。
5. 多店、店間交易、公會、龍族、共同/街道期末（B/D）；來源權限、鎖序、原子性、故障、跨期、重啟必須成立。
6. 跨系統整合與 exact tree 回歸；C 同步獨立驗收，正式基線合併另需授權。

每批記錄來源 refs、base/head/tree、選擇路徑、排除路徑及理由、相依閉包、來源 pin、測試命令/CI actual checkout、已知缺陷/待證、回復方式。禁止整支舊 R4 覆蓋、隱性回退、平行保存。D1 未查其他本機 worktree、stash、untracked/unpushed；由各窗核對保全，不宣稱已保存。

## D2-VOUCHER 候選收錄

見 [D2 三方 blob 清冊](r4-d2-three-way-intake.md)（固定 P/A/B/M、244 路徑）。原樣收錄 A 批發贈券 source 模組及對應 source-only Perl/Node 差分兩檔；三份 source pins 已核對，歷史 exact blob CI 兩測試通過，D 新 CI 待證。未接正式市場入口，不提升功能完成狀態。B 已發布雙店 wire 三檔 exact blobs，原未發布候選不再需要重建。D1 的本機保全限制仍有效。收錄回復以正常 revert/後續修正提交，不 reset 或 force。

## D3-VOUCHER-CORE-TEST｜受控交易候選（2026-11-26 UTC+8）

起點 D2 `85fa1d2636d4ee958fed57585faa117284772c28` / tree `59c1bd0412937317516e4d17f09ab79aaea01ecc`；本次重查 #27 仍 Draft，正式 base 08fdd3b31ff130e66d0337360430fda3d73fdc8d。A #22 `950fbf55259b245bfe2f4a181370628b8001223a`、B #18 `2aa1eb4ad5681af12132079182af8b6388940b47`、C #26 59d07e9fa40d3a4da2ab7e72d395a44394ad2f9e（新查詢快照）。D2 清冊保留原固定 refs；最新 A/B 下列 blob 重查一致，非全量重新盤點。

- D2 run [45849832350](https://github.com/Prysline/akimono/actions/runs/45849832350) job 140012985650：兩次查詢 in_progress；setup/checkout/setup Node 步驟成功，DSL audit 執行中，Perl、source pins、Node 測試未取得結論；原始 job log 兩次 HTTP 404 BlobNotFound，實際 checkout SHA/tree 未證（不可用 preview 代替）。D1 run 45847874218 亦 in_progress。本次不增加 runtime 或改 CI。
- 僅將 A `modern/tests/market-buy-core.test.mjs` blob 623d248433ee258e13c545c24483e19a7716066f 的一個具名子測試（R4 source-only shared market FUNCBUY clips purchase, validates grant and rolls back later wholesale failure）及其 voucher import 選擇性加到 D2 blob 56d39115e402654e89e88cb07d996199113f784e；原 D 測試保留，尤其未接 runner 的 #64 拒絕與 P5 #63 預設拒絕。A/B 另一個 #63/FUNCINIT 差分測試依賴 extended registry、signed cash/tax 與擴充 Perl oracle，留待該閉包，不整檔覆蓋。
- 新子測試使用現有 GameCore applyGameCommand、真 shared market buy、D2 voucher review/runner；人工 #64 市場庫存 1、money 600000、#79 持有 0/9/10，requestedCount 2 裁切為 1、實付 500000，核對贈券 cap10、扣款、購貨、wholesale 清零；writeMarket 故障注入後拒絕且 snapshot 不變。測試專用 adapter，不是正式 StreetModule/HTTP，不是實際 disk failure 或正式玩家。三 frozen pins 於 D2 重查與 D2 清冊一致。測試候選待新 CI；本機無 repo 且 github.com DNS 未解析，未執行 Node/Perl。
- Registry：最新 A/B 相同 9d277441dad820aeb53d8fcb67a97ba91fc058c9，D 4ad3b8d15c2a79f3e8db04fca8bcca49e210b827。實讀全檔與差分：includeReviewedShowcaseTool 預設 false，#13 保留，#63 僅 source identity/LIMIT/FLAG/PRICE/FUNCINIT 驗證後 opt-in；同 opt-in 為正價 quote 加 appraiser/peddle transport。不得把 registry alone 當作正式接線；兩種 transport 行為須對照原版，普通/P5 default 不回退。
- market-buy-core：D 52d405843c15d53d454075f91c5a90c74027a506、A a1445828e1c6f6faa71574f13826e4c2636e475a、B af21f7989f17dc1d52fb3462b8284ac9e8e661dc。實讀差分：A/B 共同 reviewedSignedCash 與 synthetic seller tax receipt；B 額外 projectSourceTax({world,rule,count,gross}) 及 sourceTax>total 拒絕。D 已有 accounting→global→item→writeMarket，保留此順序。正式接線須同時保留 B tax/guard、A voucher runner、receipt/log 與 replay；不將稅再扣買方。
- local-world-save-store：A 等 D df8429f40065882f2c1482c63e0e2163b6acb7d0；B b4f90c3290c8579f7eb9a929daa63bb55a32879b 新增 lstat regular/nlink、O_NONBLOCK 及 fstat dev/ino/nlink 對照，待與 period disk 安全、A archive 及實際 FIFO/link/corrupt generation 測試閉包整合。未修改 guard。
- A HTTP 測試 `r4-normal-commerce-funcbuy-http.test.mjs` 9f2b6b3237261e235f4367c368453504c14afa7a 有 #64 真實付、單次 log、stale CAS 及雙世代重啟；`r4-normal-commerce-funcinit-http.test.mjs` 160a5e7a70f5133db3b56332ac947b14c62a9a53 有 #24/peddle 正價運輸與兩次 v2 reload。兩者依賴 divergent genuinePlayer support、full commerce、history/disk 等尚未整合，不直接收錄宣稱可跑。

下一批：先核實 D2/D3 actual checkout/log、Node/Perl/DSL/pins；若確定性失敗先修原因。再做 Registry+cash/tax/transport 原版差分閉包，分離 opt-in 與正式 runtime；贈券正式入口必須補 A runner 與 receipt/log/HTTP/CAS/v2、B fiscal/replay/security 及 A close/archive 的選擇性適配。A/B/C 不需等待。此批不修改原版、runtime、workflow、正式基線、其他窗、Notion；D3 仍測試候選，非功能移植完成，非正式玩家證據。

## D4-MARKET-CONTRACT｜Registry、運輸與稅額共用契約候選

D3 `bfaa6c268e6e0606b150dd0e442105124ce2d843` / tree `50e84cffa3f1529883bc2fec494778c2b60aeb20` 已通過 actual checkout 0390c66f532df39d8ea8b031d890582d91cdaae4 同 tree；CI 45851923108 job 140020214318 原始 log JS1332/1332、fail/skip/cancelled 0、Perl2456/2456(85檔)、DSL/pins success；D3 FUNCBUY ok222。D2 CI 45849832350 job140012985650 actual checkout 1e5da9c03c7d619996ce87afba45679ee2d1107b / tree 59c1bd0412937317516e4d17f09ab79aaea01ecc 同 HEAD，JS1331/1331、fail/skip/cancelled0、Perl2456/2456(85檔)、DSL/pins success；兩 source-only FUNCBUY ok1081/1082。D2/D3 已核證，不代替 D4。

固定來源 A `d533b8c876c5bba6a70f69c501dc44c1ee5d33c0`、B `383dc2704fbaf52dce583ba051a1256f60a3381d`。選擇性重建 registry 與 market core 差分（重建結果分別等 A/B 9d277441dad820aeb53d8fcb67a97ba91fc058c9、B af21f7989f17dc1d52fb3462b8284ac9e8e661dc）；不是整支或整個共用架構覆蓋。registry opt-in 預設 false，保留 P5 #13、#63 default deny、正價 default quote。保留 B projectSourceTax hook、gross cap 與 safe integer 拒絕，稅只在 receipt 不重扣買方；不接領主正式 mode。新增 #63/正價 FUNCINIT 25 個受控原版 buy-s 差分案例：同 A/B oracle blob cf8138cf804cb9cea562ff0e2ead7684e6647017（測試 harness，非 frozen CGI），只改 OriginalSparseAllPlusHarness 測試初始 #63 持有參數，預設仍 1；其 imports OriginalSparseWholesalePlusHarness ba02cee03cb7dc1b5def06cbf3dea869dd93a2b6、OriginalGiftMapUseHarness 4a81cd4b834222acdd059d9ea9a717452fc830c5 兩窗/D 相同。凍結 calc/item/whole/buy-s pins 不變。從 B market-buy test 選取具名測試及兩 import，保留 D3 全部斷言；另增 D 自有稅額 hook 介面測試，人工回傳123只驗 hook/買方扣款/拒絕，非原版稅公式證據。現有 B fiscal context、完整差分及外部 replay/HTTP 仍待後續閉包。

正式 StreetModule、HTTP、disk、workflow 未變；本批沒有啟用 #63、voucher、signed cash 或 lord fiscal 的新正式入口。需 D4 exact CI，再以共同模式選擇性接線，保留 A 關店封存、B 外部保存與稅務安全。C 玩家驗收獨立，無本機 repo，未自行執行 Node/Perl。
