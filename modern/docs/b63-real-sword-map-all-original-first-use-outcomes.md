# B-63｜劍市地圖首次使用：五種真劍、原版加倍與地圖損毀

> 2026-11-22。此階段在 B-62 已驗證之 ITEM #14 真實市場購買路徑上，補上 **`@@USE` 五種 GET 結果、`funcb _local_` 收穫加倍、`func lostbook` 造成的真地圖損毀**。依照原版 Perl 的真實程式順序執行有界純數值 Node 投影，並直接以固定原版 Perl 子程式執行結果為對照。**只支援地圖第一次使用**：熟練度20造成下一次用時折減、溢出後市場回收、其它展示架銷售等尚未審查，仍須拒絕。

## 為何不是直接給木刀或把獎品加倍？

- 原版 `ITEM #40..44` 分別是木刀、鐵劍、鋼鐵劍、秘銀劍、奧利哈鋼劍，原版 `plus -1h` **不從空白批發市場產生正數劍庫存**。來源仍必須走 B-62：真市場有 `plus 1h` 的劍市地圖 #14，先用來源售價10,000購得玩家所持地圖，再花12,000使用此地圖、消耗7,200秒，獲得 EXP 20。
- 固定 DSL `GET` 先列出每種10次抽樣，原版編譯器轉為機率 `[400,350,150,60,30]` 千分比。首次使用時 `GetItemUseTime` 用 EXP=0 得7200秒。
- **前置回呼**先執行 `return 0 if rand(1000)>100`。若原版樣本小於或等於100，才將五個 `create[].count` 由10逐一改成20，並把結果訊息改為「這次我們收穫的比平時多。」；判斷的等號非常重要。
- 接著原版 `UseItem` 依序執行五個 `MakeAmount`：每組10件時，用 **10筆 rand(1000)** 各別判斷成功數；每組20件時，改走 **兩筆 rand() 正弦平方根近似常態** 的舊程式，`int(sqrt(abs(t))+average+0.5)`。因此**加倍不能靠「一般結果乘二」代替**。兩分支的原版總抽樣筆數（含前後回呼）分別為52與12。
- **後置 `lostbook`** 再使用 `rand(1000)<100`；樣本嚴格小於100才呼叫真 `item::UseItem(14,1,...)→UseItemSub`，扣除玩家地圖1份，並於 `result.useitem/usemsg` 增列此原版記錄。恰好100時不損毀，與前置加倍的100邊界不同。
- **全部五種來源 GET** 都是真實地加入玩家 `item[39..43]`，並進行各自原版首用持有上限600、500、300、100、75的檢查；不會把其它劍「轉換」為木刀。分支的 `exp[14]=20`、`money-12000`、`paytoday+12000`、`time+7200`、地圖真消耗都在單筆 GameCore revision CAS 中提交。特別拒絕未知來源、錯誤樣本數、超上限、非空源劍市場／未審查回收、重複使用或過期 revision。

## 原版 Perl 真執行驗證

[原版五情境／邊界探針](../tests/original-perl/original-b63-sword-map-all-outcomes-probe.pl) 直接使用 B-62 已固定的原版 `GetBuffer`、`GetLocalFunction` 編譯器流程與真正 DSL `funcb` 的 Perl 程式本體；執行固定 `UseItem`、`MakeAmount`、`GetItemUseTime`、`UseTime`、`CheckWholeStore`、`item::lostbook` 與 Core `item::UseItemSub`，獨立輸出每種劍實際庫存、地圖消耗、訊息、EXP、費用、時間與來源亂數順序。由 [原版 Perl 斷言](../tests/original-perl/original-b63-sword-map-all-outcomes.t) 檢查。

| 受控原版樣本情境 | 木刀／鐵劍／鋼鐵劍／秘銀劍／奧利哈鋼劍真庫存 | 最後持有地圖 | 原版 rand 總筆數 |
| --- | --- | ---: | ---: |
| 一般混合 | 2／2／2／2／2 | 1 | 52 |
| 一般混合＋地圖損毀 | 2／2／2／2／2 | 0 | 52 |
| 收穫加倍 | 8／7／3／1／1 | 1 | 12 |
| 收穫加倍＋地圖損毀 | 8／7／3／1／1 | 0 | 12 |
| 五項都沒產出＋地圖損毀 | 0／0／0／0／0 | 0 | 52 |
| 前後回呼剛好100／1000 | 8／7／3／1／1 | 1 | 12 |

以上是**指定的原版亂數樣本**之真程式輸出，不是一般情況的保證數量。20件路徑因 `MakeAmount` 高件數分支不同，不保證每次產出數等於10件模式的兩倍。Perl source oracle 只在測試端執行，不把原始 Perl 程式或不受控 callback 放入 Node 玩家命令。

## Node 實際 CAS 及舊流程安全

新程式 [`original-b63-sword-map-all-outcomes.mjs`](../src/original-b63-sword-map-all-outcomes.mjs) 增加完整首用結果審查與計算，來源契約對原版 `lostbook` 和 `funcb` **整段可執行本體**比對，加入來源欄位卻沒有審查的新 Perl 副作用會直接拒絕。只在 `createStandardStreetModule` 額外提供原版固定 `core-inc-item.cgi` 文字 `originalItemHelperSource` 且其它 B-62 審查來源完整時，才啟用 **內部** `use-original-sword-map-14-all-outcomes`。原本 B-62 狹窄操作 `use-original-sword-map-14` 保持不變，未傳該來源的舊 Street 呼叫者亦不開啟 B-63。

[Node 真商店測試](../tests/b63-source-all-sword-map-outcomes-cas.test.mjs) 以**真原版市場庫存**買入地圖，再將各情境 Perl 探針回傳的原始抽樣直接送到 B-63 新指令，逐項核對實際五種劍庫存、`result.additem/useitem/usemsg`、現金、付出、原始地圖、EXP 與 CAS；接著驗證其它劍真實庫存及費用可經 B-56 事件與 PLUS 時間片及 [B-43 雙世代存檔](../src/local-world-save-store.mjs) 寫入／重新載入。地圖已被消耗時，重載後嘗試再使用，仍須原子拒絕。亂數截短、加長、重播、來源被改動、過期 revision 也均拒絕。

**目前可在自然販售流程上架出售的劍仍只有木刀 ITEM #40。** ITEM #41～44 取得後可留在真實玩家庫存、照來源成本計入持有費，但沒有擅自宣告其它劍的自然買客／價格／販售為完成。B-61 `ken-sale` 對其它劍的 `popular/2` 來源審查本就存在，但此次沒有新增它們的販售支線。

## 保留邊界與後續

B-63 目前只實作**每家商店地圖首次使用**，當 `exp[14]` 已有20時，第二次原版 `GetItemUseTime` 有經驗縮時公式，需另行審查與 Perl 對照，不得重複用固定7200秒。額外劍販售、其它地圖／職業、原版完整 PRNG 與 `keys(%EVENT)` 雜湊迭代、並行持續事件、原版日誌持久化、玩家 HTTP 公開行為，以及 **36小時期末結算**仍不支援。此版本不是完整 Standard Street 或完整遊戲。

工作只修改 `modern/` 的程式、測試及文件；Draft PR #1 在 `test/task02-baseline-on-s1` 仍為 Draft，未合併。最終 Node／Perl測試數與 SHA 以本文件和交接更新後，同一 HEAD 的 Push + PR CI completed/success 為準。
