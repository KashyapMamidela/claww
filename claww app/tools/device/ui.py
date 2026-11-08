# List on-screen labels with bounds (* = tappable). usage: python tools/device/ui.py [filter]
import subprocess,re,sys
ADB=r'C:\Users\kashy\android-tools\platform-tools\adb.exe'
subprocess.run([ADB,'shell','uiautomator','dump','/sdcard/u.xml'],capture_output=True)
s=subprocess.run([ADB,'exec-out','cat','/sdcard/u.xml'],capture_output=True).stdout.decode('utf8','ignore')
f=sys.argv[1].lower() if len(sys.argv)>1 else ''
for m in re.finditer(r'<node [^>]*>',s):
    n=m.group(0); t=re.search(r' text="([^"]*)"',n).group(1); d=re.search(r'content-desc="([^"]*)"',n).group(1); b=re.search(r'bounds="([^"]*)"',n).group(1); c='clickable="true"' in n
    lab=(t or d)
    if lab and (f in lab.lower()): print(('*' if c else ' '),lab[:60],b)
