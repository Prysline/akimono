import {createJointCandidateJournal} from '../../src/r4-joint-candidate-journal.mjs';
import {projectorFor} from './r4-joint-candidate-sources.mjs';
process.once('message',async({directory,genesis,command})=>{
  const pause=phase=>new Promise(resolve=>{
    process.once('message',resolve);process.send({phase});
  });
  try{
    const journal=createJointCandidateJournal({directory,projector:projectorFor(genesis)});
    const result=await journal.publish(command,{afterStage:()=>pause('staged'),afterPublication:()=>pause('published')});
    process.send({phase:'done',mode:result.mode},()=>process.disconnect());
  }catch(error){process.send({phase:'error',error:error.stack},()=>{process.exitCode=1;process.disconnect()})}
});
