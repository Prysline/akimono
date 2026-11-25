# R4 軍隊人員交易候選（新基線，尚未正式接入）

前一 #18 HEAD `1206b294fa0a8f49f90b24d0d80c9dca28863631` 的 CI 45584245130 全通過：1336 JS、2778 Perl（94 .t），19 個 JS 原版差分新增。正式 migration 仍為 8a10b5b5b860e55e62b8d41d03e6d58c430dacf6。

## 本批功能與界線

新增單店僱兵／解僱的 source-reviewed 候選，不是玩家指令註冊。輸入是明示來源 fixture、同 revision 的世界／指令與軍隊檔案 bytes（null 只表示 fixture 明確缺檔）。同一結果產生完整商店變更、兵力檔案 bytes 與交易 receipt，拒絕不修改輸入。重用原版 army wire codec，不另造檔案格式、存檔或交易權威。完整凍結 army-s、army、calc、專案 config Git blob 核對。

- 僱兵：爵位*1000-現兵數、平時1000/反亂1500、現金/數量/容量裁切、固定2400秒；不計 paytoday。解僱：最多現兵數、600秒、不退款。
- 原版 handler UseTime：已有時間債拒絕，72h 上限裁切，起始恰好零秒可耗成負存量；UI 的完整時間條件另有差異。本候選只對 handler，不宣稱合法 UI 玩家流程。僅正整數 requestedCount；拒絕未審閱的數字字串、事件上下文、非單店等。
- 真 Perl probe 執行凍結 CGI 與 CheckCount/UseTime/ReadArmy/WriteArmy，17 案（包含金額/容量裁切、0爵位、負資金、時間債/72h、缺檔、stale IDs、解僱）。外層 identity、街道 lock/commit 為 adapter；真隔離 stage bytes 與 live 未改動驗證。Node 比對實際 Perl output，不用自行預期公式替代來源。新增19個 JS 測試候選。

## 正式接線尚有阻塞

P3 正式 source disk v1 只接受固定空公會與現有檔案集合；v2 history 僅接受白名單普通/時間指令；source-reviewed time 單店無公會且不支援 external event。現無已驗收玩家爵位取得路徑與軍隊狀態來源 lineage。不能注入兵力／爵位當合法取得，也不能直接放寬白名單。新候選明示 committable:false，測試現有 GameCore guard 和 ordinary history 均拒絕它。未接入正式存檔、HTTP、UI、CAS、時間週期。下一批需要爵位任務共享 evt 來源、合法物品取得/容量與分數門檻、軍隊來源 file generation 及歷史重播、完整正負向驗收。新增 src 檔會影響既有 conservative runtime fingerprint，舊不相容 v2 仍拒絕，不做靜默遷移。

不修改既有 P3 程式或原版；新 CI 尚待驗收。
