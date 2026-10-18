import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
interface Props {enemy:string;name:string;onClose:()=>void}
class LoadBoundary extends Component<{children:ReactNode;onClose:()=>void;retry:()=>void},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<section className="bot-editor-loading" role="alert"><h1>Editor unavailable</h1><p>The editor could not load. Reconnect and retry. Your saved projects have not been changed.</p><button type="button" style={{minHeight:44}} onClick={this.props.retry}>Retry editor</button> <button type="button" style={{minHeight:44}} onClick={this.props.onClose}>Back to Home</button></section>:this.props.children;}
}
/** No Blockly/source/model import on the normal Home/gameplay execution path. */
export function BotEditorEntry(props:Props){
 const [attempt,setAttempt]=useState(0);
 const Screen=useMemo(()=>lazy(()=>import('../botEditor/BotEditor')),[attempt]);
 return <LoadBoundary key={attempt} onClose={props.onClose} retry={()=>setAttempt(n=>n+1)}><Suspense fallback={<section aria-live="polite" style={{padding:20}}>Loading editor… <button type="button" onClick={props.onClose}>Back to Home</button></section>}><Screen {...props}/></Suspense></LoadBoundary>;
}
