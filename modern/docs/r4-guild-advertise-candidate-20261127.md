# #62/2 正常商會廣告來源候選

原版 Standard Street ITEM DSL blob 7a18185e98b32aee82ca1ce30d6f3c395157dbcb。既有 #62/2 僅實作未入會回傳，實際入會後的正常功能未覆蓋。重用原有 compiler review 與 UseItem 消耗契約：一包、28800 秒、無 EXP，新增 post-consumption callback。依實際本街 @DT 順序提高同 guild 每間店（包含自己）的 rank，int(500*(2-rank/5000))、10000 cap、全街公告先於各店明細；異 guild 無變動，無會籍無 rank/log。保留原有 no-guild function，不改既有正式 registry/HTTP/CAS。只接受已審來源、D authoritative actor/ordered street rows/guild definition。新增兩個必要代表性原版 callback 差分，未做正式玩家流程；CI 待驗。
