# R0 第十批：共用回呼、道具 helper、材料與產出隔離證據

正式固定基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。本批 6 份既有測試逐檔審閱；未在本機重跑，不宣稱現行玩家功能。B-26 是外部呼叫 stub，B-29 是原版 helper 片段，B-22 是已知有效 count 的材料及產出片段，三者不可互相冒充完整交易。

## original-item-helper-model.test.mjs

- 固定 blob：`7b25c30cc6030144d56eb8e01bd21bbcadc5ecb1`。
- 來源：custom/inc-item-data.cgi、modern/tests/original-perl/core-inc-item.cgi。
- 斷言：26–70 pin 四個 helper 及 lostbook；72–176 stock clamp、負值、overlimit、result append、零數量；178–228 nested lostbook 與嚴格門檻；230–254 fixture validation/immutability；256–279 27個原版觀察逐欄比對。
- 執行：projectOriginalItemHelper / projectOriginalLostbookWithCoreItemHelper → Perl probe。
- Fixture：人工 itemNo、stock、limit、count、observed draw；Perl 缺失可 skip。
- 限制：真正 helper 片段，不是 outer USE、合法取得或現行 RNG；負值異常不等於正式漏洞。
- 結論：有效，僅 Perl Oracle／Node 差分（隔離 helper）。

## original-item-helpers.t

- 固定 blob：`f9e1be8339032c1e7754eee44451e851c2fe550d`。
- 來源：custom/inc-item-data.cgi、modern/tests/original-perl/core-inc-item.cgi。
- 斷言：13–45 source body；47–104 helper clamp、negative count、overlimit；109–176 result arrays append/零負；179–236 lostbook 真 helper、stock/money/time/EXP、seed 與閾值。
- 執行：OriginalItemHelperHarness::bootstrap / subcall / lostbook → source extracted functions。
- Fixture：人工 $DT/$USE，seed，隔離 package。
- 限制：無真正 loader、CGI、log、存檔、正式交易。
- 結論：有效，僅 Perl Oracle（隔離 helper）。

## original-multi-item-use-model.test.mjs

- 固定 blob：`19476de4528183003bbf8bf1d44b4507721a7da1`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：41–57 原版 consume→create→一次市場→callback；59–121 原版數字、重複輸出零 row、overflow、uncoded item、負庫存；123–185 共享 RNG 順序、cap 與多店；186–214 fixture 拒絕、immutable、無 transaction。
- 執行：projectOriginalMultiItemUse → projectOriginalMakeAmount。
- Fixture：人工三槽兩店，固定正 count，注入 replay draws。
- 限制：本檔不直接執行 Perl；相鄰 .t 是獨立原版證據而非本檔自動逐欄差分。無前置 gate、金錢、時間、callback、正式 RNG/v2。
- 結論：有效，僅 純 Node 投影／來源守門（材料與產出）。

## original-multi-item-use.t

- 固定 blob：`a5d26b3ac82ce8d9e295561cc6ff1e8749299a97`。
- 來源：modern/tests/original-perl/use.cgi、modern/tests/original-perl/whole.cgi。
- 斷言：20–43 擷取 MakeAmount/材料產出 loop 並 require whole；73–107 stock、use/add/trash、一次 market 及空 list；114–140 seeded stochastic next rand 與故意 overdraw 的負庫存。
- 執行：eval run_pinned_multi_item → 原版 CheckWholeStore / MakeAmount。
- Fixture：人工 recipe、三槽兩店、seed；跳過前置 eligibility。
- 限制：非完整 USE 或正式配方；不能以負庫存 fixture 判定正式入口接受超量。
- 結論：有效，僅 Perl Oracle（材料與產出片段）。

## original-shared-use-callback-model.test.mjs

- 固定 blob：`c3d5d4dc1ac286403339545ef9d58071939a880a`。
- 來源：custom/inc-item-data.cgi。
- 斷言：22–30 pin lostbook/popup；32–69 strict draw、UseItem arguments、不宣稱 stock；71–123 popup rank cap、負值、pre-cap message、log order、無其他 mutation；125–141 fixture guards；143–170 12個 Perl cases 逐欄比對。
- 執行：projectOriginalLostbook / projectOriginalPopup → source-extracted Perl probe。
- Fixture：人工 item、rank、param、draw，UseItem / WriteLog recording stub；Perl 缺失可 skip。
- 限制：只證明呼叫與回傳／rank 算式，不證明真庫存扣除或真 log；不映射具體正式 USE。
- 結論：有效，僅 Perl Oracle／Node 差分（外部呼叫 stub）。

## original-shared-callbacks.t

- 固定 blob：`750a690ec929b65a773602ac5e00abd4d62868d8`。
- 來源：custom/inc-item-data.cgi。
- 斷言：23–51 擷取、編譯兩 source callbacks；66–96 lostbook 0/負/seed 與 arguments、stock unchanged；100–138 popup rank cap、負值、訊息與 log arguments、money/time/EXP unchanged。
- 執行：eval exact @@FUNCITEM lostbook/popup。
- Fixture：合成 $DT/$USE/@ITEM，UseItem/WriteLog recording stub。
- 限制：真正 Core item helper 未執行（與 B-29 區別）；無整體交易、loader、CGI、persist。
- 結論：有效，僅 Perl Oracle（外部呼叫 stub）。

## 證據分層

B-26 不執行 UseItem／WriteLog；B-29 執行真 item::UseItem/Sub，但沒有外層授權；B-22 有材料、產出及一次全球市場修正，但不包含 eligibility、外層費用或回呼。不可由任何一層單獨推定現行可用、可取得或可利用負數。全部 generic fixtures 不新增具體 ITEM/USE 正向 flag；保留 R1 正式 schema gate、v2、CAS 等證據獨立。
