# R0 全量測試清冊（收斂 #23/#24，未結案）
正式基線 233 檔（148 JS、85 Perl .t）；有效 200、歷史 33、待補 0。B56 重疊去重；既有 63 份分類中 20 份已重新逐檔覆核（其餘 43 待覆核）；收斂後累計另逐檔審閱 170 份，並非全量重審。新增 5 檔獨立列於 manifest addedTests，不列入分母。
[Canonical manifest](r0-r1-baseline-manifest.json)；[B41–B63 原始逐檔證據](r0-b41-b63-evidence.md)。保留 [R2-E](r2e-r0-affected-tests-mapping.md) / [R3](r3-r0-affected-tests-mapping.md) / [R4](r4-r0-affected-tests-mapping.md) 歷史映射。未完成語義審閱不得升格。

| 測試路徑（相對 modern/tests） | 狀態 | 證據 |
|---|---|---|
| b41-real-playable-sale.test.mjs | 歷史 | 舊 HTTP／CAS＋Perl 差分 |
| b42-continuous-shop.test.mjs | 歷史 | 舊 HTTP／CAS＋Perl 差分 |
| b43-durable-world-save.test.mjs | 歷史 | 舊存檔／HTTP/CAS fixture |
| b44-period-ledger.test.mjs | 有效 | Perl Oracle／Node 差分（純投影） |
| b45-period-top-prize.test.mjs | 有效 | Perl Oracle／Node 差分（純投影） |
| b46-period-territory.test.mjs | 有效 | Perl Oracle／Node 差分（純投影） |
| b47-period-solo-sort.test.mjs | 有效 | Perl Oracle／Node 差分（純投影） |
| b48-original-event-start.test.mjs | 有效 | Perl Oracle／Node 差分（受控） |
| b49-original-event-lifecycle.test.mjs | 有效 | Perl Oracle／Node 差分（受控） |
| b50-period-same-state-chain.test.mjs | 有效 | Perl Oracle／Node 差分（不可提交前綴） |
| b51-source-city-period-world.test.mjs | 歷史 | fixture／舊 CAS 存檔 |
| b52-event-bootstrap-source.test.mjs | 有效 | Perl Oracle／Node 差分 |
| b53-event-catalog-source.test.mjs | 有效 | Perl Oracle／Node 差分（編譯） |
| b54-repeatable-source-command-draws.test.mjs | 歷史 | fixture／現代 policy |
| b55-source-event-callbacks-live-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b56-source-event-time-slice.test.mjs | 歷史 | fixture CAS |
| b57-source-support-events-live-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b58-source-loto-real-ticket-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b59-source-iron-event-live-lifecycle.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b60-source-happy-nowfunc-live-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b61-source-sword-demand-live-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b62-real-sword-market-map-sale-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| b63-source-all-sword-map-outcomes-cas.test.mjs | 歷史 | Perl 差分＋fixture CAS |
| economy-model.test.mjs | 有效 | 純投影／來源公式 |
| game-core-contract.test.mjs | 歷史 | fixture |
| item-limit-model.test.mjs | 有效 | 來源守門／純編譯 |
| local-original-ui-layout.test.mjs | 有效 | 靜態 UI／handler wiring 回歸 |
| local-source-text.test.mjs | 有效 | 來源守門／記憶體負向 |
| market-buy-core.test.mjs | 有效 | Perl Oracle / Node 差分 |
| original-admin-sparse-market.test.mjs | 有效 | Perl Oracle／Node 差分（舊 memory CAS） |
| original-inline-work-showcase-model.test.mjs | 有效 | Perl Oracle／Node 差分（純 callback 投影） |
| original-integrated-use-lostbook-model.test.mjs | 有效 | Perl Oracle／Node 差分（合成完整 USE 順序） |
| original-item-dynamic-loading-model.test.mjs | 有效 | Perl Oracle／Node 差分（虛擬 require） |
| original-item-helper-model.test.mjs | 有效 | Perl Oracle／Node 差分（隔離 helper） |
| original-market-buy10.test.mjs | 有效 | 混合：Perl Oracle／Node 差分＋歷史 HTTP/CAS |
| original-multi-item-use-model.test.mjs | 有效 | 純 Node 投影／來源守門（材料與產出） |
| original-natural-sale-plus.test.mjs | 有效 | Perl Oracle／Node 差分（受控自然販售＋PLUS） |
| original-nayuta-functurn.test.mjs | 有效 | Perl Oracle／Node 差分（受控 FUNCTURN） |
| original-perl/backup-safety.t | 有效 | 原版 Perl Oracle／不安全歷史語義 |
| original-perl/baseline.t | 有效 | 原版 Perl Oracle |
| original-perl/lock-safety.t | 有效 | 原版 Perl Oracle／歷史鎖 |
| original-perl/new-store.t | 有效 | Perl Oracle（隔離 new.cgi） |
| original-perl/original-admin-sparse-market.t | 有效 | Perl Oracle（隔離 init/gift） |
| original-perl/original-b41-real-sale.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b42-two-rounds.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b44-period-ledger.t | 有效 | 原版 Perl Oracle（受控） |
| original-perl/original-b45-top-prize.t | 有效 | 原版 Perl Oracle（受控） |
| original-perl/original-b46-territory.t | 有效 | 原版 Perl Oracle（受控） |
| original-perl/original-b47-solo-sort.t | 有效 | 原版 Perl Oracle（受控） |
| original-perl/original-b48-event-start.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b49-event-lifecycle.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b50-period-chain.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b52-event-wire.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b53-event-catalog.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b55-instant-event-callback.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b57-support-event.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b58-loto-event.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b59-iron-event.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b60-happy-event.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b61-sword-demand.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b62-sword-map-use.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b63-sword-map-all-outcomes.t | 有效 | Perl Oracle（受控） |
| original-perl/original-full-use-lostbook.t | 有效 | Perl Oracle（合成完整 USE 順序） |
| original-perl/original-gift-map-use.t | 有效 | 原版 Perl Oracle（隔離 compiler／Core） |
| original-perl/original-inline-work-showcase.t | 有效 | Perl Oracle（原版隔離 callback） |
| original-perl/original-item-callback-contract.t | 有效 | 靜態來源守門（Perl Test::More） |
| original-perl/original-item-helpers.t | 有效 | Perl Oracle（隔離 helper） |
| original-perl/original-market-buy10.t | 有效 | 原版 Perl Oracle（隔離 CGI） |
| original-perl/original-multi-item-use.t | 有效 | Perl Oracle（材料與產出片段） |
| original-perl/original-natural-sale-plus.t | 有效 | Perl Oracle（受控自然販售＋PLUS） |
| original-perl/original-nayuta-functurn.t | 有效 | Perl Oracle（受控 FUNCTURN） |
| original-perl/original-r4-b50-guild-ledger.t | 有效 | Perl Oracle（隔離公會磁碟） |
| original-perl/original-r4-b50-period-disk.t | 有效 | Perl Oracle（隔離 period disk tail） |
| original-perl/original-r4-close-shop-archive-file.t | 有效 | 原版 Oracle（真隔離封存磁碟） |
| original-perl/original-r4-close-shop-effects.t | 有效 | 原版 Perl Oracle（CloseShop／真 session unlink） |
| original-perl/original-r4-data-files-backup.t | 有效 | 原版 Oracle（真隔離備份 prelude／部分失敗） |
| original-perl/original-r4-data-write-files.t | 有效 | 原版 Oracle（真隔離 DataWrite／rename／DataRead） |
| original-perl/original-r4-declarative-event-cycle.t | 有效 | Perl Oracle（隔離 END/START） |
| original-perl/original-r4-dragon-balance.t | 有效 | 原版 Perl Oracle（龍賽檔案／ledger） |
| original-perl/original-r4-dynamic-population-plus.t | 有效 | Perl Oracle（動態人口 PLUS） |
| original-perl/original-r4-event-hash-order.t | 有效 | Perl Oracle（hash 觀測） |
| original-perl/original-r4-event-item-param.t | 有效 | Perl Oracle（原版 PARAM compiler） |
| original-perl/original-r4-guild-file-edge.t | 有效 | Perl Oracle（公會檔案邊界） |
| original-perl/original-r4-guild-files.t | 有效 | Perl Oracle（隔離公會磁碟） |
| original-perl/original-r4-guild-period-fee.t | 有效 | Perl Oracle（單店會費呼叫） |
| original-perl/original-r4-guildbattle-end.t | 有效 | Perl Oracle（單 EVENT END） |
| original-perl/original-r4-mixed-instant-gate.t | 有效 | Perl Oracle（混合 17-key callback 群） |
| original-perl/original-r4-mixed-support-gate.t | 有效 | Perl Oracle（混合 support STARTFUNC） |
| original-perl/original-r4-multi-event-order.t | 有效 | Perl Oracle（17-key 受控切片） |
| original-perl/original-r4-period-all-finance-source.t | 有效 | 原版 Perl Oracle（兩期財務 prefix） |
| original-perl/original-r4-period-backup-tail.t | 有效 | 原版 Oracle（真隔離三代備份與 session mtime） |
| original-perl/original-r4-period-dragon-chain.t | 有效 | 原版 Perl Oracle（兩期龍賽 prefix） |
| original-perl/original-r4-period-dragon-dignity.t | 有效 | 原版 Perl Oracle（兩期龍賽／爵位 prefix） |
| original-perl/original-r4-period-expiry-all-stages.t | 有效 | 原版 Perl Oracle（兩期 expiry 呼叫／財務／技術） |
| original-perl/original-r4-period-full-tail-close.t | 有效 | 原版 Oracle（同程序兩期真關店與隔離備份尾段） |
| original-perl/original-r4-period-high-exp-tech.t | 有效 | 原版 Perl Oracle（兩期高 EXP 技術遺失） |
| original-perl/original-r4-period-real-close-chain.t | 有效 | 原版 Perl Oracle（兩期真 CloseShop／財務／prune） |
| original-perl/original-r4-period-shop-expiry.t | 有效 | 原版 Perl Oracle（缺席關店呼叫） |
| original-perl/original-r4-rebel-now.t | 有效 | Perl Oracle（單 EVENT NOW） |
| original-perl/original-r4-rebel-period-now.t | 有效 | Perl Oracle（period→NOW 單切片） |
| original-perl/original-r4-rebel-period-trigger.t | 有效 | Perl Oracle（period RebelRobin） |
| original-perl/original-r4-sorted-pre-event.t | 有效 | Perl Oracle（單店 SortDT smoke）；[第26批](r0-r4-sorted-pre-event-evidence.md) |
| original-perl/original-r4-time-slices.t | 有效 | Perl Oracle（36h 時鐘分割） |
| original-perl/original-r4-town-play.t | 有效 | Perl Oracle（真隔離 guild 讀取／town DataWrite/DataRead） |
| original-perl/original-shared-callbacks.t | 有效 | Perl Oracle（外部呼叫 stub） |
| original-perl/original-sparse-all-plus.t | 有效 | Perl Oracle（受控 PLUS） |
| original-perl/original-sparse-multi-plus.t | 有效 | Perl Oracle（受控 PLUS） |
| original-perl/original-sparse-wholesale-plus.t | 有效 | Perl Oracle（受控 PLUS） |
| original-perl/original-use-eligibility.t | 有效 | Perl Oracle（合成 eligibility） |
| original-perl/original-use-experience-transaction.t | 有效 | Perl Oracle（無回呼經驗尾段） |
| original-perl/original-use-outcomes.t | 有效 | Perl Oracle（機率與產出片段） |
| original-perl/original-use-transaction.t | 有效 | Perl Oracle（交易前段） |
| original-perl/original-virtual-item-require.t | 有效 | Perl Oracle（虛擬 require） |
| original-perl/original-world-use-sequence.t | 有效 | Perl Oracle（人工連續 USE／lostbook） |
| original-perl/period-experience.t | 有效 | Perl Oracle（固定片段） |
| original-perl/period-stock-use.t | 有效 | Perl Oracle（固定片段） |
| original-perl/showcase-market.t | 有效 | Perl Oracle（人工市場統計／sc-s CGI） |
| original-perl/whole-store.t | 有效 | Perl Oracle（人工批發定價／LIMIT） |
| original-perl/world-commit.t | 有效 | Perl Oracle（隔離多檔 marker／rename） |
| original-perl/world-data.t | 有效 | Perl Oracle（隔離 DataWrite stage） |
| original-perl/world-one-shop.t | 有效 | Perl Oracle（隔離 DataRead 店家結構） |
| original-perl/world-read-safety.t | 有效 | Perl Oracle（隔離 DataRead 負例） |
| original-perl/world-shop-history.t | 有效 | 原版 Perl Oracle／受控 DataRead |
| original-shared-use-callback-model.test.mjs | 有效 | Perl Oracle／Node 差分（外部呼叫 stub） |
| original-sparse-all-plus.test.mjs | 有效 | Perl Oracle／Node 差分（受控 PLUS） |
| original-sparse-multi-plus.test.mjs | 有效 | Perl Oracle／Node 差分（受控 PLUS） |
| original-sparse-wholesale-plus.test.mjs | 有效 | Perl Oracle／Node 差分（受控 PLUS） |
| original-standard-callback-inventory.test.mjs | 有效 | 靜態來源回呼清冊 |
| original-use-eligibility-model.test.mjs | 有效 | Perl Oracle／Node 差分（合成 eligibility） |
| original-use-experience-transaction-model.test.mjs | 有效 | Perl Oracle／Node 差分（無回呼經驗尾段） |
| original-use-outcomes-model.test.mjs | 有效 | 純 Node 投影／來源守門（機率與產出） |
| original-use-transaction-model.test.mjs | 有效 | 純 Node 投影／來源守門（交易前段） |
| p1-advanced-medicine-persistence-http.test.mjs | 歷史 | 歷史 HTTP |
| p2-career-persistence-http.test.mjs | 歷史 | 歷史 HTTP |
| p3-forging-persistence-http.test.mjs | 有效 | 混合：正式 HTTP/v2 固定時鐘＋歷史 v1（分段） |
| p3-pre-event-inventory.test.mjs | 有效 | Perl Oracle／Node 差分（受控 pre-EVENT） |
| p3-v2-appraiser-skill.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-cross-period-long-history.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-cross-period-nayuta.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-cross-period-ordinary-multishelf.test.mjs | 有效 | HTTP/CAS |
| p3-v2-high-forge-20.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-high-forge-21.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-high-forge-22.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-high-forge-23.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-high-forge-66.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-two-checkpoint-rotations.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p3-v2-written-accessory-book.test.mjs | 有效 | 受控 HTTP/CAS + v2 重啟 |
| p4-dairy-death-and-save-security.test.mjs | 有效 | HTTP/CAS |
| p4-dairy-v2-player-http.test.mjs | 有效 | HTTP/CAS |
| p5-book-work-market-source.test.mjs | 有效 | Perl Oracle |
| p5-book-work-v2-player-http.test.mjs | 有效 | HTTP/CAS |
| peer-trade-model.test.mjs | 有效 | Node 純記憶體 peer trade 投影（非 CAS） |
| period-experience-model.test.mjs | 有效 | 來源守門／純 EXP 投影 |
| period-stock-use-model.test.mjs | 有效 | 來源守門／純 stock/USE preflight |
| r2-book-work-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-career-change-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-career-true-player-http.test.mjs | 歷史 | 舊 HTTP／CAS（固定時鐘/RNG） |
| r2-dairy-inline-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-dairy-true-player-http.test.mjs | 歷史 | 舊 HTTP／CAS＋v1 recovery（固定時鐘/RNG） |
| r2-declarative-use-effects.test.mjs | 有效 | Perl Oracle／Node 差分（人工配方材料＋記憶體 CAS） |
| r2-gathering-http-save.test.mjs | 歷史 | 舊 HTTP／CAS／v1 fixture |
| r2-gathering-map-uses.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-gift-use-variants.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-party-popup-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-potion-lostbook-http.test.mjs | 歷史 | 舊 HTTP／CAS／v1 fixture |
| r2-repeat-use-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-self-advertisement-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2-showcase-resize-discard-http.test.mjs | 歷史 | 舊 HTTP／CAS／v1 fixture |
| r2-source-manufacturing-http-save.test.mjs | 歷史 | 舊 HTTP／CAS／v1 fixture |
| r2-target-advertisement-local-http.test.mjs | 歷史 | 舊 HTTP／CAS／v1 fixture |
| r2-target-advertisement-source.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| r2c-unified-market-http.test.mjs | 歷史 | 舊 HTTP／CAS＋Perl 差分 |
| r2d-unified-use-item.test.mjs | 有效 | Perl Oracle／Node 差分（受控取得與記憶體 CAS） |
| r2e-source-buy-use-http-save.test.mjs | 歷史 | 舊 HTTP／CAS＋Perl 差分 |
| r3-real-sword-http-restart.test.mjs | 歷史 | 舊 HTTP／CAS／v1 fixture |
| r3-shared-natural-sale.test.mjs | 有效 | Perl Oracle／Node 差分（受控自然販售與 pre-EVENT 純投影） |
| r3-shared-sword-acquisition-sales.test.mjs | 歷史 | 舊時間命令／記憶體 CAS＋legacy v1 真隔離磁碟 |
| r4-declarative-event-cycle.test.mjs | 有效 | Perl Oracle／Node 差分（純單 EVENT 投影） |
| r4-dynamic-population-plus.test.mjs | 有效 | Perl Oracle／Node 差分（動態人口 PLUS） |
| r4-event-item-param.test.mjs | 有效 | Perl Oracle／Node 差分（純 PARAM 投影） |
| r4-mixed-guildbattle-end-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 guildbattle-end EVENT） |
| r4-mixed-happy-now-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 happy-now EVENT） |
| r4-mixed-instant-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 instant STARTFUNC） |
| r4-mixed-iron-sword-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 iron-sword EVENT） |
| r4-mixed-loto-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 loto EVENT） |
| r4-mixed-rebel-now-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 rebel-now EVENT） |
| r4-mixed-support-gate.test.mjs | 有效 | Perl Oracle／Node 差分（混合 support STARTFUNC） |
| r4-multi-event-order.test.mjs | 有效 | Perl Oracle／Node 差分（17-key 受控投影） |
| r4-original-event-hash-order.test.mjs | 有效 | Perl Oracle（hash 觀測，JS wrapper） |
| r4-original-time-slices.test.mjs | 有效 | Perl Oracle／Node 差分（36h 時鐘分割） |
| r4-p3-pre-event-overlay.test.mjs | 有效 | 原版 Oracle／Node 差分＋受控記憶體 CAS＋隔離磁碟 |
| r4-period-all-finance-same-world-chain.test.mjs | 有效 | 原版 Oracle／Node 差分（兩期財務 prefix） |
| r4-period-dragon-dignity-same-world-chain.test.mjs | 有效 | 原版 Oracle／Node 差分（兩期龍賽／爵位 prefix） |
| r4-period-dragon-same-world-chain.test.mjs | 有效 | 原版 Oracle／Node 差分（兩期龍賽 prefix） |
| r4-period-expiry-all-stages-chain.test.mjs | 有效 | 原版 Oracle／Node 差分（兩期 expiry 呼叫／財務／技術） |
| r4-period-full-tail-close-chain.test.mjs | 有效 | Perl Oracle／Node 差分（兩期真關店＋真隔離備份尾段） |
| r4-period-high-exp-tech-same-world-chain.test.mjs | 有效 | 原版 Oracle／Node 差分（兩期高 EXP 技術遺失） |
| r4-period-real-close-source-chain.test.mjs | 有效 | Perl Oracle／Node 差分（兩期真 CloseShop／財務／prune） |
| r4-perl-hash-replay.test.mjs | 有效 | 來源差分／受控 RNG |
| r4-reviewed-time-http-history.test.mjs | 有效 | 受控 HTTP/CAS |
| r4-sorted-pre-event.test.mjs | 有效 | Perl Oracle／Node 差分（單店 SortDT）；[第26批](r0-r4-sorted-pre-event-evidence.md) |
| r4-source-b50-archive-disk-chain.test.mjs | 有效 | Perl Oracle／Node 差分＋Node 真隔離封存（非兩期原版磁碟差分） |
| r4-source-b50-guild-ledger.test.mjs | 有效 | Perl Oracle／Node 差分（隔離公會磁碟） |
| r4-source-b50-period-disk.test.mjs | 有效 | Perl Oracle／Node 差分（隔離 B50 磁碟） |
| r4-source-backup-disk.test.mjs | 有效 | Perl Oracle／Node 差分（真隔離備份磁碟／失敗拒絕） |
| r4-source-cas-http-save-restart.test.mjs | 歷史 | legacy HTTP／雙世代 fixture |
| r4-source-close-shop-archive-file.test.mjs | 有效 | Perl Oracle／Node 差分（真隔離封存磁碟） |
| r4-source-close-shop-effects.test.mjs | 有效 | Perl Oracle／Node 差分（CloseShop 真 session unlink、封存文字／SortDT） |
| r4-source-data-write-files.test.mjs | 有效 | Perl Oracle／Node 差分（真隔離單檔 stage/rename/recovery） |
| r4-source-dragon-balance.test.mjs | 有效 | 原版 Oracle／Node 差分（龍賽檔案／純 ledger） |
| r4-source-guild-files.test.mjs | 有效 | Perl Oracle／Node 差分（隔離公會磁碟） |
| r4-source-guild-period-fee.test.mjs | 有效 | Perl Oracle／Node 差分（單店會費呼叫） |
| r4-source-guildbattle-end.test.mjs | 有效 | Perl Oracle／Node 差分（單 EVENT END） |
| r4-source-period-backup-tail.test.mjs | 有效 | Perl Oracle／Node 差分（真隔離備份／純投影） |
| r4-source-period-shop-expiry.test.mjs | 有效 | 原版 Oracle／Node 差分（缺席關店呼叫） |
| r4-source-rebel-now.test.mjs | 有效 | Perl Oracle／Node 差分（單 EVENT NOW） |
| r4-source-rebel-period-now.test.mjs | 有效 | Perl Oracle／Node 差分（period→NOW 單切片） |
| r4-source-rebel-period-trigger.test.mjs | 有效 | Perl Oracle／Node 差分（period RebelRobin） |
| r4-source-town-play.test.mjs | 有效 | Perl Oracle／Node 差分（真隔離 town stage/rename/recovery） |
| r4-source-world-transition-cas-guard.test.mjs | 歷史 | 舊 CAS／nonCommittable 與 legacy store |
| reviewed-gift-map-use.test.mjs | 有效 | Perl Oracle／Node 差分（受控 memory） |
| reviewed-use-fixture-street.test.mjs | 有效 | Perl Oracle／Node 差分（人工 A/B/C＋記憶體 CAS） |
| source-audit.test.mjs | 有效 | 靜態來源 |
| standard-init.test.mjs | 有效 | 來源宣告／靜態 parser |
| standard-street-model.test.mjs | 有效 | 來源守門／純模型 |
| wholesale-turn-model.test.mjs | 有效 | 來源守門／純 PLUS 投影 |
| world-backup-preflight.test.mjs | 歷史 | 舊備份／鎖純規劃 |
| world-commit-plan.test.mjs | 歷史 | 舊 CGI commit 純規劃 |
| world-lock-contract.test.mjs | 歷史 | 純投影／歷史檔鎖 fixture |
| world-one-shop-parser.test.mjs | 有效 | 來源守門／純 parser |
| world-read-preflight.test.mjs | 有效 | 來源守門／純 parser |
| world-shop-history-model.test.mjs | 有效 | 來源守門／純 parser |
| world-wholesale-codec.test.mjs | 有效 | 來源守門／純 codec |

## 候選新增（不列入正式基線）
- modern/tests/r0-r1-baseline-audit.test.mjs：稽核工具；#23 已有 CI，整合候選待驗。
- modern/tests/r1-formal-startup-legacy-rejection.test.mjs：正式入口負向回歸；#24 已有 CI，整合候選待驗。

- modern/tests/r1-http-persistence-contract.test.mjs：正式 HTTP/v2 負向及競爭回歸，整合候選待驗。
- modern/tests/r1-v2-fresh-negative-replay.test.mjs：正式 v2 fresh replay 九種負向變體、雙槽全損拒絕與復原；整合候選待驗。
- modern/tests/r1-v2-inner-checkpoint.test.mjs：真玩家 checkpoint 內層八種隔離負向回歸，外層 HMAC 通過、獨立原因與 HTTP 復原；待 CI。

[第四十二批重新覆核](r0-b41-b43-rereview-evidence.md)：B41–43 五檔分類不變，實際逐檔190/233，R1下界不變。
