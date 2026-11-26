# R4 領主販售稅來源與自然販售候選

基線 63cce20237b00c1531ef21212da08e187a86cfa7。前一完整 CI 與真玩家長程尚未完成，專項 step 已通過。本批不啟用正式非零稅率，不改指令、存檔、UI、歷史或原版。

- 固定原版 core-detail.cgi 9a83d26fb29edee4032958f1e6de837a250f3384、item.cgi b39400d7dc0ab80062c392ae2bbc923e24ecacf8、inc-turn.cgi b8a4980275f475a952846a8d6072fad45f8dff50。
- GetUserTaxRate：反亂 EVENT 或 taxmode=1 返回零；taxmode=2 倍增；其他一般。GetSaleTax：按成交總額/數量/原價，正溢價乘5，負溢價以成交比例降低附加稅，合計四捨五入取整上限99，再取整稅額。免稅與反亂不代表免除溢價稅。
- 共用自然販售 calculator 新增明示、不可偽造的來源 review/context opt-in；舊呼叫保持原零附加稅算式，現有 runtime 不傳入新參數。新增 src 會影響保守 runtime fingerprint，不靜默遷移舊不相容存檔。候選沒有新增 RNG，保持 gross、rank、庫存、trush、cost，只有扣稅金額改變 cash/taxtoday/receipt。
- 256 組真 Perl helper 差分，新增 2/4/8 架五種稅務政策共15組實際 frozen inc-turn 自然販售 + 59 PLUS oracle；JS 比對自然段銷售、庫存、現金、稅、人氣、成本、原版 RNG；無旗標與既有 mixed-type oracle 不改。尚待實際 CI，非玩家流程。
- 已確認 inc-func.cgi shop taxmode、taxyesterday/taxtoday 欄位及 play 第二行 DTTaxrate；period.cgi 將 taxtoday 轉 taxyesterday、加總 taxin，再入 STATE.money/in。後續必須驗證同一來源交易的政策/販售/期末與 disk wire、CAS/history、真領主，不能直接放開零稅率 guard。
