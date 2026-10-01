import { randomInt, randomBytes, createHash } from 'node:crypto';
export type Level = 'start'|'sport'|'master';
export type Question = {a:number;b:number;op:'×'|'÷';answer:number};
export type Player = {id:string;name:string;token:string;group:number;score:number;index:number;status:'waiting'|'playing'|'finished'|'stopped'|'disqualified';questions:Question[];lastSeen:number;attempts:number};
export type Room = {code:string;admin:string;level:Level;capacity:number;groupSize:number;status:'waiting'|'playing'|'finished';players:Player[];createdAt:number;startedAt?:number;endedAt?:number};
export const secret = () => randomBytes(32).toString('hex');
export const hash = (s:string) => createHash('sha256').update(s).digest('hex');
export function questions(level:Level):Question[] {
 const max = {start:10,sport:20,master:50}[level]; const cap = {start:100,sport:400,master:1000}[level];
 const pool:Question[]=[];
 for(let a=2;a<=max;a++) for(let b=2;b<=max;b++) if(a*b<=cap) pool.push({a,b,op:'×',answer:a*b});
 const pick = (op:'×'|'÷') => {const remaining=[...pool];return Array.from({length:10},()=>{const q=remaining.splice(randomInt(remaining.length),1)[0];return op==='×'?q:{a:q.answer,b:q.b,op,answer:q.a};});};
 const result=[...pick('×'),...pick('÷')];for(let i=result.length-1;i>0;i--){const j=randomInt(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function finish(room:Room,now:number) {if(room.status==='playing' && room.players.every(p=>p.status!=='playing')) {room.status='finished';room.endedAt=now;}}
export function expire(room:Room,now:number) {if(room.status==='playing') for(const p of room.players) if(p.status==='playing' && now-p.lastSeen>20000) {p.status='disqualified';p.score=0;}finish(room,now);}
export function answer(room:Room,p:Player,value:number,index:number,now:number) {
 if(room.status!=='playing'||p.status!=='playing') throw Error('Quiz nie jest aktywny.');
 if(index!==p.index) throw Error('To pytanie zostało już rozliczone.');
 if(!Number.isInteger(value)||value<0||value>1000) throw Error('Wpisz liczbę całkowitą od 0 do 1000.');
 p.lastSeen=now;p.attempts++;
 const correct=p.questions[p.index].answer===value;
 if(correct){p.score++;p.index++;if(p.score===20){p.status='finished';for(const other of room.players) if(other.group===p.group && other.status==='playing')other.status='stopped';}}
 finish(room,now);return correct;
}
export function view(room:Room,token:string) {
 const admin=hash(token)===room.admin;const self=room.players.find(p=>p.token===hash(token));
 if(!admin&&!self)throw Error('Brak dostępu do konkursu.');
 return {code:room.code,level:room.level,capacity:room.capacity,groupSize:room.groupSize,status:room.status,createdAt:room.createdAt,startedAt:room.startedAt,endedAt:room.endedAt,admin,selfId:self?.id,players:room.players.map(p=>({id:p.id,name:p.name,group:p.group,score:p.score,index:p.index,status:p.status,attempts:p.attempts})),question:self?.status==='playing'?(({a,b,op})=>({a,b,op}))(self.questions[self.index]):null};
}
