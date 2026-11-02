// A prepared town operation may be committed only against the same
// original-shaped live source state it inspected. No whole-save bytes,
// source assets, DOM state or app objects are serialized here.
export function nativeTownCommitWitness(session,runtime){
 try{
  if(!session||typeof runtime?.snapshot!=='function')return null;
  const state={
   port:session.port,
   portState:session.portState,
   townActors:session.townActors,
   dateTime:session.dateTime,
   money:session.money,
   bankBalance:session.bankBalance,
   dayFlags:session.dayFlags,
   runtime:runtime.snapshot(),
   dialogueActor:runtime.dialogueActor??null,
   insideBuilding:runtime.insideBuilding??null
  };
  const serialized=JSON.stringify(state);
  return typeof serialized==='string'?serialized:null;
 }catch{return null;}
}
