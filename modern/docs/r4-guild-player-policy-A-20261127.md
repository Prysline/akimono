# R4 公會正常玩家契約 A — 2026-11-27

使用者明示裁定：「採用 A，以原版正常玩家流程為準，保留底層差異證據，繼續移植。」延續 #18 comment 7197194489。保留 frozen handler、所有原始差分及其刻意重現的可直呼叫行為；不調整費率、平衡、資金或 RNG。此批僅 B 候選，不是 D 的正式共用 API 授權。

固定來源 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365：gd-f.cgi 4b3b8e2cb117e98aa82449c7943bb498c7ca1590，inc-gd.cgi fc29abc74d79ee282b86a05a5fa56d9ffd35aa2c，gd-e.cgi 5580c540934d04316ea4f37f9ea80aa213f2d628，gd-m.cgi b18dd3166709e270e5cb2d525ce404bca80551ca；本專案 _config.cgi 87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0 L68。gd-f 無團員且 dignity>=16 才有建會表單；建會表單無代表欄，編輯才有每街代表選單。inc-gd 總部街+ID 才有編輯入口，團長/本街軍師有人事、邀請入口，非團長有自退入口。gd-m submit 實際戰時停止顯示許可表單、表單文字「いずれか１つ」，join 戰時停止顯示。gd-e leave 戰時不顯示確認表單，但 name/fire 人事表單與 handler 無戰時拒絕，不將自退限制擴張至人事。代表或邀請目標由 ReadLetterName 的街別選項選取；不添加代表必須同公會的規則。缺失 common definition 的 join 拒絕為現代資料完整性 guard，而非宣稱原版 UI 明文檢查；保留既有 raw oracle。

新增 original-r4-guild-player-policy.mjs 是純 guard；caller 必須在 D 真實 CAS 內由已授權 session 解析 world/street/shop ID、current revision、active rows、definitions、battle state 及 current directory，不得從 HTTP body 接受 context。guard 回傳不是能力 token，不能跨 snapshot 使用，不能替代原版 projector 的 invitation expiry/confirmation/title/field 等檢查；projector 仍須在同一次 CAS 內重核所有副作用。未註冊正式 route、未實作 CAS、未新增 save authority。D 實際 wire 尚待整合，合法 ID 同號跨街不可混用。原版表單/選單本批為精確 source review，不是重新執行完整 UI Perl oracle。

本機 Node v22.16.0 / Perl v5.40.1，隔離最小閉包；原四 module blob 核對後重跑 10/10；本批三個 Node policy / composition test 通過，合計 13/13、0 fail/skip。新 src b2aefd584cc05e755ccd9467ff4ab9ea925d6ffc / test 16bfca9bbc42d827afe04c2c3c9bf8ac74064c17。測試直接使用既有 reviewed source projectors，並對照 low dignity make、battle grant、leader leave 原 handler projection 仍允許，正常流程 guard 拒絕。這是受控純 guard/組合測試，不是正式 HTTP、真 CAS、v2、完整玩家流程。既有差分不修改。後續 D 需補整合、權限/並行/restart/replay；C 獨立玩家驗收不阻擋其他來源功能。

目前父 HEAD 9ce931d66ebd9f1bca7834b4e2650a1c92b0d0ec / aa17e4ab1119b752512357f2ed99499b4db70a40。未修改 frozen source、既有 tests、workflow 或其他分支。
