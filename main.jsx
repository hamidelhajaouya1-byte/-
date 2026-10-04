import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Menu, Globe2, MapPin, UserRound, Search, ChevronDown, ShieldCheck, Star, Wrench, GraduationCap, Zap, HardHat, Grid2X2, Sprout, ChefHat, Heart, Bell, Home, Phone, MessageCircle, ArrowLeft, Sparkles} from 'lucide-react';
import './styles.css';
import hero from './assets/hero-technician.jpg';
import p1 from './assets/pro-1.jpg'; import p2 from './assets/pro-2.jpg'; import p3 from './assets/pro-3.jpg'; import p4 from './assets/pro-4.jpg';

const cats=[['البناء والتشييد',8,HardHat,'gold'],['الكهرباء والميكانيك',6,Zap,'blue'],['التعليم والتدريس',7,GraduationCap,'purple'],['السباكة والصيانة',5,Wrench,'mint'],['التجميل والفتاحة',4,Sparkles,'pink'],['المطابخ والطبخ',3,ChefHat,'cyan'],['الزراعة والحدائق',3,Sprout,'green'],['أخرى',4,Grid2X2,'gray']];
const pros=[
 {name:'عبد الله الزرفي',job:'طبخ مغربي',city:'فاس',rating:'4.9',reviews:154,img:p4},
 {name:'يوسف العلوي',job:'ميكانيك السيارات',city:'مراكش',rating:'4.7',reviews:89,img:p3},
 {name:'سميرة الكتاني',job:'تدريس اللغة الفرنسية',city:'الدار البيضاء',rating:'4.9',reviews:233,img:p2},
 {name:'أحمد بن عيسى',job:'بناء وتشييد',city:'الرباط',rating:'4.8',reviews:126,img:p1}
];
function App(){
 const [active,setActive]=useState('home'); const [query,setQuery]=useState(''); const [city,setCity]=useState('جميع المدن'); const [fav,setFav]=useState([]);
 const toggleFav=(name)=>setFav(x=>x.includes(name)?x.filter(n=>n!==name):[...x,name]);
 return <div className="app" dir="rtl">
  <header className="header">
   <div className="top-actions"><button className="pill"><Globe2/> العربية <ChevronDown/></button><button className="pill"><MapPin/> الرباط <ChevronDown/></button></div>
   <div className="brand"><div className="logo-mark">🎓</div><div><b>بغيت معلم</b><span>B4it M3alm</span></div><button className="menu"><Menu/></button></div>
   <button className="login"><UserRound/> تسجيل الدخول</button>
  </header>
  <main>
   <section className="hero">
    <img src={hero} className="hero-photo" alt="محترف"/>
    <div className="hero-content"><div className="verified"><ShieldCheck/> معلمين موثوقين في جميع المدن المغربية</div><h1>إبحث عن معلمك المحترف<br/>بسهولة وفي دقائق</h1><p>أكثر من 40 مهنة، في 60 مدينة مغربية</p></div>
    <div className="searchbox"><button className="city"><ChevronDown/> <span>{city}</span><MapPin/></button><div className="searchinput"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="إبحث عن مهنة، مدينة أو اسم المعلم..."/><Search/></div></div>
    <div className="benefits"><span><Star/> تقييمات حقيقية</span><i></i><span><MessageCircle/> تواصل مباشر</span><i></i><span><ShieldCheck/> معلمين موثوقين</span><i></i><span><Zap/> خدمة سريعة</span></div>
   </section>
   <section className="section"><div className="section-head"><h2>🔥 الفئات الأكثر طلبا</h2><button>عرض جميع المهن <ArrowLeft/></button></div><div className="cats">{cats.map(([n,c,I,color])=><button className={`cat ${color}`} key={n}><span className="cat-icon"><I/></span><strong>{n}</strong><small>{c} مهن</small></button>)}</div></section>
   <section className="section pros-section"><div className="section-head"><h2>⭐ معلمون مميزون</h2><button>عرض الكل <ArrowLeft/></button></div><div className="pros">{pros.map(p=><article className="pro" key={p.name}><button className={`heart ${fav.includes(p.name)?'on':''}`} onClick={()=>toggleFav(p.name)}><Heart/></button><div className="photo-wrap"><img src={p.img} alt={p.name}/><span className="check"><ShieldCheck/></span></div><span className="available">متاح الآن</span><div className="rating"><Star/> {p.rating} <small>({p.reviews})</small></div><h3>{p.name}</h3><p>{p.job}</p><span className="loc"><MapPin/> {p.city}</span><div className="contact"><button className="call"><Phone/> اتصال</button><button className="wa"><MessageCircle/> واتساب</button></div></article>)}</div></section>
   <section className="whatsapp"><div className="wa-art">📱💬</div><div><h3>تواصل مباشرة مع المعلم عبر واتساب</h3><p>احصل على إجابة سريعة واستفساراتك</p></div><button><MessageCircle/> ابدأ الآن</button></section>
  </main>
  <nav className="bottom"><button className={active==='account'?'active':''} onClick={()=>setActive('account')}><UserRound/><span>حسابي</span></button><button><Bell/><i></i><span>الإشعارات</span></button><button className={active==='search'?'active':''} onClick={()=>setActive('search')}><Search/><span>بحث</span></button><button><Heart/><span>المفضلة</span></button><button className={active==='home'?'active':''} onClick={()=>setActive('home')}><Home/><span>الرئيسية</span></button></nav>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
