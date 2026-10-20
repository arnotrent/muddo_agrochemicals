from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.products.models import Product
from apps.inventory.models import Inventory
from apps.distributors.models import Distributor
from apps.agents.models import Agent

# NOTE on image paths: these are '/images/...' (no leading 'static/'),
# because the frontend has moved to its own React app serving files from
# frontend/public/images/ on its OWN origin — see apps/products/serializers.py
# for why these paths are deliberately left un-absolutized against the API.
#
# NOTE on 'usage' below: each entry is a short list of practical,
# knapsack-sprayer-oriented application steps (the way most Ugandan
# smallholder farmers actually mix and spray), joined into
# Product.usage_instructions as one bullet per line. This is kept
# separate from `description`, which stays a short narrative — the
# product detail page renders them as two distinct sections.
PRODUCTS=[
 {'name':'MUDDOSATE 480SL','category':'herbicide','img':'/images/product_muddosate.jpg','stock':120,'reorder':20,
  'active_ingredient':'Glyphosate 480 g/l','formulation':'Soluble Liquid (SL)',
  'crops':'All crops pre-plant/directed, Plantations, Couch grass, Kikuyu grass, Non-crop areas',
  'dosage':'150–200ml per 20L knapsack sprayer',
  'packing':'100ml, 500ml, 1L, 5L, 20L',
  'description':'A highly concentrated, non-selective systemic herbicide. Once sprayed, it is absorbed through the green foliage and translocates all the way down to the root system, completely destroying both annual and perennial grasses and deep-rooted weeds — the reason it\'s MACL\'s best-selling herbicide and the one most repeat customers ask for by name.',
  'usage':['Mix 150ml to 200ml of Muddosate in 20 litres of clean water.',
           'Apply as a pre-planting spray to completely clear land fields, or use carefully as a directed spray between rows of established tree/cane crops.',
           'Crucial Rule: avoid any spray drift onto the green parts of your crops, as this non-selective chemical will destroy any green plant it touches.']},
 {'name':'MD MAIZE PLUS 40OD','category':'herbicide','img':'/images/product_maizeplus.jpg','stock':95,'reorder':15,
  'active_ingredient':'Nicosulfuron 40 g/l','formulation':'Oil Dispersion (OD)',
  'crops':'Maize — selective, safe on the crop at label rates',
  'dosage':'40–50ml per 20L knapsack sprayer',
  'packing':'100ml, 250ml, 500ml, 1L, 5L',
  'description':'A premium, highly selective post-emergence herbicide engineered so growers can spray directly over standing maize without fear — it dries up competitive grasses and broadleaf weeds while remaining entirely safe on the crop itself. One pass at the 2–6 leaf stage is usually all a maize field needs for the season.',
  'usage':['Mix 40ml to 50ml of the fluid per 20-litre knapsack sprayer.',
           'Apply uniformly over the entire field when the maize is between the 2 to 6 leaf stage.',
           'Knocks out aggressive grasses and broadleaf weeds — including spear grass, couch grass and wild finger millet — directly within standing maize gardens.']},
 {'name':'MAX 2.4-D 720SL','category':'herbicide','img':'/images/product_max24d.jpg','stock':140,'reorder':25,
  'active_ingredient':'2,4-D Dimethylamine salt 720 g/l','formulation':'Soluble Liquid (SL)',
  'crops':'Maize, Wheat, Sorghum, Sugarcane, Rice, Pastures, Plantation crops',
  'dosage':'50–70ml per 20L knapsack sprayer',
  'packing':'100ml, 250ml, 500ml, 1L, 5L, 20L',
  'description':'A systemic, post-emergence herbicide and a vital standby tool for cereal farmers, engineered to selectively eliminate tough broadleaf weeds — pigweed, blackjack and similar competitors — without disrupting the growing crop. Works fast, priced for the volumes cereal growers actually spray.',
  'usage':['Mix 50ml to 70ml of the solution in 20 litres of water.',
           'Spray directly over standing grain fields when weeds are small and actively growing.',
           'Clears pigweed, blackjack and similar broadleaf competitors out of maize, wheat, sorghum, sugarcane and rice fields.']},
 {'name':'MD ACELEMECTIN 48EC','category':'pesticide','img':'/images/product_acelemectin.jpg','stock':88,'reorder':15,
  'active_ingredient':'Abamectin 18 g/l + Acetamiprid 30 g/l','formulation':'Emulsifiable Concentrate (EC)',
  'crops':'Cotton, Vegetables, Watermelon, Passion Fruit, Tomatoes, Coffee, Beans',
  'dosage':'20–30ml per 20L knapsack sprayer',
  'packing':'100ml, 250ml, 500ml, 1L',
  'description':'A dual-action, broad-spectrum insecticide combining systemic control — absorbed by the plant to kill feeding insects — with direct contact action, making it exceptionally effective against tough, piercing-sucking pests. Passion fruit and watermelon growers reach for this first when a pest problem is spreading fast.',
  'usage':['Mix 20ml to 30ml of the product per 20-litre knapsack sprayer of clean water.',
           'Apply thoroughly onto the foliage as soon as the first signs of pest infestation appear.',
           'Targeted pests include thrips, whiteflies, aphids, leafminers and caterpillars on crops like tomatoes, watermelons and passion fruits.']},
 {'name':'MD FOS 48EC','category':'pesticide','img':'/images/product_mdfos.jpg','stock':105,'reorder':20,
  'active_ingredient':'Chlorpyrifos 480 g/l','formulation':'Emulsifiable Concentrate (EC)',
  'crops':'Maize, Vegetables, Fruits, Beans, Coffee, Cotton, Tobacco, Groundnuts',
  'dosage':'40ml per 20L knapsack sprayer',
  'packing':'100ml, 250ml, 500ml, 1L, 5L',
  'description':'A heavy-duty, contact and stomach-action insecticide that provides rapid knockdown and prolonged residual control against aggressive soil-dwelling pests and chewing insects. Works both above ground as a foliar spray and below it as a soil drench, so stem borers and army worms have nowhere left to hide.',
  'usage':['Mix 40ml of the chemical per 20 litres of water.',
           'For soil-borne pests, apply as a direct drench around the root zone of young plants. For surface insects, spray evenly on the foliage.',
           'Highly recommended for controlling armyworms, cutworms, termites and root grubs in maize, cereal crops and fruit orchards.']},
 {'name':'M-D FOS 70SC','category':'pesticide','img':'/images/product_mdfos70sc.jpg','stock':0,'reorder':15,'featured':True,
  'active_ingredient':'Chlorpyrifos + Cypermethrin (dual-action SC blend)','formulation':'Suspension Concentrate (SC)',
  'crops':'Cabbages, tomatoes, maize and other field/vegetable crops; also for household and public-health pest control',
  'dosage':'30–40ml per 20L knapsack sprayer',
  'packing':'100ml, 250ml, 500ml, 1L',
  'description':'The newer, much stronger sibling to MD FOS 48EC — a highly concentrated dual-action SC blend of Chlorpyrifos and Cypermethrin that delivers rapid contact knockdown on the plant surface while providing a long-lasting chemical barrier that keeps working for days. Currently being finalised for stock — this listing is a preview so you know what\'s coming.',
  'usage':['Mix 30ml to 40ml of the SC fluid into a 20-litre water sprayer.',
           'Spray thoroughly across the plant leaves, making sure to coat the undersides where pests hide.',
           'Highly effective against armyworms, caterpillars and chewing pests on cabbages, tomatoes, maize and other vegetable crops.']},
 {'name':'MD BENZO-MECTIN 5WDG','category':'pesticide','img':'/images/product_benzomectin.jpg','stock':0,'reorder':10,'featured':True,
  'active_ingredient':'Emamectin Benzoate 5%','formulation':'Water-Dispersible Granules (WDG)',
  'crops':'Cabbages, broccoli and brassicas, tomatoes, maize, sorghum, leafy greens',
  'dosage':'1 sachet per 20L knapsack sprayer',
  'packing':'5g, 10g, 25g sachets',
  'description':'A powerful, localised water-dispersible granule pesticide specifically engineered to target destructive pests — Fall Armyworm and Tuta Absoluta chief among them — that rapidly build up resistance to traditional liquid sprays. The granules dissolve quickly in water to deliver deep stomach and contact action. Currently being finalised for stock — this listing is a preview so you know what\'s coming.',
  'usage':['Dissolve one sachet (adjusting dosage based on sachet size and infestation severity) into 20 litres of clean water and mix thoroughly.',
           'Spray directly onto crops at the very first sight of leaf damage or larvae.',
           'Primarily used to eradicate Fall Armyworm and Tuta absoluta on cabbages, broccoli, brassicas and tomatoes.']},
 {'name':'MD THION 350EC','category':'pesticide','img':'/images/product_thion.jpg','stock':70,'reorder':12,
  'active_ingredient':'Dimethoate 350 g/l','formulation':'Emulsifiable Concentrate (EC)',
  'crops':'Vegetables, Coffee, Tea, Citrus, Tobacco, Beans, Groundnuts',
  'dosage':'500ml–1L in 200–400L water per acre',
  'packing':'100ml, 250ml, 500ml, 1L',
  'description':'Moves through the plant\'s sap, not just the surface — so MD THION keeps working against thrips and mites even on the new growth that emerges after spraying. A coffee and citrus grower\'s dependable, budget-friendly option.',
  'usage':['Mix 500ml to 1 litre of the concentrate in 200–400 litres of water for full-field coverage, or scale down proportionally for a 20-litre knapsack sprayer.',
           'Apply at first sign of thrips or mite pressure, covering both leaf surfaces.',
           'Well suited to vegetables, coffee, tea and citrus where sap-feeding pests are the main concern.']},
 {'name':'MD THOATE 40EC','category':'pesticide','img':'/images/product_thoate.jpg','stock':62,'reorder':10,
  'active_ingredient':'Dimethoate 400 g/l','formulation':'Emulsifiable Concentrate (EC)',
  'crops':'Coffee, Vegetables, Cotton, Cereals, Tobacco, Tea',
  'dosage':'30–40ml per 20L knapsack sprayer',
  'packing':'100ml, 500ml, 1L, 5L',
  'description':'An organophosphate-based systemic pesticide engineered to combat persistent, sap-sucking insects. It moves through the vascular system of the plant, ensuring that even pests hiding on the undersides of leaves or inside dense canopies are eliminated — a dual-action insecticide and acaricide in one bottle.',
  'usage':['Dilute 30ml to 40ml of the liquid chemical in a standard 20-litre water sprayer.',
           'Spray uniformly over the crop canopy during the early morning or late evening to minimise evaporation and avoid beneficial pollinators.',
           'Primarily used to treat aphids, mealybugs and mites on vegetables and fruit crops.']},
 {'name':'TOP-LAXLY M 72WP','category':'fungicide','img':'/images/product_toplaxym.jpg','stock':115,'reorder':20,
  'active_ingredient':'Metalaxyl-M 4% + Mancozeb 64%','formulation':'Wettable Powder (WP)',
  'crops':'Onions, Tomatoes, French Beans, Watermelon, Potatoes, Peppers, Carrots',
  'dosage':'40–50g per 20L knapsack sprayer',
  'packing':'100g, 250g, 500g, 1kg',
  'description':'A highly effective, dual-action preventative and curative fungicide formulated for proactive growers to apply ahead of the rainy season. It coats the leaves to block fungal spore penetration while absorbing into the plant tissue to stop hidden diseases from spreading during humid weather — what our vegetable growers spray first when downy mildew shows up overnight after heavy rain.',
  'usage':['Mix 40g to 50g of the powder thoroughly in a 20-litre knapsack sprayer with clean water.',
           'Spray crops evenly before rainy periods or at the absolute first sign of damp weather.',
           'Targeted diseases include late blight, downy mildew and leaf spots on vegetables, potatoes, grapes, groundnuts and tobacco.']},
 {'name':'MD TOP LAXLYN 72WP','category':'fungicide','img':'/images/product_toplaxlyn.jpg','stock':90,'reorder':15,
  'active_ingredient':'Metalaxyl 8% + Mancozeb 64%','formulation':'Wettable Powder (WP)',
  'crops':'Vegetables, Potatoes, Grapes, Groundnuts, Tobacco',
  'dosage':'40–50g per 20L knapsack sprayer',
  'packing':'250g, 500g, 1kg',
  'description':'A highly effective, dual-action preventative and curative fungicide — the same trusted Metalaxyl + Mancozeb combination as TOP-LAXLY M, built for growers who plan for downy mildew and Alternaria blight before symptoms appear, giving potato and grape crops a head start on disease season.',
  'usage':['Mix 40g to 50g of the powder thoroughly in a 20-litre knapsack sprayer with clean water.',
           'Spray crops evenly before rainy periods or at the absolute first sign of damp weather.',
           'Targeted diseases include late blight, downy mildew and leaf spots on vegetables, potatoes, grapes, groundnuts and tobacco.']},
 {'name':'KNAPSACK SPRAYER 16L','category':'other','img':'/images/product_sprayer.jpg','stock':35,'reorder':5,
  'active_ingredient':'N/A — Equipment','formulation':'Manual Knapsack Sprayer',
  'crops':'All field, vegetable and plantation spray applications',
  'dosage':'16-litre tank. Operating pressure: 2–4 bar. Adjustable flat fan nozzle.',
  'packing':'Per unit — assembled or unassembled',
  'description':'Durable, ergonomic, high-pressure manual knapsack sprayers distributed in both fully assembled and unassembled formats. Designed with heavy-duty plastic tanks, comfortable shoulder straps and adjustable nozzles for uniform mist delivery and minimal chemical waste — the sprayer that outlasts a season of daily use, sold and serviced at every MACL outlet.',
  'usage':['Assemble the lance, hose and handle according to the provided instructional sheet if bought unassembled.',
           'Pour your pre-mixed chemical solution through the filter basket into the tank, tightly secure the lid, pump the pressure handle smoothly, and adjust the nozzle tip to match your required spray pattern (mist or stream).',
           'Rinse the entire tank, hose and nozzle with clean water thoroughly after every single use to prevent chemical cross-contamination and corrosion.']},
]

DISTRIBUTORS=[
 ('Muddo Agro HQ — Kampala','Central','Kampala','Container Village Nakivubo, Equity Bank Basement V013, P.O Box 25240','0772-507582 / 0702-507582','muddoagro811@gmail.com',0.3136,32.5811),
 ('Nakasero Agro Supplies','Central','Kampala','Nakasero Market, Stall 47','+256 701 234567','',0.3180,32.5750),
 ('Wakiso District Outlet','Central','Wakiso','Namulanda Trading Centre, Entebbe Road','+256 754 223344','',0.0667,32.4833),
 ('Masaka Agro Store','Central','Masaka','Birch Avenue, Masaka Town','+256 789 990011','',-0.3396,31.7369),
 ('Jinja Agro Distributor','Eastern','Jinja','Main Street, Jinja Town, Plot 45','+256 782 334455','',0.4244,33.2041),
 ('Mbale Farm Supplies','Eastern','Mbale','Republic Street, Mbale, Shop 12','+256 703 445566','',1.0796,34.1753),
 ('Iganga Agricultural Centre','Eastern','Iganga','Market Street, Iganga Town','+256 756 112233','',0.6085,33.4683),
 ('Gulu Northern Branch','Northern','Gulu','Chwa II Road, Gulu Town','+256 772 556677','',2.7748,32.2990),
 ('Lira Agro Centre','Northern','Lira','Obote Avenue, Lira Town','+256 755 889900','',2.2499,32.8998),
 ('Mbarara Western Hub','Western','Mbarara','High Street, Mbarara, Plot 8','+256 786 667788','',-0.6072,30.6545),
 ('Fort Portal Outlet','Western','Kabarole','Bwamba Road, Fort Portal Town','+256 701 778899','',0.6620,30.2750),
]

AGENTS=[
 ('Alice Namukasa','alice','alice@muddo.ug','+256 701 111001','Central','Kampala'),
 ('Robert Opio','robert','robert@muddo.ug','+256 702 222002','Eastern','Jinja'),
 ('Grace Atim','grace','grace@muddo.ug','+256 703 333003','Northern','Gulu'),
 ('Patrick Tendo','patrick','patrick@muddo.ug','+256 704 444004','Western','Mbarara'),
]

class Command(BaseCommand):
    help='Seed real MACL products, distributors and demo agents'
    def add_arguments(self,p): p.add_argument('--force',action='store_true')
    def handle(self,*a,**o):
        force=o['force']
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin','admin@muddo.ug','muddo@admin2024')
            self.stdout.write(self.style.SUCCESS('✓ Admin created (admin / muddo@admin2024)'))
        if not Product.objects.exists() or force:
            if force: Product.objects.all().delete()
            added=0
            for r in PRODUCTS:
                usage_text = '\n'.join(r.get('usage', []))
                defaults = {k: r[k] for k in ('category','description','active_ingredient','formulation','crops','dosage','packing') if k in r}
                defaults['image_url'] = r.get('img','/images/products_all.jpg')
                defaults['usage_instructions'] = usage_text
                defaults['is_featured'] = r.get('featured', False)
                p,created=Product.objects.get_or_create(name=r['name'],defaults=defaults)
                if created: Inventory.objects.create(product=p,stock_qty=r.get('stock',50),reorder_level=r.get('reorder',10),unit='units'); added+=1
            self.stdout.write(self.style.SUCCESS(f'✓ {added}/{len(PRODUCTS)} products seeded'))
        if not Distributor.objects.exists() or force:
            if force: Distributor.objects.all().delete()
            for r in DISTRIBUTORS: Distributor.objects.get_or_create(name=r[0],defaults={'region':r[1],'district':r[2],'address':r[3],'phone':r[4],'email':r[5],'lat':r[6],'lng':r[7]})
            self.stdout.write(self.style.SUCCESS(f'✓ {len(DISTRIBUTORS)} distributors seeded'))
        if not Agent.objects.exists() or force:
            n=0
            for name,username,email,phone,region,district in AGENTS:
                if not User.objects.filter(username=username).exists():
                    f,*l=name.split(' ',1)
                    u=User.objects.create_user(username,email,'agent@2024',first_name=f,last_name=' '.join(l) if l else '')
                    Agent.objects.create(user=u,phone=phone,region=region,district=district); n+=1
            self.stdout.write(self.style.SUCCESS(f'✓ {n} agents seeded (password: agent@2024)'))
        self.stdout.write(self.style.SUCCESS('\n✅ Done!\n   Run: python manage.py runserver\n   Admin: http://127.0.0.1:8000/login/ → admin / muddo@admin2024'))
