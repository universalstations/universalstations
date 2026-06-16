/* ════════════════════════════════════════════════════════════
   Universal Stations — Lecteur vocal d'article (auto-injecté)
   À inclure sur chaque page article : <script src="/article-voice.js" defer></script>
   Synthèse vocale native (gratuite, hors-ligne) + onde animée + surlignage.
   ════════════════════════════════════════════════════════════ */
(function(){
  function init(){
    const body = document.querySelector('.art-body');
    if (!body) return;
    const synth = window.speechSynthesis;

    /* ── CSS injecté ── */
    const css = `
    .av-player{position:relative;overflow:hidden;background:#0e0f18;border:1px solid rgba(245,158,11,.30);border-radius:14px;padding:.85rem 1rem;margin:0 0 2rem;transition:border-color .3s,box-shadow .3s;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
    .av-player.playing{border-color:rgba(245,158,11,.55);animation:av-breathe 2.6s ease-in-out infinite}
    @keyframes av-breathe{0%,100%{box-shadow:0 8px 30px rgba(245,158,11,.08)}50%{box-shadow:0 8px 40px rgba(245,158,11,.20)}}
    .av-row{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
    .av-play{font-family:inherit;font-weight:700;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:#000;background:#f59e0b;border:0;border-radius:10px;padding:.75rem 1.3rem;cursor:pointer;transition:background .2s,transform .15s}
    .av-play:hover{background:#fcd34d;transform:translateY(-1px)}
    .av-stop{font-family:inherit;font-weight:700;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:#ef4444;border:0;border-radius:10px;padding:.75rem 1rem;cursor:pointer;opacity:.55;transition:background .2s,transform .15s}
    .av-player.playing .av-stop{opacity:1}
    .av-stop:hover{background:#dc2626;transform:translateY(-1px)}
    .av-speed{margin-left:auto;display:flex;align-items:center;gap:.4rem;font-family:'JetBrains Mono',monospace;font-size:.55rem;letter-spacing:.08em;color:#8b8ba8}
    .av-speed select{background:#151623;color:#f1f0fa;border:1px solid rgba(139,92,246,.16);border-radius:8px;padding:.38rem .5rem;font-family:'JetBrains Mono',monospace;font-size:.58rem;cursor:pointer}
    .av-viz{height:0;opacity:0;transition:height .3s,opacity .3s}
    .av-player.playing .av-viz{height:40px;opacity:1;margin-top:.7rem}
    .av-viz canvas{width:100%;height:40px;display:block}
    .av-status{font-family:'JetBrains Mono',monospace;font-size:.52rem;letter-spacing:.06em;color:#42425a;margin-top:.5rem}
    .av-status b{color:#f59e0b}
    .art-body .av-s{transition:background .25s,color .25s,box-shadow .25s;border-radius:5px;padding:1px 3px}
    .art-body .av-s.on{background:rgba(245,158,11,.20);color:#f1f0fa;box-shadow:0 0 0 2px rgba(245,158,11,.18)}`;
    const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);

    /* ── UI du lecteur (inséré avant le corps de l'article) ── */
    const player=document.createElement('div');
    player.className='av-player';player.setAttribute('role','group');player.setAttribute('aria-label',"Lecture vocale de l'article");
    player.innerHTML =
      '<div class="av-row">'+
        '<button type="button" class="av-play"><span class="av-ptxt">Écouter l\'article</span></button>'+
        '<button type="button" class="av-stop" aria-label="Arrêter la lecture">Stop</button>'+
        '<div class="av-speed">Vitesse <select class="av-rate" aria-label="Vitesse de lecture">'+
          '<option value="0.85">Lent</option><option value="1" selected>Normal</option><option value="1.15">Rapide</option>'+
        '</select></div>'+
      '</div>'+
      '<div class="av-viz"><canvas class="av-canvas" width="1200" height="80" aria-hidden="true"></canvas></div>'+
      '<div class="av-status">Voix : <b class="av-voicename">…</b></div>';
    body.parentNode.insertBefore(player, body);

    if (!synth) { player.querySelector('.av-status').innerHTML='🔇 Lecture vocale non supportée par ce navigateur.'; player.querySelector('.av-play').disabled=true; return; }

    /* ── découpe le corps en phrases (préserve le gras via texte) ── */
    const playBtn=player.querySelector('.av-play'), playTxt=player.querySelector('.av-ptxt'),
          stopBtn=player.querySelector('.av-stop'), rateSel=player.querySelector('.av-rate'),
          statusEl=player.querySelector('.av-status'), voicename=player.querySelector('.av-voicename'),
          canvas=player.querySelector('.av-canvas'), vctx=canvas.getContext('2d');
    /* retire emojis / pictogrammes / flèches / symboles avant la lecture vocale */
    const clean=s=>s.replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}\u{20E3}\u{2122}\u{2139}]/gu,'').replace(/\s{2,}/g,' ').trim();
    const sentences=[];
    body.querySelectorAll('p').forEach(p=>{
      const raw=p.textContent.trim(); if(!raw) return;
      const parts=raw.match(/[^.!?]+[.!?]*/g)||[raw];
      p.innerHTML='';
      parts.forEach(txt=>{const t=txt.trim();if(!t)return;const sp=document.createElement('span');sp.className='av-s';sp.textContent=txt;p.appendChild(sp);sentences.push({el:sp,text:t,speak:clean(t)});});
    });
    if(!sentences.length){player.style.display='none';return;}

    let voice=null;
    function pick(){const vs=synth.getVoices().filter(v=>/fr(-|_)?/i.test(v.lang));voice=vs.find(v=>/aurelie|aurélie/i.test(v.name))||vs.find(v=>/thomas|jacques|amelie|amélie|enhanced|premium|siri/i.test(v.name))||vs[0]||null;voicename.textContent=voice?voice.name:'défaut';}
    pick(); if(synth.onvoiceschanged!==undefined)synth.onvoiceschanged=pick;

    let idx=0,playing=false,paused=false,raf=null,vizRun=false;
    function clearHi(){sentences.forEach(s=>s.el.classList.remove('on'));}
    function speakFrom(i){if(i>=sentences.length){finish();return;}idx=i;clearHi();sentences[i].el.classList.add('on');sentences[i].el.scrollIntoView({block:'center',behavior:'smooth'});const say=sentences[i].speak;if(!say){if(playing&&!paused)speakFrom(i+1);return;}const u=new SpeechSynthesisUtterance(say);u.lang='fr-FR';if(voice)u.voice=voice;u.rate=parseFloat(rateSel.value)||1;u.onend=()=>{if(playing&&!paused)speakFrom(i+1);};u.onerror=()=>{if(playing&&!paused)speakFrom(i+1);};synth.speak(u);}
    function setUI(){player.classList.toggle('playing',playing);playTxt.textContent=!playing?"Écouter l'article":(paused?'Reprendre':'Pause');}
    function start(){synth.cancel();playing=true;paused=false;setUI();vizRun=true;if(!raf)draw();speakFrom(0);}
    function finish(){playing=false;paused=false;clearHi();setUI();vizRun=false;if(raf){cancelAnimationFrame(raf);raf=null;}vctx.clearRect(0,0,canvas.width,canvas.height);statusEl.innerHTML='Lecture terminée';}
    playBtn.addEventListener('click',()=>{if(!playing){start();return;}if(!paused){synth.pause();paused=true;setUI();vizRun=false;}else{synth.resume();paused=false;setUI();vizRun=true;if(!raf)draw();}});
    stopBtn.addEventListener('click',()=>{synth.cancel();finish();});
    rateSel.addEventListener('change',()=>{if(playing){const i=idx;synth.cancel();paused=false;playing=true;setUI();speakFrom(i);}});
    window.addEventListener('beforeunload',()=>synth.cancel());

    function draw(){const w=canvas.width,h=canvas.height;vctx.clearRect(0,0,w,h);const dots=54,step=w/dots,t=Date.now()/1000,amp=vizRun?1:0.12;for(let i=0;i<dots;i++){let v=0.5+0.46*Math.sin(t*3+i*0.4)*(0.6+0.4*Math.sin(t*1.3+i*0.6));v=Math.min(1,Math.max(0,v));const a=Math.abs(v-0.5)*2*amp,x=i*step+step/2,y=h/2+(v-0.5)*h*0.8*amp,r=1.4+a*3.4,cg=Math.round(211+a*44),cb=Math.round(77+a*178);vctx.beginPath();vctx.arc(x,y,r,0,6.28);vctx.fillStyle='rgba(255,'+cg+','+cb+','+(0.4+a*0.6)+')';vctx.shadowColor='rgba(252,211,77,0.9)';vctx.shadowBlur=a*13;vctx.fill();const y2=h/2-(v-0.5)*h*0.28*amp;vctx.beginPath();vctx.arc(x,y2,Math.max(.7,r*0.5),0,6.28);vctx.fillStyle='rgba(255,255,255,'+(0.08+a*0.2)+')';vctx.shadowBlur=0;vctx.fill();}vctx.shadowBlur=0;if(vizRun||amp>0.12)raf=requestAnimationFrame(draw);else raf=null;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
