# R0 第三十八批：peer trade 投影／B-32 人工 USE 差分（未結案）

固定正式 baseline `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；候選父 HEAD `d6a01c4dc2289834367de43472e819334ae82f76`。兩份測試完整讀取及主要入口／probe 核對；B-32 共用兩 helper 前批已讀，不重複認列。保留純投影與記憶體 CAS 的區別。

## peer-trade-model.test.mjs

- 測試 blob: `d562f38d6098d041a678cb706f635b9f668dcc3b`；Node 純記憶體 peer trade 投影（非 CAS）。
- 來源／入口：`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/buy-s.cgi` @ `6ba8df9a733ed16c490389414cd94934fe1185ca`；`modern/tests/original-perl/item.cgi` @ `b39400d7dc0ab80062c392ae2bbc923e24ecacf8`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/src/peer-trade-model.mjs` @ `fb1a56e4f6b0e1a77f315b7b630940f626540127`；`modern/src/economy-model.mjs` @ `cd2974c1719594ca0f667bc56577e48e7a25e17e`；`modern/src/item-limit-model.mjs` @ `01df503fd093c6bb63e1972675c6012b5aef491f`；`modern/src/standard-street-model.mjs` @ `c624fbb9f2c141bd539b7dfec86a48d3ba373efc`；`modern/src/parse-dsl.mjs` @ `1e81a659e8f24ef0e4aa1124adb37e2c47aec234`。
- 斷言：L36–212 #79 身分／wholesale-only FUNCBUY、資金稅帳庫存、cash/limit clipping、免費交易2倍時間、時間債、拒絕；L214–321 RNG 門檻/缺失/非法/throw、售完扣 rank；L331–504 #1/#40/#79 精確 metadata、雙品交易、identity/limit/stale 負例。
- 執行：settleUnguildedPeerPurchase 純函式，回傳新 buyer/seller；無 Perl 子程序、WorldState CAS 或存檔。
- Fixture：來源 model 開店產生 #79 初始券，人工展示售價；#1/#40 stock 手工置入，人工 tax10/time1200/now1000000；直接改 rank、money、time，注入 random。
- 限制：不證正式玩家間交易／合法取得／真 RNG／v2；L139–147 stale #79 僅驗 buyer、seller price/item，非完整 seller snapshot；L314–320 明示非售完保留非法 rank -1，售完才拒絕；非全部負例逐欄原子。

## reviewed-use-fixture-street.test.mjs

- 測試 blob: `5ee976a32a324e27a192c03660da54ca16fe7d9e`；Perl Oracle／Node 差分（人工 A/B/C＋記憶體 CAS）。
- 來源／入口：`modern/tests/original-perl/use.cgi` @ `1bf4537cc41e344c144d840d43175c4c232765bb`；`modern/tests/original-perl/calc.cgi` @ `586354a9a300e26d0e12a4efa512fa25760e3197`；`modern/tests/original-perl/whole.cgi` @ `778badaf157326bcfd1f8fa1e310d94f94995eb3`；`modern/tests/original-perl/core-inc-item.cgi` @ `bb0244748088be0c5f1d24de7f9f7f05225278cb`；`custom/inc-item-data.cgi` @ `7a18185e98b32aee82ca1ce30d6f3c395157dbcb`；`custom/inc-rebel-data.cgi` @ `923634e58a05beca9ab004515fc7669d53a1ba3a`；`modern/tests/original-perl/original-world-use-sequence-probe.pl` @ `3c5874ecf7d09fabe837d5f9e870926b6418f474`；`modern/tests/original-perl/OriginalFullUseLostbookHarness.pm` @ `2e84c60cf948011e0f32344dde4ee64299793964`；`modern/tests/original-perl/OriginalItemHelperHarness.pm` @ `d6d9627308f992c92483cdae609e1a7b299d3f2e`；`modern/src/reviewed-use-fixture-street.mjs` @ `5509b9a7b53ebb844a37e2b7cc366dfcab8c564a`；`modern/src/original-integrated-use-lostbook-model.mjs` @ `f5b2b14bf12f3f075e35b95718f0e8dc7e7be5e7`；`modern/src/game-core-contract.mjs` @ `b5ff31b7caa086e811ab7e4204aca8a5b23a8975`；`modern/src/standard-street-module.mjs` @ `abf89cb14a24479f98ec00374d48657cc1f45d81`。
- 斷言：L41–127 synthetic street 邊界、兩次 commit/rev2、callback 順序與 skip/no callback；L128–220 zero-count/stale/unknown/非法 bucket/shop/field/world；L222–260 JSON roundtrip/replay/shape/event；L262–317 三組兩步實際 Perl probe，Node projector 比所有列並同 adapter 連續 CAS 對比。
- 執行：source-fixture-use 由 synthetic StreetModule / executeMemoryCommand；Perl probe 每次重建前次部分 state，原版 UseItem/MakeAmount、whole/calc/helper/lostbook。
- Fixture：shop42/43、A/B/C、固定 now1000、Perl 各步 seed12/14，Node 取 floor(observed draw) 或人工 bucket。
- 限制：非正式 Standard Street；L140–155 標題 shortage/time-gate rejects 但實際 COMMITTED、snapshot 改變，不證拒絕；L213–220 只 spoof worldId、未獨立 spoof streetId；L256–260 僅 metadata/key 檢查非 IO spy；Perl ENOENT 可 skip；JSON snapshot 非 v2，無正式 HTTP、合法商品、真時鐘/RNG。

## 邊界

本批未重跑本機測試；R1 87 詳細列、限定與正式下界不變，無新增 feature refs。第32、35批、bb44e26、第36批 CI 仍 in_progress，第37批 queued；新候選待驗。
