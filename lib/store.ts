import {createClient} from '@supabase/supabase-js';
import type {Room} from './game';
const globalStore=globalThis as unknown as {mathRooms?:Map<string,Room>};
const memory=globalStore.mathRooms??=new Map();
export const production = !!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
function db(){return createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});}
export async function create(room:Room){if(!production){if(process.env.NODE_ENV==='production'&&process.env.DEMO_MODE!=='true')throw Error('Skonfiguruj Supabase lub DEMO_MODE.');if(memory.has(room.code))throw Error('Konflikt kodu, spróbuj ponownie.');memory.set(room.code,structuredClone(room));return;}const {error}=await db().from('contest_rooms').insert({code:room.code,state:room,revision:0});if(error)throw Error('Nie udało się zapisać konkursu.');}
// Optimistic concurrency: one atomic database write wins; losers re-run against fresh state.
export async function mutate<T>(code:string,fn:(room:Room)=>T):Promise<T>{
 if(!production){const room=memory.get(code);if(!room)throw Error('Nie znaleziono konkursu.');const copy=structuredClone(room);const result=fn(copy);memory.set(code,copy);return result;}
 for(let i=0;i<12;i++){const client=db();const {data,error}=await client.from('contest_rooms').select('state,revision').eq('code',code).single();if(error||!data)throw Error('Nie znaleziono konkursu.');const room=data.state as Room;const result=fn(room);const {data:ok,error:writeError}=await client.rpc('contest_compare_swap',{p_code:code,p_revision:data.revision,p_state:room});if(writeError)throw Error('Błąd zapisu konkursu.');if(ok)return result;}
 throw Error('Konkurs jest zajęty. Spróbuj ponownie.');
}
