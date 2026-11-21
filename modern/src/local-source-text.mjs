/**
 * Normalize only file-system newline transport differences before feeding
 * pinned Perl/DSL sources into source-guarded reviews.
 *
 * Git checkout on Windows may convert LF Git blobs to CRLF working-tree
 * files (core.autocrlf=true). The original review markers are intentionally
 * LF-based. This changes no disk files, source rules, source content other
 * than CRLF -> LF, or original Git blob provenance.
 */
export function normalizeLocalSourceText(text){
  if(typeof text!=='string')throw new TypeError('source must be UTF-8 text');
  if(/\r(?!\n)/.test(text))
    throw new Error('Unsupported lone CR in local source; source review refused');
  return text.replace(/\r\n/g,'\n');
}
