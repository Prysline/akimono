# R4 原版反亂指令入口差分候選

來源為已鎖定的原版 army-s.cgi、army.cgi UI、plug/army.cgi、calc.cgi、_config.cgi。新增獨立 JS candidate 與 24 組實際原版完整 CGI view/handler 差分；不修改既有僱/解僱或 #22 共用經營檔。

- rebelon：輸入 rebel、2500 人、1800 秒；rebel 到 NOW+259200、RIOT 加入、治安 >5000 時乘 0.9 取整。
- rside：輸入 rebel、1200 秒、RIOT 加入，兵力不扣。lside：拒絕 RIOT、1200 秒；領主兵力加 army，其他店加 robina，從 ARMY 刪除。
- 原版 view 與 handler 條件分開：UI 有完整時間、有效反亂、是否領主、現兵力與 RIOT 限制；原版 handler 某些直接呼叫可以違反 UI 條件或產生時間債。正式玩家未開放，不可將 raw handler 的寬鬆條件當成授權。
- PushLog(3,0,...) 是真原版 join/volunteer 的模式，不是 2；既有正式 log codec 只接受 0/1/2，未經來源整合前不能直接提交這些交易。
- 原版 Perl 真執行 ReadArmy/WriteArmy 與 UseTime，身份、DataRead、commit、顯示及 l 為測試 adapter。比較多店 ARMY/RIOT 語意而非 Perl hash 順序。所有結果 committable:false，未接 HTTP/history/正式外部 EVENT；不得當成真玩家取得 2500 兵力的證據。
- 下一步需同一來源交易中接合反亂 EVENT 排序、同一 command 多 slice 讀 live/stage 行為、城鎮期末及日誌模式 3，再進正式 CAS。原版無領主時也可由非領主起兵；不虛構領主或跳過合法兵力取得。
