"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

export default function Success(){
  const [orderId,setOrderId]=useState("");
  useEffect(()=>{setOrderId(sessionStorage.getItem("bacMasterOrderId")||"")},[]);
  if(!orderId)return <main className="success"><div className="card"><h1>لا يوجد طلب مؤكد</h1><p>لا يمكن عرض حالة نجاح بدون تأكيد الطلب من الخادم.</p><Link className="btn" href="/#order">العودة إلى نموذج الطلب</Link></div></main>;
  return <main className="success"><div className="card"><span className="ok">✓</span><h1>تم استلام طلبك بنجاح</h1><p>احتفظ برقم الطلب كمرجع.</p><p className="note"><b>رقم الطلب: {orderId}</b></p><p>سيتواصل معك الفريق لتأكيد تفاصيل الطلب.</p><Link className="btn" href="/">العودة للصفحة الرئيسية</Link></div></main>
}