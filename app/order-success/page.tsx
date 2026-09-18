import Link from "next/link";
import {cookies} from "next/headers";
import {ORDER_CONFIRMATION_COOKIE,verifyOrderConfirmation} from "../../lib/order-confirmation";

export default async function Success(){
  const cookieStore=await cookies();
  const orderId=verifyOrderConfirmation(cookieStore.get(ORDER_CONFIRMATION_COOKIE)?.value);
  if(!orderId)return <main className="success"><div className="card"><h1>لا توجد معلومات طلب مؤكدة لعرضها.</h1><p>لا يمكن عرض حالة نجاح بدون تأكيد صالح من الخادم.</p><Link className="btn" href="/#order">العودة إلى نموذج الطلب</Link></div></main>;
  return <main className="success"><div className="card"><span className="ok">✓</span><h1>تم استلام طلبك بنجاح</h1><p>احتفظ برقم الطلب كمرجع.</p><p className="note"><b>رقم الطلب: {orderId}</b></p><p>سيتواصل معك الفريق لتأكيد تفاصيل الطلب.</p><Link className="btn" href="/">العودة للصفحة الرئيسية</Link></div></main>
}