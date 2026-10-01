import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Iloczyn — arena matematyczna',description:'Konkurs mnożenia i dzielenia. Jeden cel, dwadzieścia punktów.',appleWebApp:{capable:true,title:'Iloczyn',statusBarStyle:'default'}};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#153d35'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="pl"><body>{children}</body></html>;}
