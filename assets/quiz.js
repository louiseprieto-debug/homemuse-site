/* Home Muse — "Before your free call" quiz (EN + FR). Answers are emailed via FormSubmit, then the booking calendar opens. */
(function(){
  var root=document.getElementById("quiz");if(!root)return;
  var FR=document.documentElement.lang==="fr";
  var INBOX="contact@homemuse.fr";
  var CAL="https://calendar.app.google/dqCyKrvmDF6t8wsh9";

  var T=FR?{
    start:"Commencer",next:"Continuer",back:"Retour",skip:"Passer",send:"Choisir mon créneau",sending:"Envoi…",
    step:function(a,b){return "Question "+a+" sur "+b},pick2:"Jusqu'à deux réponses",pickAny:"Plusieurs réponses possibles",
    req:"Merci d'indiquer votre prénom et un e-mail valide.",
    subj:function(n,p){return "Nouvelle demande d'appel · "+n+" · "+p}
  }:{
    start:"Let's begin",next:"Continue",back:"Back",skip:"Skip",send:"Choose my call time",sending:"Sending…",
    step:function(a,b){return "Question "+a+" of "+b},pick2:"Pick up to two",pickAny:"Select any that apply",
    req:"Please add your first name and a valid email.",
    subj:function(n,p){return "New call request · "+n+" · "+p}
  };

  var Q1={id:"situation",label:FR?"Que se passe-t-il avec votre maison ?":"What's happening with your home?",type:"one",
    opts:FR?[["sell","Je la vends"],["stay","J'y reste, et je veux l'aimer à nouveau"],["rent","Je la loue (Airbnb, location saisonnière)"],["other","Autre chose"]]
          :[["sell","I'm selling it"],["stay","I'm staying, and I want to love it again"],["rent","I'm renting it out (Airbnb, holiday let)"],["other","Something else"]]};
  var Q2={
    sell:{id:"goal",label:FR?"Qu'est-ce qui compte le plus ?":"What matters most?",type:"one",
      opts:FR?["Vendre plus vite","Obtenir un meilleur prix","Se démarquer en photo","Tout à la fois"]:["Sell faster","Get a better price","Stand out in photos","All of the above"]},
    stay:{id:"goal",label:FR?"Comment voulez-vous vous sentir chez vous ?":"How do you want to feel at home?",type:"multi",max:2,
      opts:FR?["Apaisé·e","Inspiré·e","Cocooné·e","Plein·e d'énergie","Organisé·e"]:["Calm","Inspired","Cosy","Energised","Organised"]},
    rent:{id:"goal",label:FR?"Qu'attendez-vous de vos voyageurs ?":"What do you want from your guests?",type:"one",
      opts:FR?["De meilleurs avis","Un prix par nuit plus élevé","Plus de réservations","Un lieu facile à entretenir"]:["Better reviews","Higher nightly rate","More bookings","A space that's easy to look after"]},
    other:{id:"goal",label:FR?"Racontez-moi en quelques mots":"Tell me in a few words",type:"text",
      ph:FR?"Ce qui se passe, ce dont vous rêvez…":"What's going on, what you're dreaming of…"}
  };
  var REST=[
    {id:"space",label:FR?"De quel type de lieu s'agit-il ?":"What kind of space is it?",type:"one",withText:{id:"where",label:FR?"Où se trouve-t-il ?":"Where is it?",ph:FR?"Ville ou quartier":"Town or area"},
      opts:FR?["Appartement","Maison","Villa","Studio","Autre"]:["Apartment","House","Villa","Studio","Other"]},
    {id:"rooms",label:FR?"De quelles pièces parle-t-on ?":"Which rooms are we talking about?",type:"multi",
      opts:FR?["Salon","Cuisine","Chambre(s)","Salle(s) de bain","Terrasse ou jardin","Toute la maison"]:["Living room","Kitchen","Bedroom(s)","Bathroom(s)","Terrace or garden","The whole home"]},
    {id:"timing",label:FR?"Pour quand aimeriez-vous que ce soit fait ?":"When would you like it done?",type:"one",
      opts:FR?["Dès que possible","D'ici 1 à 3 mois","Dans les 6 prochains mois","Je rêve encore, pour l'instant"]:["As soon as possible","Within 1–3 months","In the next 6 months","I'm just dreaming for now"]},
    {id:"budget",label:FR?"Quel budget vous semble confortable pour ce projet ?":"What budget feels comfortable for this project?",type:"one",
      opts:FR?["Moins de 1 500 €","1 500 – 5 000 €","5 000 – 15 000 €","Plus de 15 000 €","J'aimerais votre avis"]:["Under €1,500","€1,500–5,000","€5,000–15,000","Over €15,000","I'd like your advice"]},
    {id:"smile",label:FR?"En une phrase : qu'est-ce qui vous ferait sourire à chaque fois que vous entrez ?":"In one sentence, what would make you smile every time you walk in?",type:"text",optional:true,
      ph:FR?"Facultatif, mais j'adore lire la réponse":"Optional, but I love reading this one"}
  ];
  var TOTAL=7;
  var A={},step=0,screens=root.querySelectorAll("[data-screen]");

  function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!=null)e.textContent=h;return e}
  function val(o){return Array.isArray(o)?o[0]:o}
  function txt(o){return Array.isArray(o)?o[1]:o}
  function question(n){return n===1?Q1:n===2?Q2[A.situation||"stay"]:REST[n-3]}

  var qBox=root.querySelector("[data-screen=q]"),bar=root.querySelector(".qz-bar i"),barWrap=root.querySelector(".qz-bar");

  function show(name){screens.forEach(function(s){s.hidden=s.getAttribute("data-screen")!==name});
    barWrap.hidden=name==="intro"||name==="thanks";
    var h=root.querySelector("[data-screen="+name+"] h2");if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
    var top=root.getBoundingClientRect().top+scrollY-110;if(scrollY>top)scrollTo({top:top,behavior:"smooth"});
  }
  function setBar(n){bar.style.width=Math.round(n/(TOTAL+1)*100)+"%"}

  function render(n){
    step=n;var q=question(n);qBox.innerHTML="";setBar(n);
    qBox.appendChild(el("p","qz-step",T.step(n,TOTAL)));
    var h=el("h2","qz-q",q.label);qBox.appendChild(h);
    var hintTxt=q.type==="multi"?(q.max?T.pick2:T.pickAny):"";if(hintTxt)qBox.appendChild(el("p","small",hintTxt));
    var nav=el("div","qz-nav"),back=el("button","qz-back",T.back);back.type="button";
    back.onclick=function(){if(n===1){show("intro")}else render(n-1)};
    var next=el("button","btn",T.next);next.type="button";
    var go=function(){if(n<TOTAL){render(n+1)}else{show("contact");setBar(TOTAL+1)}};

    if(q.type==="one"||q.type==="multi"){
      var list=el("div","qz-opts");list.setAttribute("role","group");list.setAttribute("aria-label",q.label);
      var cur=A[q.id];if(q.type==="multi"&&!Array.isArray(cur))cur=[];
      q.opts.forEach(function(o){
        var b=el("button","qz-opt",txt(o));b.type="button";var v=val(o);
        var on=q.type==="multi"?cur.indexOf(txt(o))>-1:(A[q.id+"_v"]===v);
        b.setAttribute("aria-pressed",on?"true":"false");
        b.onclick=function(){
          if(q.type==="one"){
            if(q.id==="situation"&&A.situation!==v){delete A.goal}
            A[q.id]=txt(o);A[q.id+"_v"]=v;if(q.id==="situation")A.situation=v,A.situation_label=txt(o);
            list.querySelectorAll(".qz-opt").forEach(function(x){x.setAttribute("aria-pressed","false")});b.setAttribute("aria-pressed","true");
            if(!q.withText)setTimeout(go,220);else next.disabled=false;
          }else{
            var i=cur.indexOf(txt(o));
            if(i>-1)cur.splice(i,1);else{if(q.max&&cur.length>=q.max)return;cur.push(txt(o))}
            A[q.id]=cur;b.setAttribute("aria-pressed",i>-1?"false":"true");next.disabled=!cur.length;
          }
        };
        list.appendChild(b);
      });
      qBox.appendChild(list);
      if(q.withText){var f=el("div","field qz-extra"),lab=el("label",null,q.withText.label),inp=el("input");
        inp.id="qz-"+q.withText.id;lab.htmlFor=inp.id;inp.placeholder=q.withText.ph;inp.value=A[q.withText.id]||"";
        inp.oninput=function(){A[q.withText.id]=inp.value.trim()};f.appendChild(lab);f.appendChild(inp);qBox.appendChild(f)}
      if(q.type==="multi"||q.withText){next.disabled=q.type==="multi"?!cur.length:!A[q.id];next.onclick=go;nav.appendChild(back);nav.appendChild(next)}
      else nav.appendChild(back);
    }else{
      var ta=el("textarea");ta.id="qz-"+q.id;ta.placeholder=q.ph;ta.value=A[q.id]||"";ta.setAttribute("aria-label",q.label);
      ta.oninput=function(){A[q.id]=ta.value.trim();if(!q.optional)next.disabled=!A[q.id]};
      qBox.appendChild(ta);next.disabled=!q.optional&&!A[q.id];next.onclick=go;
      nav.appendChild(back);nav.appendChild(next);
    }
    qBox.appendChild(nav);show("q");
  }

  root.querySelector("[data-start]").onclick=function(){render(1)};
  root.querySelector("[data-back-q]").onclick=function(){render(TOTAL)};
  root.querySelectorAll("[data-cal]").forEach(function(a){a.href=CAL});

  var form=root.querySelector("form"),err=root.querySelector(".qz-err");
  form.addEventListener("submit",function(e){
    e.preventDefault();var fd=new FormData(form);
    var first=(fd.get("first")||"").trim(),email=(fd.get("email")||"").trim();
    if(!first||!/^\S+@\S+\.\S+$/.test(email)){err.textContent=T.req;err.hidden=false;return}
    if(fd.get("_honey"))return;err.hidden=true;
    var L=FR?{s:"Situation",g:"Objectif",sp:"Type de lieu",w:"Lieu",r:"Pièces",t:"Délai",b:"Budget",sm:"Ce qui la/le ferait sourire",n:"Prénom",e:"E-mail",p:"Téléphone",l:"Langue"}
           :{s:"Situation",g:"Goal",sp:"Space",w:"Where",r:"Rooms",t:"Timing",b:"Budget",sm:"What would make them smile",n:"First name",e:"Email",p:"Phone",l:"Language"};
    var j=function(x){return Array.isArray(x)?x.join(", "):(x||"—")};
    var data={};
    data[L.n]=first;data[L.e]=email;data[L.p]=(fd.get("phone")||"—");data[L.l]=fd.get("lang");
    data[L.s]=j(A.situation_label);data[L.g]=j(A.goal);data[L.sp]=j(A.space);data[L.w]=j(A.where);
    data[L.r]=j(A.rooms);data[L.t]=j(A.timing);data[L.b]=j(A.budget);data[L.sm]=j(A.smile);
    var short={sell:FR?"Vente":"Selling",stay:FR?"J'y reste":"Staying",rent:FR?"Location":"Renting",other:FR?"Autre":"Other"}[A.situation]||"";
    data._subject=T.subj(first,short);data._replyto=email;data._template="table";data._captcha="false";
    var btn=form.querySelector("button[type=submit]"),label=btn.textContent;btn.disabled=true;btn.textContent=T.sending;
    function done(){show("thanks");window.hmTrack&&window.hmTrack("Lead",{content_name:"Pre-call quiz"})}
    function fallback(){
      var body=Object.keys(data).filter(function(k){return k.charAt(0)!=="_"}).map(function(k){return k+": "+data[k]}).join("\n");
      location.href="mailto:"+INBOX+"?subject="+encodeURIComponent(data._subject)+"&body="+encodeURIComponent(body);
      root.querySelector(".qz-fallback").hidden=false;show("thanks");
    }
    fetch("https://formsubmit.co/ajax/"+INBOX,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data)})
      .then(function(r){return r.json().then(function(b){if(!r.ok||String(b.success)==="false")throw 0})})
      .then(done,fallback).then(function(){btn.disabled=false;btn.textContent=label});
  });
  show("intro");
})();
