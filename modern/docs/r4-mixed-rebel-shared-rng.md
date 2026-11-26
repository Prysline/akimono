## 反亂 NOW 共用 RNG 游標

新增隔離候選 opt-in reviewedExternalDraws；原版來源的 NOW 根據是否有盜賊、是否仍有反亂軍，實際消耗 0/1/2 次 RNG，不預先由呼叫方猜測。直接使用 shared draw(range) 與 consumedSamples，驗證 cursor、range、draw count；既有 exact array oracle 路徑保留。支援原版 transient DT.army null。以既有實際 Perl 17-key oracle 五種反亂／happy／guildbattle 情境比較 range、消耗、shop、town、event、logs。正式 normal EVENT provider 不擴權；仍 noncommittable。未接正式 CAS 或存檔。