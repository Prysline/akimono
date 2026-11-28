/** Read-only source projection of the Standard Street town page, not HTTP authority. */
import {createHash} from 'node:crypto';
const pins=Object.freeze({town:'07cf4cf8fe3b3c9ada166d0f75bdf76c884b8244',custom:'d579a5bec7ae71706ba8161790d2760033fd2f93'});
const approved=new WeakSet();
const fail=m=>{throw new RangeError('R4 town scenery: '+m)};
export function reviewTownScenery(sources){
  for(const [k,sha] of Object.entries(pins)){
    const s=sources?.[k];
    if(typeof s!=='string'||createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex')!==sha)fail('source drift '+k);
  }
  const r=Object.freeze({committable:false});approved.add(r);return r;
}
const int=v=>Number.isSafeInteger(v);
export function projectTownScenery({reviewed,nowSeconds,develop,safety,rebel,leaderId,balanceName,shops,guest,boardMtime}){
  if(!approved.has(reviewed))fail('source review required');
  if(![nowSeconds,develop,safety,leaderId,boardMtime].every(int)||nowSeconds<0||boardMtime<0||
     typeof guest!=='boolean'||typeof rebel!=='boolean'||typeof balanceName!=='string'||!Array.isArray(shops))fail('trusted source snapshot required');
  const ids=new Set();
  for(const s of shops){
    if(!s||!int(s.id)||s.id<1||ids.has(s.id)||!int(s.lastlogin)||typeof s.shopname!=='string'||typeof s.name!=='string')fail('ordered original DT required');
    ids.add(s.id);
  }
  const building=develop>4500?'house1a.png':'house1b.png';
  const tree=develop>6500?'tree2.png':'tree1.png';
  const road=develop>6500?3:develop>5500?2:1;
  const slots=[
    ['競技場',['mapsignslime.png',building],'slime','slime'],
    [null,[tree],null,null],
    ['依頼所',['mapsignrequest.png','mapshop.png'],'req','req'],
    ['市場',['mapsignmarket.png','mapshop.png'],'shop-m','shop-m'],
    [null,[tree],null,null],
    ['ギルド',['mapsignguild.png',building],'gd','gd'],
    [null,[tree],null,null],
    ['兵士駐屯所',['mapsignarmy.png',building],'army',null],
    ['図書館',['house1c.png'],'action.cgi?key=library','action.cgi?key=library'],
    ['掲示板',['mapboard.png'],'treebbs',null],
  ].map(([label,assets,player,visitor],index)=>({index,label,assets,route:guest?visitor:player}));
  const bubbles=[];
  const add=(slot,character,message)=>bubbles.push({slot,character,message});
  if(rebel){
    add(1,'d2','大変だ・・・。援軍を呼ばないと！');
    add(2,'d1','反乱だ！加勢に行くぞっ');
    add(5,'d1','領主を倒せっ');
    add(5,'d1','一気にケリをつけようっ');
  }else{
    const phase=Math.trunc(nowSeconds/3600)%4;
    if(phase===0){
      add(0,'e1','うちのスライムまた負けちゃった・・・');
      add(4,'e2','食事の材料買いに行かなくっちゃ。');
    }else if(phase===1){
      add(7,'b2','図書館の情報は重要だよっ');
      add(7,'b1','掲示板のチェックも大切だね。ふむふむ・・・');
    }else if(phase===2){
      add(4,'c2','ぽかぽかして気持ちええのぉ・・・');
      add(6,'c1','買い物はやっぱり'+(shops[0]?.shopname??'')+'よねっ');
    }else if(safety<4000){
      const leader=shops.find(s=>s.id===leaderId);
      if(leaderId&&!leader)fail('unresolved leader in trusted snapshot');
      add(0,'a1',(leaderId?leader.name:balanceName)+'の暴政に断固ハンターイ！');
      add(0,'a2','もっと市民の安全を考えろーっ');
    }
  }
  const activeShops=shops.filter(s=>s.lastlogin>=nowSeconds-600).map(s=>s.shopname);
  return {slots,bubbles,roadAssets:['a','b','c'].map(c=>'maproad'+road+c+'.png'),
    palace:{asset:rebel?'consul2.png':'consul.png',route:'lord'},
    shoppingStreet:{assets:['mapshop.png','mapshop.png'],route:'shop-a'},
    activeShops,activeText:activeShops.length?activeShops.join('， '):'なし',
    boardMtime,committable:false};
}
