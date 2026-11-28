/** Read-only original custom/library.cgi: no Perl execution, world or save authority. */
import {createHash} from 'node:crypto';
const sourcePin='b2f6bd867fb87fd3bd7153b0fdb173de97726e76';
const reviews=new WeakSet();
export function reviewOriginalLibrary(source){
  if(typeof source!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0').update(source).digest('hex')!==sourcePin)
    throw new RangeError('original library source drift');
  const chapters=[...source.matchAll(/^\$TITLE\[(\d+)\]="([^"\n]*)";\n\$CONTENT\[(\d+)\]=<<'HTML';\n([\s\S]*?)^HTML$/gm)].map((m,i)=>{
    if(Number(m[1])!==i||m[1]!==m[3]||!m[2]||!m[4])throw new RangeError('original library chapter order');
    // Only source SPAN headings are markup; everything else is literal text.
    const body=m[4],parts=body.split(/(<SPAN>[\s\S]*?<\/SPAN>)/).filter(Boolean).map(value=>{
      const heading=value.startsWith('<SPAN>');
      const text=heading?value.slice(6,-7):value;
      if(/[<>]/.test(text))throw new RangeError('original library unsupported markup');
      return Object.freeze({heading,text});
    });
    return Object.freeze({id:i,title:m[2],parts:Object.freeze(parts)});
  });
  if(chapters.length!==8)throw new RangeError('original library chapter count');
  const reviewed=Object.freeze({chapters:Object.freeze(chapters)});reviews.add(reviewed);return reviewed;
}
export function describeOriginalLibrary(reviewed,id=null){
  if(!reviews.has(reviewed))throw new RangeError('original library review required');
  const source='frozen-standard-library.v1';
  if(id===null)return {source,chapters:reviewed.chapters.map(({id,title})=>({id,title}))};
  if(!Number.isSafeInteger(id)||id<0||id>=reviewed.chapters.length)throw new RangeError('original library chapter unavailable');
  return {source,chapter:reviewed.chapters[id]};
}
