(function(){
  var files=['app-core.js','app-main.js','app-more.js'];
  var log=[];
  var box=document.createElement('pre');
  box.style.cssText='white-space:pre-wrap;font-size:11px;line-height:1.5;color:#ffb0b5;margin-top:16px;padding:0 4px';
  function show(){box.textContent=log.join('\n');}
  window.addEventListener('error',function(e){
    var f=(e.filename||'').split('/').pop().split('?')[0];
    log.push((f||'?')+' Zeile '+e.lineno+': '+e.message);
    show();
  });
  var host=document.querySelector('.auth-box');
  (host||document.body).appendChild(box);
  function load(i){
    if(i>=files.length)return;
    var s=document.createElement('script');
    s.src=files[i]+'?v=7';
    s.onload=function(){load(i+1);};
    s.onerror=function(){log.push(files[i]+': Datei nicht gefunden');show();load(i+1);};
    document.head.appendChild(s);
  }
  load(0);
})();
