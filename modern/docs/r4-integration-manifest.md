# R4 統一整合收錄紀錄

D1 文件候選；尚未收錄任何 A/B runtime。起點 migration/standard-street-s1 @ 08fdd3b31ff130e66d0337360430fda3d73fdc8d，tree 9a6c0d5837042c276eda13f78394025016d332b5。P5 exact tree [CI 45727603147](https://github.com/Prysline/akimono/actions/runs/45727603147) 既有記錄 JS1329/1329、Perl2456/2456（85檔）、pins/DSL 通過；不是本文件提交的 CI。

| PR | 重新核對 HEAD（快照） | 處置 |
|---|---|---|
| #18 | f356c14452537a11167110f5b46709f7a1bb9039 | B，保留 |
| #22/#25 | 1780f564c3b5bca3a1d396a6156d280f71fa9b23 | A；#25 不合併 |
| #26 | 50528dd28d184f7110e4b364f956a62f7e5bbca7 | C |
| #23 | 988c310ceb5dbcbb4e89d5f22d7b9b9590017433 | 暫停，待證據移交 |
| #24 | 08526633a81b6c0474599e70b9846cf7e021ef41 | 同上 |
| #16 | 6664d60af29b4974f9386bf5c97ce09cdd477637 | 唯讀來源 |
| #1 | d2dccdacb83925b6f0121bd7311f92be2e18d2da | 唯讀歷史 |

雙店 wire 82101a4f37c6839b0b94341488b265cd5bce5247 已確認 Git object 可讀；[交接](https://github.com/Prysline/akimono/pull/18#issuecomment-7195147369)。未永久備份、未發布、未 CI；B 依最新 HEAD 檢查三檔差分後重建，不移動 #18 ref 指向候選。

## 批次計畫（依賴閉包優先，不是全域開工門檻）

1. D1 文件與責任；D2 逐檔三方 blob/語義差分與現有介面、測試相依清冊。
2. 正常商品取得/USE/EXP/販售/回呼小批閉包（A），保護 P1–P5，核對 B 共享變更。
3. 多架、時間、EVENT、排序、維持費、決算、關店與存檔共用閉包（A/B/D）。
4. 宮殿、軍隊、領主、稅務等獨立閉包（B）；無依賴可提前。
5. 多店、店間交易、公會、龍族、共同/街道期末（B/D）；來源權限、鎖序、原子性、故障、跨期、重啟必須成立。
6. 跨系統整合與 exact tree 回歸；C 同步獨立驗收，正式基線合併另需授權。

每批記錄來源 refs、base/head/tree、選擇路徑、排除路徑及理由、相依閉包、來源 pin、測試命令/CI actual checkout、已知缺陷/待證、回復方式。禁止整支舊 R4 覆蓋、隱性回退、平行保存。D1 未查其他本機 worktree、stash、untracked/unpushed；由各窗核對保全，不宣稱已保存。
