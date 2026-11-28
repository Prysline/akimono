# R4 公會正常指令來源包（2026-11-27）

復用既有 pinned-gd-s.cgi 2b743fdab85b897ba6a621f100df656f884ab29b、pinned-guild.cgi 6593aa8a3ae4a1695c2418f12a3776f0053454ac、calc.cgi 586354a9a300e26d0e12a4efa512fa25760e3197。既有 original-r4-command-source.t 已實際執行原版 fund/force/break；本次補缺的 JS 功能，而非擴大驗收。

fund: 依原版裁量，保留100000、金庫 in/店 paytoday；不耗時。force: 團長/本街代表且稱號及3小時，金庫直接扣四分之一，非 out，atk 上限1000。break: 稱號及3小時、目標金庫較高、原版 rand(50)、攻防衰減、成功分配/獎金、負金庫刪定義 intent。保留原版兩參數 PushLog 獎金呼叫及原文 message keys/args，不重建 locale。正常 UI donation 顯示門檻200000 與 raw handler 留100000不同，D 依既定正常 UI policy 做入口；本包非鑑權或發布，definitionRemoval 只是已知公會 code，不直接刪檔。無新增收費/平衡規則。

新直接原版 handler differential 5 cases，實際 ReadGuildData/EditGuildMoney/WriteGuildData 與隔離刪檔；街道/鎖/locale/log/pub adapters。既有 3 套 source tests 不變，CI 待驗。無需等待 C 正式玩家流程才做下一功能。D 使用同一權威接入，不另開 API/CAS。
