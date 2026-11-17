# لوحة إدارة المحطة (موقع مستقل)

موقع ثابت (HTML/JS) متصل بنفس مشروع Supabase الخاص بتطبيق AL-MAHATTA.

## الإعداد
1. Supabase → SQL Editor → شغّل `supabase/05_admin.sql` (مرة واحدة).
2. اجعل حسابك مديراً عاماً (بدّل البريد):
   `update public.profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');`
3. GitHub (مستودع الإدارة) → Settings → Secrets → Actions: `SUPABASE_URL` و `SUPABASE_ANON_KEY` (نفس قيم التطبيق).
4. Settings → Pages → Source = GitHub Actions.
5. الدخول بنفس حسابك في التطبيق. نسيان كلمة المرور: من التطبيق ("نسيت كلمة المرور").

الأدوار: مدير عام (`is_admin` أو موظف دور admin) = كل شيء، موظف = الطلبات والمحتوى فقط (بدون الموظفين والعمولات والإعدادات).
