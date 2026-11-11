"""Adds more ingredients and dishes to database/foods/*.csv (idempotent: a name that already exists is skipped).

Run from the repo root:  python database/foods/tools/add_more_foods.py  then  node database/foods/build_foods.mjs

Ingredients here are NOT all from USDA: values marked LABEL are typical published or packaged-product values (paneer,
jaggery, curry leaves, ragi), the rest are USDA SR Legacy values written from the USDA record's description. Every
row says which in `source`, and every row is unreviewed until the nutritionist signs it off (docs/food-review.md).
Dish nutrition is never typed: it is computed from the recipe grams below, which are authored estimates of one
typical serving.
"""
import csv
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)  # database/foods

USDA = 'USDA FoodData Central SR Legacy'
LABEL = 'Typical published values (not USDA)'

# name, aliases, diet, jain_ok, kcal, protein, carbs, fat, fibre, iron, calcium, vitc, b12, sodium, sugar, source, ref, units
ING = [
    ('Paneer', 'paneer|cottage cheese|panir', 'veg', True, 296, 18.3, 1.2, 22.8, 0, 0.2, 208, 0, 0.8, 22, 1.2, LABEL, 'Typical full-fat paneer; brands differ by 10 to 15 %. The nutritionist should replace with their own value', [('g', 1, True), ('cube', 15, False)]),
    ('Jaggery', 'gur|bellam|vellam', 'vegan', True, 383, 0.4, 98, 0.1, 0, 11, 80, 0, 0, 20, 97, LABEL, 'Typical jaggery; close to sugar in energy', [('g', 1, True), ('tsp', 5, False)]),
    ('Curry leaves', 'curry leaf|kadi patta|karivepaku', 'vegan', True, 108, 6.1, 18.7, 1, 6.4, 0.9, 830, 4, 0, 0, 0, LABEL, 'Typical value for fresh curry leaves', [('g', 1, True)]),
    ('Ragi flour', 'ragi|finger millet|nachni|ragi atta', 'vegan', True, 328, 7.3, 72, 1.3, 3.6, 3.9, 344, 0, 0, 11, 0, LABEL, 'Typical finger millet flour', [('g', 1, True)]),
    ('Cream, heavy', 'cream|fresh cream|malai', 'veg', True, 340, 2.8, 2.8, 36.1, 0, 0, 65, 0.6, 0.2, 38, 2.9, USDA, 'Cream, fluid, heavy whipping', [('g', 1, True), ('tbsp', 15, False)]),
    ('Almonds', 'almond|badam', 'vegan', True, 579, 21.15, 21.55, 49.93, 12.5, 3.71, 269, 0, 0, 1, 4.35, USDA, 'Nuts, almonds', [('g', 1, True), ('piece', 1.2, False), ('handful', 28, False)]),
    ('Bottle gourd', 'lauki|dudhi|sorakaya|anapakaya', 'vegan', True, 14, 0.6, 3.39, 0.02, 0.5, 0.2, 26, 10.1, 0, 2, 2.5, USDA, 'Gourd, white-flowered (calabash), raw', [('g', 1, True)]),
    ('Ridge gourd', 'turai|beerakaya|peerkangai|tori', 'vegan', True, 20, 0.6, 4.35, 0.2, 1.1, 0.4, 20, 12, 0, 3, 0, USDA, 'Gourd, dishcloth (towelgourd), raw', [('g', 1, True)]),
    ('Plantain, raw', 'raw banana|kaccha kela|vazhakkai|aratikaya', 'vegan', True, 122, 1.3, 31.9, 0.37, 2.3, 0.6, 3, 18.4, 0, 4, 15, USDA, 'Plantains, raw', [('g', 1, True)]),
    ('Fenugreek leaves', 'methi leaves|methi|menthi aku', 'vegan', True, 49, 4.4, 6, 0.9, 1.1, 1.9, 395, 52, 0, 76, 0, LABEL, 'Typical fresh methi leaves', [('g', 1, True), ('handful', 30, False)]),
    ('Broccoli', 'broccoli', 'vegan', True, 34, 2.82, 6.64, 0.37, 2.6, 0.73, 47, 89.2, 0, 33, 1.7, USDA, 'Broccoli, raw', [('g', 1, True)]),
    ('Sapota', 'chikoo|chiku|sapodilla', 'vegan', True, 83, 0.44, 19.96, 1.1, 5.3, 0.8, 21, 14.7, 0, 12, 14, USDA, 'Sapodilla, raw', [('g', 1, True), ('piece', 100, False)]),
    ('Jackfruit', 'jackfruit|panasa|chakka|kathal', 'vegan', True, 95, 1.72, 23.25, 0.64, 1.5, 0.23, 24, 13.7, 0, 2, 19.1, USDA, 'Jackfruit, raw', [('g', 1, True)]),
    ('Muskmelon', 'melon|kharbuja|cantaloupe', 'vegan', True, 34, 0.84, 8.16, 0.19, 0.9, 0.21, 9, 36.7, 0, 16, 7.9, USDA, 'Melons, cantaloupe, raw', [('g', 1, True)]),
    ('Coconut water', 'tender coconut water|elaneer|nariyal pani', 'vegan', True, 19, 0.72, 3.71, 0.2, 1.1, 0.29, 24, 2.4, 0, 105, 2.61, USDA, 'Nuts, coconut water (liquid from coconuts)', [('ml', 1, False), ('glass', 250, True)]),
    ('Pistachios', 'pista|pistachio', 'vegan', True, 560, 20.16, 27.17, 45.32, 10.6, 3.92, 105, 5.6, 0, 1, 7.66, USDA, 'Nuts, pistachio nuts, raw', [('g', 1, True), ('handful', 28, False)]),
    ('Sprouted moong', 'sprouted moong|moong sprouts cooked', 'vegan', True, 30, 3.04, 5.94, 0.18, 1.8, 0.69, 13, 13.2, 0, 6, 4.13, USDA, 'Mung beans, mature seeds, sprouted, raw', [('g', 1, True)]),
    ('Kale', 'kale|leafy kale|curly kale', 'vegan', True, 49, 4.28, 8.75, 0.93, 3.6, 1.6, 150, 120, 0, 38, 2.26, USDA, 'Kale, raw', [('g', 1, True), ('handful', 25, False)]),
    ('Arugula', 'rocket|rocket leaves|arugula leaves', 'vegan', True, 25, 2.58, 3.65, 0.66, 1.6, 1.46, 160, 15, 0, 27, 2.05, USDA, 'Arugula, raw', [('g', 1, True), ('handful', 20, False)]),
    ('Spring onion', 'scallion|green onion|spring onions|hara pyaz', 'vegan', True, 32, 1.83, 7.34, 0.19, 2.6, 1.48, 72, 18.8, 0, 16, 2.33, USDA, 'Onions, spring or scallions (includes tops and bulb), raw', [('g', 1, True)]),
    ('Olives', 'olive|black olives|green olives', 'vegan', True, 115, 0.84, 6.26, 10.68, 3.2, 3.32, 88, 0.9, 0, 735, 0, USDA, 'Olives, ripe, canned (small-extra large)', [('g', 1, True), ('piece', 4, False)]),
    ('Hummus', 'hummus|chickpea dip', 'vegan', True, 166, 7.9, 14.29, 9.6, 6, 2.44, 38, 0, 0, 379, 0.34, USDA, 'Hummus, commercial', [('g', 1, True), ('tbsp', 15, False)]),
    ('Zucchini', 'courgette|zucchini|summer squash', 'vegan', True, 17, 1.21, 3.11, 0.32, 1, 0.37, 16, 17.9, 0, 8, 2.5, USDA, 'Squash, summer, zucchini, includes skin, raw', [('g', 1, True), ('piece', 196, False)]),
    ('Celery', 'celery|celery stalk', 'vegan', True, 14, 0.69, 2.97, 0.17, 1.6, 0.2, 40, 3.1, 0, 80, 1.34, USDA, 'Celery, raw', [('g', 1, True), ('piece', 40, False)]),
    ('Pickle', 'pickle|achar|pickles|mango pickle|lime pickle|avakaya|lemon pickle', 'vegan', False, 160, 1.5, 12, 12, 2, 2, 40, 5, 0, 2400, 3, LABEL, 'Typical Indian oil pickle, high in salt and oil; brands vary a lot', [('g', 1, True), ('tsp', 5, False), ('tbsp', 15, False)]),
]

# Dishes: name, aliases, cuisine, unit, pieces, target grams (water tops it up to this weight), items
D = []
def dish(name, aliases, cuisine, unit, pieces, target, **items):
    D.append((name, aliases, cuisine, unit, pieces, target, items))

I = lambda s: s  # readability only
RICE, ATTA, MAIDA, RAVA, RICEF, BESAN = 'Rice, white, raw', 'Wheat flour, atta', 'Maida', 'Rava, semolina', 'Rice flour', 'Besan, gram flour'

def items(**kw):
    return kw

# --- South Indian ---
dish('Rava dosa', 'rava dosai|sooji dosa', 'South Indian', 'dosa', 1, 110, **{RAVA: 30, RICEF: 10, 'Curd, plain': 15, 'Oil, sunflower': 6, 'Onion': 10, 'Green chilli': 1, 'Salt': 1, 'Cumin seeds': 0.5})
dish('Pesarattu', 'moong dal dosa|pesarattu dosa', 'Andhra/Telangana', 'dosa', 1, 110, **{'Moong dal, raw': 45, RICE: 5, 'Ginger': 3, 'Green chilli': 2, 'Oil, sunflower': 6, 'Salt': 1})
dish('Rava idli', 'sooji idli|semolina idli', 'South Indian', 'idli', 1, 60, **{RAVA: 30, 'Curd, plain': 25, 'Oil, sunflower': 2, 'Mustard seeds': 0.5, 'Salt': 1})
dish('Appam', 'aappam|palappam', 'South Indian', 'appam', 1, 70, **{RICE: 35, 'Coconut milk': 30, 'Sugar': 3, 'Salt': 0.5})
dish('Idiyappam', 'string hoppers|noolputtu|semiya idiyappam', 'South Indian', 'plate', 1, 120, **{RICEF: 45, 'Salt': 0.5, 'Oil, coconut': 2})
dish('Puttu', 'kerala puttu|rice puttu', 'South Indian', 'puttu', 1, 110, **{RICEF: 50, 'Coconut, fresh': 15, 'Salt': 0.5})
dish('Kerala parotta', 'parotta|porotta|malabar parotta', 'South Indian', 'parotta', 1, 110, **{MAIDA: 70, 'Oil, sunflower': 12, 'Sugar': 2, 'Salt': 1})
dish('Bisi bele bath', 'bisibelebath|bisi bele huli anna', 'South Indian', 'plate', 1, 300, **{RICE: 40, 'Toor dal, raw': 25, 'Carrot': 20, 'Green beans': 20, 'Green peas, raw': 15, 'Potato': 20, 'Oil, sunflower': 8, 'Tamarind': 4, 'Curry powder': 3, 'Salt': 1})
dish('Coconut rice', 'thengai sadam|kobbari annam', 'South Indian', 'plate', 1, 220, **{RICE: 50, 'Coconut, fresh': 20, 'Oil, coconut': 5, 'Mustard seeds': 1, 'Green chilli': 2, 'Curry leaves': 1, 'Salt': 1})
dish('Tomato rice', 'thakkali sadam|tomato bath', 'South Indian', 'plate', 1, 250, **{RICE: 50, 'Tomato': 80, 'Onion': 30, 'Oil, sunflower': 6, 'Red chilli powder': 1, 'Mustard seeds': 0.5, 'Salt': 1.5})
dish('Vangi bath', 'brinjal rice|vangibath', 'South Indian', 'plate', 1, 250, **{RICE: 50, 'Brinjal, eggplant': 80, 'Oil, sunflower': 8, 'Curry powder': 3, 'Peanuts, raw': 5, 'Salt': 1.5})
dish('Vegetable kurma', 'veg kurma|veg korma south indian', 'South Indian', 'katori', 1, 150, **{'Potato': 30, 'Carrot': 20, 'Green peas, raw': 15, 'Green beans': 15, 'Coconut, fresh': 20, 'Onion': 20, 'Oil, sunflower': 5, 'Salt': 1, 'Curry powder': 2})
dish('Avial', 'aviyal', 'South Indian', 'katori', 1, 150, **{'Plantain, raw': 30, 'Carrot': 20, 'Green beans': 20, 'Pumpkin': 25, 'Coconut, fresh': 20, 'Curd, plain': 15, 'Oil, coconut': 4, 'Curry leaves': 1, 'Salt': 1, 'Cumin seeds': 0.5})
dish('Kootu', 'moong dal kootu|poricha kootu', 'South Indian', 'katori', 1, 150, **{'Moong dal, raw': 15, 'Bottle gourd': 50, 'Coconut, fresh': 10, 'Oil, coconut': 3, 'Mustard seeds': 0.5, 'Curry leaves': 1, 'Salt': 1, 'Turmeric powder': 0.3})
dish('Chicken chettinad', 'chettinad chicken|chicken chettinad masala', 'South Indian', 'plate', 1, 200, **{'Chicken thigh with skin, raw': 100, 'Onion': 40, 'Tomato': 30, 'Coconut, fresh': 10, 'Oil, sunflower': 8, 'Curry leaves': 1, 'Red chilli powder': 2, 'Black pepper': 1, 'Salt': 1.5, 'Curry powder': 2})
dish('Prawn masala', 'prawn curry|eral masala|royyala masala', 'South Indian', 'plate', 1, 220, **{'Prawns, raw': 110, 'Onion': 40, 'Tomato': 40, 'Coconut, fresh': 10, 'Oil, sunflower': 8, 'Red chilli powder': 1.5, 'Turmeric powder': 0.5, 'Salt': 1.5, 'Curry powder': 2})
dish('Mutton biryani', 'goat biryani|hyderabadi mutton biryani', 'Andhra/Telangana', 'plate', 1, 400, **{'Mutton (goat), raw': 100, RICE: 65, 'Onion': 50, 'Curd, plain': 30, 'Oil, sunflower': 10, 'Ghee': 5, 'Ginger': 3, 'Garlic': 3, 'Curry powder': 4, 'Salt': 2})
dish('Masala vada', 'chana dal vada|paruppu vadai', 'South Indian', 'vada', 2, 70, **{'Chana, chickpeas raw': 40, 'Onion': 15, 'Green chilli': 2, 'Curry leaves': 1, 'Oil, sunflower': 12, 'Salt': 0.5})
dish('Potato bonda', 'aloo bonda|batata bonda', 'South Indian', 'bonda', 2, 110, **{'Potato': 50, BESAN: 25, 'Onion': 15, 'Oil, sunflower': 12, 'Turmeric powder': 0.3, 'Salt': 1, 'Green chilli': 1})
dish('Payasam', 'semiya payasam|paal payasam|kheer south indian', 'South Indian', 'katori', 1, 190, **{'Milk, whole': 150, 'Sugar': 20, RICE: 12, 'Cashew nuts, raw': 5, 'Ghee': 3, 'Cardamom': 0.3})
dish('Ragi dosa', 'ragi dosai|finger millet dosa', 'South Indian', 'dosa', 1, 110, **{'Ragi flour': 35, RICEF: 8, 'Curd, plain': 15, 'Onion': 10, 'Oil, sunflower': 5, 'Salt': 1})
dish('Ragi mudde', 'ragi sangati|ragi ball|finger millet ball', 'South Indian', 'ball', 1, 160, **{'Ragi flour': 50, 'Salt': 0.5})
dish('Lemon rice with peanuts', 'chitrannam|nimmakaya pulihora', 'Andhra/Telangana', 'plate', 1, 240, **{RICE: 50, 'Lemon juice': 10, 'Peanuts, raw': 8, 'Oil, sunflower': 6, 'Mustard seeds': 1, 'Turmeric powder': 0.5, 'Curry leaves': 1, 'Salt': 1})
dish('Pappu annam', 'dal rice andhra|pappu and rice', 'Andhra/Telangana', 'plate', 1, 300, **{RICE: 50, 'Toor dal, raw': 25, 'Ghee': 4, 'Tomato': 20, 'Turmeric powder': 0.5, 'Salt': 1.5})

# --- North Indian and others ---
dish('Butter chicken', 'murgh makhani|chicken makhani', 'North Indian', 'plate', 1, 250, **{'Chicken breast, raw': 130, 'Butter': 10, 'Tomato puree': 60, 'Cream, heavy': 20, 'Onion': 30, 'Oil, sunflower': 6, 'Ginger': 3, 'Garlic': 3, 'Curry powder': 3, 'Salt': 1.5, 'Red chilli powder': 1.5})
dish('Chicken tikka', 'tikka chicken|chicken tikka starter', 'North Indian', 'piece', 6, 200, **{'Chicken breast, raw': 150, 'Curd, plain': 30, 'Oil, sunflower': 5, 'Ginger': 3, 'Garlic': 3, 'Red chilli powder': 2, 'Salt': 1.5, 'Lemon juice': 5})
dish('Tandoori chicken', 'tandoori murgh|chicken leg tandoori', 'North Indian', 'piece', 2, 220, **{'Chicken thigh with skin, raw': 180, 'Curd, plain': 30, 'Oil, sunflower': 6, 'Ginger': 3, 'Garlic': 3, 'Red chilli powder': 3, 'Salt': 2, 'Lemon juice': 5})
dish('Chicken 65', 'chicken sixty five|hyderabadi chicken 65', 'South Indian', 'plate', 1, 170, **{'Chicken breast, raw': 120, RICEF: 8, 'Oil, sunflower': 14, 'Curd, plain': 10, 'Red chilli powder': 2, 'Ginger': 2, 'Garlic': 2, 'Salt': 1.5, 'Curry leaves': 1})
dish('Paneer butter masala', 'paneer makhani|butter paneer', 'North Indian', 'plate', 1, 220, **{'Paneer': 90, 'Butter': 10, 'Tomato puree': 70, 'Cream, heavy': 15, 'Onion': 30, 'Oil, sunflower': 5, 'Garlic': 2, 'Ginger': 2, 'Curry powder': 2, 'Salt': 1.5, 'Sugar': 2})
dish('Palak paneer', 'saag paneer|spinach paneer|paneer palak', 'North Indian', 'plate', 1, 220, **{'Spinach': 150, 'Paneer': 70, 'Onion': 30, 'Oil, sunflower': 8, 'Cream, heavy': 10, 'Garlic': 3, 'Ginger': 2, 'Curry powder': 2, 'Salt': 1.5})
dish('Paneer bhurji', 'paneer scramble|scrambled paneer', 'North Indian', 'plate', 1, 200, **{'Paneer': 100, 'Onion': 40, 'Tomato': 40, 'Oil, sunflower': 8, 'Green chilli': 2, 'Turmeric powder': 0.5, 'Salt': 1, 'Cumin seeds': 0.5, 'Coriander leaves': 5})
dish('Matar paneer', 'peas paneer|mutter paneer', 'North Indian', 'plate', 1, 250, **{'Paneer': 70, 'Green peas, raw': 70, 'Tomato': 60, 'Onion': 40, 'Oil, sunflower': 8, 'Curry powder': 2, 'Salt': 1.5, 'Ginger': 2})
dish('Kadai paneer', 'karahi paneer|paneer kadai', 'North Indian', 'plate', 1, 245, **{'Paneer': 90, 'Capsicum, green': 60, 'Onion': 40, 'Tomato': 40, 'Oil, sunflower': 8, 'Curry powder': 2, 'Salt': 1.5, 'Coriander seeds': 1})
dish('Paneer tikka', 'tandoori paneer', 'North Indian', 'piece', 6, 220, **{'Paneer': 120, 'Curd, plain': 25, 'Capsicum, green': 30, 'Onion': 30, 'Oil, sunflower': 6, 'Red chilli powder': 2, 'Salt': 1.5, 'Curry powder': 2})
dish('Mushroom masala', 'mushroom curry|kumbh masala', 'North Indian', 'plate', 1, 240, **{'Mushroom': 150, 'Onion': 40, 'Tomato': 40, 'Oil, sunflower': 8, 'Curry powder': 2, 'Salt': 1.5})
dish('Bhatura', 'bhature|chole bhature bread', 'North Indian', 'bhatura', 1, 100, **{MAIDA: 70, 'Curd, plain': 15, 'Oil, sunflower': 18, 'Sugar': 1, 'Salt': 1})
dish('Kulcha', 'amritsari kulcha|plain kulcha', 'North Indian', 'kulcha', 1, 100, **{MAIDA: 70, 'Curd, plain': 10, 'Oil, sunflower': 4, 'Salt': 1})
dish('Missi roti', 'besan roti|missi', 'North Indian', 'roti', 1, 70, **{ATTA: 25, BESAN: 20, 'Oil, sunflower': 4, 'Onion': 10, 'Salt': 1})
dish('Gobi paratha', 'cauliflower paratha', 'North Indian', 'paratha', 1, 120, **{ATTA: 50, 'Cauliflower': 60, 'Oil, sunflower': 8, 'Salt': 1, 'Green chilli': 1})
dish('Paneer paratha', 'stuffed paneer paratha', 'North Indian', 'paratha', 1, 100, **{ATTA: 50, 'Paneer': 40, 'Oil, sunflower': 8, 'Salt': 1})
dish('Methi paratha', 'fenugreek paratha', 'North Indian', 'paratha', 1, 90, **{ATTA: 50, 'Fenugreek leaves': 20, 'Oil, sunflower': 6, 'Curd, plain': 5, 'Salt': 1})
dish('Tandoori roti', 'tandoor roti', 'North Indian', 'roti', 1, 55, **{ATTA: 45, 'Salt': 0.5})
dish('Butter naan', 'naan with butter', 'North Indian', 'naan', 1, 110, **{MAIDA: 80, 'Butter': 8, 'Curd, plain': 10, 'Sugar': 2, 'Salt': 1})
dish('Aloo matar', 'aloo mutter|potato peas curry', 'North Indian', 'plate', 1, 220, **{'Potato': 100, 'Green peas, raw': 50, 'Tomato': 40, 'Oil, sunflower': 8, 'Curry powder': 2, 'Salt': 1.5, 'Onion': 30})
dish('Jeera aloo', 'cumin potatoes|aloo jeera', 'North Indian', 'plate', 1, 170, **{'Potato': 150, 'Oil, sunflower': 8, 'Cumin seeds': 2, 'Salt': 1.5, 'Turmeric powder': 0.5, 'Coriander leaves': 5})
dish('Lauki sabzi', 'dudhi sabzi|bottle gourd curry|sorakaya curry', 'North Indian', 'katori', 1, 150, **{'Bottle gourd': 100, 'Tomato': 20, 'Onion': 15, 'Oil, sunflower': 5, 'Curry powder': 1.5, 'Salt': 1})
dish('Mutton rogan josh', 'rogan josh|kashmiri mutton curry', 'North Indian', 'plate', 1, 250, **{'Mutton (goat), raw': 120, 'Curd, plain': 30, 'Onion': 50, 'Oil, sunflower': 12, 'Ginger': 3, 'Garlic': 3, 'Curry powder': 3, 'Salt': 2, 'Red chilli powder': 2})
dish('Mutton keema', 'keema|minced mutton|keema matar', 'North Indian', 'plate', 1, 250, **{'Mutton (goat), raw': 120, 'Onion': 40, 'Tomato': 40, 'Green peas, raw': 30, 'Oil, sunflower': 10, 'Ginger': 3, 'Garlic': 3, 'Curry powder': 3, 'Salt': 2})
dish('Matar pulao', 'peas pulao|green peas pulao', 'North Indian', 'plate', 1, 260, **{RICE: 55, 'Green peas, raw': 40, 'Oil, sunflower': 6, 'Cumin seeds': 1, 'Onion': 20, 'Salt': 1})
dish('Salted lassi', 'namkeen lassi|chaas lassi', 'North Indian', 'glass', 1, 250, **{'Curd, plain': 150, 'Salt': 1, 'Cumin seeds': 0.5})
dish('Mango lassi', 'aam lassi', 'North Indian', 'glass', 1, 310, **{'Curd, plain': 150, 'Mango': 100, 'Sugar': 10})
dish('Nimbu pani', 'lemonade|lemon water with sugar|shikanji', 'North Indian', 'glass', 1, 240, **{'Lemon juice': 25, 'Sugar': 15, 'Salt': 0.5})
dish('Gulab jamun', 'jamun|gulabjamun', 'North Indian', 'piece', 2, 100, **{'Skim milk powder': 25, MAIDA: 8, 'Ghee': 8, 'Sugar': 30})
dish('Jalebi', 'imarti|jilebi', 'North Indian', 'piece', 3, 110, **{MAIDA: 40, 'Sugar': 40, 'Oil, sunflower': 12, 'Curd, plain': 5})
dish('Kheer', 'rice kheer|payasam north indian|rice pudding', 'North Indian', 'katori', 1, 245, **{'Milk, whole': 200, RICE: 20, 'Sugar': 20, 'Cashew nuts, raw': 5, 'Cardamom': 0.3})
dish('Suji halwa', 'sooji halwa|rava kesari|rava halwa', 'North Indian', 'katori', 1, 200, **{RAVA: 40, 'Ghee': 20, 'Sugar': 40})
dish('Gajar halwa', 'carrot halwa|gajrela', 'North Indian', 'katori', 1, 212, **{'Carrot': 120, 'Milk, whole': 60, 'Sugar': 20, 'Ghee': 8, 'Cashew nuts, raw': 4})
dish('Besan ladoo', 'besan laddu|laddu', 'North Indian', 'piece', 2, 65, **{BESAN: 30, 'Ghee': 15, 'Sugar': 20})
dish('Dahi vada', 'dahi bhalla|thayir vadai|perugu vada', 'North Indian', 'plate', 1, 170, **{'Urad dal, raw': 30, 'Curd, plain': 100, 'Oil, sunflower': 10, 'Salt': 0.5, 'Cumin seeds': 0.5, 'Sugar': 2})
dish('Dhokla', 'khaman dhokla|khaman', 'North Indian', 'piece', 4, 120, **{BESAN: 50, 'Curd, plain': 30, 'Oil, sunflower': 5, 'Sugar': 5, 'Salt': 1})
dish('Thepla', 'methi thepla|gujarati thepla', 'North Indian', 'thepla', 1, 80, **{ATTA: 40, BESAN: 10, 'Fenugreek leaves': 15, 'Oil, sunflower': 6, 'Curd, plain': 5, 'Salt': 1})
dish('Egg roll', 'kathi roll egg|egg wrap', 'North Indian', 'roll', 1, 190, **{MAIDA: 50, 'Egg, whole': 100, 'Oil, sunflower': 8, 'Onion': 20, 'Salt': 1})
dish('Bread toast with butter', 'buttered toast|toast butter', 'Continental', 'slice', 2, 60, **{'Bread, white': 50, 'Butter': 10})
dish('Veg sandwich', 'vegetable sandwich|cheese veg sandwich', 'Continental', 'sandwich', 1, 151, **{'Bread, white': 60, 'Butter': 6, 'Cucumber': 30, 'Tomato': 30, 'Cheddar cheese': 15, 'Onion': 10})
dish('Peanut butter toast', 'pb toast|peanut butter sandwich', 'Continental', 'slice', 2, 80, **{'Bread, whole wheat': 60, 'Peanut butter': 20})
dish('Gobi manchurian', 'cauliflower manchurian|gobi 65 chinese', 'Chinese/Indo-Chinese', 'plate', 1, 220, **{'Cauliflower': 120, MAIDA: 12, RICEF: 8, 'Oil, sunflower': 14, 'Soy sauce': 8, 'Garlic': 4, 'Onion': 20, 'Capsicum, green': 20, 'Sugar': 2})
dish('Chicken hakka noodles', 'chicken noodles|chicken chowmein', 'Chinese/Indo-Chinese', 'plate', 1, 350, **{'Chinese noodles, dry': 70, 'Chicken breast, raw': 80, 'Oil, sunflower': 10, 'Cabbage': 40, 'Carrot': 20, 'Capsicum, green': 20, 'Soy sauce': 8, 'Salt': 1})
dish('Sprouts curry', 'moong sprouts curry|usal|misal base', 'North Indian', 'katori', 1, 150, **{'Sprouted moong': 60, 'Onion': 20, 'Tomato': 25, 'Oil, sunflower': 4, 'Curry powder': 1.5, 'Salt': 1})
dish('Fruit bowl', 'fruit salad|mixed fruits|seasonal fruit', 'Anything', 'katori', 1, 200, **{'Banana': 50, 'Apple': 50, 'Papaya': 50, 'Pomegranate': 25, 'Grapes': 25})


def read(name):
    with io.open(os.path.join(ROOT, name), encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


# --- Batch 2026-11-11b: snacks, chaat, street food, more curries, drinks, and a few staples ---
ING += [
    ('Makhana', 'fox nut|lotus seeds|phool makhana|foxnut', 'vegan', True, 347, 9.7, 76.9, 0.1, 14.5, 1.4, 60, 0, 0, 1, 0, LABEL, 'Typical roasted-plain makhana; nutritionist to confirm', [('g', 1, True), ('handful', 15, False)]),
    ('Sabudana', 'sago|tapioca pearls|javvarisi|saggubiyyam', 'vegan', True, 358, 0.2, 88.7, 0.02, 0.9, 1.6, 20, 0, 0, 1, 3.35, USDA, 'Tapioca, pearl, dry', [('g', 1, True)]),
    ('Dalia, broken wheat', 'dalia|daliya|broken wheat|lapsi', 'vegan', False, 342, 11.5, 69, 1.9, 12.5, 3.6, 25, 0, 0, 5, 0, LABEL, 'Typical bulgur / broken wheat; nutritionist to confirm', [('g', 1, True)]),
    ('Chia seeds', 'chia|sabja|basil seeds', 'vegan', True, 486, 16.5, 42.1, 30.7, 34.4, 7.7, 631, 1.6, 0, 16, 0, USDA, 'Seeds, chia seeds, dried', [('g', 1, True), ('tsp', 4, False), ('tbsp', 12, False)]),
    ('Cheese slice', 'processed cheese|cheese slice|amul cheese slice', 'veg', True, 313, 18, 5, 24, 0, 0.3, 560, 0, 0.5, 1100, 4, LABEL, 'Typical processed cheese slice; brands differ', [('g', 1, True), ('slice', 20, False)]),
    ('Mayonnaise', 'mayo|mayonnaise', 'egg', False, 680, 1, 0.6, 75, 0, 0.2, 8, 0, 0.1, 635, 0.6, USDA, 'Salad dressing, mayonnaise, regular', [('g', 1, True), ('tbsp', 14, False)]),
    ('Chocolate, dark', 'dark chocolate|chocolate', 'veg', True, 598, 7.8, 46.4, 42.6, 10.9, 11.9, 73, 0, 0.1, 20, 24, USDA, 'Chocolate, dark, 70-85% cacao solids', [('g', 1, True), ('piece', 10, False)]),
    ('Ice cream, vanilla', 'ice cream|vanilla ice cream', 'egg', False, 207, 3.5, 23.6, 11, 0.7, 0.1, 128, 0.6, 0.4, 80, 21.2, USDA, 'Ice creams, vanilla', [('g', 1, True), ('scoop', 66, False)]),
    ('French fries', 'fries|chips potato|finger chips', 'vegan', True, 312, 3.4, 41.4, 14.7, 3.8, 0.8, 18, 4.7, 0, 210, 0.3, USDA, 'Fast foods, potato, french fried', [('g', 1, True), ('portion', 117, False)]),
    ('Cornflakes', 'corn flakes|kellogg cornflakes', 'vegan', False, 357, 7.5, 84, 0.4, 3.3, 28, 5, 21, 0, 729, 8, USDA, 'Cereals ready-to-eat, corn flakes (fortified)', [('g', 1, True), ('bowl', 30, False)]),
]

dish('Sambar rice', 'sambar sadam|huli anna', 'South Indian', 'plate', 1, 300, **{RICE: 50, 'Toor dal, raw': 20, 'Brinjal, eggplant': 20, 'Carrot': 15, 'Onion': 20, 'Tamarind': 4, 'Oil, sunflower': 5, 'Curry powder': 3, 'Mustard seeds': 0.5, 'Salt': 1.5})
dish('Rasam rice', 'rasam sadam|saaru anna', 'South Indian', 'plate', 1, 300, **{RICE: 50, 'Tomato': 40, 'Tamarind': 4, 'Toor dal, raw': 8, 'Ghee': 3, 'Mustard seeds': 0.5, 'Cumin seeds': 0.5, 'Black pepper': 1, 'Salt': 1.5})
dish('Lemon sevai', 'lemon semiya|lemon vermicelli|elumichai sevai', 'South Indian', 'plate', 1, 220, **{'Vermicelli, dry': 50, 'Lemon juice': 10, 'Oil, sunflower': 6, 'Peanuts, raw': 6, 'Mustard seeds': 0.5, 'Curry leaves': 1, 'Turmeric powder': 0.3, 'Salt': 1})
dish('Egg dosa', 'muttai dosai|dosa with egg', 'South Indian', 'dosa', 1, 160, **{RICE: 30, 'Urad dal, raw': 8, 'Egg, whole': 50, 'Oil, sunflower': 6, 'Onion': 10, 'Salt': 1})
dish('Set dosa', 'sponge dosa|set dosai', 'South Indian', 'set', 3, 150, **{RICE: 35, 'Urad dal, raw': 10, 'Poha, flattened rice': 5, 'Oil, sunflower': 4, 'Salt': 1})
dish('Neer dosa', 'neer dose|water dosa', 'South Indian', 'dosa', 2, 120, **{RICE: 35, 'Coconut, fresh': 10, 'Oil, coconut': 3, 'Salt': 0.7})
dish('Kothu parotta', 'kothu parota|egg kothu parotta', 'South Indian', 'plate', 1, 300, **{MAIDA: 90, 'Egg, whole': 50, 'Onion': 40, 'Tomato': 30, 'Oil, sunflower': 14, 'Curry powder': 3, 'Salt': 2})
dish('Tomato pappu', 'tomato dal|tamata pappu', 'Andhra/Telangana', 'katori', 1, 170, **{'Toor dal, raw': 30, 'Tomato': 50, 'Onion': 15, 'Oil, sunflower': 4, 'Turmeric powder': 0.5, 'Mustard seeds': 0.5, 'Curry leaves': 1, 'Salt': 1.5})
dish('Mirchi bajji', 'chilli bajji|milagai bajji', 'South Indian', 'piece', 2, 80, **{'Green chilli': 40, BESAN: 20, RICEF: 4, 'Oil, sunflower': 10, 'Salt': 0.5})
dish('Onion pakoda', 'onion pakora|kanda bhaji|onion bhaji', 'North Indian', 'plate', 1, 100, **{'Onion': 50, BESAN: 25, 'Oil, sunflower': 14, 'Green chilli': 2, 'Salt': 1})
dish('Aloo tikki', 'potato tikki|aloo patties', 'North Indian', 'piece', 2, 120, **{'Potato': 100, 'Green peas, raw': 10, 'Oil, sunflower': 10, 'Coriander leaves': 3, 'Red chilli powder': 0.5, 'Salt': 1})
dish('Pani puri', 'golgappa|puchka|gol gappe', 'North Indian', 'piece', 6, 150, **{ATTA: 25, RAVA: 10, 'Oil, sunflower': 8, 'Potato': 40, 'Chickpeas, boiled': 20, 'Tamarind': 5, 'Coriander leaves': 3, 'Salt': 1})
dish('Bhel puri', 'bhelpuri|bhel', 'North Indian', 'plate', 1, 150, **{'Poha, flattened rice': 30, 'Peanuts, raw': 8, 'Onion': 20, 'Tomato': 15, 'Potato': 20, 'Tamarind': 4, 'Besan, gram flour': 8, 'Oil, sunflower': 5, 'Salt': 1})
dish('Kachori', 'dal kachori|moong dal kachori|khasta kachori', 'North Indian', 'piece', 1, 70, **{MAIDA: 35, 'Moong dal, raw': 12, 'Oil, sunflower': 12, 'Cumin seeds': 0.5, 'Salt': 0.7})
dish('Dal fry', 'dal fry restaurant|toor dal fry', 'North Indian', 'katori', 1, 170, **{'Toor dal, raw': 30, 'Onion': 20, 'Tomato': 30, 'Oil, sunflower': 5, 'Ghee': 3, 'Cumin seeds': 0.5, 'Garlic': 3, 'Turmeric powder': 0.5, 'Salt': 1.5})
dish('Shahi paneer', 'shahi paneer masala|paneer shahi', 'North Indian', 'katori', 1, 180, **{'Paneer': 70, 'Tomato puree': 40, 'Cream, heavy': 15, 'Onion': 25, 'Cashew nuts, raw': 8, 'Butter': 6, 'Oil, sunflower': 4, 'Curry powder': 2, 'Salt': 1.5})
dish('Malai kofta', 'kofta curry|veg malai kofta', 'North Indian', 'plate', 1, 220, **{'Paneer': 40, 'Potato': 40, 'Cream, heavy': 15, 'Tomato puree': 40, 'Onion': 25, 'Cashew nuts, raw': 8, 'Oil, sunflower': 10, 'Curry powder': 2, 'Salt': 1.5})
dish('Baingan masala', 'brinjal masala|baingan curry', 'North Indian', 'katori', 1, 150, **{'Brinjal, eggplant': 100, 'Onion': 25, 'Tomato': 30, 'Oil, sunflower': 8, 'Curry powder': 2, 'Red chilli powder': 1, 'Salt': 1.2})
dish('Chicken korma', 'murgh korma|chicken kurma', 'North Indian', 'plate', 1, 240, **{'Chicken thigh with skin, raw': 120, 'Curd, plain': 30, 'Onion': 40, 'Cashew nuts, raw': 8, 'Oil, sunflower': 8, 'Ghee': 3, 'Curry powder': 3, 'Salt': 1.5})
dish('Keema pav', 'mutton keema pav|keema with pav', 'North Indian', 'plate', 1, 300, **{'Mutton (goat), raw': 100, 'Onion': 40, 'Tomato': 40, 'Green peas, raw': 20, 'Oil, sunflower': 10, 'Curry powder': 3, 'Bread, white': 60, 'Butter': 5, 'Salt': 1.5})
dish('Seekh kebab', 'mutton seekh kebab|chicken seekh kebab', 'North Indian', 'piece', 3, 150, **{'Mutton (goat), raw': 110, 'Onion': 15, 'Oil, sunflower': 6, 'Ginger': 3, 'Garlic': 3, 'Curry powder': 2, 'Salt': 1.2})
dish('Fish tikka', 'tandoori fish|fish tikka starter', 'North Indian', 'plate', 1, 160, **{'Fish, tilapia, raw': 140, 'Curd, plain': 20, 'Oil, sunflower': 5, 'Ginger': 3, 'Garlic': 3, 'Red chilli powder': 2, 'Salt': 1.2, 'Lemon juice': 5})
dish('Paneer biryani', 'veg paneer biryani', 'North Indian', 'plate', 1, 380, **{'Paneer': 70, RICE: 65, 'Onion': 40, 'Curd, plain': 25, 'Oil, sunflower': 10, 'Ghee': 5, 'Curry powder': 4, 'Salt': 2})
dish('Chole bhature plate', 'chole bhatura|chhole bhature', 'North Indian', 'plate', 1, 360, **{'Chana, chickpeas raw': 45, 'Onion': 30, 'Tomato': 30, MAIDA: 90, 'Curd, plain': 15, 'Oil, sunflower': 25, 'Curry powder': 3, 'Salt': 2})
dish('Rasgulla', 'rosogolla|rasagola', 'North Indian', 'piece', 2, 100, **{'Paneer': 40, 'Sugar': 28, 'Water': 32})
dish('Kulfi', 'malai kulfi|matka kulfi', 'North Indian', 'piece', 1, 90, **{'Milk, whole': 70, 'Sugar': 12, 'Cream, heavy': 6, 'Pistachios': 2, 'Cardamom': 0.2})
dish('Khakhra', 'methi khakhra|gujarati khakhra', 'Gujarati', 'piece', 2, 25, **{ATTA: 18, 'Oil, sunflower': 2, 'Salt': 0.3, 'Fenugreek leaves': 3})
dish('Sabudana khichdi', 'sago khichdi|sabudana upma', 'Maharashtrian', 'plate', 1, 200, **{'Sabudana': 50, 'Peanuts, raw': 15, 'Potato': 30, 'Oil, sunflower': 8, 'Cumin seeds': 0.5, 'Green chilli': 2, 'Salt': 1})
dish('Roasted makhana', 'phool makhana roasted|foxnut roasted', 'North Indian', 'bowl', 1, 30, **{'Makhana': 28, 'Ghee': 2, 'Salt': 0.3})
dish('Dalia porridge', 'daliya porridge|broken wheat porridge|vegetable daliya', 'North Indian', 'bowl', 1, 280, **{'Dalia, broken wheat': 40, 'Milk, whole': 100, 'Sugar': 6})
dish('Masala oats', 'savoury oats|veg oats', 'North Indian', 'bowl', 1, 260, **{'Oats, rolled': 40, 'Onion': 20, 'Tomato': 20, 'Carrot': 15, 'Oil, sunflower': 4, 'Curry powder': 2, 'Salt': 1})
dish('Egg sandwich', 'egg mayo sandwich|boiled egg sandwich', 'Continental', 'sandwich', 1, 150, **{'Bread, white': 55, 'Egg, whole': 55, 'Butter': 5, 'Mayonnaise': 8, 'Salt': 0.5, 'Black pepper': 0.3})
dish('Cheese sandwich', 'grilled cheese sandwich|veg cheese sandwich', 'Continental', 'sandwich', 1, 130, **{'Bread, white': 55, 'Cheese slice': 20, 'Butter': 6, 'Tomato': 20, 'Cucumber': 15})
dish('Chicken sandwich', 'chicken mayo sandwich|grilled chicken sandwich', 'Continental', 'sandwich', 1, 190, **{'Bread, whole wheat': 60, 'Chicken breast, raw': 60, 'Mayonnaise': 8, 'Lettuce and salad greens': 15, 'Tomato': 20, 'Butter': 4})
dish('Veg burger', 'aloo tikki burger|veggie burger', 'Fast food', 'burger', 1, 200, **{'Bread, white': 70, 'Potato': 70, 'Mayonnaise': 8, 'Onion': 15, 'Tomato': 20, 'Oil, sunflower': 8, 'Lettuce and salad greens': 10})
dish('Chicken burger', 'crispy chicken burger|chicken patty burger', 'Fast food', 'burger', 1, 230, **{'Bread, white': 70, 'Chicken breast, raw': 90, MAIDA: 15, 'Mayonnaise': 10, 'Lettuce and salad greens': 10, 'Oil, sunflower': 10})
dish('French fries portion', 'fries|finger chips|potato fries', 'Fast food', 'portion', 1, 117, **{'French fries': 117})
dish('Pizza slice', 'cheese pizza slice|margherita pizza|veg pizza slice', 'Fast food', 'slice', 1, 110, **{MAIDA: 50, 'Cheese slice': 25, 'Tomato puree': 20, 'Oil, sunflower': 3, 'Capsicum, green': 8, 'Salt': 0.7})
dish('Veg momos', 'vegetable momos|veg dumplings|steamed veg momo', 'Chinese', 'piece', 6, 150, **{MAIDA: 60, 'Cabbage': 45, 'Carrot': 15, 'Onion': 10, 'Oil, sunflower': 4, 'Ginger': 2, 'Soy sauce': 3, 'Salt': 1})
dish('Chicken momos', 'steamed chicken momo|chicken dumplings', 'Chinese', 'piece', 6, 160, **{MAIDA: 60, 'Chicken breast, raw': 50, 'Onion': 10, 'Oil, sunflower': 4, 'Ginger': 2, 'Soy sauce': 3, 'Salt': 1})
dish('Chilli chicken', 'dry chilli chicken|chilli chicken gravy', 'Chinese', 'plate', 1, 220, **{'Chicken breast, raw': 120, 'Capsicum, green': 25, 'Onion': 30, MAIDA: 10, 'Oil, sunflower': 14, 'Soy sauce': 8, 'Green chilli': 4, 'Garlic': 3, 'Salt': 1})
dish('Chilli paneer', 'paneer chilli|dry chilli paneer', 'Chinese', 'plate', 1, 200, **{'Paneer': 100, 'Capsicum, green': 25, 'Onion': 30, MAIDA: 8, 'Oil, sunflower': 12, 'Soy sauce': 8, 'Green chilli': 4, 'Garlic': 3, 'Salt': 1})
dish('Sweet corn soup', 'veg sweet corn soup|corn soup', 'Chinese', 'bowl', 1, 250, **{'Sweet corn': 50, 'Carrot': 10, 'Egg white': 10, 'Oil, sunflower': 2, 'Soy sauce': 3, 'Salt': 1.5, 'Black pepper': 0.3})
dish('Filter coffee', 'south indian coffee|kaapi|degree coffee', 'South Indian', 'cup', 1, 150, **{'Milk, whole': 110, 'Sugar': 8})
dish('Cold coffee', 'iced coffee|cold coffee with ice cream', 'Beverage', 'glass', 1, 250, **{'Milk, whole': 200, 'Sugar': 15, 'Ice cream, vanilla': 33})
dish('Green tea', 'tea green|green tea without sugar', 'Beverage', 'cup', 1, 200, **{'Water': 200})
dish('Black coffee', 'coffee black|americano|black coffee without sugar', 'Beverage', 'cup', 1, 200, **{'Water': 200})
dish('Fruit salad', 'mixed fruit bowl|fruit chaat', 'Fruit', 'bowl', 1, 250, **{'Apple': 60, 'Banana': 60, 'Papaya': 50, 'Pomegranate': 30, 'Grapes': 50})
dish('Chicken salad', 'grilled chicken salad|chicken caesar salad', 'Continental', 'plate', 1, 280, **{'Chicken breast, raw': 110, 'Lettuce and salad greens': 60, 'Cucumber': 40, 'Tomato': 40, 'Oil, sunflower': 6, 'Lemon juice': 5, 'Salt': 0.8})
dish('Tuna sandwich', 'tuna mayo sandwich', 'Continental', 'sandwich', 1, 170, **{'Bread, whole wheat': 60, 'Tuna, canned in water': 60, 'Mayonnaise': 8, 'Lettuce and salad greens': 10, 'Tomato': 20})
dish('Chia pudding', 'chia seed pudding|sabja pudding', 'Continental', 'bowl', 1, 230, **{'Chia seeds': 24, 'Milk, whole': 180, 'Sugar': 6})
dish('Cornflakes with milk', 'cereal with milk|cornflakes bowl', 'Continental', 'bowl', 1, 230, **{'Cornflakes': 30, 'Milk, whole': 150, 'Sugar': 5})
dish('Peanut chikki', 'chikki|groundnut chikki|shengdana chikki', 'Maharashtrian', 'piece', 2, 40, **{'Peanuts, raw': 22, 'Jaggery': 18})


def main():
    ing_rows = read('ingredients.csv')
    existing_ing = {r['name']: r for r in ing_rows}
    dish_names = {r['name'] for r in read('dishes.csv')}
    diet_rank = {'vegan': 0, 'veg': 1, 'egg': 2, 'nonveg': 3}

    ing_out, unit_out, dish_out, item_out = [], [], [], []
    for n, aliases, diet, jain, kcal, p, c, f, fibre, iron, ca, vc, b12, na, sugar, src, ref, units in ING:
        if n in existing_ing:
            continue
        existing_ing[n] = {'name': n, 'diet': diet, 'jain_ok': 'true' if jain else 'false'}
        ing_out.append([n, aliases, '', diet, 'true' if jain else 'false', kcal, p, c, f, fibre, iron, ca, vc, b12, na, sugar, '', src, f'{ref} | added 2026-11-11; needs the nutritionist to confirm' + ('' if src == LABEL else '; FDC id to be verified')])
        for u, g, d in units:
            unit_out.append([n, u, g, 'true' if d else 'false'])

    for name, aliases, cuisine, unit, pieces, target, its in D:
        if name in dish_names:
            continue
        total = 0.0
        worst, jain = 'vegan', True
        for it, g in its.items():
            if it not in existing_ing:
                raise SystemExit(f'{name}: unknown ingredient "{it}"')
            total += g
            d = existing_ing[it]['diet']
            if diet_rank[d] > diet_rank[worst]:
                worst = d
            if existing_ing[it]['jain_ok'] != 'true':
                jain = False
        water = round(target - total, 1)
        rows = list(its.items())
        if water > 0:
            rows.append(('Water', water))
            total += water
        dish_out.append([name, aliases, cuisine, worst, 'true' if jain else 'false', '', 'Computed from ingredients', 'Recipe grams are an authored estimate of a typical home or mess serving; needs nutritionist review'])
        for it, g in rows:
            item_out.append([name, it, g])
        unit_out.append([name, unit, round(total / pieces, 1), 'true'])

    def append(name, rows):
        path = os.path.join(ROOT, name)
        with io.open(path, 'a', encoding='utf-8', newline='') as fh:
            w = csv.writer(fh, lineterminator='\n', quoting=csv.QUOTE_MINIMAL)
            for r in rows:
                w.writerow(r)

    for name in ('ingredients.csv', 'dishes.csv', 'dish_items.csv', 'units.csv'):
        path = os.path.join(ROOT, name)
        with io.open(path, 'rb') as fh:
            data = fh.read()
        if data and not data.endswith(b'\n'):
            with io.open(path, 'ab') as fh:
                fh.write(b'\n')
    append('ingredients.csv', ing_out)
    append('units.csv', unit_out)
    append('dishes.csv', dish_out)
    append('dish_items.csv', item_out)
    print(f'added {len(ing_out)} ingredients and {len(dish_out)} dishes')


if __name__ == '__main__':
    main()
