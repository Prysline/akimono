# R0 第五十批：P3／R4 正式 HTTP 與 v2 證據重新覆核

固定基線：08fdd3b31ff130e66d0337360430fda3d73fdc8d。逐檔實讀十份測試與兩份共用支援；保留有效分類，不升格真玩家。genuinePlayer 預設固定起始時鐘 896401，伺服器 RNG、真 HTTP/CAS、真程序重啟、v2；不注入正向資產。未本機重跑。

## p3-v2-appraiser-skill.test.mjs

- 固定 blob：`fe677c0b24d72e3469698347c392e60271500b89`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L5–37：採礦、採集、購書、#37/0,1 真實取得技能與 EXP 200；未達門檻拒絕；#37/2 消耗 #1–8 各3，保留 #18/19，取得 #24、EXP250，兩世代重啟
- 執行路徑：genuinePlayer →正式 HTTP USE/buy/discard/advance/save/load
- 限制：固定起始 896401；伺服器 RNG，非自然長期玩家；#37/2 首次成功路徑。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`。

## p3-v2-cross-period-nayuta.test.mjs

- 固定 blob：`9372b12a733f3a754bd3d6aa5df407fe7f34db26`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L5 起：跨期養成 #66 EXP500、#37 鑑定、#18/19/24；#66/3 消耗5/6/7各20及8×6、產70；實售並重試至 lostbook，最多32次；兩世代重啟；正 FUNCTURN 為條件斷言及 diagnostic，非無條件成功
- 執行路徑：genuinePlayer(crossPeriod:true) →正式 reviewed time/USE/自然販售/v2
- 限制：固定起始；低機率 bounded trial 失敗會 fail，不可把 diagnostic 當必然；只單店單架。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`。

## p3-v2-cross-period-ordinary-multishelf.test.mjs

- 固定 blob：`b8e695f6dc0c01936941d8a67c8b0df8584f863e`；有效／HTTP/CAS。
- 實際斷言：L7 起：#63/1 合法擴架，兩架編輯、play.cgi wire、時間推進拒絕且 world/history 不變；discard 不耗時；兩世代 v2 重啟
- 執行路徑：genuinePlayer(crossPeriod:true) →正式 HTTP
- 限制：固定起始；cross-enabled 不表示完成跨期，多架 time 明確拒絕；非多架自然販售驗收。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`。

## p3-v2-written-accessory-book.test.mjs

- 固定 blob：`ac68b622f62850b2cc0f059bf7e3fb9851c4ffc8`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L7 起：#79/1 兌15/16/17，#10/3 合法消耗材料與書、NEED 不消耗，寫66；技能不足拒絕；重啟後訓練18/19並 #66/0 製67，EXP20/100，兩世代
- 執行路徑：genuinePlayer →正式 HTTP
- 限制：固定起始；寫書 while 無明文獨立重試上限，受時間等外部限制；未覆蓋所有寫書輸出。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`。

## r4-reviewed-time-http-history.test.mjs

- 固定 blob：`786c8af79556d45af1fd290d50579b1c53dbb699`；有效／受控 HTTP/CAS。
- 實際斷言：4 cases：正常 time+gift、拒絕 RNG/now/stale/舊 route、origin 403、兩世代 trace 破壞回退；36h 邊界拒絕；128 歷史 checkpoint obstruction、認證/key/prefix 損壞拒絕及復原；跨期20+40秒、filesystem obstruction CAS、play/backup bytes、合法後續 commerce、trace/disk 損壞回退
- 執行路徑：spawn scripts/dev-local.mjs → HTTP、隔離暫存磁碟、真 Node restart
- 限制：固定起始 1000000/1025980/900000/1022380；人工破壞只為負向測試；部分 forged trace/outer checksum rejection 不隔離內層因果；origin 403 未獨立重查 world。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`。

## p3-v2-high-forge-20.test.mjs

- 固定 blob：`eb230be88be9c794bedba396def73c49acc30f65`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L1–3 wrapper → highForge(20)；#9 採礦 earned EXP → #78/4 轉職，保留 floor(earned/2)；技能 #18；門檻 200/400/600，逐階 EXP+20、材料扣除、NEED 保留、產物 41–44、lostbook 與 callback，兩代重啟；最新世代 forged EXP999 回退
- 執行路徑：support/p3-high-forge.mjs → genuinePlayer →正式 HTTP
- 限制：固定起始 896401，跨期關閉；未達門檻拒絕為條件分支，已達則不宣稱實際拒絕；非每次必 lostbook/售出；#66/3 另由 nayuta 測試。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/tests/support/p3-high-forge.mjs` @ `187b03899bd092dfa2935d13a81dedf10d103c87`。

## p3-v2-high-forge-21.test.mjs

- 固定 blob：`8fa40869f69dd704c2f251fc3132b0a641dffc5a`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L1–3 wrapper → highForge(21)；#9 採礦 earned EXP → #78/5 轉職，保留 floor(earned/2)；技能 #18；門檻 200/400/600，逐階 EXP+20、材料扣除、NEED 保留、產物 47–50、lostbook 與 callback，兩代重啟
- 執行路徑：support/p3-high-forge.mjs → genuinePlayer →正式 HTTP
- 限制：固定起始 896401，跨期關閉；未達門檻拒絕為條件分支，已達則不宣稱實際拒絕；非每次必 lostbook/售出；#66/3 另由 nayuta 測試。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/tests/support/p3-high-forge.mjs` @ `187b03899bd092dfa2935d13a81dedf10d103c87`。

## p3-v2-high-forge-22.test.mjs

- 固定 blob：`0ca2eccf11144c714afc8478ba566a8aa918bfee`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L1–3 wrapper → highForge(22)；#9 採礦 earned EXP → #78/6 轉職，保留 floor(earned/2)；技能 #18；門檻 200/400/600，逐階 EXP+20、材料扣除、NEED 保留、產物 53–56、lostbook 與 callback，兩代重啟
- 執行路徑：support/p3-high-forge.mjs → genuinePlayer →正式 HTTP
- 限制：固定起始 896401，跨期關閉；未達門檻拒絕為條件分支，已達則不宣稱實際拒絕；非每次必 lostbook/售出；#66/3 另由 nayuta 測試。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/tests/support/p3-high-forge.mjs` @ `187b03899bd092dfa2935d13a81dedf10d103c87`。

## p3-v2-high-forge-23.test.mjs

- 固定 blob：`8acb692f6e4a0c3e13d7151c2552bbc5470bdcd4`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L1–3 wrapper → highForge(23)；#9 採礦 earned EXP → #78/7 轉職，保留 floor(earned/2)；技能 #19；門檻 250/500/700，逐階 EXP+20、材料扣除、NEED 保留、產物 58–61、lostbook 與 callback，兩代重啟
- 執行路徑：support/p3-high-forge.mjs → genuinePlayer →正式 HTTP
- 限制：固定起始 896401，跨期關閉；未達門檻拒絕為條件分支，已達則不宣稱實際拒絕；非每次必 lostbook/售出；#66/3 另由 nayuta 測試。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/tests/support/p3-high-forge.mjs` @ `187b03899bd092dfa2935d13a81dedf10d103c87`。

## p3-v2-high-forge-66.test.mjs

- 固定 blob：`ae6f58c0a212c544504128d6c9c5172b6d8ea932`；有效／受控 HTTP/CAS + v2 重啟。
- 實際斷言：L1–3 wrapper → highForge(66)；#9 採礦 earned EXP → #78/3 轉職，保留 floor(earned/2)；技能 #18/19；門檻 250/500，逐階 EXP+20、材料扣除、NEED 保留、產物 67–69、lostbook 與 callback，兩代重啟；缺 #24 時 #66/3 拒絕
- 執行路徑：support/p3-high-forge.mjs → genuinePlayer →正式 HTTP
- 限制：固定起始 896401，跨期關閉；未達門檻拒絕為條件分支，已達則不宣稱實際拒絕；非每次必 lostbook/售出；#66/3 另由 nayuta 測試。
- 入口：`modern/scripts/dev-local.mjs` @ `78400e3bd5ca3d4c6831cdb0828be8ad5b6fcaa9`；`modern/tests/support/p3-genuine-v2-player.mjs` @ `547208190d5ec6d26af293e1ed0d0ded5f649a44`；`modern/tests/support/p3-high-forge.mjs` @ `187b03899bd092dfa2935d13a81dedf10d103c87`。
