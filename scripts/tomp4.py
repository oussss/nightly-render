import json, sys, subprocess, os
rec, out = sys.argv[1], sys.argv[2]
d = json.load(open(f'{rec}/frames.json')); fr = d['frames']; t0 = d['t0']; slow = d.get('slow', 1)
lines = []
for i, f in enumerate(fr):
    nxt = fr[i+1]['t'] if i + 1 < len(fr) else f['t'] + 0.1
    lines.append(f"file '{rec}/frames/{f['file']}'\nduration {max(0.0005, (nxt - f['t']) / slow):.5f}")
lines.append(f"file '{rec}/frames/{fr[-1]['file']}'")
open(f'{rec}/list.txt', 'w').write('\n'.join(lines))
# the first frame's offset from the start mark
off = fr[0]['t'] - t0
print('first frame offset', round(off, 3))
os.makedirs(os.path.dirname(out), exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{rec}/list.txt', '-vf', 'fps=60,scale=1170:2532:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', out], check=True)
