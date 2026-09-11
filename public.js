document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',()=>window.scrollTo({top:document.querySelector(a.getAttribute('href'))?.offsetTop-70||0,behavior:'smooth'})));
