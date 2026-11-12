# Drive the plugged-in Android phone and save a small screenshot.
# usage: python tools/device/shot.py NAME [steps...]
# steps: t:x,y tap | s:x1,y1,x2,y2 swipe | b back | w:sec wait | l:URL deep link | snap:NAME extra screenshot
# Output: tools/device/out/NAME.png (432 px wide; 1 px = 2.5 phone px). Needs Pillow.
import io, os, subprocess, sys, time
from PIL import Image

ADB = os.environ.get('ADB', r'C:\Users\kashy\android-tools\platform-tools\adb.exe')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)


def sh(*a):
    subprocess.run([ADB, 'shell', *a], capture_output=True)


def guard():
    # Never touch the phone unless CLAWW is in front and no call is ringing or active.
    w = subprocess.run([ADB, 'shell', 'dumpsys', 'window'], capture_output=True, text=True).stdout
    focus = next((l for l in w.splitlines() if 'mCurrentFocus' in l), '')
    t = subprocess.run([ADB, 'shell', 'dumpsys', 'telephony.registry'], capture_output=True, text=True).stdout
    calling = any(l.strip().startswith('mCallState=') and l.strip() != 'mCallState=0' for l in t.splitlines())
    if 'com.claww.app' not in focus or calling:
        print('ABORT: CLAWW not in front or a call is on:', focus.strip(), 'calling' if calling else '')
        sys.exit(2)


def snap(name):
    raw = subprocess.run([ADB, 'exec-out', 'screencap', '-p'], capture_output=True).stdout
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    im = im.resize((432, round(im.height * 432 / im.width)))
    path = os.path.join(OUT, name + '.png')
    im.save(path)
    return path


name = sys.argv[1]
for c in sys.argv[2:]:
    if c.startswith(('t:', 's:')) or c == 'b':
        guard()
    if c.startswith('t:'):
        x, y = c[2:].split(','); sh('input', 'tap', x, y); time.sleep(1.2)
    elif c.startswith('s:'):
        sh('input', 'swipe', *c[2:].split(','), '350'); time.sleep(1)
    elif c == 'b':
        sh('input', 'keyevent', 'KEYCODE_BACK'); time.sleep(1.2)
    elif c.startswith('w:'):
        time.sleep(float(c[2:]))
    elif c.startswith('l:'):
        sh('am', 'start', '-a', 'android.intent.action.VIEW', '-d', c[2:]); time.sleep(3)
    elif c.startswith('snap:'):
        snap(c[5:])
print(snap(name))
