(function(){
  var fr=document.documentElement.lang==="fr";
  var head=document.getElementById("head"),nav=document.getElementById("nav"),btn=document.getElementById("menuBtn");
  var over=document.body.getAttribute("data-over")==="1";
  function setHead(){head.classList.toggle("over",over);head.classList.toggle("solid",!over||window.scrollY>40||nav.classList.contains("open"))}
  window.addEventListener("scroll",setHead,{passive:true});setHead();
  btn.addEventListener("click",function(){var o=nav.classList.toggle("open");btn.setAttribute("aria-expanded",o?"true":"false");setHead()});
  var vids=document.querySelectorAll("video");
  if(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches){vids.forEach(function(v){v.removeAttribute("autoplay");v.pause()})}
  else{
    var safari=/^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
    function swap(v){
      /* Safari can refuse to autoplay a video but always plays an MP4 placed in an image tag */
      if(!safari||!v.parentNode||v.__swapped)return;v.__swapped=true;
      var s=v.querySelector("source"),img=document.createElement("img");
      img.src=s?s.src:v.currentSrc;img.alt="";img.setAttribute("aria-hidden","true");
      img.onerror=function(){img.src=v.getAttribute("poster")};
      v.parentNode.replaceChild(img,v);
    }
    function go(v){if(v.__swapped)return;v.muted=true;var p=v.play();if(p&&p.catch)p.catch(function(){swap(v)});
      setTimeout(function(){var r=v.getBoundingClientRect();if(v.paused&&r.top<innerHeight&&r.bottom>0)swap(v)},1800)}
    vids.forEach(function(v){v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute("muted","");v.setAttribute("playsinline","")});
    if("IntersectionObserver" in window){
      var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){go(e.target)}else{e.target.pause()}})},{threshold:0.1});
      vids.forEach(function(v){io.observe(v)});
    }else{vids.forEach(go)}
    document.addEventListener("touchstart",function(){vids.forEach(function(v){if(v.paused&&v.getBoundingClientRect().top<innerHeight)go(v)})},{once:true,passive:true});
  }
  document.addEventListener("input",function(e){if(e.target.matches(".compare input")){e.target.closest(".compare").style.setProperty("--pos",e.target.value+"%")}});
  document.querySelectorAll(".copy-btn").forEach(function(b){b.addEventListener("click",function(){
    var t=b.getAttribute("data-copy"),label=b.textContent;
    function done(){b.textContent=fr?"Copié":"Copied";setTimeout(function(){b.textContent=label},1600)}
    function sel(){var s=b.previousElementSibling,r=document.createRange();r.selectNodeContents(s);var w=getSelection();w.removeAllRanges();w.addRange(r)}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,sel)}else sel();
  })});
  var f=document.getElementById("enquiry");
  if(f){f.addEventListener("submit",function(e){
    e.preventDefault();if(!f.checkValidity()){f.reportValidity();return}
    var v=function(id){var el=document.getElementById(id);return el?el.value.trim():""};
    var name=(v("f-first")+" "+v("f-last")).trim();
    var subject=(fr?"Demande depuis homemuse.fr · ":"Enquiry from homemuse.fr · ")+v("f-need");
    var lines=[(fr?"Nom : ":"Name: ")+name,(fr?"E-mail : ":"Email: ")+v("f-email"),(fr?"Téléphone : ":"Phone: ")+v("f-phone"),(fr?"Intérêt : ":"Interested in: ")+v("f-need"),"",v("f-msg")];
    window.location.href="mailto:contact@homemuse.fr?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(lines.join("\n"));
    document.getElementById("sent").hidden=false;
  })}
})();
