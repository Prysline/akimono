# R1 逐項功能證據：P4／P5 真時鐘玩家（第一批）

固定正式 base `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；已確認整合 CI 45765900966（HEAD `b40dec8bfd28f6e655e48f5068c5ba280d5513b8`、checkout tree exact）P4/P5 全通過、0 skip。這是來源證據連結補強，不是新 gameplay 或完整 feature 驗收。14 欄框架已套全部 220 rows，未覆核欄維持 null。ITEM registry 只表示 market-buy；製作型商品可 lawful acquisition 即使 registry=false。

## ITEM 13

- 取得／行為：來源市場正 PLUS 後 0 價/600s/limit1 購入，持有後 street cap 阻止再供貨；不可上架；2 世代持有
- 共用命令：market-buy; edit-showcase deny
- 條件與拒絕：零價、庫存、架號、revision、transport；無 UI browser assertion
- 時間／RNG：市場 PLUS、持有 cap
- 證據：`modern/tests/p5-book-work-v2-player-http.test.mjs` L89–154 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L165–172 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L195–208 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L228–246 @ `97a9b57a8f51f72643f363d3bc21370323428be9`
- 限制：不宣稱市場以外回呼或全 ITEM 驗收。未證明 UI、完整原版差分或其他未列分支。

## USE 13/0

- 取得／行為：合法 #13 持有；3000/次、normal7200/peddle4800、time clipping、資產/EXP 不變、inline logs
- 共用命令：use-item
- 條件與拒絕：無書、時間不足、非法 count/資產/亂數；合法 effectiveCount
- 時間／RNG：0 RNG draws per work
- 證據：`modern/tests/p5-book-work-v2-player-http.test.mjs` L30–58 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L139–152 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L159–172 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L195–208 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L228–246 @ `97a9b57a8f51f72643f363d3bc21370323428be9`
- 限制：無獨立逐 USE Perl 差分/UI；v2 history 命令與資金回放。未證明 UI、完整原版差分或其他未列分支。

## USE 13/1

- 取得／行為：合法 #13；10000/次、normal14400/peddle9600、保留書/EXP、兩 inline logs；收入支持超過非工作資金上限的合法購買
- 共用命令：use-item
- 條件與拒絕：缺書、非法 count/亂數/資產、stale revision
- 時間／RNG：0 RNG draws
- 證據：`modern/tests/p5-book-work-v2-player-http.test.mjs` L30–58 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L139–172 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L195–218 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L228–246 @ `97a9b57a8f51f72643f363d3bc21370323428be9`
- 限制：無逐 USE Oracle/UI。未證明 UI、完整原版差分或其他未列分支。

## ITEM 25

- 取得／行為：市場先買2牛，street cap=2；券與期末獎換到10，持有、自然販售、maintenance、雙代持有
- 共用命令：market-buy; use-item #79/4; edit-showcase; advance-reviewed-world-time
- 條件與拒絕：初始0、合法市場2、阻額外購買、持有10；保留已發生死亡的單獨證據
- 時間／RNG：自然販售與 maintenance；死亡另測
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L158–209 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L218–233 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L244–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-death-and-save-security.test.mjs` L37–91 @ `18dd2835d4c96e7065c5cae267aeed8fdb37730d`
- 限制：單店來源；不宣稱所有牛事件或多架。未證明 UI、完整原版差分或其他未列分支。

## ITEM 26

- 取得／行為：由 #25/0,1 產奶，不從市場購買；合法庫存、消耗、自然販售與維持費，兩代 replay
- 共用命令：use-item #25/0,1; edit-showcase; advance-reviewed-world-time
- 條件與拒絕：產量界限、牛數、EXP、時間、rank/ferment
- 時間／RNG：自然販售與 maintenance
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L52–77 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L205–239 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L243–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：市場 registry unsupported 仍保留；不等於整個 ITEM unsupported。未證明 UI、完整原版差分或其他未列分支。

## ITEM 35

- 取得／行為：五牛與15奶合法 #26/1 產優格2，吃/再製/自然販售/maintenance、兩次重啟持有
- 共用命令：use-item #26/1; use-item #35/0; edit-showcase; advance-reviewed-world-time
- 條件與拒絕：牛 NEED 不消耗、奶-15、產物+2、食用-1
- 時間／RNG：自然販售與 maintenance
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L78–94 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L217–236 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L239–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：market-buy 未註冊；不宣稱全部回呼。未證明 UI、完整原版差分或其他未列分支。

## ITEM 36

- 取得／行為：十牛與15奶合法 #26/2 產起司1，吃/再製/自然販售/maintenance、兩代持有
- 共用命令：use-item #26/2; use-item #36/0; edit-showcase; advance-reviewed-world-time
- 條件與拒絕：9牛拒絕，10牛 NEED 不耗、奶-15、產物+1
- 時間／RNG：自然販售與 maintenance
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L78–94 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L218–236 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L239–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：market-buy 未註冊；不宣稱全部回呼。未證明 UI、完整原版差分或其他未列分支。

## USE 25/0

- 取得／行為：合法牛，普通擠奶；產量≤count*cows、死亡扣牛、EXP+10/count cap、action time、draw count+1
- 共用命令：use-item
- 條件與拒絕：缺牛、0/小數 count、stale revision、client RNG 拒絕
- 時間／RNG：count+1 server draws；action clock asserted
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L52–77 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L190–206 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L237–238 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L255–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-death-and-save-security.test.mjs` L93–108 @ `18dd2835d4c96e7065c5cae267aeed8fdb37730d`
- 限制：未逐項 Perl/UI；自然死亡專測為25/1。未證明 UI、完整原版差分或其他未列分支。

## USE 25/1

- 取得／行為：合法牛，強力擠奶；產量≤2*count*cows、死亡扣牛、EXP/time/draw count；死亡後合法補牛重啟另證
- 共用命令：use-item
- 條件與拒絕：缺牛、合法產量與 count clipping 的 fresh test
- 時間／RNG：count+1 server draws
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L52–77 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L208–233 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L243–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-death-and-save-security.test.mjs` L37–91 @ `18dd2835d4c96e7065c5cae267aeed8fdb37730d`
- 限制：死亡須實際觀察；exact CI 45765900966 觀察1次。未證明 UI、完整原版差分或其他未列分支。

## USE 26/0

- 取得／行為：合法奶飲用 1/10/30，milk-count；rank <10上升、10不變、30下降；兩代完整世界 replay
- 共用命令：use-item
- 條件與拒絕：持有奶，正常用量；rank cap10000
- 時間／RNG：<10 draw1，>=10 draw0
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L96–110 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L237–239 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L260–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：無 UI/獨立 Perl 差分。未證明 UI、完整原版差分或其他未列分支。

## USE 26/1

- 取得／行為：五牛/15奶→優格2，牛 NEED 不耗；4牛與奶不足拒絕；兩代保存與重製
- 共用命令：use-item
- 條件與拒絕：NEED 與材料負例
- 時間／RNG：未獨立量測此 USE RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L78–87 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L205–217 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L239–243 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L253–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-death-and-save-security.test.mjs` L55–87 @ `18dd2835d4c96e7065c5cae267aeed8fdb37730d`
- 限制：死亡後缺牛且足奶另測；非全部材料分支。未證明 UI、完整原版差分或其他未列分支。

## USE 26/2

- 取得／行為：十牛/15奶→起司1；5/9牛拒絕；牛不耗，奶不足拒絕；兩代保存與重製
- 共用命令：use-item
- 條件與拒絕：5/9/10 cows、milk gate
- 時間／RNG：未獨立量測此 USE RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L78–87 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L208–229 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L239–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：無獨立 Perl/UI。未證明 UI、完整原版差分或其他未列分支。

## USE 35/0

- 取得／行為：合法優格，食用扣1，兩次重啟後食用
- 共用命令：use-item
- 條件與拒絕：持有>0、stock-1
- 時間／RNG：未獨立量測此 USE RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L89–94 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L230–236 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L260–266 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：未證明完整食用 callback 效果。未證明 UI、完整原版差分或其他未列分支。

## USE 36/0

- 取得／行為：合法起司，食用扣1，兩次重啟後食用
- 共用命令：use-item
- 條件與拒絕：持有>0、stock-1
- 時間／RNG：未獨立量測此 USE RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L89–94 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L230–236 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L260–266 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：未證明完整食用 callback 效果。未證明 UI、完整原版差分或其他未列分支。

## ITEM 78

- 取得／行為：正價市場買入，轉職指南被消耗，peddle job 兩代 replay；P4 cow 路徑另證
- 共用命令：market-buy; use-item #78/12
- 條件與拒絕：錯價0拒絕、正價買入、stock0/job
- 時間／RNG：未單獨驗 ITEM FUNCTURN
- 證據：`modern/tests/p5-book-work-v2-player-http.test.mjs` L154–166 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L200–208 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L212–234 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：持久化是轉職結果與 history，非指南仍持有。未證明 UI、完整原版差分或其他未列分支。

## USE 78/11

- 取得／行為：合法買指南，轉 cow、guide0，milking 3600→2400、job持久化
- 共用命令：use-item
- 條件與拒絕：正向 job 與時間折扣；完整 EXP transfer 尚需逐項
- 時間／RNG：未獨立量測 RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L212–216 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L230–234 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L260–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：不宣稱全部職業或完整 EXP 轉移。未證明 UI、完整原版差分或其他未列分支。

## USE 78/12

- 取得／行為：合法買指南，轉 peddle、guide0，工作7200/14400→4800/9600；job兩代保存
- 共用命令：use-item
- 條件與拒絕：正向 job、time rate；零價指南拒絕
- 時間／RNG：未獨立量測此 USE RNG
- 證據：`modern/tests/p5-book-work-v2-player-http.test.mjs` L154–172 @ `97a9b57a8f51f72643f363d3bc21370323428be9`；`modern/tests/p5-book-work-v2-player-http.test.mjs` L200–208 @ `97a9b57a8f51f72643f363d3bc21370323428be9`
- 限制：不宣稱其他職業/EXP transfer。未證明 UI、完整原版差分或其他未列分支。

## ITEM 79

- 取得／行為：初始5、真排行結算再取得≥3、合法券換牛，存檔後持有／資產 history replay
- 共用命令：open-shop; advance-reviewed-world-time; use-item #79/4
- 條件與拒絕：initial5、prize voucher delta、gift cow count
- 時間／RNG：結算獎品途徑有證據，非全 prize RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L13–50 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L158–189 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L218–234 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L248–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`
- 限制：market-buy unsupported；不宣稱各券 USE 全驗。未證明 UI、完整原版差分或其他未列分支。

## USE 79/4

- 取得／行為：初始券及真期末獎券合法兌牛；count 與牛 delta、雙代結果；死亡後替補另證
- 共用命令：use-item
- 條件與拒絕：可用券與目標牛數，count=min(缺牛,券)；未獨立缺券拒絕
- 時間／RNG：未獨立量測此 USE RNG
- 證據：`modern/tests/p4-dairy-v2-player-http.test.mjs` L13–50 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L218–234 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-v2-player-http.test.mjs` L244–265 @ `80def541842276dbd4d9dacda3d626bc93a5c5db`；`modern/tests/p4-dairy-death-and-save-security.test.mjs` L37–91 @ `18dd2835d4c96e7065c5cae267aeed8fdb37730d`
- 限制：不宣稱所有 gift variants。未證明 UI、完整原版差分或其他未列分支。

