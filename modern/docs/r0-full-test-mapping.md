# R0 全量測試清冊（收斂 #23/#24，未結案）
正式基線 233 檔（148 JS、85 Perl .t）；有效 46、歷史 17、待補 170。B56 重疊去重；既有分類為第一批證據，並非本輪全量重審。新增 2 檔獨立列於 manifest addedTests，不列入分母。
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
| economy-model.test.mjs | 待補 | 未完成語義審閱 |
| game-core-contract.test.mjs | 歷史 | fixture |
| item-limit-model.test.mjs | 待補 | 未完成語義審閱 |
| local-original-ui-layout.test.mjs | 待補 | 未完成語義審閱 |
| local-source-text.test.mjs | 待補 | 未完成語義審閱 |
| market-buy-core.test.mjs | 有效 | Perl Oracle / Node 差分 |
| original-admin-sparse-market.test.mjs | 待補 | 未完成語義審閱 |
| original-inline-work-showcase-model.test.mjs | 待補 | 未完成語義審閱 |
| original-integrated-use-lostbook-model.test.mjs | 待補 | 未完成語義審閱 |
| original-item-dynamic-loading-model.test.mjs | 待補 | 未完成語義審閱 |
| original-item-helper-model.test.mjs | 待補 | 未完成語義審閱 |
| original-market-buy10.test.mjs | 待補 | 未完成語義審閱 |
| original-multi-item-use-model.test.mjs | 待補 | 未完成語義審閱 |
| original-natural-sale-plus.test.mjs | 待補 | 未完成語義審閱 |
| original-nayuta-functurn.test.mjs | 待補 | 未完成語義審閱 |
| original-perl/backup-safety.t | 待補 | 未完成語義審閱 |
| original-perl/baseline.t | 待補 | 未完成語義審閱 |
| original-perl/lock-safety.t | 待補 | 未完成語義審閱 |
| original-perl/new-store.t | 待補 | 未完成語義審閱 |
| original-perl/original-admin-sparse-market.t | 待補 | 未完成語義審閱 |
| original-perl/original-b41-real-sale.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b42-two-rounds.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b44-period-ledger.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b45-top-prize.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b46-territory.t | 有效 | Perl Oracle（受控） |
| original-perl/original-b47-solo-sort.t | 有效 | Perl Oracle（受控） |
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
| original-perl/original-full-use-lostbook.t | 待補 | 未完成語義審閱 |
| original-perl/original-gift-map-use.t | 待補 | 未完成語義審閱 |
| original-perl/original-inline-work-showcase.t | 待補 | 未完成語義審閱 |
| original-perl/original-item-callback-contract.t | 待補 | 未完成語義審閱 |
| original-perl/original-item-helpers.t | 待補 | 未完成語義審閱 |
| original-perl/original-market-buy10.t | 待補 | 未完成語義審閱 |
| original-perl/original-multi-item-use.t | 待補 | 未完成語義審閱 |
| original-perl/original-natural-sale-plus.t | 待補 | 未完成語義審閱 |
| original-perl/original-nayuta-functurn.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-b50-guild-ledger.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-b50-period-disk.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-close-shop-archive-file.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-close-shop-effects.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-data-files-backup.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-data-write-files.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-declarative-event-cycle.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-dragon-balance.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-dynamic-population-plus.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-event-hash-order.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-event-item-param.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-guild-file-edge.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-guild-files.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-guild-period-fee.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-guildbattle-end.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-mixed-instant-gate.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-mixed-support-gate.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-multi-event-order.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-all-finance-source.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-backup-tail.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-dragon-chain.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-dragon-dignity.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-expiry-all-stages.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-full-tail-close.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-high-exp-tech.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-real-close-chain.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-period-shop-expiry.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-rebel-now.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-rebel-period-now.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-rebel-period-trigger.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-sorted-pre-event.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-time-slices.t | 待補 | 未完成語義審閱 |
| original-perl/original-r4-town-play.t | 待補 | 未完成語義審閱 |
| original-perl/original-shared-callbacks.t | 待補 | 未完成語義審閱 |
| original-perl/original-sparse-all-plus.t | 待補 | 未完成語義審閱 |
| original-perl/original-sparse-multi-plus.t | 待補 | 未完成語義審閱 |
| original-perl/original-sparse-wholesale-plus.t | 待補 | 未完成語義審閱 |
| original-perl/original-use-eligibility.t | 待補 | 未完成語義審閱 |
| original-perl/original-use-experience-transaction.t | 待補 | 未完成語義審閱 |
| original-perl/original-use-outcomes.t | 待補 | 未完成語義審閱 |
| original-perl/original-use-transaction.t | 待補 | 未完成語義審閱 |
| original-perl/original-virtual-item-require.t | 待補 | 未完成語義審閱 |
| original-perl/original-world-use-sequence.t | 待補 | 未完成語義審閱 |
| original-perl/period-experience.t | 待補 | 未完成語義審閱 |
| original-perl/period-stock-use.t | 待補 | 未完成語義審閱 |
| original-perl/showcase-market.t | 待補 | 未完成語義審閱 |
| original-perl/whole-store.t | 待補 | 未完成語義審閱 |
| original-perl/world-commit.t | 待補 | 未完成語義審閱 |
| original-perl/world-data.t | 待補 | 未完成語義審閱 |
| original-perl/world-one-shop.t | 待補 | 未完成語義審閱 |
| original-perl/world-read-safety.t | 待補 | 未完成語義審閱 |
| original-perl/world-shop-history.t | 待補 | 未完成語義審閱 |
| original-shared-use-callback-model.test.mjs | 待補 | 未完成語義審閱 |
| original-sparse-all-plus.test.mjs | 待補 | 未完成語義審閱 |
| original-sparse-multi-plus.test.mjs | 待補 | 未完成語義審閱 |
| original-sparse-wholesale-plus.test.mjs | 待補 | 未完成語義審閱 |
| original-standard-callback-inventory.test.mjs | 待補 | 未完成語義審閱 |
| original-use-eligibility-model.test.mjs | 待補 | 未完成語義審閱 |
| original-use-experience-transaction-model.test.mjs | 待補 | 未完成語義審閱 |
| original-use-outcomes-model.test.mjs | 待補 | 未完成語義審閱 |
| original-use-transaction-model.test.mjs | 待補 | 未完成語義審閱 |
| p1-advanced-medicine-persistence-http.test.mjs | 歷史 | 歷史 HTTP |
| p2-career-persistence-http.test.mjs | 歷史 | 歷史 HTTP |
| p3-forging-persistence-http.test.mjs | 待補 | 未完成語義審閱 |
| p3-pre-event-inventory.test.mjs | 待補 | 未完成語義審閱 |
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
| peer-trade-model.test.mjs | 待補 | 未完成語義審閱 |
| period-experience-model.test.mjs | 待補 | 未完成語義審閱 |
| period-stock-use-model.test.mjs | 待補 | 未完成語義審閱 |
| r2-book-work-source.test.mjs | 待補 | 未完成語義審閱 |
| r2-career-change-source.test.mjs | 待補 | 未完成語義審閱 |
| r2-career-true-player-http.test.mjs | 待補 | 未完成語義審閱 |
| r2-dairy-inline-source.test.mjs | 待補 | 未完成語義審閱 |
| r2-dairy-true-player-http.test.mjs | 待補 | 未完成語義審閱 |
| r2-declarative-use-effects.test.mjs | 待補 | 未完成語義審閱 |
| r2-gathering-http-save.test.mjs | 待補 | 未完成語義審閱 |
| r2-gathering-map-uses.test.mjs | 待補 | 未完成語義審閱 |
| r2-gift-use-variants.test.mjs | 待補 | 未完成語義審閱 |
| r2-party-popup-source.test.mjs | 待補 | 未完成語義審閱 |
| r2-potion-lostbook-http.test.mjs | 待補 | 未完成語義審閱 |
| r2-repeat-use-source.test.mjs | 待補 | 未完成語義審閱 |
| r2-self-advertisement-source.test.mjs | 待補 | 未完成語義審閱 |
| r2-showcase-resize-discard-http.test.mjs | 待補 | 未完成語義審閱 |
| r2-source-manufacturing-http-save.test.mjs | 待補 | 未完成語義審閱 |
| r2-target-advertisement-local-http.test.mjs | 待補 | 未完成語義審閱 |
| r2-target-advertisement-source.test.mjs | 待補 | 未完成語義審閱 |
| r2c-unified-market-http.test.mjs | 待補 | 未完成語義審閱 |
| r2d-unified-use-item.test.mjs | 待補 | 未完成語義審閱 |
| r2e-source-buy-use-http-save.test.mjs | 待補 | 未完成語義審閱 |
| r3-real-sword-http-restart.test.mjs | 待補 | 未完成語義審閱 |
| r3-shared-natural-sale.test.mjs | 待補 | 未完成語義審閱 |
| r3-shared-sword-acquisition-sales.test.mjs | 待補 | 未完成語義審閱 |
| r4-declarative-event-cycle.test.mjs | 待補 | 未完成語義審閱 |
| r4-dynamic-population-plus.test.mjs | 待補 | 未完成語義審閱 |
| r4-event-item-param.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-guildbattle-end-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-happy-now-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-instant-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-iron-sword-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-loto-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-rebel-now-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-mixed-support-gate.test.mjs | 待補 | 未完成語義審閱 |
| r4-multi-event-order.test.mjs | 待補 | 未完成語義審閱 |
| r4-original-event-hash-order.test.mjs | 待補 | 未完成語義審閱 |
| r4-original-time-slices.test.mjs | 待補 | 未完成語義審閱 |
| r4-p3-pre-event-overlay.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-all-finance-same-world-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-dragon-dignity-same-world-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-dragon-same-world-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-expiry-all-stages-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-full-tail-close-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-high-exp-tech-same-world-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-period-real-close-source-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-perl-hash-replay.test.mjs | 待補 | 未完成語義審閱 |
| r4-reviewed-time-http-history.test.mjs | 有效 | 受控 HTTP/CAS |
| r4-sorted-pre-event.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-b50-archive-disk-chain.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-b50-guild-ledger.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-b50-period-disk.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-backup-disk.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-cas-http-save-restart.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-close-shop-archive-file.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-close-shop-effects.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-data-write-files.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-dragon-balance.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-guild-files.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-guild-period-fee.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-guildbattle-end.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-period-backup-tail.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-period-shop-expiry.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-rebel-now.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-rebel-period-now.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-rebel-period-trigger.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-town-play.test.mjs | 待補 | 未完成語義審閱 |
| r4-source-world-transition-cas-guard.test.mjs | 待補 | 未完成語義審閱 |
| reviewed-gift-map-use.test.mjs | 待補 | 未完成語義審閱 |
| reviewed-use-fixture-street.test.mjs | 待補 | 未完成語義審閱 |
| source-audit.test.mjs | 有效 | 靜態來源 |
| standard-init.test.mjs | 待補 | 未完成語義審閱 |
| standard-street-model.test.mjs | 待補 | 未完成語義審閱 |
| wholesale-turn-model.test.mjs | 待補 | 未完成語義審閱 |
| world-backup-preflight.test.mjs | 待補 | 未完成語義審閱 |
| world-commit-plan.test.mjs | 待補 | 未完成語義審閱 |
| world-lock-contract.test.mjs | 待補 | 未完成語義審閱 |
| world-one-shop-parser.test.mjs | 待補 | 未完成語義審閱 |
| world-read-preflight.test.mjs | 待補 | 未完成語義審閱 |
| world-shop-history-model.test.mjs | 待補 | 未完成語義審閱 |
| world-wholesale-codec.test.mjs | 待補 | 未完成語義審閱 |

## 候選新增（不列入正式基線）
- modern/tests/r0-r1-baseline-audit.test.mjs：稽核工具；#23 已有 CI，整合候選待驗。
- modern/tests/r1-formal-startup-legacy-rejection.test.mjs：正式入口負向回歸；#24 已有 CI，整合候選待驗。
