# R0 第三十五批：R4 town / guildbattle END / play 磁碟

正式 baseline HEAD `08fdd3b31ff130e66d0337360430fda3d73fdc8d`；候選父 HEAD `0e875d4cc00a6e48c281229c71e96606d4dcdaa2`。兩份測試逐檔審閱；沿用固定來源，不修改 runtime。

## original-r4-town-play.t

- L6–19：原版直接執行 guildbattle END，真隔離 ReadGuild/ReadGuildData，beta2000 勝 alpha1000；zero 保留、comma/percent/newline escape、GetTownData decode key 而 SetTownData encode key（raw escaped,key 取不到）；第二輪 DataRead 真讀前一輪 town，empty 刪除，beta 持續，staged/live 相等。
- Probe L67–94 原版函式擷取、require 與 DSL END body eval；L113–118 預置 owned-lock/fresh backup；L148–156 人工 guild/config/ledger；L158–200 兩次實際 DataWrite/commit，中間 DataRead 後人工修改 shop。probe scope 的 no guild IO 只適用寫入，實際有 guild 讀取。

## r4-source-town-play.test.mjs

- L39–72：解析 town row 作 map 比較，其他 rows exact；兩輪 Node 真隔離讀 guild 檔、END 投影、Set/GetTownData、log、stage/commit/readback；town 繼承真 readback，其餘重新取 Oracle input。Node active END 由固定 start1000000/span3600/expiry1003599/draw0 驅動，Perl 則直接呼叫 callback。
- L73–81：SHA drift、duplicate map、非法 %zz/%ff、舊 one-key serializer 拒絕、多 key town serializer 接受；L82–93：live path directory 阻擋 Node rename、pending commit 拒絕讀、recover 後 town reload。
- town module L12–18 SHA/WeakSet review，L19–39 escape 與 key 不對稱，L40–61 map 與 serializer，L69–95 read 與 END 投影（ledgerAfter 不寫入），L97–115 stage/rename；readTownPlay 僅檢查 separator 並讀 town，不是全 world parser。空 marker removal 未證。

## 來源與限定

- 原版來源 SHA：
  - `custom/inc-rebel-data.cgi` `923634e58a05beca9ab004515fc7669d53a1ba3a`
  - `modern/tests/original-perl/write.cgi` `203f33b37511e838800a45b84183af98fcf46e4c`
  - `modern/tests/original-perl/inc-func.cgi` `e7a8add7b0291901e71fe797783b664dff1568a0`
  - `modern/tests/original-perl/core-detail.cgi` `9a83d26fb29edee4032958f1e6de837a250f3384`
  - `modern/tests/original-perl/lock.cgi` `84382170f1b7f70348c4e2a91bf30b1d1043b964`
  - `modern/tests/original-perl/pinned-custom.cgi` `93d7f77df648df0c46e5dca4763afd3d2c48654b`
  - `modern/tests/original-perl/pinned-guild.cgi` `6593aa8a3ae4a1695c2418f12a3776f0053454ac`
  - `modern/tests/original-perl/pinned-guildsub.cgi` `4dee1edeeedf3b482b8786111e1e5d626095f8d5`
  - `modern/tests/original-perl/pinned-config.cgi` `010e43766c1b78c7572cbc0aded2daf03dc07a1e`
  - `_config.cgi` `87e4fd4eefba063d982e3b79aa7cfa6565e1a1e0`
- 執行來源 SHA：
  - `modern/tests/original-perl/original-r4-town-play-probe.pl` `cf0d043270c8a643d6d695c7599e652cf6ebff5c`
  - `modern/src/original-r4-town-files.mjs` `b1b902e6e0bc94a278a92dfcd546f215ec4e19d6`
  - `modern/src/original-r4-data-write-files.mjs` `8541d7cd933cfe2b45d50330808f2494a541ab97`
  - `modern/src/original-r4-guildbattle-end.mjs` `888231c04e3295975b7fbcde6e5d981a4720b608`
  - `modern/src/original-r4-guild-files.mjs` `0a3db9a0d8056986674ea5424d0e5ab72777d239`
  - `modern/src/original-event-compiled-catalog.mjs` `909d9d5e5d1595ef20c66d0e4e0aedb3d374889d`
- 人工 alpha1000/beta2000、固定兩 guild/config/ledger、owned-lock、fresh backup；Perl 第二輪 DataRead 後人工 money/saletoday/lasttime；Node 每輪非 town 部分重新取 Oracle input，END 固定時間及 draw。
- Perl 直接執行 DSL END body，非全 EVENT lifecycle；真隔離 guild/config/ledger 讀取但無 guild 寫入、MakeGuildFile、真 lock acquisition、真時鐘/RNG、CAS、正式 HTTP/v2；town map 解析相等而非 Perl hash order bytes；Node 只 reload town，非獨立全世界續接。
- 原版 pinned-custom.cgi L42–58 的 Set/Get key 不對稱是確認的原版行為，不擅自修正。原版 guildbattle DSL L94–105；guild L4–15、guildsub L4–29、config L4–21 真隔離讀取。唯一最高值 fixture，無平手或 guild 動態變更。
- R1 僅補既有 EVENT guildbattle Oracle/Node 差分範圍，不升格其他層、不增加 detailed 項數；R5 不提前實作。
