import {readFile} from 'node:fs/promises';
const root=new URL('../../../',import.meta.url);
export async function loadNormalCommerceAuditSources(){
 const sourcePaths={
 itemDsl:'custom/inc-item-data.cgi',rebelDsl:'custom/inc-rebel-data.cgi',originalConfigSource:'_config.cgi',
 originalAdminInitSource:'modern/tests/original-perl/core-inc-admin-func.cgi',
 originalDataReadSource:'modern/tests/original-perl/inc-func.cgi',
 originalDataWriteSource:'modern/tests/original-perl/write.cgi',
 originalTurnSource:'modern/tests/original-perl/inc-turn.cgi',
 originalWholeSource:'modern/tests/original-perl/whole.cgi',
 originalCompilerSource:'modern/tests/original-perl/inc-makeitem.cgi',
 originalBuySource:'modern/tests/original-perl/buy-s.cgi',
 originalBuyItemSource:'modern/tests/original-perl/item.cgi',
 originalBuyCalcSource:'modern/tests/original-perl/calc.cgi',
 originalMarketSource:'modern/tests/original-perl/market.cgi',
 originalItemSource:'modern/tests/original-perl/item.cgi',
 originalDetailSource:'modern/tests/original-perl/core-detail.cgi',
 originalPeriodSource:'modern/tests/original-perl/period.cgi',
 originalUseSource:'modern/tests/original-perl/use.cgi',
 originalItemHelperSource:'modern/tests/original-perl/core-inc-item.cgi',
 originalNewSource:'modern/tests/original-perl/new.cgi',
 originalCustomSource:'modern/tests/original-perl/pinned-custom.cgi',
 originalLogSource:'modern/tests/original-perl/pinned-log.cgi',
 originalShowcaseSource:'modern/tests/original-perl/sc-s.cgi',
 coreLocaleSource:'modern/tests/original-perl/pinned-core-zh_TW.po',localLocaleSource:'locale/zh_TW.po',localeLoaderSource:'custom/inc-locale.cgi',
 };
 return Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async([k,p])=>[k,await readFile(new URL(p,root),'utf8')])));
}
