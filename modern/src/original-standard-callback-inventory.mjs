/**
 * B-26: static, source-pinned callback declaration inventory for the exact
 * Standard Street DSL. Does not compile/eval Perl, call real item functions,
 * require inc-item.cgi, commit world data, or claim runtime resolution.
 *
 * The frozen inc-makeitem.cgi GetLocalFunction converts a USE "func _local_"
 * to "_local_" + (per-item USE index + 1), while a later "func _local_1"
 * remains a named reference. Do not count aliases as new code definitions.
 */
import {parseDsl,validateStandardStreet} from './parse-dsl.mjs';

const freeze=x=>Object.freeze(x);
function fail(message){throw new Error('B-26 callback inventory: '+message);}
function first(block,key){return block.fields[key]?.[0]?.value??null;}
function freezeRows(rows){return freeze(rows.map(x=>freeze(x)));}
function fromLocal(block,entry){
  const lines=block.raw.split('\n'),start=entry.line-block.startLine;
  if(start<0||start>=lines.length)fail('invalid source line for local function');
  if(!/^\s*(func|funcb|funct)\s+_local_(?:\s|$)/i.test(lines[start]))
    fail('inline Perl source marker missing at '+entry.line);
  let end=-1;
  for(let i=start+1;i<lines.length;i++){
    if(/^\s*_local_\s*(?:#.*)?$/.test(lines[i])){end=i;break;}
  }
  if(end<0)fail('missing original _local_ closing marker '+entry.line);
  return freeze({
    sourceStart:entry.line+1,
    sourceEnd:block.startLine+end-1,
    text:lines.slice(start+1,end).join('\n'),
    sourceKind:'inline-local',
  });
}
function fromGlobalFunctions(block,sharedName){
  if(!block)fail('missing @@FUNCITEM');
  const lines=block.raw.split('\n');
  const needle=new RegExp('^sub\\s+'+sharedName+'\\s*$');
  let start=lines.findIndex(x=>needle.test(x));
  if(start<0)return null;
  let end=-1;
  for(let i=start+1;i<lines.length;i++){
    if(/^}\s*$/.test(lines[i])){end=i;break;}
  }
  if(end<0)fail('unclosed shared function '+sharedName);
  return freeze({
    sourceStart:block.startLine+start,
    sourceEnd:block.startLine+end,
    text:lines.slice(start,end+1).join('\n'),
    sourceKind:'shared-funcitem',
  });
}
function references(body){
  // Static tokens are EVIDENCE of references, not proof of exact side
  // effects, reachable code paths, or ownership of called functions.
  const code=body.split('\n').filter(x=>!/^\s*#/.test(x)).join('\n');
  const tags=[];
  for(const [tag,re] of [
    ['inventory',/\b(?:UseItem|AddItem|DelItem)\s*\(|->\{item\}/],
    ['money',/->\{money\}|\bEditMoney\s*\(/],
    ['time',/->\{time\}|\b(?:UseTime|EditTime)\s*\(/],
    ['experience',/->\{exp\}/],
    ['popularity',/->\{rank\}/],
    ['showcase',/->\{showcase(?:count)?\}|->\{price\}/],
    ['guild',/->\{guild\}|\bGUILD\b/],
    ['event',/%DTevent|\bDTevent\{/],
    ['logs',/\b(?:WriteLog|PushLog)\s*\(/],
    ['random',/\brand\s*\(/],
    ['other-service',/\b(?:ReadArmy|WriteArmy|GetUserDataEx|SetUserDataEx)\s*\(/],
  ]){if(re.test(code))tags.push(tag);}
  return freeze(tags);
}
function roleRecord({file,kind,field,entry,ownerItemId,ownerCode,
 ownerName,useIndex,sourceName,resolvedSymbol,resolution,origin}){
  return freeze({
    file,kind,field,sourceLine:entry.line,
    ownerItemId,ownerCode,ownerName,useIndex,
    sourceName,resolvedSymbol,resolution,
    originFile:origin?.file??file,
    originStart:origin?.sourceStart??null,
    originEnd:origin?.sourceEnd??null,
    references:origin?references(origin.text):freeze([]),
    // This is a source-backed candidate, not a runnable callback.
    execution:'not-executed',
  });
}
const supportedHeaders=new Set(['USE','ITEM']);
const FIELDS={USE:['func','funcb'],ITEM:['funct']};

/**
 * Verify *existing* compiler recognition contract; don't execute the
 * compiler (its top-level code manages files, maintenance lock and eval).
 */
function compilerPinned(source){
  if(typeof source!=='string')fail('missing original compiler text');
  for(const token of [
    'GetLocalFunction($name,$g_use->{no}+1)',
    'GetLocalFunction($name,"b".($g_use->{no}+1))',
    "sub $use->{func} {eval(<<'_eval_code_');",
    "sub $use->{funcbefore} {eval(<<'_eval_code_');",
    'sub GetLocalFunction',
    '$funcname=$g_define->{localfuncmark}.$ext;',
  ])if(!source.includes(token))fail('pinned compiler contract drift: '+token);
}
export function auditOriginalStandardCallbackDeclarations({
  itemDsl,rebelDsl,compilerSource,
}){
  compilerPinned(compilerSource);
  const main=parseDsl(itemDsl,'custom/inc-item-data.cgi');
  const rebel=parseDsl(rebelDsl,'custom/inc-rebel-data.cgi');
  const verify=validateStandardStreet([main,rebel]);
  if(!verify.ok)fail('source structure failed 79/116/25/7 audit');
  const funcItem=main.blocks.find(x=>x.kind==='FUNCITEM');
  const globalFunctions=new Map();
  for(const name of ['lostbook','popup']){
    const body=fromGlobalFunctions(funcItem,name);
    if(!body)fail('missing original shared callback '+name);
    globalFunctions.set(name,body);
  }
  const byItem=new Map();
  const definition=new Map();
  const declarations=[];
  for(const block of [...main.blocks,...rebel.blocks]){
    if(block.kind==='ITEM'){
      const id=Number(first(block,'no'));
      const code=first(block,'code'),name=first(block,'name');
      if(!Number.isSafeInteger(id)||!code||!name)fail('missing owner item metadata');
      byItem.set(block.startLine,freeze({id,code,name,file:block.file,index:0}));
    }
    if(!supportedHeaders.has(block.kind))continue;
    const owner=block.kind==='USE'
      ?byItem.get(block.ownerItemLine):freeze({
          id:Number(first(block,'no')),code:first(block,'code'),
          name:first(block,'name'),file:block.file,
        });
    if(!owner)fail('unresolved parent item '+block.startLine);
    const usesBefore=declarations.filter(x=>x.kind==='USE'&&
      x.ownerCode===owner.code&&x.field==='func').length;
    // Source compiler increments g_use.no for every USE, including those
    // without a callback. Retain that position independently of filtering.
    if(block.kind==='USE'){
      const seen=byItem.get(block.ownerItemLine);
      const useIndex=seen.index+1;
      byItem.set(block.ownerItemLine,freeze({...seen,index:useIndex}));
      for(const field of FIELDS.USE){
        const entries=block.fields[field]??[];
        for(const entry of entries){
          const sourceName=entry.value.trim(),prefix=field==='funcb'?'_local_b':'_local_';
          const resolvedSymbol=sourceName==='_local_'?prefix+useIndex:sourceName;
          let origin=null,resolution='';
          if(sourceName==='_local_'){
            const b=fromLocal(block,entry);
            origin=freeze({...b,file:block.file});
            resolution='inline-definition';
            const unique=block.file+'::'+owner.code+'::'+resolvedSymbol;
            if(definition.has(unique))fail('duplicate local symbol '+unique);
            definition.set(unique,origin);
          }else if(sourceName.startsWith('_local_')){
            const key=block.file+'::'+owner.code+'::'+resolvedSymbol;
            origin=definition.get(key)??null;
            resolution=origin?'local-alias':'unresolved-local';
          }else{
            origin=globalFunctions.get(sourceName)??null;
            resolution=origin?'shared-named':'unresolved-named';
          }
          declarations.push(roleRecord({
            file:block.file,kind:block.kind,field,entry,ownerItemId:owner.id,
            ownerCode:owner.code,ownerName:owner.name,useIndex,
            sourceName,resolvedSymbol,resolution,origin,
          }));
        }
      }
    }else{
      for(const field of FIELDS.ITEM){
        for(const entry of block.fields[field]??[]){
          const sourceName=entry.value.trim();
          const origin=sourceName==='_local_'
            ?freeze({...fromLocal(block,entry),file:block.file})
            :globalFunctions.get(sourceName)??null;
          declarations.push(roleRecord({
            file:block.file,kind:block.kind,field,entry,
            ownerItemId:owner.id,ownerCode:owner.code,
            ownerName:owner.name,useIndex:null,sourceName,
            resolvedSymbol:sourceName,resolution:sourceName==='_local_'
              ?'inline-definition':origin?'shared-named':'unresolved-named',origin,
          }));
        }
      }
    }
  }
  const post=declarations.filter(x=>x.kind==='USE'&&x.field==='func');
  const before=declarations.filter(x=>x.kind==='USE'&&x.field==='funcb');
  const turn=declarations.filter(x=>x.kind==='ITEM'&&x.field==='funct');
  const countResolution=Object.create(null);
  for(const x of declarations)
    countResolution[x.resolution]=(countResolution[x.resolution]??0)+1;
  const jobModifiers=main.blocks.filter(x=>x.kind==='USE')
    .reduce((n,b)=>n+(b.fields.job?.length??0),0);
  const summary=freeze({
    sourceItemCount:verify.actual.items,
    sourceUseCount:verify.actual.uses,
    sourceEventCount:verify.actual.events,
    sourceGlobalHookCount:verify.actual.functions,
    postUseDeclarations:post.length,
    postUseNoDeclaration:verify.actual.uses-post.length,
    postUseSharedLostbook:post.filter(x=>x.resolvedSymbol==='lostbook').length,
    postUseSharedPopup:post.filter(x=>x.resolvedSymbol==='popup').length,
    postUseInlineDefinitions:post.filter(x=>x.resolution==='inline-definition').length,
    postUseLocalAliases:post.filter(x=>x.resolution==='local-alias').length,
    preUseDeclarations:before.length,
    itemTurnDeclarations:turn.length,
    useJobModifiers:jobModifiers,
    unresolvedReferences:declarations.filter(x=>x.resolution.startsWith('unresolved')).length,
  });
  const groups=freeze([...new Set(post.map(x=>x.ownerCode))].map(code=>freeze({
    ownerCode:code,ownerItemId:post.find(x=>x.ownerCode===code).ownerItemId,
    ownerName:post.find(x=>x.ownerCode===code).ownerName,
    declarations:post.filter(x=>x.ownerCode===code).length,
  })));
  return freeze({
    summary,groups,postUse:freezeRows(post),preUse:freezeRows(before),
    itemTurn:freezeRows(turn),
    sharedDefinitions:freezeRows([...globalFunctions].map(([symbol,source])=>({
      symbol,file:'custom/inc-item-data.cgi',
      sourceStart:source.sourceStart,sourceEnd:source.sourceEnd,
      references:references(source.text),execution:'not-executed',
    }))),
    scope:'static DSL declaration inventory tied to original compiler naming; no Perl evaluation, dynamic callback, authenticated use or world writes',
  });
}
