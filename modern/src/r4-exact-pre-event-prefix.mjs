/** Locate the unique exact-consumption prefix of the server's indexed tape.
 * A missing draw means the prefix is too short; only the final PLUS
 * exact-consumption/118-sample guard can certify that it is too long.
 * No alternative draw values are tried and the projector remains exact.
 */
const fail=s=>{throw new RangeError('R4 exact pre-EVENT prefix: '+s);};
const short=new Set([
  'R3 shared natural-sale: missing natural/PLUS source draw',
  'R3 item callbacks: missing original #70 rand(1)',
  'B-41 original sale boundary: missing original period random samples',
  'B-37 all original PLUS: missing original random draw',
]);
const long=new Set([
  'B-37 all original PLUS: unused source random samples',
  'B-37 all original PLUS: explicit random millionths, maximum 118 samples',
]);
export function resolveR4ExactPreEventPrefix({project,unit,maxDraws}){
  if(typeof project!=='function'||typeof unit!=='function'||!Number.isSafeInteger(maxDraws)||maxDraws<0||maxDraws>148)
    fail('bounded indexed tape and exact projector required');
  const tape=[];
  let low=0,high=maxDraws;
  while(low<=high){
    const count=Math.floor((low+high)/2);
    while(tape.length<count){
      const sample=unit(tape.length);
      if(!Number.isSafeInteger(sample)||sample<0||sample>=1000000)fail('invalid indexed source sample');
      tape.push(sample);
    }
    const samples=tape.slice(0,count);
    let pre;
    try{pre=project(samples);}
    catch(error){
      if(!(error instanceof RangeError))throw error;
      if(short.has(error.message)){low=count+1;continue;}
      if(long.has(error.message)){high=count-1;continue;}
      throw error;
    }
    if(pre?.receipt?.totalDraws!==count)fail('pre-EVENT exact draw accounting');
    return {pre,samples};
  }
  fail('pre-EVENT draw budget exhausted or exact prefix unavailable');
}
