# R0 第十六批：B-38 自然販售／B-39 #70 FUNCTURN 逐檔證據

固定正式基線 `08fdd3b31ff130e66d0337360430fda3d73fdc8d`。B-38 harness 擷取原版 inc-turn 自然販售區段，載入原版 market/item/core-detail，再接 B-35 PLUS fragment／CheckWholeStore；B-39 另從 DSL 擷取 #70 inline body，以隔離 item wrapper eval，實際執行原版 FUNCTURN dispatcher，再接 PLUS。B-38 不執行回呼；兩者均略過 SortDT、period、完整 CGI，固定單店單架與人工庫存、人口、初始資產及亂數。Node 為舊受控 memory command，時間戳未前進，不升格現行正式玩家。

## original-natural-sale-plus.test.mjs
- Blob: `56880dc270355e1524bd146e0aa449c6b7a8e65a`。
- 斷言：69–97：capability、1728秒及 source drift；98–120：空架原版差分；121–157：人工 #10 的販售、稅、人氣、成本、記錄、CSV/defined slots 與 draw 順序；158–194：缺／多／錯 draws、stale、額外欄位、無庫存拒絕及 memory 不變（最後無庫存案例僅斷言拒絕碼）。
- 執行：execFileSync original-natural-sale-plus-probe.pl；createStandardStreetModule + executeMemoryCommand reviewed-natural-sale-plus。
- 邊界：固定 now=1000000，人工 #10 庫存／上架、明示 draws；非 FUNCTURN/FUNCSALE、SortDT、period、完整 CGI 或正式 HTTP/v2。
- 分類：有效（Perl Oracle／Node 差分（受控自然販售＋PLUS）），非正式玩家。

## original-natural-sale-plus.t
- Blob: `7937a8b6071663c8a9c327b333cbf6a1d39d52e1`。
- 斷言：10–16：原版區段標記及排除 SortDT；17–38：人工 #10 售1、105000G、日售5000、稅0、trush5001、cost1、temprank6010、售出記錄、#10 cap10、60 sparse slots、79 槽與 consumed draws；39–48：空架無售、100000G、cost/trush1、temprank5010、definedness 同。
- 執行：OriginalNaturalSalePlusHarness::run；直接 Perl .t。
- 邊界：單店單架，1728秒，固定初始資產與人口、人工庫存、明示 draws；只執行原版自然區段與 B35SourceStep，非完整 CGI/時間/正式存檔。
- 分類：有效（Perl Oracle（受控自然販售＋PLUS）），非正式玩家。

## original-nayuta-functurn.test.mjs
- Blob: `8b55b3a8f4b5ae4ab0c259f4ad7611ba81351a85`。
- 斷言：65–94：#70 唯一 FUNCTURN、8640秒、100 rank、point20000、source drift；95–121：空架差分；122–152：人工 #70 庫存、未售、rank+100、callback log、sparse 61槽／#70 cap0；153–171：60秒機率兩支、超價、rank cap 與原版差分；172–218：公開 PLUS 上界、非法 draws、stale、額外欄位及偽造 fixture 原子拒絕。
- 執行：execFileSync original-nayuta-functurn-probe.pl；executeMemoryCommand reviewed-nayuta-functurn；projectNayutaCallbackOnly。
- 邊界：固定 now=1000000，人工 #70、明示 draws、單架；8640秒只走內部受控路徑，60秒 callback-only 是純投影；非正式時間、合法取得、自然售出 #70 或 HTTP/v2。
- 分類：有效（Perl Oracle／Node 差分（受控 FUNCTURN）），非正式玩家。

## original-nayuta-functurn.t
- Blob: `74ccf29344d0dd1405f8d9a78c1e3d1e7c843a16`。
- 斷言：9–19：原版 inline 與 dispatcher 標記；20–39：人工 #70 未售、money100000、cost/trush7、temprank6010、rank5107、log、cap0、61槽；40–53：空架 rank5007、cost/trush5、無 callback log、60槽、draw差1；54–67：60秒 RNG 0/999999、50001超價、rank cap10000。
- 執行：OriginalNayutaFuncturnHarness::run + callback_only；直接 Perl .t。
- 邊界：固定單店單架、人工 #70、明示 draws；原版 inline 用隔離 wrapper eval，實際 dispatcher 執行，略過 FUNCSALE/SortDT/period/CGI；無正式合法取得或 v2。
- 分類：有效（Perl Oracle（受控 FUNCTURN）），非正式玩家。

## 功能矩陣補鏈

ITEM #10：B-38 人工庫存售出一件及原版販售、稅（僅零稅案例）、人氣、成本、PLUS 差分；ITEM #70：B-39 人工庫存未售、原版 FUNCTURN 與 Node 對照，包含低於1 rank 的受控 RNG 分支、等價／超價、人氣上限。#70 market-buy registry 仍 false，正式 lawfulAcquisition、HTTP、reviewedTime、v2 未證明。既有 P3 正向歷史敘述並非本批精確測試證據，不在此提升正式下界。全79槽比對不硬映射其餘商品。

## 已核對前候選 CI

[45809746831](https://github.com/Prysline/akimono/actions/runs/45809746831) job 139874181899 completed/success；HEAD `6499ac2d552d047bf4eb6d74787af18b5d89cc5f`、實際 checkout `f2e9aefd8b3587596bae9c24114469c07f330965`、兩者 tree `9ecfa3a6d8d13721d5383f041fddd32635efead5`。JS1350/1350、0 fail/skip/cancelled，Perl 2456/2456（85檔），source/DSL pins 通過。此證據只適用前候選；新文件與 manifest 待新 CI。
