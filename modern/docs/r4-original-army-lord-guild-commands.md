# R4 原版指令研究：軍隊、領主、公會（2026-11-25）

研究範圍僅凍結原版，不修改現代版 JS、存檔、HTTP、UI，不提出新版實作。固定來源 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。先前 rebel NOW、guildbattle END、army 檔案和期末已有原版測試，本次補指令入口，而非重做期末。

## 軍隊 army-s.cgi（6f457b78f530e37aa0ff4074358a57797f5087e2）
- 29–49 plus：爵位點數*1000-現有兵力為容量；平時每名1000、反亂1500；先 UseTime(2400) 再 CheckCount 與現金裁切；只扣 money 不寫 paytoday。
- 51–63 fire：數量裁至現有，耗600秒，不退款。原版 UseTime 只拒絕起始時間不足（已超過 NOW），可耗成負存量；UI ArmyFire 另檢查完整600秒。
- 65–79 rebelon：確認字串、兵力>=2500、耗1800秒；rebel=NOW+259200、RIOT[id]=1、安全>5000 時乘0.9取整。UI army.cgi 27–32/119–125 另限制無活動反亂、非領主及完整時間；不把 UI 條件誤稱本函式內檢查。
- 81–113 rside 耗1200秒，設定 RIOT 不扣兵；lside 拒絕已反亂者，耗1200秒，領主自己派兵加 STATE.army，其他店加 robina，移除 ARMY[id]。UI 另要求有兵、活動反亂且未加入。
- 5–18 Lock→DataRead→CheckUserPass→ReadArmy→指令→WriteArmy→RenewLog→DataWrite→DataCommitOrAbort→UnLock。ARMY/RIOT 的原版 stage 由 plug/army.cgi 真執行。

## 領主 lord-s.cgi（8754dabf130a521aa243fc0568910d5f52523362）
- 20–45 inside：半形數字，稅率<=40，開拓/治安預算各<=10000000；修改 DTTaxrate、STATE.devem、safem；不即時扣城市資金。期末實際扣款在 inc-period.cgi 142–144。
- 47–65 outside/outdel：反亂中拒絕，護衛軍單價1200，用 STATE.money 購買，數量裁切；解僱不退款。沒有 UseTime。
- 67–99 taxside/treset：目標存在；free=1、double=2、其他刪 taxmode；treset 刪所有店欄位。
- 101–114 expose：反亂中拒絕，目標存在，城市資金>=1000000、目標人氣>=2000；扣城市資金1000000、人氣取整/10、治安+500 上限10000。UI lord-f.cgi 68–92 另要求正規軍>=2000，該數量檢查未在 expose 函式內出現。lord-f.cgi 7 檢查領主身份，lord-s.cgi 入口僅明示 CheckUserPass；完整外層路由/授權尚未證明，不據此宣稱可由真非領主玩家執行。
- 5–15 共同尾段 RenewLog→DataWrite→DataCommitOrAbort，未直接寫 army 檔。

## 公會 gd-s.cgi（2b743fdab85b897ba6a621f100df656f884ab29b）
- 28–40 fund：用 CheckCount 裁至店現金，必須剩>=100000，EditGuildMoney 增加金庫及 in，店 money 扣、paytoday 增。UI inc-guild-cmd.cgi 17–18 額外顯示門檻為店現金>=200000。
- 42–78 break：稱號 _so_e、完整10800秒存量；UseTime 先於目標檢查；只能攻擊比自身金庫多的公會。powerdeg=atk-def+int(rand(50))；正值才有 attack=int((目標money+1000000)*powerdeg/1600)。無論攻擊成功與否 atk*0.9、目標 def*0.8 取整；成功目標扣 attack、自方入 int(attack*0.9)，店獎金 int(attack/10)+1000 加 money/saletoday；可能超過目標金庫。負金庫立即 unlink common/<guild>.pl（不等街道 commit），自方 def*1.5 上限1000。
- 80–97 force：公會總部領導或當地代表、稱號、完整3小時；atk>990 拒絕（耗時在檢查之前）；直接扣 int(money/4)，不是 EditGuildMoney，out 不增；atk 加 int(扣款/25000)，上限1000。原版使用拼寫 $ckeckok 的 package global 而非宣告的 lexical $checkok；測試每個獨立命令情境需重置它。
- 8–23 Lock→DataRead→CheckUserPass→入會檢查→ReadGuild→ReadGuildData→指令→WriteGuildData→RenewLog→DataWrite→DataCommitOrAbort→UnLock。

## 證據與限制
新增三份 exact 原版 CGI，完整 Git blob hash 檢查。original-r4-command-source.t 執行完整三份 CGI body、實際 calc/army/guild 原版 helper，受控 rand、隔離檔案；身份、初始 DataRead、公會定義載入、正式 DataWrite、commit/lock/render 是 adapter。真原版 army/guild stage 寫出及負公會金庫 live unlink 有驗證。拒絕後記憶體暫態變化不等於正式存檔已改。測試不是合法 UI 玩家流程、完整鑑權或跨程序 commit。CI 候選，未宣稱通過。
