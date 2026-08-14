// app.js — lógica Pomodoro reutilizable y compatible con tests (CommonJS + browser)
(function(exports){
  class PomodoroTimer{
    constructor(opts = {}){
      this.pomodoro = opts.pomodoro || 25*60;
      this.shortBreak = opts.shortBreak || 5*60;
      this.longBreak = opts.longBreak || 15*60;
      this.mode = 'pomodoro';
      this.remaining = this.pomodoro;
      this.interval = null;
      this.onTick = opts.onTick || function(){};
      this.onEnd = opts.onEnd || function(){};
      this.cycles = 0; // pomodoro sessions completed
      this._running = false;
    }

    start(){
      if(this._running) return;
      this._running = true;
      this.interval = setInterval(()=> this._tick(), 1000);
    }

    pause(){
      this._running = false;
      if(this.interval){ clearInterval(this.interval); this.interval = null }
    }

    reset(){
      this.pause();
      this.mode = 'pomodoro';
      this.remaining = this.pomodoro;
      this.cycles = 0;
      this.onTick(this._format());
    }

    setDurations({pomodoro, shortBreak, longBreak}){
      if(pomodoro) this.pomodoro = pomodoro;
      if(shortBreak) this.shortBreak = shortBreak;
      if(longBreak) this.longBreak = longBreak;
      if(this.mode === 'pomodoro') this.remaining = this.pomodoro;
    }

    _tick(){
      if(this.remaining > 0){
        this.remaining -= 1;
        this.onTick(this._format());
        return;
      }
      // time ended
      this.onEnd(this.mode);
      if(this.mode === 'pomodoro'){
        this.cycles += 1;
        if(this.cycles % 4 === 0) this._switchTo('longBreak');
        else this._switchTo('shortBreak');
      } else {
        this._switchTo('pomodoro');
      }
      this.onTick(this._format());
    }

    _switchTo(mode){
      this.mode = mode;
      if(mode === 'pomodoro') this.remaining = this.pomodoro;
      if(mode === 'shortBreak') this.remaining = this.shortBreak;
      if(mode === 'longBreak') this.remaining = this.longBreak;
    }

    _format(){
      const m = Math.floor(this.remaining/60);
      const s = this.remaining % 60;
      return {mode:this.mode, minutes:m, seconds:s, raw:this.remaining};
    }

    // utility for tests: advance n seconds synchronously
    _advanceSeconds(n=1){
      for(let i=0;i<n;i++) this._tick();
    }
  }

  // Browser glue: if running in browser, mount UI handlers
  if(typeof window !== 'undefined'){
    window.addEventListener('DOMContentLoaded', ()=>{
      const minutesEl = document.getElementById('minutes');
      const secondsEl = document.getElementById('seconds');
      const startBtn = document.getElementById('start');
      const pauseBtn = document.getElementById('pause');
      const resetBtn = document.getElementById('reset');
      const modeButtons = document.querySelectorAll('.mode');
      const pomInput = document.getElementById('pomodoro-min');
      const shortInput = document.getElementById('short-min');
      const longInput = document.getElementById('long-min');
      const bell = document.getElementById('bell');

      // optional simple beep using WebAudio if no src
      function playBeep(){
        try{
          if(bell && bell.src){ bell.play(); return }
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
          o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
          setTimeout(()=>{ o.stop(); ctx.close(); },700);
        }catch(e){ console.warn('no audio',e) }
      }

      const timer = new PomodoroTimer({
        pomodoro: parseInt(pomInput.value,10)*60,
        shortBreak: parseInt(shortInput.value,10)*60,
        longBreak: parseInt(longInput.value,10)*60,
        onTick: (st)=>{
          minutesEl.textContent = String(st.minutes).padStart(2,'0');
          secondsEl.textContent = String(st.seconds).padStart(2,'0');
        },
        onEnd: ()=>{
          playBeep();
          // try to notify
          if(window.Notification && Notification.permission === 'granted'){
            new Notification('Pomodoro', {body:'Sesión finalizada. Toma un descanso si corresponde.'});
          }
        }
      });

      startBtn.addEventListener('click',()=>{ timer.start(); startBtn.disabled = true; pauseBtn.disabled=false });
      pauseBtn.addEventListener('click',()=>{ timer.pause(); startBtn.disabled=false; pauseBtn.disabled=true });
      resetBtn.addEventListener('click',()=>{ timer.reset(); startBtn.disabled=false; pauseBtn.disabled=true });

      modeButtons.forEach(btn=> btn.addEventListener('click',(e)=>{
        modeButtons.forEach(b=>b.classList.remove('active'));
        e.target.classList.add('active');
        const mode = e.target.dataset.mode;
        if(mode === 'pomodoro') timer._switchTo('pomodoro');
        if(mode === 'shortBreak') timer._switchTo('shortBreak');
        if(mode === 'longBreak') timer._switchTo('longBreak');
        // update display immediately
        const st = timer._format();
        minutesEl.textContent = String(st.minutes).padStart(2,'0');
        secondsEl.textContent = String(st.seconds).padStart(2,'0');
      }));

      // inputs change durations
      [pomInput, shortInput, longInput].forEach(inp=> inp.addEventListener('change', ()=>{
        timer.setDurations({pomodoro:parseInt(pomInput.value,10)*60, shortBreak:parseInt(shortInput.value,10)*60, longBreak:parseInt(longInput.value,10)*60});
        const st = timer._format();
        minutesEl.textContent = String(st.minutes).padStart(2,'0');
        secondsEl.textContent = String(st.seconds).padStart(2,'0');
      }))

      // request permission for notifications
      if(window.Notification && Notification.permission !== 'granted'){
        Notification.requestPermission().catch(()=>{});
      }

      // initialize display
      const st = timer._format();
      minutesEl.textContent = String(st.minutes).padStart(2,'0');
      secondsEl.textContent = String(st.seconds).padStart(2,'0');

      // expose for debugging
      window.pomodoroTimer = timer;
    });
  }

  // export for Node tests
  if(typeof module !== 'undefined' && module.exports){
    module.exports = PomodoroTimer;
  }

  if(exports){ exports.PomodoroTimer = PomodoroTimer }
})(typeof exports === 'undefined' ? null : exports);