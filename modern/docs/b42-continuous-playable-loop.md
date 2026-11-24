# B-42｜連續兩輪真經營：商品 #10、原版自然販售、正確決算邊界

> 狀態（2026-11-21）：**B-42 前段已實作／驗證。完整原版跨期決算與實際存讀檔仍未完成。** 只修改 `test/task02-baseline-on-s1`，不合併 Draft PR #1、不修改 main／migration／原版 Core／DSL。

## 本機實際操作

```bash
git switch test/task02-baseline-on-s1
git pull --ff-only origin test/task02-baseline-on-s1
cd modern
npm run dev:local
```

開啟 http://127.0.0.1:4173，保留原版風格繁體中文 UI 與「交易」導覽。

1. 自店／店內：建立來源世界及新商店。現金 100,000 G，初始 #10 庫存 0。
2. 交易／市場：初始真市場無貨時應拒絕。執行原版 **59 項 PLUS 供貨子步驟** 60 秒；這個單獨子步驟**不推進世界時間**。
3. 真買入 #10「書本寫作工具」1 件（5,000 G）；資金 100,000→95,000 G、庫存0→1；到自店／倉庫合法設定第1架展示 #10、原價 5,000 G。
4. 自店／店內：快轉 30 分鐘。固定 E2E 亂數下售出1件，資金回到100,000 G、庫存1→0。
5. **同一個世界**回交易／市場，不再按人工供貨：第4步自然販售後的原版 PLUS 已更新真正批發貨源，原版市場再買入 #10 1件，資金100,000→95,000 G，庫存0→1；`paytoday=10000`。
6. 展示架繼續保留 #10，不必重新上架。再快轉30分鐘，固定 E2E 再賣出1件，資金回到100,000 G，庫存1→0，`saletoday=10000`、`itemtoday[10]=2`。
7. 再快轉10分鐘。展示架雖仍掛著 #10，但庫存0：**不會憑空售出**；來源專門店判定仍令 `temprank = rank + 1000`，持有費小數 `costtoday` 繼續累積；世界版本、時間、79欄市場 CSV 原子更新。

以上售出結果為已重現的**固定跨語言隨機樣本**，一般本機快轉使用 Node 隨機抽樣，**不保證每次賣出**。

## 原版 Perl／Node／HTTP 證據

- [B-42 Node／HTTP E2E](../tests/b42-continuous-shop.test.mjs)：直接透過 GameCore → StandardStreetModule → WorldState，在同一個世界連續兩次來源買入與兩次自然販售，再做零庫存快轉；核對 revision 5→6→7→8→9、現金、庫存、人氣、今日帳務、原始批發 CSV，舊 revision 被拒絕且不提交。
- [原版 Perl 來源探針](../tests/original-perl/original-b41-real-sale-probe.pl)＋[B-42 Perl 斷言](../tests/original-perl/original-b42-two-rounds.t)：實際兩次執行固定原版 `buy-s.cgi`，首次合法執行 `sc-s.cgi`，並在同一個商店及批發狀態依序執行來源 `inc-turn.cgi` 的自然販售區段 + 59 PLUS／`CheckWholeStore`。只在不同 CGI 請求之間還原暫時性 `TIME_SEND_ITEM` 和 `buypeoplebase`，保留店鋪現金、真正庫存與市場，不把人工庫存拿來冒充玩家進貨。
- 原版 `_sale_count_` 每次自然販售片段重新建立，`itemtoday`／`saletoday`／`paytoday`／`costtoday` 沿用既有世界累計；原版專賣店加成是看第1展示架商品，即使該商品售罄也一樣。

## 決算時間：已修正來源邊界，尚未執行完整結算

固定原版 `inc-turn.cgi` 時間切分使用 `NOW_TIME + TZ_JST - DATE_REVISE_TIME`。對照固定 `_config.cgi`：

| 來源欄位 | 原版值 |
| --- | --- |
| ONE_DAY_TIME | 36小時 = 129600秒 |
| TZ_JST | 9小時 = 32400秒 |
| DATE_REVISE_TIME | 6小時 = 21600秒 |
| **實際期別偏移** | **+3小時 = 10800秒** |

B-41 的 +9小時判定已更正為 +3小時，並把三個原版常數加入來源審核門檻。UI 頂部顯示下一個期末的**來源時間倒數**。快轉跨越未實作期末時必須拒絕，現金／庫存／版本／時鐘不會被偷改。固定測試世界時間 1000000 秒時，下期時間為 1026000 秒，距離26000秒；兩輪銷售加10分鐘後仍距離21800秒。

**不可冒稱完成完整原版決算。** 固定原版 [period.cgi](../tests/original-perl/period.cgi) 涉及排行榜、經營者失效、維持費與日帳歸檔、熟練度折損、公會、世界領地狀態、人口、事件、備份與 session 清理。現有 B-19/B-20 的抽取子模型不能替代完整 `inc-period.cgi`；本機 WorldState 也尚未具備全部領地／事件資料，不能用猜測預設值去補。

## 已確認的 CI

程式 SHA `81f47513699d6028d06c9c7db0f0fd0b5531e385`：[Push CI](https://github.com/Prysline/akimono/actions/runs/44896929809) 與 [PR CI](https://github.com/Prysline/akimono/actions/runs/44896933582) 同 SHA 完成／成功：**820/820 Node、1221/1221 原版 Perl（35個 .t）**。文件提交後還要核對當前最終 HEAD 的同 SHA 雙 CI，不挪用此中途結果。

## 下一階段（B-42 後半／B-43）

先依原版 `inc-turn.cgi → FUNCTURN／FUNCSALE → SortDT → inc-period.cgi → PLUS` 的實際必要順序擴充合法世界狀態與時段切分，驗證**真正跨期**的商店收支、領地／人口、市場、期別轉帳、拒絕重複結算。完整原版 Perl 與 Node／HTTP 比對成功後，才在既有 UI 開放跨期快轉。再做可靠單機落盤、關閉 Node 後重新載入繼續經營；此輪沒有宣稱已具備永久存檔、登入或多人。
