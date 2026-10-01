import {NextRequest,NextResponse} from 'next/server';
import {randomInt,timingSafeEqual} from 'node:crypto';
import {answer,expire,hash,questions,secret,view,type Room,type Level} from '@/lib/game';
import {create,mutate,production} from '@/lib/store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function response(data:unknown,status=200){return NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export async function GET(req:NextRequest){try{const code=req.nextUrl.searchParams.get('code')||'';const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';return response(await mutate(code,r=>{const now=Date.now();expire(r,now);const p=r.players.find(p=>p.token===hash(token));if(p&&p.status==='playing')p.lastSeen=now;return {...view(r,token),demo:!production};}));}catch(e){return response({error:(e as Error).message},400);}}
export async function POST(req:NextRequest){try{
 const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.origin) return response({error:'Niedozwolone źródło żądania.'},403);
 if(Number(req.headers.get('content-length')||0)>8192)return response({error:'Za duże żądanie.'},413);
 const b=await req.json();const token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';const now=Date.now();
 if(b.action==='create'){
 const password=process.env.ADMIN_PASSWORD;if(production&&!password)throw Error('Ustaw ADMIN_PASSWORD na serwerze.');
 if(password){const supplied=hash(String(b.password||''));if(!timingSafeEqual(Buffer.from(supplied),Buffer.from(hash(password))))throw Error('Nieprawidłowe hasło administratora.');}
 if(!['start','sport','master'].includes(b.level)||![2,4].includes(b.groupSize)||!Number.isInteger(b.capacity)||b.capacity<2||b.capacity>64||b.capacity%b.groupSize!==0)throw Error('Wybierz 2–64 uczestników i pełne grupy.');
 const admin=secret();const room:Room={code:String(randomInt(100000,1000000)),admin:hash(admin),level:b.level as Level,capacity:b.capacity,groupSize:b.groupSize,status:'waiting',players:[],createdAt:now};await create(room);return response({token:admin,...view(room,admin),demo:!production});}
 const result=await mutate(String(b.code||''),r=>{
 expire(r,now);
 if(b.action==='join'){if(r.status!=='waiting'||r.players.length>=r.capacity)throw Error('Lista uczestników jest zamknięta.');const name=String(b.name||'').trim();if(name.length<2||name.length>32)throw Error('Imię musi mieć 2–32 znaki.');const credential=secret();r.players.push({id:secret().slice(0,16),name,token:hash(credential),group:Math.floor(r.players.length/r.groupSize)+1,score:0,index:0,status:'waiting',questions:questions(r.level),lastSeen:now,attempts:0});return {token:credential,...view(r,credential),demo:!production};}
 const admin=hash(token)===r.admin;const p=r.players.find(p=>p.token===hash(token));if(!admin&&!p)throw Error('Brak dostępu.');
 let correct: boolean|undefined;
 if(b.action==='start'){if(!admin||r.status!=='waiting'||r.players.length!==r.capacity)throw Error('Start wymaga administratora i kompletu uczestników.');r.status='playing';r.startedAt=now;for(const player of r.players){player.status='playing';player.lastSeen=now;}}
 else if(b.action==='answer'){if(!p)throw Error('Tylko uczestnik może odpowiadać.');correct=answer(r,p,b.value,b.index,now);}
 else if(b.action==='leave'){if(p&&p.status==='playing'){p.score=0;p.status='disqualified';expire(r,now);}}
 else if(b.action==='stop'){if(!admin)throw Error('Brak dostępu.');if(r.status==='playing'){for(const player of r.players)if(player.status==='playing')player.status='stopped';r.status='finished';r.endedAt=now;}}
 else throw Error('Nieznana operacja.');
 return {...view(r,token),correct,demo:!production};
 });return response(result);
 }catch(e){return response({error:(e as Error).message},400);}}
