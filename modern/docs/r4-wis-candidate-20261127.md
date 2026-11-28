# R4 wis 正常來源功能

原版標準街 menu 啟用 wis。原版 wis.cgi 9cf103e681229dd765c04465a41aa4975d9d7fac、custom/inc-menu.cgi 53e8e64f1b3c1d0eeb67104cc3377b50996c4187、inc-func GetQuery pin。正常同街收件者、最多72字、原 query 清理、原 &/>/< 轉義；一個 id-wis.cgi，未讀訊息可被後來訊息覆蓋；原選單 WisRead 讀後刪除。候選只回傳 byte/write/delete intents，原 HTML 是資料，不直接插入 DOM，D 以可信 actor/recipient/安全 rendering 接入同一權威，既有 LC-B subdata 清理重用。直接原版 wis wrapper 寫真 temp 檔、實際 custom menu WisRead slice 讀/刪；auth/render adapters，CI 待驗。無新增聊天歷史、費用或長程驗收。
