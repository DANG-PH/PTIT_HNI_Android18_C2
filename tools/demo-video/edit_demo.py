"""Cut the recorded sessions into a captioned, narrated demo video (target: under two minutes).

Usage: python3 -I edit_demo.py <rec_dir> <ffmpeg> <out.mp4> [narration_dir]

<rec_dir> holds marks.json from record-demo.cjs and, optionally, console-marks.json from record-console.cjs.
[narration_dir] holds g1.wav … g7.wav (one clip per scene group); without it the video is silent.
"""
import json
import os
import re
import subprocess
import sys
import wave

rec, ffmpeg, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
narr_dir = sys.argv[4] if len(sys.argv) > 4 else None
data = json.load(open(os.path.join(rec, 'marks.json')))
marks, facts = data['marks'], data['facts']
work = os.path.join(rec, 'edit')
os.makedirs(work, exist_ok=True)
FONTS = '/usr/share/fonts/truetype/noto'

V = {'user': facts['userVideo'], 'admin': facts['adminVideo']}
console_marks = os.path.join(rec, 'console-marks.json')
if os.path.exists(console_marks):  # governance scene recorded on its own
    c = json.load(open(console_marks))
    V['console'] = c['video']
    marks['console'] = c['marks']


def run(args, capture=False):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        raise SystemExit(f'ffmpeg failed: {" ".join(args[:6])}')
    return r


def duration(path):
    r = subprocess.run([ffmpeg, '-hide_banner', '-i', path], capture_output=True, text=True)
    h, mi, se = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr).groups()
    return int(h) * 3600 + int(mi) * 60 + float(se)


# Playwright's recording drifts linearly against the wall clock, so map marks onto each video's timeline.
SCALE = {who: duration(V[who]) / (marks[who][-1]['t'] + 0.3) for who in V}


def m(who, name):
    return next(x['t'] for x in marks[who] if x['name'] == name)


def num(pattern, text, default):
    found = re.search(pattern, text or '')
    return found.group(1) if found else default


n1 = num(r'read (\d+) of', facts.get('consent1'), '3')
n2 = num(r'read (\d+) of', facts.get('consent2'), '7')
nmask = num(r'(\d+) identifiers masked', facts.get('masked'), 'several')
answer_ok = '2,920' in (facts.get('answer1') or '')
refused = re.search(r'(\d+) of (\d+) independent Tide nodes', facts.get('refusal') or '')
failed, total = (refused.group(1), refused.group(2)) if refused else ('20', '20')

# (narration group, source, start, end, target seconds or None for real time, caption)
S = [
    ('g1', 'user', m('user', 'landing') - 1.0, m('user', 'signin'), None,
     'AI could save us hours on our most private paperwork. But those are exactly the documents we never give an AI.'),
    ('g1', 'user', m('user', 'signin'), m('user', 'home'), 6.0,
     'To read your files, an AI service holds the keys, so its admins, attackers or a hijacked agent can read everything.'),
    ('g2', 'user', m('user', 'guide'), m('user', 'encrypt'), None,
     'NeedToKnow, built with TideCloak. Step 1: seal a sample vault.'),
    ('g2', 'user', m('user', 'encrypt'), m('user', 'encrypted'), 3.0,
     "Your documents are encrypted in your browser. No master key exists anywhere."),
    ('g2', 'user', m('user', 'ciphertext'), m('user', 'ciphertext') + 3.4, None,
     'All the server ever stores is ciphertext.'),
    ('g3', 'user', m('user', 'ask1') - 0.8, m('user', 'consent1'), 3.0,
     'Step 2: you ask about your knee surgery. The AI sees only document titles...'),
    ('g3', 'user', m('user', 'consent1'), m('user', 'release1'), None,
     f'...and asks for {n1} of 7 documents, not your passport. You release them for this one question.'),
    ('g3', 'user', m('user', 'release1'), m('user', 'answer1'), 2.5,
     f"Tide's network decrypts just those {n1}, inside your own session."),
    ('g3b', 'user', m('user', 'answer1'), m('user', 'masked'), None,
     'A cited answer: insurance pays $10,380, you pay $2,920, and you can afford it.'
     if answer_ok else 'A cited, step-by-step answer built only from the documents you released.'),
    ('g3b', 'user', m('user', 'masked'), m('user', 'masked') + 5.0, None,
     f'Before anything left your browser, {nmask} names and ID numbers were masked. This is exactly what the AI saw.'),
    ('g4', 'user', m('user', 'ask2') - 1.0, m('user', 'consent2'), 3.0,
     'Step 3: red-team it. A clinic invoice hides a prompt injection in French, and the AI is hijacked.'),
    ('g4', 'user', m('user', 'consent2'), m('user', 'release2'), 6.0,
     f'The hijacked AI demands {n2} of 7 documents. You release only the two that matter.'),
    ('g4', 'user', m('user', 'release2'), m('user', 'answer2'), 2.5,
     'Hijacked or not, the AI holds no key and no tools.'),
    ('g4', 'user', m('user', 'answer2'), m('user', 'denied'), None,
     'It tries export_all_documents() and plants a phishing link. The link is stripped, nothing is exported, '
     'and you deny the extra requests.'),
    ('g4', 'user', m('user', 'receipts'), m('user', 'user-end'), None,
     'Every disclosure lands on your receipt ledger, encrypted under your own key.'),
    ('g5', 'admin', m('admin', 'store') - 0.5, m('admin', 'decrypt'), 4.5,
     'Step 4: the platform operator. The whole database is open to them, and it is all ciphertext.'),
    ('g5', 'admin', m('admin', 'decrypt'), m('admin', 'refused'), 2.5,
     "The operator tries to decrypt your file with their own Tide session..."),
    ('g5', 'admin', m('admin', 'refused'), m('admin', 'refused') + 5.5, None,
     f'...and {failed} of {total} independent Tide nodes refuse. There is no master key to steal or abuse.'),
    ('g5', 'admin', m('admin', 'rogue'), m('admin', 'rogued'), 2.5,
     'A server-side AI agent with full database access gets nothing readable.'),
    ('g5', 'admin', m('admin', 'rogued'), m('admin', 'rogued') + 5.0, None,
     'A server-side AI agent with full database access gets nothing readable.'),
]
if 'console' in V:
    S.append(('g6', 'console', m('console', 'console') - 0.5, m('console', 'console') + 6.5, None,
              "Even with the server's root password, an attacker can only file a change request. "
              'It waits for Tide admins to sign it in their own enclaves.'))

ASS_HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 800
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Noto Sans,30,&H00FFFFFF,&H00FFFFFF,&HC0101010,&H40101010,1,0,0,0,100,100,0,0,3,14,0,2,90,90,34,1
Style: End,Noto Sans,44,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,5,80,80,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ts(sec):
    h, rem = divmod(max(sec, 0), 3600)
    mnt, s = divmod(rem, 60)
    return f'{int(h)}:{int(mnt):02d}:{s:05.2f}'


def ass(path, text, dur, style='Cap'):
    with open(path, 'w') as f:
        f.write(ASS_HEAD + f'Dialogue: 0,{ts(0)},{ts(dur + 1)},{style},,0,0,0,,{text}\n')


def wav_len(path):
    with wave.open(path) as w:
        return w.getnframes() / w.getframerate()


narration = {}
if narr_dir:
    for g in sorted({x[0] for x in S} | {'g7'}):
        p = os.path.join(narr_dir, f'{g}.wav')
        if os.path.exists(p):
            narration[g] = (p, wav_len(p))

# Plan durations, then pad the last segment of a group when its narration runs longer than the pictures.
plan = []
for grp, who, start, end, target, text in S:
    start, end = start * SCALE[who], end * SCALE[who]
    raw = max(end - start, 0.5)
    speed = max(1.0, raw / target) if target else 1.0
    plan.append({'grp': grp, 'who': who, 'start': start, 'end': end, 'speed': speed, 'dur': raw / speed, 'pad': 0.0,
                 'text': text})
for g, (_, nlen) in narration.items():
    idx = [i for i, p in enumerate(plan) if p['grp'] == g]
    if idx:
        shown = sum(plan[i]['dur'] for i in idx)
        if nlen + 0.5 > shown:
            plan[idx[-1]]['pad'] = nlen + 0.5 - shown

parts, starts, clock = [], {}, 0.0
for i, p in enumerate(plan):
    starts.setdefault(p['grp'], clock)
    total_dur = p['dur'] + p['pad']
    sub = os.path.join(work, f's{i:02d}.ass')
    ass(sub, p['text'], total_dur)
    seg = os.path.join(work, f's{i:02d}.mp4')
    pad = f",tpad=stop_mode=clone:stop_duration={p['pad']:.3f}" if p['pad'] > 0 else ''
    vf = (f"setpts=(PTS-STARTPTS)/{p['speed']:.4f},fps=30,scale=1280:800:flags=lanczos,format=yuv420p{pad},"
          f'subtitles={sub}:fontsdir={FONTS}')
    # Trim on the INPUT side so the speed-up and the captions see a timeline that starts at 0.
    run([ffmpeg, '-y', '-loglevel', 'error', '-ss', f"{max(p['start'], 0):.3f}", '-to', f"{p['end']:.3f}",
         '-i', V[p['who']], '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-r', '30', seg])
    parts.append(seg)
    print(f"{i:02d} {p['grp']:3s} {p['who']:7s} x{p['speed']:5.2f} {p['dur']:4.1f}s +{p['pad']:3.1f}  {p['text'][:58]}")
    clock += total_dur

end_len = max(4.5, narration['g7'][1] + 0.8) if 'g7' in narration else 4.5
starts['g7'] = clock
end_text = ('{\\fs64}NeedToKnow\\N{\\fs34}AI help for the documents that matter most,\\Non a need-to-know basis.'
            '\\N\\N{\\fs28}Built with TideCloak  ·  ntk.dangpham.id.vn')
end_ass = os.path.join(work, 'end.ass')
ass(end_ass, end_text, end_len, style='End')
end_mp4 = os.path.join(work, 'end.mp4')
run([ffmpeg, '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', f'color=c=0x0d1412:s=1280x800:d={end_len:.2f}:r=30',
     '-vf', f'subtitles={end_ass}:fontsdir={FONTS},format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast',
     '-crf', '23', '-r', '30', end_mp4])
parts.append(end_mp4)
clock += end_len

lst = os.path.join(work, 'list.txt')
with open(lst, 'w') as f:
    f.writelines(f"file '{p}'\n" for p in parts)
silent = os.path.join(work, 'silent.mp4')
run([ffmpeg, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', silent])

if narration:
    inputs, chains, labels = [], [], []
    for k, (g, (path, _)) in enumerate(sorted(narration.items(), key=lambda kv: starts.get(kv[0], 0))):
        delay = int(starts.get(g, 0) * 1000) + 250
        inputs += ['-i', path]
        chains.append(f'[{k + 1}:a]aresample=48000,adelay={delay}:all=1[a{k}]')
        labels.append(f'[a{k}]')
    # Pad the mix to exactly the video's length and cap the output there (apad alone never ends).
    graph = (';'.join(chains) + f";{''.join(labels)}amix=inputs={len(labels)}:normalize=0:dropout_transition=0,"
             f'apad=whole_dur={clock:.3f}[aout]')
    run([ffmpeg, '-y', '-loglevel', 'error', '-i', silent, *inputs, '-filter_complex', graph, '-map', '0:v',
         '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-t', f'{clock:.3f}', '-movflags', '+faststart',
         out_path])
else:
    run([ffmpeg, '-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', '-movflags', '+faststart', out_path])
print(f'TOTAL {clock:.1f}s -> {out_path} ({os.path.getsize(out_path) / 1e6:.1f} MB)')
