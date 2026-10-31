import { spawn, execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const bundledAgent = fileURLToPath(new URL('./agent/DeepSeek Remote.app/Contents/MacOS/DeepSeekRemoteAgent', import.meta.url));
const wakeDisplay=()=>new Promise((resolve,reject)=>execFile('/usr/bin/caffeinate',['-u','-t','1'],{timeout:4000},error=>error?reject(error):resolve()));
export function createNativeBridge({ executable = bundledAgent, testPattern = false, iceServers = [], relayOnly = false, spawnProcess = spawn, wake = wakeDisplay } = {}) {
  let setupChild=null;
  let probe = null, lastProbe = 0, value = { installed: false, screen: false, input: false };
  async function status() {
    if (testPattern) return { installed: true, screen: true, input: true, testPattern: true };
    if (Date.now() - lastProbe < 3000) return value;
    if (!probe) probe = (async () => {
      try {
        await access(executable);
        const data = await new Promise((resolve, reject) => execFile(executable, ['--permissions'], { timeout: 4000, maxBuffer: 4096, env: minimalEnv() }, (error, stdout) => error ? reject(error) : resolve(stdout)));
        const p = JSON.parse(data);
        value = { installed: true, screen: p.screen === true, input: p.input === true, testPattern: false };
      } catch { value = { installed: false, screen: false, input: false, testPattern: false }; }
      lastProbe = Date.now(); return value;
    })().finally(() => { probe = null; });
    return probe;
  }
  function start({ onMessage, onClose }) {
    let ended = false, pending = '', stopTimer, started = false, awake;
    const child = spawnProcess(executable, testPattern ? ['--test-pattern'] : [], { stdio: ['pipe', 'pipe', 'pipe'], env: minimalEnv() });
    // Discard native diagnostics: SDP, text and desktop contents never enter Host logs.
    child.stderr?.resume();
    const startup = setTimeout(() => { onMessage({ type: 'error', code: 'agent-timeout' }); stop(); }, 15000); startup.unref?.();
    function send(value) {
      if (ended || child.stdin.destroyed || child.stdin.writableLength > 1024 * 1024) return false;
      child.stdin.write(JSON.stringify(value) + '\n'); return true;
    }
    function stop() {
      if (ended) return; ended = true; clearTimeout(startup); awake?.kill('SIGTERM');
      if (!child.stdin.destroyed) { child.stdin.end(JSON.stringify({ type: 'stop' }) + '\n'); }
      stopTimer = setTimeout(() => child.kill('SIGKILL'), 3000); stopTimer.unref?.();
    }
    child.stdout.on('data', bytes => {
      if (ended) return;
      pending += bytes.toString('utf8');
      if (pending.length > 1024 * 1024) { stop(); return; }
      let index;
      while ((index = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, index); pending = pending.slice(index + 1);
        let m; try { m = JSON.parse(line); } catch { stop(); return; }
        if (m.type === 'started' && !started) {
          started = true;
          (testPattern?Promise.resolve():wake()).then(()=>{
            if(ended)return;
            if(!testPattern){
              awake=spawnProcess('/usr/bin/caffeinate',['-d','-i','-w',String(child.pid)],{stdio:'ignore',env:minimalEnv()});
              awake.once('error',()=>{if(!ended){onMessage({type:'error',code:'display-wake-failed'});stop();}});
            }
            send({ type: 'start', iceServers, relayOnly });
          }).catch(()=>{if(!ended){onMessage({type:'error',code:'display-wake-failed'});stop();}});
        }
        else if (m.type === 'ready') { clearTimeout(startup); onMessage(m); }
        else if (['answer', 'candidate', 'error', 'closed', 'connection', 'input-ready', 'capture'].includes(m.type)) onMessage(m);
      }
    });
    child.stdin.on('error', stop);
    child.once('error', () => { onMessage({ type: 'error', code: 'agent-unavailable' }); stop(); });
    child.once('close', () => { ended = true; awake?.kill('SIGTERM'); clearTimeout(startup); clearTimeout(stopTimer); pending = ''; onClose(); });
    return { send, stop, get pid() { return child.pid; } };
  }
  function setup() {
    if(setupChild)return;
    const child=setupChild=spawnProcess(executable,['--setup'],{stdio:'ignore',env:minimalEnv()});
    child.once('error',()=>{setupChild=null;});
    child.once('close',()=>{if(setupChild===child)setupChild=null;lastProbe=0;});
  }
  function dispose(){setupChild?.kill('SIGTERM');setupChild=null;}
  return { status, start, setup, dispose, configuration: { iceServers, relayOnly }, testPattern };
}
function minimalEnv() {
  return { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: process.env.HOME, TMPDIR: process.env.TMPDIR || '/tmp', LANG: 'en_US.UTF-8' };
}
