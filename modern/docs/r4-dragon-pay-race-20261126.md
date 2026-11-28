# R4 龍族付款：跨程序來源競態候選（2026-11-26）

`original-r4-dragon-pay-race.t`：四個 SHA 固定原版 blob，實際 fork、pipe、街道 Lock、共同 CoLock、WritePayLog、CoDataCA、DragonBalance、檔案 rename/unlink。唯一介入為在 consumer 真正 unlink 前設置同步點；街道啟動 abort adapter 不執行任何街道寫檔。不是完整遊戲流程或玩家驗收。

預期斷言：consumer 讀取 500 後尚未 unlink；producer 持獨立 common lock 再 append 500 並完成 common commit；consumer 仍只入帳 500 卻刪掉包含兩筆的 live file。相同街道相同店號相同金額可能是兩筆合法付款，不可用內容雜湊當唯一 operation ID。不同街道同店號不應互相消費。

現代候選必須防止先消費後發布、重複付款、跨街道誤認、同額付款誤去重及 crash 後半套發布。下一步先以共同 revision/producer identity + 持久化 receipt 建立安全協議，再接正式多店 session/CAS 與 period save/replay。此測試描述原版缺陷，不代表已修好現代 runtime，待實際 CI 確認。
