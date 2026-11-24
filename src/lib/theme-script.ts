export const SETTINGS_KEY = 'zentra:settings';

/**
 * قبل از اولین رسم صفحه اجرا می‌شود (داخل <head>) تا تم، رنگ و اندازه‌ی ذخیره‌شده فوراً اعمال شوند
 * و صفحه هنگام باز شدن چشمک نزند. اگر کاربر تمی انتخاب نکرده باشد، تنظیم سیستم‌عامل ملاک است.
 */
export const themeScript = `(function(){var d=document.documentElement,s={};try{s=JSON.parse(localStorage.getItem('${SETTINGS_KEY}')||'{}')||{}}catch(e){}var t=s.theme;if(t!=='light'&&t!=='dark'){try{t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){t='light'}}d.dataset.theme=t;if(typeof s.accent==='string')d.dataset.accent=s.accent;if(typeof s.size==='string')d.dataset.size=s.size})();`;
