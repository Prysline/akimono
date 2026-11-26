import {checkRuntimeEnvironment} from '../src/runtime-environment.mjs';
try{
  const args=process.argv.slice(2);
  if(args.length>1||args.some(a=>a!=='--oracle'))throw new Error('用法：npm run check:env [-- --oracle]');
  const result=checkRuntimeEnvironment({oracle:args.includes('--oracle')});
  console.log(JSON.stringify(result,null,2));
  console.log('執行環境檢查通過；不代表完整遊戲或跨版本存檔驗收。');
}catch(error){
  console.error(error.message);process.exitCode=1;
}
