# R0 第25批：R4 時鐘分割與動態人口 PLUS

固定上批 HEAD `dcbc5fad1b88b014f1b08fd9c9423fbb2e4a7b6d`。四份測試逐檔審閱、兩 probe、原版 PLUS harness 與 Node projector。時鐘分割不等於實際 36h 結算；人工 post-period population 不等於正式人口狀態。未本地重跑。

## r4-original-time-slices.test.mjs

- 九例 raw/effective slices、lastTime/now、settlement flag；36h=129600、shift10800；config/turn marker drift、負/非整數/倒退/溢位/128 boundaries cap 拒絕。
- 分類：有效；Perl Oracle／Node 差分（36h 時鐘分割）
- Fixture：固定 last/now、九 clock cases
- 限制：只執行原版 clock partition；probe 固定 TZ=32400、DATE_REVISE=21600、period129600，Node marker 檢查 config；effective 去零尾，非實際 period/SortDT/PLUS/EVENT/clock service/CAS/HTTP/v2。

## original-r4-time-slices.t

- probe exit/JSON；九 cases、exact boundary [1,60],[0,0]、雙 boundary [1,60],[1,129600],[0,60]、起於 boundary 不重結算、逐案 lastTime/now 恢復。
- 分類：有效；Perl Oracle（36h 時鐘分割）
- Fixture：固定原版時鐘變數
- 限制：只執行擷取的 unchanged inc-turn partition；配置常值由 probe 指派；非真時鐘、結算或存檔。

## r4-dynamic-population-plus.test.mjs

- 三人口 250000/500000/750000，120秒；比79槽 wholesale/defined indices/CSV/drawsUsed；非500000缺 r4PeriodPopulation mode 拒絕；非法人口 0/-1/1.5/null/MAX_SAFE_INTEGER 拒絕、原始 world 不變。
- 分類：有效；Perl Oracle／Node 差分（動態人口 PLUS）
- Fixture：memory initialize-source-market/open-shop，人工 PERIOD_WORLD_SCHEMA 與 period.dtPeople，120秒、全零 draws
- 限制：實際 memory 初始化與開店，之後人工 period envelope 只供純 projector、不提交；Perl 執行59 PLUS＋full CheckWholeStore；probe 118零樣本只返回 consumed prefix，Node 用該 prefix；非實際人口生成、合法79商品取得、正式 period/HTTP/CAS/v2。

## original-r4-dynamic-population-plus.t

- probe exit/JSON；三指定人口、各79 wholesale、draw count 等於 consumedSamples、#10 在低/高人口 stock 不同。
- 分類：有效；Perl Oracle（動態人口 PLUS）
- Fixture：人工單店初始 #63/#79、空 sparse wholesale、三人口、120秒與零亂數
- 限制：固定 GetTime 編譯59 PLUS、原版 inc-turn PLUS 與整個 CheckWholeStore；只核 consumed prefix，非全部118 draws 皆耗盡；非完整 CGI/合法取得/自然售出/正式結算。


### CI 補核：第16及18批

- run 45812881914 / job 139884994194：success，實際 checkout `161420e6fe1a81bfbc1503171cb6680109e1b14c`，tree `62f97bbcd1341a7e9202dda33facb9239f840a4a` 等於 HEAD `85882a1fa1d5f9aa6797507448e4296792a7bd60` tree。
- run 45813274369 / job 139886364325：success，實際 checkout `145516bf05207275c62b51d34ed5fa62ad0a37b2`，tree `9a5c64ecd7f56d50e0ff3b8496ddb5cee243e50c` 等於 HEAD `3ddcb0ca6890a14d5039a52bfd23f8b3458ad83a` tree。
- 兩 run 實際 JS 1350 tests / 1349 pass / 0 fail / 0 cancelled / 1 skip（P4 actual cow mortality: save before replacing, reload, NEED denial, legal replacement；No cow death occurred in bounded real player experiment），Perl 2456/2456、85檔 PASS；DSL/source pins 全通過。固定測試已存在 conditional skip；不是新確認程式故障，也不證該兩次死亡後完整鏈。先前 1350/1350 不替代這兩 run 或更新候選。

