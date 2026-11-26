# R1 第55批：最後16列詳細證據與限制

固定前候選 `6f406e3a1ba53f66c08186bfa174108189960e98` / `0f6de9cacf0c4cabf6718b129811f3b98c98f7af`。僅覆核固定 DSL 及已審測試，沒有新 runtime 執行。

| 功能 | 原版宣告行 | 證據範圍 | 分類 |
|---|---|---|---|
| ITEM 37 | 195–207 | 受控原版 USE 與共用 memory CAS 比對 compiler、stock、receipt；明示材料消耗，不證合法取得、自然銷售或正式 HTTP/v2。 另 #79/3 受控兌換產物。 | 限定 Oracle/差分 |
| ITEM 39 | 266–276 | #39 原版三案 market-buy 差分與受控 USE 材料消耗；不升格正式取得／HTTP/v2。 | 限定 Oracle/差分 |
| ITEM 62 | 1780–1792 | #62/0 人工 stock 的廣告包消耗及自家廣告差分，不等於商會/跨店廣告、合法取得。 | 限定 Oracle/差分 |
| ITEM 64 | 2243–2255 | 受控原版 USE 與共用 memory CAS 比對 compiler、stock、receipt；明示材料消耗，不證合法取得、自然銷售或正式 HTTP/v2。 僅 #39/11，非守衛或偷竊 callback。 | 限定 Oracle/差分 |
| ITEM 11 | 2257–2269 | 受控17 EVENT 純投影與 Perl 四案逐值差分；#11 清券、每券一 draw，committable=false；非自然開獎或正式玩家。 | 限定 Oracle/差分 |
| ITEM 27 | 2445–2455 | 受控原版 USE 與共用 memory CAS 比對 compiler、stock、receipt；明示材料消耗，不證合法取得、自然銷售或正式 HTTP/v2。 不改 market-buy unsupported。 | 限定 Oracle/差分 |
| ITEM 28 | 2466–2476 | 受控原版 USE 與共用 memory CAS 比對 compiler、stock、receipt；明示材料消耗，不證合法取得、自然銷售或正式 HTTP/v2。 不改 market-buy unsupported。 | 限定 Oracle/差分 |
| ITEM 29 | 2487–2497 | 受控原版 USE 與共用 memory CAS 比對 compiler、stock、receipt；明示材料消耗，不證合法取得、自然銷售或正式 HTTP/v2。 不改 market-buy unsupported。 | 限定 Oracle/差分 |
| USE 63/4 | 1978–1986 | 來源 param 5、時間、費用、材料宣告；既有 alias metadata，沒有該 param 原版執行差分、實際施工、CAS/v2。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 63/5 | 1987–1995 | 來源 param 6、時間、費用、材料宣告；既有 alias metadata，沒有該 param 原版執行差分、實際施工、CAS/v2。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 63/6 | 1996–2004 | 來源 param 7、時間、費用、材料宣告；既有 alias metadata，沒有該 param 原版執行差分、實際施工、CAS/v2。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 63/7 | 2005–2013 | 來源 param 8、時間、費用、材料宣告；既有 alias metadata，沒有該 param 原版執行差分、實際施工、CAS/v2。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 62/2 | 1837–1858 | 基線 Registry 缺規則（已存在的拒絕測試）；原版外部／跨店依賴尚需對候選重驗，不是 runtime 缺陷確認。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 65/0 | 2027–2060 | 基線 Registry 缺規則（已存在的拒絕測試）；原版外部／跨店依賴尚需對候選重驗，不是 runtime 缺陷確認。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 65/1 | 2061–2120 | 基線 Registry 缺規則（已存在的拒絕測試）；原版外部／跨店依賴尚需對候選重驗，不是 runtime 缺陷確認。 | 僅別名／拒絕證據，不升格 Oracle/差分 |
| USE 65/2 | 2121–2150 | 基線 Registry 缺規則（已存在的拒絕測試）；原版外部／跨店依賴尚需對候選重驗，不是 runtime 缺陷確認。 | 僅別名／拒絕證據，不升格 Oracle/差分 |

精確測試 blob／行號見 canonical manifest。詳細列 204→220；其中最後8 USE 僅 alias 或 Registry absence，正向 Oracle/Node 不變。ITEM 66→74、USE108、EVENT25（含限定 metadata）；正式下界仍 ITEM7/USE12/EVENT0。220/220 只表示逐列已有詳細引用或缺口證據，絕非移植/驗收完成。#62/2 原版商會成員與人氣/日誌；#65/0 原版目標人氣及廣告 EXP；#65/1 原版機器人、賠償、庫存與 safety；#65/2 原版 target showcase 類型、kill event 八小時。均須外部候選實際驗證，不自行補規則。

## R1-HTTP-01 執行環境稽核（未實跑）

- 本容器 git 2.47.3、Node22.16.0、Perl5.40.1、npm/prove 可用；無 gh，未取得前窗 worktree。本地 git ls-remote https://github.com/Prysline/akimono.git HEAD：fatal: unable to access ... Could not resolve host: github.com；curl github.com、api.github.com、raw.githubusercontent.com、codeload.github.com 均 error (6) Could not resolve host。公開 tar 下載未成功。不能核證前窗本地未提交/未推送或備份。
- GitHub connector 可讀固定 blob、tree、CI/PR，且已成功非 force 寫入 #26；沒有可用的直接 runner/terminal、workflow_dispatch 或 repo archive→本容器檔案橋接。讀取固定 UTF-8 檔不等於已有完整可執行 checkout（#26 tree 713 entries，其中 modern/src 124檔、885439 bytes）。
- #26/base 唯一 workflow verify-modernization.yml @ 310e655c630aab3cf1d3c5248664227b854a8385：pull_request / 特定 push，Node22，npm test 只包含 tests/*.test.mjs，另 audit/demo、pins、Perl；strict 腳本不在其中。#18 專用 verify-r4-genuine-rebel.yml @ 4f99e4c677bd5f47981f27f141bc17a429141495 僅固定 external/player 命令，亦無 dispatch；不借用或寫入別窗。舊 run45851995042 無 artifacts；rerun 既有 workflow 不會執行 strict。
- 原 strict `modern/scripts/r1-http-extra-fields-repro.mjs` @ e43339680eda08d30ebc9a5c70f56635361ace12，正式 dev-local 子程序、隔離 temp disk、無 time/RNG 注入；initialize/open-shop/load 三路由 extra fields；預期 4xx、ok false、全 snapshot/磁碟不變與合法對照。靜態查閱不是 runtime 證據；未確認越權、資產注入或契約失敗。
- 可行資源：提供確切候選 SHA 的完整 git bundle/checkout archive（含凍結來源、modern 與原測試），放入可讀本地環境後核對 SHA/tree/每 blob，執行 cd modern && node --test scripts/r1-http-extra-fields-repro.mjs，保存 Node/Perl/OS、命令、stdout/stderr/exit、snapshot 及 SHA/tree；或具合法 checkout 權限的隔離 runner 執行同命令。前者不需改任何分支/CI；後者若需新 workflow/驗證分支，須另確認權限與 D 的跨窗責任，不能假定 D 有額外資源。未改一般 CI，不將預期 red 混入 green。
- 目前分類：環境受阻；不阻擋其他功能證據覆核。R5 尚未執行，無新確認 runtime 缺陷。

## C 第57批：最新 CI／R1-HTTP-01 狀態

[第57批 exact CI、缺陷及 P5 資金證據](r1-ci-defect-and-p5-funds-evidence-20261127.md)：第50批歷史紅燈保留，第51–56批一般 CI exact tree 成功（JS 0 fail，52/54/55 各1牛死亡未命中；Perl2456/2456）。R1-HTTP-01 第56批專用 CI 已實跑，3/3 拒絕契約失敗，已回報 D #27；不證資產注入。使用者指定 GitHub CI，本機 DNS 非主要阻礙。P5 六次後續成功，歷史根因仍待證；不降斷言、不改平衡。R0/R1 詳細索引與正式驗收下界不變，R5 未啟動。
