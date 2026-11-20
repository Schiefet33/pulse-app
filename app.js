(function(){
  var files=['app-core.js','app-main.js','app-more.js'];
  files.forEach(function(f){
    var s=document.createElement('script');
    s.src=f+'?v=6';
    s.async=false;
    document.head.appendChild(s);
  });
})();
