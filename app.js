const dialog=document.querySelector('#assistant');const sidebar=document.querySelector('.side');
document.querySelectorAll('#openAssistant,#openAssistant2').forEach(b=>b?.addEventListener('click',()=>dialog.showModal()));
document.querySelector('#close').addEventListener('click',()=>dialog.close());
document.querySelector('#hamb').addEventListener('click',()=>sidebar.classList.toggle('open'));
document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>sidebar.classList.remove('open')));
document.querySelectorAll('.prompts button').forEach(b=>b.addEventListener('click',()=>{document.querySelector('#request').value=b.textContent;document.querySelector('#request').focus()}));
document.querySelector('#listen').addEventListener('click',()=>{const b=document.querySelector('#listen'),t=document.querySelector('#voiceText');b.disabled=true;b.innerHTML='Escuchando… <span>◉</span>';t.textContent='Escuchando la solicitud';setTimeout(()=>{t.textContent='Solicitud recogida · lista para validar';document.querySelector('#request').value='Necesito una pieza para mi vehículo. Pendiente de confirmar modelo y motorización.';b.disabled=false;b.innerHTML='Crear solicitud <span>→</span>'},1200)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')sidebar.classList.remove('open');if(e.key.toLowerCase()==='v'&&!dialog.open&&document.activeElement.tagName!=='TEXTAREA')dialog.showModal()});
