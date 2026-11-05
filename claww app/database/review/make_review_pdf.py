"""Builds the trainer + nutritionist review PDF from the dump written by dump_review_data.mjs.

  node database/review/dump_review_data.mjs review.json
  python database/review/make_review_pdf.py review.json out.pdf
"""
import json
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)

data = json.load(open(sys.argv[1], encoding='utf-8'))
out = sys.argv[2]

ss = getSampleStyleSheet()
H1 = ParagraphStyle('H1', parent=ss['Heading1'], fontSize=18, spaceAfter=6)
H2 = ParagraphStyle('H2', parent=ss['Heading2'], fontSize=13, spaceBefore=10, spaceAfter=4)
H3 = ParagraphStyle('H3', parent=ss['Heading3'], fontSize=10.5, spaceBefore=6, spaceAfter=2)
B = ParagraphStyle('B', parent=ss['BodyText'], fontSize=9, leading=12)
SM = ParagraphStyle('SM', parent=B, fontSize=7.5, leading=9.5)
CELL = ParagraphStyle('CELL', parent=B, fontSize=7.5, leading=9)

GRID = TableStyle([
    ('FONTSIZE', (0, 0), (-1, -1), 7.5),
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
    ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#9CA3AF')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2), ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
])


def P(t, s=CELL):
    return Paragraph(str(t).replace('&', '&amp;').replace('<', '&lt;'), s)


def table(rows, widths, repeat=1):
    t = Table([[c if not isinstance(c, str) else P(c) for c in r] for r in rows], colWidths=widths, repeatRows=repeat)
    t.setStyle(GRID)
    return t


def signoff(what):
    t = Table([[P(f'{what}: approved / approved with changes / not approved'), P('Name and signature'), P('Date')], ['', '', '']],
              colWidths=[90 * mm, 55 * mm, 30 * mm], rowHeights=[None, 18 * mm])
    t.setStyle(GRID)
    return t


def footer(c, d):
    c.saveState()
    c.setFont('Helvetica', 7)
    c.drawString(15 * mm, 8 * mm, 'CLAWW review pack - draft for professional review, not medical advice')
    c.drawRightString(195 * mm, 8 * mm, f'Page {d.page}')
    c.restoreState()


story = []
W = 180 * mm

# ---------- cover ----------
story += [Paragraph('CLAWW review pack', H1),
          Paragraph('Workout plans for the trainer, food and meal plans for the nutritionist', H2),
          Paragraph('CLAWW builds a person\'s workout plan and daily meal plan from the templates in this document. Nothing in it is '
                    'written by a language model at run time: a person\'s answers pick a template, and the app fills it from a food or '
                    'exercise catalogue. Every template here is marked <b>unreviewed</b>. Your approval, or your changes, is what lets '
                    'us mark them reviewed before they reach testers.', B),
          Spacer(1, 6),
          Paragraph('How to review', H2),
          Paragraph('<b>Trainer</b> - Part A. For each of the %d weekly templates: is the split sensible for that goal, place and '
                    'number of days; are sets, rep ranges, reps in reserve (RIR) and rest right; are the main lifts first; is weekly '
                    'volume reasonable. Then check the injury table (A2): does each body part and severity remove the right '
                    'movements. Write changes beside the row.' % len(data['blueprints']), B),
          Paragraph('<b>Nutritionist</b> - Part B. (1) The %d meal templates: realistic, sensible portions, diet labels right. '
                    '(2) The %d dishes and their recipe grams: these are our estimates of one typical home or mess serving and are the '
                    'biggest source of error, especially oil. (3) The %d ingredients and where each number came from, including '
                    'the proxies. (4) Missing foods (paneer, jaggery, curry leaves, ragi, idli and dosa batter, regional breads, '
                    'leafy greens). (5) Jain rule: we exclude onion, garlic, ginger, potato, carrot, beetroot, radish, sweet potato, '
                    'mushrooms, eggs, meat, fish and honey. Confirm.' % (len(data['templates']), len(data['dishes']), len(data['ingredients'])), B),
          Spacer(1, 6),
          Paragraph('Important notes', H2),
          Paragraph('- Ingredient values come from USDA FoodData Central SR Legacy (public domain). No Indian composition table '
                    'has been copied because its licence is unconfirmed. If you trust a table (for example ICMR-NIN), tell us and we '
                    'will check the licence and replace values.<br/>'
                    '- Micronutrient targets in the diary use US NIH values for now. Please give the ICMR-NIN values you want.<br/>'
                    '- Costs are blank everywhere, so the budget is not used yet.<br/>'
                    '- Portions are in household steps (half katori, one roti, one egg). The planner aims for calories within 7 % and '
                    'protein at least 90 % of the target, otherwise it shows the gap and the cheapest food that fixes it.<br/>'
                    '- Where a dish has a proxy ingredient, the source column says PROXY.', B),
          Spacer(1, 8), signoff('Trainer (Part A)'), Spacer(1, 6), signoff('Nutritionist (Part B)'), PageBreak()]

# ---------- Part A ----------
story += [Paragraph('Part A - Workouts (for the trainer)', H1)]
story += [Paragraph('A1. Weekly templates', H2),
          Paragraph('Each template is days of slots. A slot is a movement pattern (not a specific exercise): the app then chooses the '
                    'exercise for the person\'s equipment, dislikes and injuries, for example a barbell squat in a gym, a goblet squat '
                    'at home, a bodyweight squat with no equipment. "Role" is main, accessory or isolation. RIR is reps left in the '
                    'tank. Blocks run 6 weeks; in week 6 each exercise loses one set (deload); accessories rotate every block. '
                    '"Min. months" is the training age before the template is offered.', B)]

order = {'muscle': 0, 'fat_loss': 1, 'strength': 2, 'general': 3}
bps = sorted(data['blueprints'], key=lambda b: (order.get(b['goal'], 9), b['place'], b['daysPerWeek']))
GOAL = {'muscle': 'Build muscle', 'fat_loss': 'Lose fat', 'strength': 'Get stronger', 'general': 'General fitness'}
for b in bps:
    head = f"{b['title']}  ({GOAL.get(b['goal'], b['goal'])}, {b['place']}, {b['daysPerWeek']} days, split {b['split']}, min. {b['minMonths']} months)"
    block = [Paragraph(head, H3), Paragraph(b['rationale'], SM)]
    for d in b['days']:
        rows = [['Pattern', 'Role', 'Sets', 'Reps', 'RIR', 'Rest (s)']]
        total = 0
        for s in d['slots']:
            rows.append([s['pattern'].replace('_', ' '), s['role'], s['sets'], f"{s['repRange'][0]}-{s['repRange'][1]}", s['rir'], s['restSec']])
            total += s['sets']
        rows.append([f"{d['name']}: {len(d['slots'])} exercises", '', f'{total} sets', '', '', ''])
        t = table(rows, [60 * mm, 28 * mm, 22 * mm, 22 * mm, 18 * mm, 22 * mm])
        t.setStyle(TableStyle([('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#F3F4F6'))]))
        block += [Paragraph(d['name'], SM), t, Spacer(1, 3)]
    block += [P('Trainer notes / changes:  ____________________________________________________________', SM), Spacer(1, 6)]
    story.append(KeepTogether(block[:3]))
    story += block[3:]
story.append(PageBreak())

story += [Paragraph('A2. Injury rules', H2),
          Paragraph('A person can name a body part and how bad it is. The app removes whole movement patterns from their plan. '
                    'Each level also removes everything in the levels before it. For the knee, ankle, hip and lower back, even a mild '
                    'injury also removes jumping and other impact work. This is a conservative screen, not physiotherapy; the app tells '
                    'the person to see a professional.', B)]
inj = [
    ('Knee', '-', 'lunge, knee extension', 'squat'),
    ('Lower back', 'back extension', 'hinge', 'squat'),
    ('Shoulder', '-', 'vertical push', 'horizontal push, vertical pull'),
    ('Wrist', '-', 'core anti-extension (planks)', 'horizontal push, vertical push'),
    ('Ankle or foot', '-', 'calf raise', 'lunge, squat'),
    ('Hip', '-', 'lunge', 'hinge, squat'),
    ('Elbow', '-', 'elbow extension, elbow flexion', 'horizontal push, horizontal pull, vertical pull'),
    ('Neck', '-', 'vertical push', 'vertical pull'),
]
story.append(table([['Body part', 'Mild removes', 'Moderate adds', 'Severe adds']] + [list(r) for r in inj], [32 * mm, 38 * mm, 52 * mm, 58 * mm]))
story += [Spacer(1, 4), P('Trainer notes / changes:  ______________________________________________________________________', SM),
          Spacer(1, 6), Paragraph('Other fixed rules to confirm', H3),
          Paragraph('- Each of chest, back, shoulders, quads, hamstrings and glutes is trained at least twice a week where the template '
                    'allows (excused when an injury removes the main patterns for it).<br/>'
                    '- Main lifts come first in a session. A session is fitted to the minutes the person chose: it drops optional '
                    'slots first, then trims accessory sets, then isolation, and only then trims main lifts (never below 2 sets).<br/>'
                    '- Rest by role: main 150 s, accessory 90 s, isolation 60 s unless the template says otherwise.<br/>'
                    '- Progression: weight goes up after the person tops the rep range on all sets; a hard session, poor sleep or sore '
                    'muscles hold or lower it.', B), PageBreak()]

# ---------- Part B ----------
story += [Paragraph('Part B - Food and meal plans (for the nutritionist)', H1)]
story += [Paragraph('B1. Meal templates', H2),
          Paragraph('Each template is a real combination of dishes with a quantity in the dish\'s household unit. Every number below is '
                    'computed from the dish recipes (B2) and ingredient values (B3), nothing is typed by hand. The planner scales '
                    'the quantities in household steps to reach the person\'s target. "Where" = food sources it suits (home, self cook, '
                    'mess, tiffin, canteen, eating out); "Cook" = what the person needs to make it.', B)]
for meal in ['breakfast', 'lunch', 'dinner']:
    ts = [t for t in data['templates'] if t['meal'] == meal]
    story.append(Paragraph(f'{meal.capitalize()} ({len(ts)})', H2))
    rows = [['ID', 'Meal', 'Diet', 'kcal', 'P', 'C', 'F', 'Where / cook']]
    for t in ts:
        items = ', '.join(f"{i['qty']:g} {i['unit']} {i['food']}" for i in t['items'])
        jain = ' Jain' if t['jainOk'] else ''
        rows.append([t['id'], [P(t['name'], CELL), P(items, SM)], t['diet'] + jain, t['kcal'], t['protein'], t['carbs'], t['fat'],
                     P('; '.join(x for x in [', '.join(t['needsSources']), ', '.join(t['needsCook'])] if x), SM)])
    story.append(table(rows, [16 * mm, 74 * mm, 17 * mm, 11 * mm, 10 * mm, 10 * mm, 10 * mm, 32 * mm]))
    story += [Spacer(1, 3), P('Nutritionist notes / changes:  _______________________________________________________', SM)]
story.append(PageBreak())

story += [Paragraph('B2. Dishes and recipe grams', H2),
          Paragraph('One standard serving of each dish is a list of ingredients in grams. These grams are <b>our estimates</b> of a '
                    'typical home or mess serving and are the most important thing to check, especially oil and ghee. "Per 100 g" '
                    'is computed from the recipe. Unit = the household measure we use for the dish.', B)]
rows = [['Dish', 'Diet', 'Unit', 'Per 100 g (kcal / protein)', 'Recipe (one serving, grams)']]
for d in sorted(data['dishes'], key=lambda x: x['name']):
    rows.append([d['name'], d['diet'] + (' Jain' if d['jain'] else ''), d['serving'],
                 f"{round(d['kcal100'])} / {round(d['protein100'], 1)}", P('; '.join(d['items']), SM)])
story.append(table(rows, [38 * mm, 18 * mm, 24 * mm, 26 * mm, 74 * mm]))
story += [Spacer(1, 3), P('Nutritionist notes / changes:  _______________________________________________________', SM), PageBreak()]

story += [Paragraph('B3. Ingredients and sources', H2),
          Paragraph('Values per 100 g. Source is USDA FoodData Central SR Legacy unless stated. A reference containing PROXY means no '
                    'exact record exists and a similar food stands in, check each of these.', B)]
rows = [['Ingredient', 'Diet', 'kcal', 'P', 'C', 'F', 'Source reference']]
for i in sorted(data['ingredients'], key=lambda x: x['name']):
    rows.append([i['name'], i['diet'] + (' Jain' if i['jain'] else ''), i['kcal'], i['protein'], i['carbs'], i['fat'], P(i['ref'], SM)])
story.append(table(rows, [42 * mm, 18 * mm, 10 * mm, 10 * mm, 10 * mm, 10 * mm, 80 * mm]))
story += [Spacer(1, 8), Paragraph('Foods we could not find in USDA and need from you', H3),
          Paragraph('paneer, jaggery, curry leaves, ragi, idli and dosa batter, ghee-based sweets, pickles, Indian leafy greens (methi, '
                    'gongura, amaranth), coconut oil dishes, regional breads. Please give values and the table they come from.', B),
          Spacer(1, 10), signoff('Nutritionist (Part B)')]

doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=14 * mm,
                        title='CLAWW review pack', author='CLAWW')
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print('written', out)
