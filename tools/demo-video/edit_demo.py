"""Cut the recorded sessions into a captioned ~1:45 demo video.

Usage: python3 -I edit_demo.py <rec_dir> <ffmpeg> <out.mp4>
"""
import json
import os
import re
import subprocess
import sys

rec, ffmpeg, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(os.path.join(rec, 'marks.json')))
marks, facts = data['marks'], data['facts']
work = os.path.join(rec, 'edit')
os.makedirs(work, exist_ok=True)
FONTS = '/usr/share/fonts/truetype/noto'


def m(who, name):
    for x in marks[who]:
        if x['name'] == name:
            return x['t']
    raise KeyError(f'{who}:{name}')


def has(who, name):
    return any(x['name'] == name for x in marks[who])


def num(pattern, text, default):
    found = re.search(pattern, text or '')
    return found.group(1) if found else default


n1 = num(r'read (\d+) of', facts.get('consent1'), '3')
n2 = num(r'read (\d+) of', facts.get('consent2'), '7')
answer_ok = '10,380' in (facts.get('answer1') or '') and '2,920' in (facts.get('answer1') or '')
refused = re.search(r'(\d+) of (\d+) independent Tide nodes', facts.get('refusal') or '')
failed, total = (refused.group(1), refused.group(2)) if refused else ('20', '20')

V = {'linh': facts['linhVideo'], 'admin': facts['adminVideo']}
console_marks = os.path.join(rec, 'console-marks.json')
if os.path.exists(console_marks):  # governance scene re-recorded on its own
    c = json.load(open(console_marks))
    V['console'] = c['video']
    marks['console'] = c['marks']


def duration(path):
    r = subprocess.run([ffmpeg, '-hide_banner', '-i', path], capture_output=True, text=True)
    h, mi, se = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr).groups()
    return int(h) * 3600 + int(mi) * 60 + float(se)


# Playwright's recording drifts linearly against the wall clock (frames arrive late under load), so map
# each mark onto the video's own timeline using the ratio of video length to the last mark.
SCALE = {who: duration(V[who]) / (marks[who][-1]['t'] + 0.3) for who in V}
print('time scale', {k: round(v, 4) for k, v in SCALE.items()})

# (source, start, end, target_seconds or None for real time, caption)
S = [
    ('linh', m('linh', 'landing') - 1.0, m('linh', 'signin'), None,
     'AI could save us hours on our most private paperwork. But those are exactly the documents we never give an AI.'),
    ('linh', m('linh', 'signin'), m('linh', 'home'), 7.0,
     'The trust problem: to read your files, an AI service must hold the key, so its admins, attackers or a hijacked agent can read everything.'),
    ('linh', m('linh', 'home'), m('linh', 'encrypted'), 5.0,
     "NeedToKnow, built with TideCloak: Linh's documents are encrypted in her browser. No master key exists anywhere."),
    ('linh', m('linh', 'ciphertext'), m('linh', 'ciphertext') + 3.4, None,
     'All the server ever stores is ciphertext.'),
    ('linh', m('linh', 'ask1') - 1.2, m('linh', 'consent1'), 3.5,
     'She asks about her knee surgery. The AI sees only document titles...'),
    ('linh', m('linh', 'consent1'), m('linh', 'release1'), None,
     f'...and asks for {n1} of 7 documents, not her passport. She releases them for this one question.'),
    ('linh', m('linh', 'release1'), m('linh', 'answer1'), 3.0,
     f"Tide's network decrypts just those {n1}, inside her own session."),
    ('linh', m('linh', 'answer1'), m('linh', 'answer1') + 7.0, None,
     'A cited answer: insurance pays $10,380, she pays $2,920, and she can afford it. An evening of reading, done in seconds.'
     if answer_ok else 'A cited, step-by-step answer built only from the documents she released.'),
    ('linh', m('linh', 'ask2') - 2.0, m('linh', 'consent2'), 3.5,
     'Red-team run: the clinic invoice hides a prompt injection in French, and the AI is hijacked.'),
    ('linh', m('linh', 'consent2'), m('linh', 'release2'), 7.0,
     f'The hijacked AI demands {n2} of 7 documents. Linh releases only the two that matter.'),
    ('linh', m('linh', 'release2'), m('linh', 'answer2'), 3.0,
     'Hijacked or not, the AI holds no key and no tools.'),
    ('linh', m('linh', 'answer2'), m('linh', 'denied'), None,
     'It tries export_all_documents() and plants a phishing link. The link is stripped, nothing is exported, and Linh denies the extra requests.'),
    ('linh', m('linh', 'receipts'), m('linh', 'linh-end'), None,
     'Every disclosure lands on her receipt ledger, encrypted under her own key.'),
    ('admin', m('admin', 'store') - 0.5, m('admin', 'decrypt'), 4.5,
     'Now the platform operator. The whole database is open to them, and it is all ciphertext.'),
    ('admin', m('admin', 'decrypt'), m('admin', 'refused'), 3.0,
     "The operator tries to decrypt Linh's file with their own Tide session..."),
    ('admin', m('admin', 'refused'), m('admin', 'refused') + 5.5, None,
     f'...and {failed} of {total} independent Tide nodes refuse. There is no master key to steal or abuse.'),
    ('admin', m('admin', 'rogue'), m('admin', 'rogued'), 2.5,
     'A server-side AI agent with full database access gets nothing readable.'),
    ('admin', m('admin', 'rogued'), m('admin', 'rogued') + 5.0, None,
     'A server-side AI agent with full database access gets nothing readable.'),
]
if 'console' in V:
    S.append(('console', m('console', 'console') - 0.5, m('console', 'console') + 6.5, None,
              "Even with the server's root password, an attacker can only file a change request. "
              'It waits for Tide admins to sign it in their own enclaves.'))
elif has('admin', 'console'):
    S.append(('admin', m('admin', 'console'), m('admin', 'console') + 5.5, None,
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


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:])
        raise SystemExit(f'ffmpeg failed: {" ".join(args[:6])}')


parts, total_dur = [], 0.0
for i, (who, start, end, target, text) in enumerate(S):
    start, end = start * SCALE[who], end * SCALE[who]
    raw = max(end - start, 0.5)
    speed = max(1.0, raw / target) if target else 1.0
    dur = raw / speed
    sub = os.path.join(work, f's{i:02d}.ass')
    ass(sub, text, dur)
    seg = os.path.join(work, f's{i:02d}.mp4')
    vf = (f'setpts=(PTS-STARTPTS)/{speed:.4f},fps=30,scale=1280:800:flags=lanczos,format=yuv420p,'
          f'subtitles={sub}:fontsdir={FONTS}')
    # Trim on the INPUT side so the speed-up and the captions see a timeline that starts at 0.
    run([ffmpeg, '-y', '-loglevel', 'error', '-ss', f'{max(start, 0):.3f}', '-to', f'{end:.3f}', '-i', V[who],
         '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-r', '30', seg])
    parts.append(seg)
    total_dur += dur
    print(f'{i:02d} {who:5s} {start:6.1f}-{end:6.1f} x{speed:4.2f} -> {dur:4.1f}s  {text[:70]}')

end_text = ('{\\fs64}NeedToKnow\\N{\\fs34}AI help for the documents that matter most,\\Non a need-to-know basis.'
            '\\N\\N{\\fs28}Built with TideCloak  ·  ntk.dangpham.id.vn')
end_ass = os.path.join(work, 'end.ass')
ass(end_ass, end_text, 4.5, style='End')
end_mp4 = os.path.join(work, 'end.mp4')
run([ffmpeg, '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x0d1412:s=1280x800:d=4.5:r=30',
     '-vf', f'subtitles={end_ass}:fontsdir={FONTS},format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast',
     '-crf', '23', '-r', '30', end_mp4])
parts.append(end_mp4)
total_dur += 4.5

lst = os.path.join(work, 'list.txt')
with open(lst, 'w') as f:
    f.writelines(f"file '{p}'\n" for p in parts)
run([ffmpeg, '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy',
     '-movflags', '+faststart', out_path])
print(f'TOTAL ~{total_dur:.1f}s -> {out_path} ({os.path.getsize(out_path) / 1e6:.1f} MB)')
