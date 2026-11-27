# R4 郵便局正常功能來源包

標準街 menu 明列郵便局。復用凍結 source 48h、MAX_BOX=5、common box 10 CSV 欄位與 newest-first。send 正常表單有可信街道/ID、40/400 字元、原 query 字元清理、CutStr、空標題原 locale key；read 標記未讀、fromid=1 通知讀後刪除（沿原 WriteFlag）；delete 同一共享郵件從雙方信箱消失。原版 raw delete 不檢查選取信件 owner，正常 UI 僅呈現本人的收/發信件，候選不暴露 raw 越權。到期 mode=2 於 WriteLetter 濾除；讀取未變更時不強制寫入。projectDwarfNotice 共用編碼及來源通知 title/message keys/args，不把系統寄件者套玩家5封容量。locale 由 D 可信 adapter 傳入，不把 caller string 當 authority。新增固定上游 6 CGI bytes，直接 source ReadLetter/NewLetter/LetterReading/WriteLetter 差分兩個代表流程，渲染及 source query/localize adapter；未改正式 runtime/HTTP/CAS，CI 待驗。
