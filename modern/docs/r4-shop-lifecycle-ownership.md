# R4 店舖生命週期｜D 正式責任分配（2026-11-27 UTC+8）

使用者已授權 D 統一分配自主再出發／自主閉店；並非正式合併、新權限、平衡或 reset 替代授權。本分工即刻適用各工作窗，但尚未實作新的正式入口。A/B/C 各自分支保持唯一寫入者；D 只寫 integration/r4-unified-migration-20261126，正式基線 migration/standard-street-s1 不變。

## 1. 入場證據與版本

完整實讀 [責任決策 #7198223460](https://github.com/Prysline/akimono/pull/22#issuecomment-7198223460)、[A05–07 原版分析 #7198153022](https://github.com/Prysline/akimono/pull/22#issuecomment-7198153022)、[A08–09 後續 #7198426955](https://github.com/Prysline/akimono/pull/22#issuecomment-7198426955)、[B 續作 #7198126796](https://github.com/Prysline/akimono/pull/18#issuecomment-7198126796) 及 C/D PR 交接。B 已獲使用者公會正常玩家流程政策 A；底層差異保留，不把此授權擴張為不相關 gameplay 裁定。

| 窗 | HEAD | tree | 查詢 CI |
|---|---|---|---|
| A #22/#25 | 76b6fd4a6c68ebcf8ce74d128fa805cce077e8ec | e8ad318b2101fa6cde08fbc555743c7b7ac5268d | 45864219915 job140062757036 in_progress |
| B #18 | 921cedfdfb387715f6b709174ecabc4b71332c5c | 7bd9f4052950b7f60a54003aa06236489d0a54f8 | full 45861905289 job140054799268 success；獨立 45861905298 九 jobs success（本輪未逐一核對其原始 logs） |
| C #26 | 630e98795ef957272e49c8a7cabb5c6f1ce992b2 | ede2b15cfcdb0077b026c2a25b2386a84eefd003 | 45862211525 job140055850815 success |
| D #27 | dc8f6571555ccfa86c418eba750731beba85491b | 6bd72827fc5e67b3cf21d784c3ae49f573c79eeb | 45863935332 job140061794000 failure |

B full CI 實際 checkout 55918527296ccfb97cc0f4e4ce30ec552452394d，tree 同 HEAD，JS1656/1657（1 skip、0 fail/cancel）、Perl2929/96檔 PASS；C checkout e3121ca24dcd04209d8e56de61ce88b07e05e5e2，tree 同 HEAD，JS1349/1350（1 skip、0 fail/cancel）、Perl2456/85檔 PASS。保留 C 第50批 P5 資金來源證據失敗，不用最新成功抹除既有失敗，不把 skip 當已驗收。D8 CI 45861053386 checkout 8596c846fcc4338effbaef9adeebe12c0aecb679 / tree 704381b7ab7b7fdc84a897e64c8d6237ee2a5299，JS1347/1347、Perl2456 PASS；D9 45861415100 checkout 5a4d942f8220ee74cafbc526d8dc264a63ea91d5 / tree fea7ac12abd4ee0a1463f449171a0c9460bf9844 JS1348/1349；D10 checkout fc8ea1cf34dfe63c5f92b82f4b45039a6929e70e / tree 6bd72827fc5e67b3cf21d784c3ae49f573c79eeb JS1350/1351。均實際 tree 對照。D9/D10 同一 not ok1095：#63 HTTP tick 時 B-41 original sale boundary 拒絕庫存/shelf；D10 環境正負兩案 ok1151/1152。後續 Perl/pins 因 npm test 失敗未執行。D 主責修正相關 time/market 閉包，保留斷言，不擴權或把原版改平衡；不阻擋生命週期來源包或無關移植。無本機工作樹狀態可查，不宣告 stash/unpushed 已保存。

## 2. 凍結來源和已完成的功能，禁止重做

原版 handler：modern/tests/original-perl/pinned-membership-user.cgi blob 8e817c535d4cd17e68d65f0e2f67846a344b5094（A/B 皆有，D 尚未收錄）。注意不是 pinned-user.cgi（plug/user.cgi，46fe3b13e68ee83997aa919125ab210372af2822）。原版固定 upstream katelynn620/akimono-core@738d71a2985fd088f2ca90f25145706392ee2365；source pins：inc-func.cgi e7a8add7b0291901e71fe797783b664dff1568a0、write.cgi 203f33b37511e838800a45b84183af98fcf46e4c、core-detail.cgi 9a83d26fb29edee4032958f1e6de837a250f3384、new.cgi 9f0a590a6f1d4e93d2534056a0dc96c4d5c80ba7、custom/inc-item-data.cgi 7a18185e98b32aee82ca1ce30d6f3c395157dbcb、inc-makeitem.cgi 1da8cce1e76ad6159325a37faec68efaa82c7f69、_config.cgi 87e4fd4eefba063d982e3b79aa7cfa6565e1a0。

兩個 handler 共用 Lock→DataRead→CheckUserPass→dispatch→RenewLog→DataWrite→DataCommitOrAbort→UnLock→OutSkin。restart：rss 必須 restart、NOW-foundation >=10800，刪整個 DT hash 後保留 id/name/shopname/pass/icon，六欄 LHS 五欄 RHS 使 time 初始 undef；status=1、lastlogin/foundation=NOW、money=100000、rank=5010、showcasecount=1；隨後 require funcnew.cgi，再按 ^id-.+\.cgi$ 刪該店 subdata，再 PushLog(1,0,再出發訊息)。重要：標準街 DSL 46–48、3320–3336 實讀確認 @@FUNCNEW 依 NewShopTime 設 time=NOW-12*60*60，NewShopMoney=100000，NewShopItem 為 #63 展示架工具1／#79 禮物卷5。故 undef 是 callback 前狀態，不直接假定最終 wire 為 undef；仍由 B 真 compiler/funcnew + DataWrite/DataRead 比對 sparse item、空欄、AutoVar、零/undef、hash/wire、point、lastlogin。不得直接拿 new.cgi 的整組預設欄位填補 restart，亦不得用 reset。未做完整實際原版 handler roundtrip，現無需使用者決定 time，先做來源驗證。

cls：cls 必須 closeshop；SetCookieSession()（inc-func 空參數產生 -check-cookie- cookie），清 USERPASSURL/FORM；CloseShop(id,l('自主閉店'))，PushLog(1,0,店名閉店訊息)，DTblockip=原 DT.remoteaddr，再共用 log/write/commit。_config NEW_SHOP_BLOCKIP=1；new.cgi 原有同 IP 連續註冊限制。區分 plug/user.cgi 的 ReadDTSub/WriteDTSub 和 inc-func CheckUserPass 的 SESSION_DIR/username.cgi；CloseShop 與 restart 刪的是 SUBDATA_DIR/id-*.cgi，不能將兩種檔案目錄混為同一 session 刪除，也不能自作主張刪所有使用者資料。B 查原始 session 失效、cookie、blockip、新店資格與跨街 identity；D 將實際 ownership 與存檔綁定。

D6 已收錄 A 的 full commerce CloseShop effects 561725d9dc0d2eb5141b6b84c1e381b04587f261、native archive hash 97929ed7cd0a97b013f7991287ce15d7198d12b2、immutable archive projection 93d49fa1adc06221f5dc7c50b7ad2b2c6acb7d9e，D6/D7 source tests pass；D8 disk layout 安全與 archive/army 共存測試 pass。B 現有 legacy CloseShop effects 8ba642520d76dd9115acde71028554f24ece1261、sandbox archive 3ad6e474644c188163284ef904f448e54016177b，保留原始證據，不覆蓋 D/A 的八架、signed cash、native map 與 NV、immutable archive generation 實作。CloseShop reason、SetUserData no-op、32 scalar/seven sections、status/money/rank=0、subdata selection、SortDT/DataWrite omission、WriteErrorLog 30000-byte rotation 均已有來源閉包，重用，不重做。

尚未有正式自主 restart/cls 入口；D dev-local /api/reset 是測試世界/雙 slot 清除，不是玩家再出發。D 現有 local single-account 模式 pass/remoteaddr 空、nextid=100、blockip=''，history ordinary shopId=1；B 也尚無正式新 lifecycle ACL。D8 archive guard 只允許 closed world，不能據此宣稱重新開店後歷史 archive 可存；將來需按 source evidence 適配多店/重開場景，保留原 archive bytes 及不可修復安全，不能為了新入口直接解除 guard。現有 B 多店 registration/identity oracle 與公會、龍族來源包仍非正式 runtime。

## 3. 唯一施工責任（授權決定）

| 工作包 | 唯一作者／分支 | 交付物 |
|---|---|---|
| LC-B1 自主再出發及自主閉店 wrapper 的原版差分 | B/#18 | 新隔離 lifecycle reviewer/projector；重用已存在 CloseShop，不重新實作 archive/close/hash；證明原版正常 UI→handler、確認值、時間門檻、保留/清除欄位、真 FUNCNEW/wire、log order/args，輸出非 committable effects |
| LC-B2 帳號、session、shop identity/registration、子資料及外部效果來源 | B/#18 | CheckUserPass/SetCookieSession、SESSION_DIR vs SUBDATA_DIR、blockip、nextid、跨街同 ID、guild/army/dragon/共同付款或邀請在 restart/cls 實際效果；正常玩家 policy 與 raw handler 分別記錄，勿新增隱含 cascade 或臆測清帳 |
| LC-D1 唯一正式 command/identity/authority | D/#27 | 選擇性適配 B effects，服務端 actor resolver/owner ACL、current revision/identity、normal policy、單一 GameCore CAS；同一 existing v2 source-history 權威 |
| LC-D2 初始化、原版關店／封存／子資料／日誌整合 | D/#27 | 重用既有來源 projector 和 D5/D8 immutable disk、server native hash lineage、closed prune/reopen layout、同一原子發布、外部共同檔案提交契約；不新增第二套 close 或 save |
| LC-D3 HTTP/UI/history/replay/必要整合 | D/#27 | 共用 StreetModule、dev-local、local-ui、history policy、checkpoint、source loader/pins、成功/拒絕/重啟/故障回復，正式能力預設拒絕直到必要閉包具備 |
| A 正常經營其他功能 | A/#22/#25 CI-only | A05–A09/其後正常經營、來源 FUNCNEW/商品依賴既有功能包與證據協助，不另寫 lifecycle、auth/session 或正式持久化 |
| C 獨立驗證 | C/#26 | 固定候選的原版差分證據去重、合法玩家完整流程、3h 邊界、持久化、拒絕與故障重啟、低機率/長程，正式玩家測試不改 D runtime |

B 只寫 B source/isolated candidate；既有 B 外部候選的共用檔案差分以功能包交 D，不把 B source wrapper 接入正式 HTTP，也不新增第二個作者修改 D branch。D 是共享正式檔案的唯一整合作者。若需更改已凍結 A close projector 契約，由 B 提交所需差分證據，D 審閱選擇性適配；A 不重做。C 不寫 A/B/D runtime。B 其餘龍族／公會／外部移植可以並行。

## 4. 介面契約與發布門檻

以下命名是 D 本次指定的候選契約，不代表已有 API 或已承諾來源不明行為。

- command kinds: restart-shop, close-shop；候選 HTTP POST /api/restart-shop 與 /api/close-shop，僅 exact keys expectedRevision, confirmation；confirmation 分別 'restart'/'closeshop'，無任意 money/time/id/path/order/RNG/log、無任意 actor/shopId 注入。未取得可信 session/owner 綁定則不開放。伺服器解析 worldId/streetId/shopId/owner identity 及當前 revision，CAS 時同一 authority 重核。帳號密碼、session secret 不送入公開 state、log 或 replay；不得複製原版明文 cookie/密碼到新版公開介面。歷史記錄只使用必要可重播的穩定身分/授權結果與命令資料，由 D 定義安全封裝；replay 驗證來源與 provenance，不要求舊 session secret 仍有效。
- B source projector contract：reviewed frozen source identity + trusted source snapshot/actor shop/street/current clock + canonical confirmation + native ordered context + exact scoped subdata inventory；回傳 immutable candidate {shopTransition,sourceLogCalls,subdataDeletionSelection,sessionIntent,blockIpEffect,externalEffects,sourceEvidence,committable:false}（可用等價命名，交付時固定 shape）；不從 HTTP 信任或接受 caller provided mutation、沒有直接檔案刪除／save／CAS。close wrapper 交 D/A 現有 projector 取得 archive/prune input，不自己產生第二套 archive payload。restart 保留同 world/street/shop identity 與市場/城鎮時鐘/其他店；除 source 確認的副作用外不改其他資料。不宣稱原版現有 guild/army/dragon 狀態可任意清除。
- 交易順序：授權、exact fields、確認、revision、來源狀態及依賴可驗證→純投影/來源 native order→組合 log、prune/registration/subdata、外部 effect→完整 successor validation + history/replay/save preflight→單一 CAS；發布依 existing v2 顯式 save、immutable staging、雙 slot/generation、HMAC checkpoint/retained prefix、故障回復，不能由 sandbox 直接提交。關店成功後 session/cookie 失效與伺服器所有權策略必須與同一已提交 successor 一致；不提前撤銷或部分發布。現有顯式 save 與記憶體 CAS 是不同界線，不假稱每 HTTP 已 durable。對原版 handler 的直接 I/O/部分失敗保留差分，現代原子性另明示。
- 來源 clock 使用 server world nowSeconds；不得借 test reset 變 worldId、清兩 slot、刪 key、重建 checkpoint 或跳過歷史。正常 restart 同 shopId、revision+1；close 依原版移除 active shop 和 index，retain archive/其他世界及 lineage、revision+1，其他外部狀態按來源證據處理。反覆請求舊 revision 或無 owner/失效 session 必須拒絕；同一次 close 只出現一次 archive/log。
- 最低測試：真原版 handler + compiler/funcnew + DataWrite/DataRead roundtrip；正確 10799/10800/10801 秒、確認錯字、未授權、他店/cross-street、空/缺欄/sparse inventory、前後 key/rows、只刪匹配 subdata（含其他店與近似名稱）、原版 cookie/session/no-op/set blockip/log、既有 close hash/UTF8/NV/rotation、兩代 v2 replay/restart、stale CAS、錯誤/故障注入無部分發布。開店後再出發、再閉店、再註冊資格、已閉店 archive 保留、多店外部差異依完整來源。不得以測試 reset、fixture資產或 fake session 當正式玩家驗收。正式 C 驗收獨立，不是無關功能開工門檻。

## 5. 後續施工與決策邊界

B 優先讀本文件及 A 交接，從當下 HEAD 續作 LC-B1/B2；交付 exact head/tree/source pins/差分及原始 CI，列已審來源、候選、正式接線、玩家證據四維，不提交 D 代碼。D 先處理 D9 相關 B-41 guard（選擇性收錄完整正常時間依賴，不僅擴白名單），同時可審查 source package；LC-D1–3 按依賴逐批接入，不重做 D6/D8。A 續 A05–09/其他正常經營；C 維持原有驗證及新 lifecycle evidence plan，不等待 D 才做無關稽核。所有分支 no force/no merge，#25 永遠 CI-only。未經使用者授權不得合併 #18/#22/#27 或變正式基線。

現在沒有額外原版規則決策需求：time callback 已找到明確來源，待真 oracle；若 B 發現真正無法由原版分辨的 gameplay/外部生命週期歧義、重大保存/權限架構衝突或超出授權，附 exact source/可驗證差異與選項交 D，再必要時提使用者。普通技術缺口不要求使用者決策。ENV D10 獨立持續，Windows 實機/完整 CI 仍待驗證；不能因此停其他工作。
