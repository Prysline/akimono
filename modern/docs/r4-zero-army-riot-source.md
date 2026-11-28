# R4 零兵力 RIOT 邊界

原版 plug/army.cgi WriteArmy 僅刪除 ARMY 的零值與過期店號，不刪除 RIOT。下一次 ReadArmy 可合法讀到 RIOT 存在而沒有 ARMY key。inc-rebel-data.cgi NOW 將 undef 放入暫態 DT.army，數值減法視其為零；即便零兵力，該 RIOT 仍增加 time 的護衛軍消耗。不得提前刪除 RIOT 或製造零兵力值來掩蓋 undef。

新增四次實際原版 NOW、WriteArmy、DataCommitOrAbort、ReadArmy 連續差分：兩店反亂兵 4000/500、護衛軍10000，第一期清除第二店 ARMY，第二期觀測原版 undef（JSON null）、仍有 RIOT，第四期鎮壓時清空 RIOT。比較 raw DT、事件、城市、RNG、log 與磁碟語意。DT.army 不在原版 DTindexnamelist，不寫入正式 play 欄位；仍保留等兵力排序拒絕、正式外部 EVENT 拒絕與 noncommittable 限制。新 CI 尚待驗證。
