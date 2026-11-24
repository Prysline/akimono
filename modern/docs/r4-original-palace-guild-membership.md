# R4 原版研究：爵位任務、公會入團及人事（2026-11-25）

只讀凍結原版及本專案既有 custom 設定，增加獨立 Perl 證據。無現代版 JS、存檔、HTTP、UI 或架構實作。上游固定 katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365。前一原版指令研究 f64d3efec5e6fb850564c0140dd68652d3a89b11 的 CI 45482684879 已通過（1198 JS、2653 Perl、92 .t）。

## 宮殿

- palace.cgi（e197a6f05c6d155e3a38aadebf92682a4b20b565）22–34：面會 UI 經營點數 >= deny_point。
- palace-s.cgi（f3a918d6fcffd435e478dce53b812a89c1429ef2）12–53：GetTownData('evt') 空/零取0；依目前任務檢查庫存，足夠才扣庫存、dignity++、int(rand(任務數)) 設全街 evt、log、DataWrite、commit。物品不足正常 render，不扣、不抽 RNG、不走 commit。處理本身未見 point 門檻。不能將 UI 門檻直接當伺服器檢查。
- 專案 custom/inc-palace.cgi blob d8ccf91ccb8978c2de542d5a19db59ca168ec47e：deny_point=20000；六項 (57,300),(68,50),(31,2000),(41,200),(53,200),(47,200)。任務不是個人欄位。原 GetTownData/SetTownData 讀寫 DTtown（pinned-custom.cgi）。
- 本測試使用實際設定及原版 handler、受控 rand、兩商店共用 DTtown；庫存為隔離 fixture，爵位顯示標籤為 fixture，非實際道具取得或完整合法玩家流程。

## 入團

- gd-m.cgi（b18dd3166709e270e5cb2d525ce404bca80551ca）4–16 edit 先 CoLock，join 再 Lock；DataRead/CheckUserPass/ReadEntry，再 RequireFile('inc-gd-entry.cgi')。ReadEntry 137–154 讀 common entry、chop/split CSV、欄位 no,tm,town,id,guild；tm < NOW 才過期（等於仍保留）；MYENTRY 是自己公會尚存索引。
- inc-gd-entry.cgi（f28cdcc1778534cbf1c84195df7ab749519be5a6）13–42 new：入會許可由總部團長或當地代表授予，依 OtherDir 選目標街道和 ID；同公會同街同 ID 不重複許可，期限 NOW+172800（48h）。若多個街道欄位同時有值，原迴圈保留最後一個，不另證合法 UI 路徑。UI gd-m 71 隱藏戰時許可；new 函式內無該事件拒絕。
- 44–67 join：已有公會或 guildbattle 活動則拒絕；按街道、店 ID 篩選，所有符合邀請先 undef，任一 guild 符合要求才成功。成功會消耗同街同店的其他邀請；不同街相同 ID 保留。過期清理是 ReadEntry，不在 join 重新比時間。
- 4–10,62–81 順序：join 先 RenewLog→DataWrite→DataCommitOrAbort→UnLock；其後 WriteEntry stage 到 COTEMP_DIR，CoDataCA→CoUnLock。即街道資料提交在共同邀請清除之前。測試真 common stage/rename/marker recovery，街道發布僅 adapter；注入 common rename failure 不是實際完整街道存檔崩潰。

## 人事與戰時差異

- gd-e.cgi（5580c540934d04316ea4f37f9ea80aa213f2d628）91–114 name：總部團長或當地代表、目標存在同公會；length <=20 字元（UTF-8 解碼後 Perl length）；寫 user._so_e。116–141 fire：同權限、同公會，不得開除總部團長，確認字串；刪 _so_e、guild=''；name/fire 未明示活動 guildbattle 限制。
- user.cgi（8e817c535d4cd17e68d65f0e2f67846a344b5094）139–150 自願退團：確認字串、已入會，刪 _so_e 及 guild；gd-e UI 29 禁戰時退團、inc-gd UI 20–34 不對總部團長顯示退團選項，但 user guild 函式未見相同檢查。
- 上述差異是隔離原版 handler 行為，不是正式部署鑑權證明。未實際登入/請求 production；不提供改動正式遊戲方式。

## 新測試
original-r4-palace-guild-membership.t：五份 frozen CGI 完整 blob hash，既有 custom/colock helper 與專案宮殿設定亦 hash 驗證；真 ReadEntry、WriteEntry、CoDataCA、宮殿 handler、gd-e/user handler；身份、街道讀寫/commit、鎖、guild 定義載入及顯示為 adapter。真 File::Temp common 文件，不改原版或任何玩家資料。不宣稱全部公會生命週期、完整原版跨程序鎖、正式持久化或 P3/R4 完成。新增 CI 待確認。
