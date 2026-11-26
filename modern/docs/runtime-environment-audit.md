# R4 執行環境依賴稽核（D 窗，獨立工作線）

日期 2026-11-27（UTC+8）。稽核基準 D9 HEAD 6fbae2dfd77852d52c71a1ef79e186fa452c12cc / tree fea7ac12abd4ee0a1463f449171a0c9460bf9844。這是環境與相容性工作，不是遊戲平衡、移植完成或正式玩家驗收門檻；A/B/C 不等待本稽核。現階段保留 Perl，不改原版、不略過歷史與 checkpoint，不改正式基線。

## 目前直接與間接依賴

逐檔檢索固定 D9 的 modern/src、modern/scripts 共 163 份 .mjs（child_process、Perl executable、seed 等字面）；找到下列直接呼叫。下方行號是 D9 快照，後續以工具更新。判定 reachability 依實際入口與呼叫者；不把放在 src/ 的研究投影一概當玩家可用功能。

| D9 路徑與函式／行 | 階段 | 依賴與界線 |
|---|---|---|
| src/reviewed-history-checkpoint-store.mjs:53–65 fingerprintReviewedCheckpointRuntime | 所有 dev:local 啟動 | execFileSync('perl',['-MConfig','-e',...])，回傳 $^V/archname，3 秒上限。即使沒有既有存檔也必須取得，並非僅 Oracle。 |
| src/original-r4-perl-hash-replay.mjs:56 resolveR4HashOrders | 非跨期時間及重播 | 原生 %EVENT/%DTevent keys()、插入、刪除，JSON::PP/Config，固定 PERL_HASH_SEED 與 PERL_PERTURB_KEYS=0。 |
| 同檔:103 resolveR4CommandHashOrders | 跨期時間及重播 | 一次 command 的 1–2 slice hash mutation 在同一原生程序重建；不得每片重新排序。 |
| src/original-r4-close-archive-hash.mjs:92 resolveR4CloseArchiveHashOrders | A 關店來源候選，D9 未正式接線 | 原生 DataRead numeric maps、依 shelf sale mutation 序列化，固定 seed、Config/JSON::PP；不是現有啟動必須執行的 callback。 |
| src/original-r4-close-shop-effects.mjs:156 projectR4CloseShopEffects | fullCommerce 關店候選，D9 未正式接線 | fractional costtoday 以 Perl NV string conversion；不能用 JS Number.toString 任意替代。 |
| scripts/demo-original-natural-sale-plus.mjs:31；demo-original-nayuta-functurn.mjs:34；demo-original-sparse-all-plus.mjs:29 | Oracle／示範 | 各呼叫原版 .pl，不是 dev:local 必要路徑。 |

D10 新增 runtime-environment.mjs 集中既有 Config 指紋呼叫與最小 native hash smoke；check-env.mjs 是獨立工具，dev-local.mjs 在來源與存檔開啟前檢查。並未把 Perl 移出 runtime。原版 .cgi/.dsl 作為 source text 讀入及 pin 審閱，不代表以 CGI server 執行。未審閱的 A/B 新版候選需在各包接線時重掃，不能用 D9 無呼叫推論所有未來功能無依賴。

## Oracle、差分與其他環境依賴

- D9 tree：modern/tests 159 .mjs（含支援／非預設巢狀測試），85 .t、91 .pl、13 .pm。159 份 .mjs 全部掃描，98 份有 Perl executable 或 hash env 字面命中（包含純 Oracle、直接 hash 測試及混合 HTTP/Oracle，非 98 個純 Oracle；字面掃描不等於動態 reachability）。另有 33 份 dev-local/genuinePlayer 字面候選（含 helper 與靜態 UI 讀檔，非 33 個真 HTTP 測試）。
- npm test = node --test tests/*.test.mjs；其中原版差分以 execFileSync('perl', probe) 等執行，HTTP/保存測試透過 dev-local 或 genuine-v2-player 間接需要 native Perl；單純 DSL 及 JS projection 不必然執行 Perl。不能把所有 Node 測試當無 Perl 單元測試，也不應因缺 Perl 把全部測試 skip。
- prove -v *.t（在 modern/tests/original-perl）執行原版隔離 Core；.pl/.pm 是探針／測試支援，凍結 .cgi、DSL 不改；Test::More、Test::Harness、Digest::SHA、File::Temp、Storable 等屬測試用途。原版根 README 的 Locale::Maketext::Lexicon 為原 CGI 部署需求，不是本次 native runtime helper 的依賴。
- npm run audit:runtime-deps：Node-only、唯讀、可重掃所有 src/scripts/tests 的 JS，列出直接 executable、Perl env、child_process、間接 HTTP/fingerprint/hash 文字命中行號，以及 .t/.pl/.pm 逐檔與 use/require 模組字面清冊。未知呼叫標記 review-needed；不是 parser 或動態 dependency proof，不保證 regex 找到任意拼接、alias 或外部插件。可用 npm run --silent audit:runtime-deps > /tmp/akimono-runtime-deps.json（Windows 可另存暫存目錄）。不執行 Perl、不碰存檔、不作為其他移植的開工門檻。
- 現有 CI ubuntu-latest / Node 22，npm test、DSL audit、demo、git source pins、prove；D7 原始日誌 1345 Node / 2456 Perl（85檔）通過。D8/D9 另跑，環境稽核不取代其功能 CI。POSIX FIFO 測試需要 mkfifo，Windows 原測試明示 skip；Windows ACL、rename/fsync、source LF、原生 hash/NV 與完整 Windows 回歸仍需實機驗證。Linux 目前是 CI 的完整驗證平台。

## Hash、RNG、replay 與 checkpoint 不可混淆

- Native hash seed：r4HashSeed 以 SHA-256(R4_HASH_POLICY, worldId, revision, nowSeconds, minutes) 取 32 hex；hash traversal 由原生 Perl、固定 seed 和 perturb=0 決定。normal-turn-candidate 呼叫 resolveR4HashOrders；cross-period-candidate 呼叫 resolveR4CommandHashOrders，跨片保留 hash mutation；JS object/Map insertion order 或 alphabetic sort 都不是等價證據。固定 seed 是本機政策，不是聲稱歷史 CGI 使用該 seed。
- RNG：local-source-command-draws.mjs / r4-time-command-draws.mjs 是 Node crypto SHA-256、48-bit rejection sampling、命令／world/revision/時鐘／參數域；單位 millionth、彩票原範圍、消耗順序。不是原生 Perl rand() stream，也不需執行 Perl 產生樣本。不可換 Math.random、改 sample range/消耗順序或用不同事件順序偷換結果。
- 歷史：reviewed-world-time-history.mjs 保存 draw/hash policy、seed、interpreter、完整 event permutations、draws/ranges/effect/after digests；replayReviewedTimeHistoryEntry 重新執行 GameCore 及 CAS，比對 trace 與世界，不是只信存入的 order。ordinary command 也重新驗證來源與樣本。
- Checkpoint：fingerprintReviewedCheckpointRuntime 原 SHA256 輸入含 FORMAT、Node process.version、全部 src/*.mjs 的 bytes hash、entrypoint bytes、source inputs；Perl interpreter 另存 $^V/archname。retained prefixes、HMAC、source fingerprint、hash/draw policy、revision/generation/lineage 等驗證不變。版本/架構字串不保證相同 Perl build 的 hash/NV 行為完全一致；此次 smoke 只測當前程序重現性。資料跨 Node 版本、OS、Perl 版或 arch、程式變更不保證可讀；CRLF 來源輸入已於 dev-local normalize，runtime JS bytes fingerprint 仍可能不同。
- 環境修正新增/修改 src 與 entrypoint，按既有政策會改 sourceFingerprint；已有 authenticated checkpoint 可能無法由新 runtime 驗過，fresh history 仍須全重播。保留完整原存檔目錄（兩 slot、key、retained prefixes、immutable generations）、原版本與原環境；不要刪 key、改 fingerprint、重算/偽造 HMAC 或刪舊世代求通過。需跨版本遷移時另以原始環境 replay + 審閱遷移提案處理，不自動開放。
- Node crypto 與 filesystem 亦為真 runtime 依賴；本機信任邊界為單一可信 OS 帳號、可讀 key 的程序不在威脅邊界內。用本機可寫、私有目錄、避免網路磁碟/跨 OS 共享、symlink/hardlink；Windows 設適當 ACL，Linux checkpoint dir/key 保持 0700/0600。現有 Windows 跳過 directory fsync/POSIX mode 的平台分支，並非完整 durability 等價聲明。

## 安裝與啟動

在 Windows 與 Linux 都要 Node.js >=22 / npm、同一執行環境內可由 Node execFileSync('perl',...) 直接找到的原生 Perl，Config / JSON::PP。Git 用於取得程式碼與來源 pins 稽核；現有 package.json 無第三方 npm dependencies，無須為缺 Perl 反覆 npm install。尚未固定支援的 Perl 最低版本或跨平台等價矩陣；原 Oracle README 以 Perl 5.40 為測試環境，推薦與既有存檔／驗證機保持同版同 build。同版本字串不等同跨 OS 相容。

Windows（PowerShell）：
1. 由 https://strawberryperl.com/ 安裝與 OS 架構相符的 Strawberry Perl（Perl 官方安裝指引 https://learn.perl.org/installing/windows.html）。安裝後關閉、重開 PowerShell／VS Code terminal。若 PATH 未更新，加入實際安裝的 perl/bin，例如 C:\Strawberry\perl\bin（依安裝位置調整）；不靠 PowerShell alias、WSL command 或 .bat wrapper。
2. 執行 node -v、npm -v、Get-Command perl -All、where.exe perl、perl -v。多份 perl 時確認同一個 native executable 順序；不要混用 Git Bash/MSYS/WSL 的 Perl 與 Windows Node。
3. 在 repo 的 modern/ 執行 npm run check:env，再 npm run dev:local，開 http://127.0.0.1:4173。若 PowerShell execution policy 擋 npm.ps1，可執行 npm.cmd run check:env / npm.cmd run dev:local（不是放寬 OS 安全設定）。
4. 獨立跨期候選使用新的明確目錄；例如 $env:AKIMONO_REVIEWED_CROSS_PERIOD='1' 與 $env:AKIMONO_SAVE_DIR='C:\akimono-local\r4-new'。D9 market 候選另有 AKIMONO_REVIEWED_MARKET_COMMERCE=1，非預設必要。不要把 Windows 與 WSL 指向同一份既有存檔。WSL 可行的替代是整套 Node/npm/Perl/Git 在 Linux 環境內安裝並使用 Linux 本機 save dir，而不是 Windows Node 呼叫 wsl.exe。
5. 若要 Oracle：npm run check:env -- --oracle；npm test；在 original-perl 目錄用 prove -v *.t（如 shell wildcard 不展開，可用 prove -v 逐檔或 Linux/WSL 完整 CI）。未在 Windows 實機核證全套；缺 Perl 不該略過既有測試。

Linux（Debian/Ubuntu 範例）：
- sudo apt update && sudo apt install perl git（Node 22+ 依發行版或 nodejs.org 安裝）；node -v；npm -v；command -v perl；perl -v。
- cd modern；npm run check:env；npm run dev:local。需要新跨期候選：AKIMONO_REVIEWED_CROSS_PERIOD=1 AKIMONO_SAVE_DIR=/path/to/new-private-directory npm run dev:local。
- Oracle：npm run check:env -- --oracle；npm test；(cd tests/original-perl && prove -v *.t)。完整測試需 coreutils 的 mkfifo 等 POSIX 工具；Git source pin 稽核及 CI 依現有 workflow。不要以 root 身分執行玩家 server。

## 前置檢查與拒絕

npm run check:env 驗 Node major >=22、原生 perl -MConfig 指紋、JSON::PP 與固定 seed 的插入/刪除遍歷兩次可重現；不啟動 HTTP、讀存檔或產生 key。--oracle 另檢查常用核心模組，不代表全套 Oracle 已通過。dev:local 直接執行同一檢查，失敗在 HTTP listen 和 save store 初始化前報錯、非零退出；指紋仍在 checkpoint store 實際計算。錯誤區分缺執行檔 PATH (ENOENT)、權限、timeout、子程序失敗、指紋與 hash 異常；保留原失敗 cause。安裝 Perl 不意味舊 save 自動相容，不引入任何 skip 或 fallback。

## 長期限縮 Perl 至 Oracle：可行性與退出條件（研究，不是現在要求）

方向可行但尚不能宣告原版等價。必須先把 native hash traversal 與 NV formatting 做成獨立、版本化、可差分的兼容契約，現有 runtime 仍使用 native Perl。先固定參考 Perl build/version/hash algorithm（包括 seed bytes、bucket/resize、插入刪除、DataRead wire、重複鍵/過期與跨片 mutation），累積兩平台固定 seed permutation、真原版 EVENT/外部/關店 trace。評估純 JS 或 WASM 等實作；不能只把 hash key 排序，也不能僅保存舊 permutation 然後信任玩家提供的 trace。NV→文字必須涵蓋 fractional upkeep、科學記號、精度與原版封存 bytes。

並行以原版 Oracle 差分對新 backend：全合法 EVENT subset、manual/rebel 交互、同 command 多片及刪除/重插、售出累加與 archive bytes、RNG draw order/ranges、收益與副作用、拒絕與 CAS、完整 replay/v2 restart/checkpoint/雙世代故障回復、Windows/Linux CI。跨實作 fingerprint 與舊歷史如何重播需獨立遷移規約、保留舊環境與原 HMAC 安全，不能單純改 interpreter 為固定字串。只有經原版一致性、必要整合與獨立版本授權後才切正式 backend；到時 Perl 可留在來源研究/差分與舊版回復工具。若無法忠實模擬 hash/NV 或重播，保留 native Perl 為合理選擇。此研究不阻擋 A/B/C，也不是改平衡的理由。

## 驗證紀錄

本批新增環境正向與缺 PATH 的負向測試；CI exact HEAD 待取得。已在獨立 Linux 工具環境確認 Node v22.16.0、Perl v5.40.1/x86_64-linux-gnu-thread-multi、上述常用 modules、prove、mkfifo 可用；本機 git clone/ls-remote DNS 失敗，無完整 repo，不能宣稱全套本機驗證或 Windows 實機已通過。
