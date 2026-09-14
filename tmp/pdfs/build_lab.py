from pathlib import Path
import re, json, hashlib, shutil, html, textwrap
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, CondPageBreak, Table, TableStyle, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/gp-lab'
PDF = ROOT / 'output/pdf/gp-user-module-implementation-lab.pdf'
manifest = {}
snippets = []

def expand(match):
    kind, args = match.group(1), match.group(2).split('|')
    path = args[0]
    p = ROOT / path
    raw = p.read_bytes()
    lines = raw.decode('utf-8-sig').splitlines()
    start, end = 1, len(lines)
    if kind == 'source' and len(args) > 1:
        start, end = int(args[1]), int(args[2])
    elif kind == 'function':
        start = next(i+1 for i,s in enumerate(lines) if s.startswith(args[1]))
        end = next(i+1 for i in range(start, len(lines)) if lines[i] == '}')
    elif kind == 'match':
        found = [i+1 for i,s in enumerate(lines) if args[1] in s]
        assert len(found) == 1, (path,args[1],found)
        start = end = found[0]
    assert 1 <= start <= end <= len(lines), (path,start,end,len(lines))
    code = '\n'.join(lines[start-1:end])
    lang = {'.tsx':'tsx','.ts':'typescript','.py':'python','.json':'json','.mjs':'javascript','.sql':'sql'}.get(p.suffix,'dotenv')
    if path.startswith('frontend/') or path.startswith('backend/'):
        dest = OUT / 'source' / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p,dest)
        manifest[path] = hashlib.sha256(raw).hexdigest()
    snippets.append({'path':path,'start':start,'end':end,'sha256':hashlib.sha256(code.encode()).hexdigest()})
    return f'**Source:** `{path}` (lines {start}-{end}; '+('complete file' if start==1 and end==len(lines) else 'verbatim excerpt')+f').\n\n```{lang}\n{code}\n```'

template = (ROOT/'tmp/pdfs/lab-template.md').read_text(encoding='utf-8')
document = re.sub(r'\{\{(source|function|match):([^\n]+?)\}\}',expand,template)
assert not re.search(r'\{\{(source|function|match):', document), 'Unexpanded source token'
# Keep complete references for the context discussed in the appendix as well.
extra = [
 'README.md','frontend/vite.config.ts','frontend/drizzle.config.ts','frontend/tsconfig.json',
 'frontend/data/demo/index.ts','frontend/data/demo/types.ts',
 'frontend/app/people/page.tsx','frontend/app/people/[clientId]/page.tsx',
 'frontend/app/page.tsx','frontend/app/messages/page.tsx','frontend/lib/auth.ts',
 'frontend/components/role-provider.tsx','frontend/docs/gp-medication-chart.md',
 'frontend/app/api/chart-administrations/route.ts','frontend/drizzle/0000_medication_records.sql',
 'frontend/drizzle/0001_short_random.sql','frontend/tests/prescriber-chart.test.ts',
 'frontend/tests/chart-administrations.mjs','backend/config/urls.py','backend/config/settings/base.py',
 'backend/config/settings/dev.py','backend/apps/accounts/middleware.py','backend/apps/accounts/models.py',
 'backend/apps/clients/models.py','backend/apps/clients/views.py','backend/apps/clients/serializers.py',
 'backend/apps/medications/models.py','backend/apps/messaging/models.py','backend/apps/messaging/views.py',
 'backend/apps/messaging/serializers.py','backend/apps/audit/models.py','backend/apps/audit/middleware.py',
 'backend/apps/administration/models.py','backend/apps/administration/views.py','backend/.env.example',
 'backend/requirements/base.txt','backend/requirements/dev.txt','backend/tests/test_safety_models.py',
 'backend/tests/conftest.py','backend/pytest.ini',
]
for path in extra:
    p=ROOT/path
    dest=OUT/'source'/path
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(p,dest)
    manifest[path]=hashlib.sha256(p.read_bytes()).hexdigest()
(OUT/'source-manifest.json').write_text(json.dumps({'inspected':'2026-09-10','frontend_commit':'c53e0eaccf0d9771a9babfada1fab6de8b1f35f3','files':manifest,'excerpts':snippets},indent=2),encoding='utf-8')
(OUT/'GP-User-Module-Implementation-Lab.md').write_text(document,encoding='utf-8')

for name, filename in [('Lab','calibri.ttf'),('LabBold','calibrib.ttf'),('LabItalic','calibrii.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts')/filename)))
pdfmetrics.registerFontFamily('Lab',normal='Lab',bold='LabBold',italic='LabItalic',boldItalic='LabBold')
PAGE_W,PAGE_H=A4
MARGIN=43
WIDTH=PAGE_W-2*MARGIN
navy=colors.HexColor('#17354C')
teal=colors.HexColor('#276D70')
grey=colors.HexColor('#536371')
styles={
 'body':ParagraphStyle('body',fontName='Lab',fontSize=10.2,leading=13.4,spaceAfter=6,textColor=colors.HexColor('#20313F')),
 'title':ParagraphStyle('title',fontName='LabBold',fontSize=22,leading=27,spaceAfter=15,textColor=navy),
 'h2':ParagraphStyle('h2',fontName='LabBold',fontSize=16,leading=20,spaceBefore=12,spaceAfter=10,textColor=navy,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='LabBold',fontSize=14,leading=18,spaceBefore=4,spaceAfter=11,textColor=navy),
 'caption':ParagraphStyle('caption',fontName='Lab',fontSize=8.7,leading=11.5,spaceBefore=3,spaceAfter=5,textColor=grey),
 'cell':ParagraphStyle('cell',fontName='Lab',fontSize=9.1,leading=12,spaceAfter=0,textColor=colors.HexColor('#20313F')),
 'headcell':ParagraphStyle('headcell',fontName='LabBold',fontSize=9.2,leading=12,textColor=colors.white),
}

def inline(s):
    pieces=re.split(r'(`[^`]+`)',s)
    out=[]
    for part in pieces:
        if part.startswith('`') and part.endswith('`'):
            out.append('<font name="Mono" size="8.8">'+html.escape(part[1:-1])+'</font>')
        else:
            part=html.escape(part)
            part=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',part)
            out.append(part)
    return ''.join(out)

class Code(Flowable):
    def __init__(self,lines,lang='',continued=False):
        Flowable.__init__(self)
        self.raw=lines
        self.lang=lang
        self.continued=continued
        self.font=7.6
        self.leading=10
        self.pad=10
        self.width=WIDTH
        self.lines=None
    def wrap(self,w,h):
        self.width=w
        cols=int((w-2*self.pad)/pdfmetrics.stringWidth('M','Mono',self.font))
        self.lines=[]
        for raw in self.raw:
            raw=raw.expandtabs(2)
            if not raw:
                self.lines.append('')
            elif len(raw)<=cols:
                self.lines.append(raw)
            else:
                indent=' '*(min(len(raw)-len(raw.lstrip()),12)+2)
                self.lines.extend(textwrap.wrap(raw,width=cols,expand_tabs=False,replace_whitespace=False,drop_whitespace=False,break_long_words=True,break_on_hyphens=False,subsequent_indent=indent))
        self.height=len(self.lines)*self.leading+28
        return self.width,self.height
    def split(self,w,h):
        self.wrap(w,h)
        count=int((h-28)/self.leading)
        if count<3: return []
        if count>=len(self.lines):return [self]
        return [Code(self.lines[:count],self.lang,self.continued), Code(self.lines[count:],self.lang,True)]
    def draw(self):
        c=self.canv
        c.setFillColor(colors.HexColor('#F2F5F7'))
        c.roundRect(0,0,self.width,self.height,4,stroke=0,fill=1)
        c.setFillColor(teal)
        c.rect(0,0,2,self.height,stroke=0,fill=1)
        c.setFont('LabBold',7)
        c.setFillColor(grey)
        c.drawString(self.pad,self.height-11,self.lang.upper()+(' / CONTINUED' if self.continued else ''))
        c.setFont('Mono',self.font)
        c.setFillColor(colors.HexColor('#1E2E3E'))
        y=self.height-24
        for line in self.lines:
            c.drawString(self.pad,y,line)
            y-=self.leading

story=[]
lines=document.splitlines()
i=0
while i<len(lines):
    line=lines[i]
    if not line.strip():i+=1;continue
    if line.startswith('```'):
        lang=line[3:]
        i+=1
        raw=[]
        while i<len(lines) and not lines[i].startswith('```'):
            raw.append(lines[i]);i+=1
        story.append(Code(raw,lang));story.append(Spacer(1,9));i+=1;continue
    if line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].startswith('|'):
            row=lines[i].strip().strip('|').split('|')
            if not all(re.fullmatch(r'[\s:\-]+',x) for x in row):rows.append([x.strip() for x in row])
            i+=1
        n=len(rows[0])
        assert all(len(r)==n for r in rows), rows
        ratios=[.33,.67] if n==2 else [.32,.35,.33] if n==3 else [1/n]*n
        data=[[Paragraph(inline(cell),'x' if False else styles['headcell' if ri==0 else 'cell']) for cell in row] for ri,row in enumerate(rows)]
        t=Table(data,colWidths=[WIDTH*r for r in ratios],repeatRows=1,hAlign='LEFT')
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#F3F6F7'),colors.white]),('LINEBELOW',(0,0),(-1,0),.6,navy),('LINEBELOW',(0,1),(-1,-1),.25,colors.HexColor('#D5DFE5'))]))
        story.append(t);story.append(Spacer(1,10));continue
    if line.startswith('# '):
        story.append(Paragraph(inline(line[2:]),styles['title']));i+=1;continue
    if line.startswith('## '):
        if line=='## Appendix':story.append(PageBreak())
        story.append(Paragraph(inline(line[3:]),styles['h2']));i+=1;continue
    if line.startswith('### '):
        if re.match(r'### \([1-9]\d*\)',line):story.append(Spacer(1,12));story.append(CondPageBreak(145))
        else: story.append(CondPageBreak(110))
        if line.startswith('### E.'): story.append(CondPageBreak(300))
        story.append(Paragraph(inline(line[4:]),styles['h3']));i+=1;continue
    p=[line];i+=1
    while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','```','|')):
        p.append(lines[i]);i+=1
    text=' '.join(p)
    style=styles['caption'] if text.startswith('**Source:**') else styles['body']
    if text.startswith('**Source:**'):story.append(CondPageBreak(80))
    story.append(Paragraph(inline(text),style))

def page(c,doc):
    c.saveState()
    c.setStrokeColor(colors.HexColor('#CCD8DF'))
    c.setLineWidth(.4)
    c.line(MARGIN,PAGE_H-29,PAGE_W-MARGIN,PAGE_H-29)
    c.setFont('LabBold',8)
    c.setFillColor(navy)
    c.drawString(MARGIN,PAGE_H-22,'ADAC4CARE  /  GP IMPLEMENTATION LAB')
    c.setFont('Lab',8)
    c.setFillColor(grey)
    c.drawRightString(PAGE_W-MARGIN,PAGE_H-22,'REPOSITORY PRACTICE  |  2026')
    c.line(MARGIN,32,PAGE_W-MARGIN,32)
    c.drawString(MARGIN,20,'Copy commands from the Markdown companion; PDF code may wrap visually.')
    c.drawRightString(PAGE_W-MARGIN,20,str(doc.page))
    c.restoreState()

doc=SimpleDocTemplate(str(PDF),pagesize=A4,rightMargin=MARGIN,leftMargin=MARGIN,topMargin=46,bottomMargin=45,title='GP User Module — Implementation Lab',author='ADAC4CARE learning materials')
doc.build(story,onFirstPage=page,onLaterPages=page)
print(json.dumps({'pdf':str(PDF),'markdown':str(OUT/'GP-User-Module-Implementation-Lab.md'),'words':len(document.split()),'source_files':len(manifest),'excerpts':len(snippets)}))
