# R4 新基線第二批：原版軍隊／共同檔案隔離驗證候選

## 起點與已驗收證據
- #16 固定 6664d60af29b4974f9386bf5c97ce09cdd477637，CI 45576804253 通過 1198 JS / 2774 Perl（94 .t）。公會缺列與空列重讀修正實測通過。
- #18 入場 19f35989b659fdfb3279e6cf4770d3fa6b72b322，CI 45577006632 通過 1317 JS / 2778 Perl（94 .t）。這是來源證據入場，不是正式外部功能。
- migration 已由 #19 更新至 8a10b5b5b860e55e62b8d41d03e6d58c430dacf6。與 3b927866b4749aad3ffc583a9cf12bf3fb9eb783 相比只有 14 個 Markdown 路徑；#19 CI 45577439072 成功。以真正 merge parent 將最新 migration 同步入 #18 工作分支，保留34個已驗收入場檔；不合併 #1/#16，不修改 migration。
- 本批新增以下四份精確 blob，既有正式程式不改。除本批補上的 army module，全部11個直接 JS 匯入依賴核對相同；原版測試 fixtures 已於第一批移入，其餘必要來源由 CI 再驗證。

- `modern/src/original-r4-army-files.mjs` — `c04fd7806b44ab8dfb802874558d7715022abe09`
- `modern/tests/r4-source-rebel-army-disk.test.mjs` — `cb3867a7359620aa12637eb04c4e50ccdc7178b7`
- `modern/tests/r4-source-external-joint.test.mjs` — `81888f1c1f0f35565b85ca5d8b95cd554d2b8e28`
- `modern/tests/r4-guild-peer-buy-source.test.mjs` — `919611f9c179ba2325ffa5d76e0a915e640825dd`

## 驗收邊界
army module 只操作特定 File::Temp/os.tmpdir 命名的隔離 sandbox，source review/回傳 committable:false；包括原版兩行 army wire、RIOT 與 stale ID、NOW 讀 live 而非 stage、marker/abort/recover、跨軍隊/公會/城鎮三檔共同測試。公會 peer buy 差分屬 test-only 計算及現行中性報價對照，非正式公會交易指令。未掛入 GameCore、WorldState、HTTP、v2 save/replay 或 UI。新 CI 必須另驗收，不能引用舊 #1/#16 綠燈冒充本批結果。

## 下一步
從新基線審閱外部狀態的來源身份、revision、歷史驗證及持久化發布契約；只做可獨立驗收的最小正式功能片段。保留未知事件 fail-closed、普通多架、單店單架 opt-in 跨期、唯一 v2 權威。禁止無來源初始化、隱式舊存檔遷移、外部副作用先行發布、將隔離投影標為可正式提交。R4/R5/R0/R1 未結案。
