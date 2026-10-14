"""Builds supabase/catalog/2026-10-15-first-products.sql: the shop's first real products
(from its Instagram posts), photos in assets/products/ (official brand photos where the exact
item was found, the shop's own photo otherwise).

Prices: the posts give USD "with delivery"; converted at the Central Bank rate of 6 Oct 2026
(1 USD = 11 780 UZS) and rounded up to 10 000 UZS. Everything is ordered from abroad
(stock 0, every size orderable), 15–20 days.

The SQL is idempotent (safe to run twice) and hides the placeholder catalog instead of deleting it.
Run:  python scripts/build-products-2026-10.py
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://outletlounge.uz/assets/products/'
RATE = 11780
IMAGES = json.load(open(os.path.join(ROOT, 'scripts', 'products-2026-10-images.json'), encoding='utf8'))


def uzs(usd):
    return int(math.ceil(usd * RATE / 10000.0) * 10000)


LETTER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL']


def letters(a, b):
    return LETTER[LETTER.index(a):LETTER.index(b) + 1]


P = [
    dict(slug='boss-mesh-trainers-ribbed-sole-black-grey', brand='boss', name='Mesh trainers with ribbed sole',
         color='Black / grey', hex='#2B2B2B', group='black', style='HB-50568928', cat='sneakers', usd=117,
         material='Mesh upper (100% polyester), smooth trims, lightweight ribbed rubber outsole', fit=None, origin=None,
         sizes=[str(s) for s in range(40, 46)], featured=True,
         ru='Беговые кроссовки BOSS с сетчатым верхом, гладкими вставками и лёгкой рифлёной подошвой. Оригинал, артикул 50568928, цвет 015.',
         uz='Toʻrsimon ustki qismi, silliq qoʻshimchalari va yengil qovurgʻali tagligi bor BOSS yugurish krossovkalari. Original, artikul 50568928, rang 015.',
         en='Running-inspired BOSS trainers with mesh uppers, smooth trims and a lightweight ribbed outsole. Original, style 50568928, colour 015.'),
    dict(slug='porsche-x-boss-stretch-cotton-cap-black', brand='boss', name='Porsche x BOSS stretch-cotton cap',
         color='Black', hex='#111111', group='black', style='HB-50572432', cat='caps-hats', usd=69,
         material='98% cotton, 2% elastane (peached twill); lining 100% polyester', fit=None, origin=None,
         sizes=['ONE SIZE'], featured=True,
         ru='Кепка из коллаборации Porsche x BOSS: персиковый эластичный хлопковый твил, тональный глянцевый логотип, изогнутый козырёк и фирменная застёжка. Артикул 50572432.',
         uz='Porsche x BOSS hamkorligidagi kepka: yumshoq elastik paxta tvil, bir xil rangdagi yaltiroq logotip, egilgan soyabon va brend qisqichi. Artikul 50572432.',
         en='A Porsche x BOSS cap in peached stretch-cotton twill with a gloss-effect tonal logo, curved visor and branded closure. Style 50572432.'),
    dict(slug='boss-grained-leather-loafers-dark-brown', brand='boss', name='Grained-leather loafers',
         color='Dark brown', hex='#4A3B33', group='brown', style='HB-50536173', cat='classic-shoes', usd=145,
         material='Grained cow leather upper, lining and insole; synthetic rubber sole', fit=None, origin=None,
         sizes=[str(s) for s in range(40, 47)], featured=True,
         ru='Лоферы BOSS из зернистой кожи: полностью на кожаной подкладке, с тиснёным логотипом сбоку и светлой резиновой подошвой. Артикул 50536173.',
         uz='Donador teridan BOSS loferlari: toʻliq teri astarli, yon tomonida bosma logotip, ochiq rangli rezina taglik. Artikul 50536173.',
         en='BOSS slip-on loafers in grained leather, fully leather-lined, with an embossed side logo and a light rubber sole. Style 50536173.'),
    dict(slug='boss-x-aston-martin-polo-cotton-silk-light-beige', brand='boss', name='BOSS x Aston Martin polo in cotton and silk',
         color='Light beige', hex='#DAD6CC', group='beige', style='HB-50548616', cat='polos', usd=119,
         material='85% cotton, 15% silk, quilted texture', fit='regular', origin=None,
         sizes=letters('S', '3XL'), featured=True,
         ru='Поло из коллаборации BOSS x Aston Martin: хлопок с шёлком, стёганая фактура и фирменные «крылья» Aston Martin на груди. Прямой крой. Артикул 50548616.',
         uz='BOSS x Aston Martin hamkorligidagi polo: ipak qoʻshilgan paxta, qavima tekstura va koʻkragida Aston Martin «qanotlari». Toʻgʻri bichim. Artikul 50548616.',
         en='A BOSS x Aston Martin polo in cotton and silk with a quilted texture and the Aston Martin wings on the chest. Regular fit. Style 50548616.'),
    dict(slug='boss-zip-up-sweatshirt-jacket-black', brand='boss', name='Zip-up sweatshirt jacket',
         color='Black', hex='#141414', group='black', style=None, cat='hoodies-sweatshirts', usd=109,
         material=None, fit='regular', origin=None, sizes=letters('S', 'XXL'), featured=False,
         ru='Чёрная куртка-толстовка BOSS на молнии с воротником-стойкой. Легко сочетается с футболкой и джинсами.',
         uz='Tik yoqali, zamokli qora BOSS sviter-kurtka. Futbolka va jinsi bilan oson uygʻunlashadi.',
         en='A black BOSS zip-up sweatshirt jacket with a stand collar. Easy over a T-shirt and jeans.'),
    dict(slug='mizuno-gore-tex-trail-shoes-grey', brand='mizuno', name='GORE-TEX trail shoes',
         color='Grey', hex='#77787B', group='grey', style=None, cat='sneakers', usd=165,
         material='Knit upper with a GORE-TEX waterproof membrane, lugged rubber outsole', fit=None, origin=None,
         sizes=[str(s) for s in range(40, 47)], featured=False,
         ru='Кроссовки Mizuno с мембраной GORE-TEX: не промокают, держат тепло и уверенно цепляются за мокрый асфальт и тропу благодаря протектору.',
         uz='GORE-TEX membranali Mizuno krossovkalari: suv oʻtkazmaydi, issiqni saqlaydi, chuqur protektori hoʻl yoʻl va soʻqmoqda ishonchli ushlaydi.',
         en='Mizuno trail shoes with a GORE-TEX membrane: waterproof, warm, and a deep lugged outsole that grips wet streets and trails.'),
    dict(slug='ramsey-half-zip-merino-sweater-navy', brand='ramsey', name='Half-zip merino sweater',
         color='Navy', hex='#1D2433', group='navy', style='RM-10157838', cat='knitwear', usd=66,
         material='Extra-fine merino wool blend, flat knit', fit='regular', origin='TR',
         sizes=letters('S', '3XL'), featured=True,
         ru='Тонкий свитер Ramsey из экстратонкой мериносовой шерсти с воротником-стойкой на молнии — лёгкий, очень мягкий, хорошо сидит под пиджаком и курткой. Есть варианты с одной или двумя молниями.',
         uz='Ramsey ning ekstra ingichka merinos junidan yupqa sviteri, zamokli tik yoqa bilan — yengil, juda yumshoq, pidjak va kurtka ostida yaxshi turadi. Bir yoki ikki zamokli variantlari bor.',
         en='A fine Ramsey sweater in extra-fine merino wool with a zipped stand collar: light, very soft and made to sit under a blazer or jacket. Available with one or two zips.'),
    dict(slug='ramsey-wool-overshirt-suit-navy', brand='ramsey', name='Wool overshirt suit, two-piece',
         color='Navy', hex='#1E2433', group='navy', style='RM-10151002', cat='suits-blazers', usd=260,
         material='100% wool', fit='regular', origin='TR', sizes=['46', '48', '50', '52', '54', '56'], featured=True,
         ru='Костюм-двойка Ramsey из 100% шерсти: куртка-рубашка с накладными карманами и брюки в тон. Свободный casual-крой — можно носить вместе или по отдельности.',
         uz='Ramsey ning 100% jundan ikki qismli kostyumi: ustki choʻntakli koʻylak-kurtka va bir xil rangdagi shim. Erkin casual bichim — birga ham, alohida ham kiyish mumkin.',
         en='A Ramsey two-piece in 100% wool: an overshirt jacket with patch pockets and matching trousers. Relaxed casual cut, to wear together or apart.'),
    dict(slug='ramsey-pique-polo-shirt-petrol', brand='ramsey', name='Cotton piqué polo shirt',
         color='Petrol', hex='#1F5D6B', group='blue', style='RM-10157221', cat='polos', usd=46,
         material='100% cotton piqué', fit='slim', origin='TR', sizes=letters('S', 'XXL'), featured=False,
         ru='Поло Ramsey цвета «петроль» из 100% хлопкового пике: дышит, держит форму и подходит и для офиса, и для выходных.',
         uz='Ramsey ning «petrol» rangli 100% paxta pike polosi: havo oʻtkazadi, shaklini saqlaydi, ofisga ham, dam olish kunlariga ham mos.',
         en='A Ramsey polo in petrol blue, 100% cotton piqué: breathable, holds its shape, right for the office and the weekend.'),
    dict(slug='ramsey-slim-chino-trousers-navy', brand='ramsey', name='Slim chino trousers',
         color='Navy', hex='#1E2536', group='navy', style='RM-10164268', cat='trousers', usd=55,
         material='Cotton blend', fit='slim', origin='TR', sizes=['30', '31', '32', '33', '34', '36', '38'], featured=True, lead='15',
         ru='Чиносы Ramsey приталенного кроя из мягкого хлопкового смесового твила — от офиса до вечера. Есть в тёмно-синем и чёрном.',
         uz='Ramsey ning yumshoq aralash paxta tvildan torroq bichimli chinoslari — ofisdan kechgacha. Toʻq koʻk va qora ranglarda.',
         en='Ramsey chinos in a soft cotton-blend twill with a slim cut, from the office to the evening. In navy and black.'),
    dict(slug='ramsey-slim-chino-trousers-black', brand='ramsey', name='Slim chino trousers',
         color='Black', hex='#151515', group='black', style='RM-10164268', cat='trousers', usd=55,
         material='Cotton blend', fit='slim', origin='TR', sizes=['30', '31', '32', '33', '34', '36', '38'], featured=False, lead='15',
         ru='Чиносы Ramsey приталенного кроя из мягкого хлопкового смесового твила — от офиса до вечера. Есть в чёрном и тёмно-синем.',
         uz='Ramsey ning yumshoq aralash paxta tvildan torroq bichimli chinoslari — ofisdan kechgacha. Qora va toʻq koʻk ranglarda.',
         en='Ramsey chinos in a soft cotton-blend twill with a slim cut, from the office to the evening. In black and navy.'),
    dict(slug='adidas-fleece-hooded-tracksuit-black', brand='adidas', name='Fleece hooded tracksuit, hoodie and pants',
         color='Black', hex='#151515', group='black', style=None, cat='hoodies-sweatshirts', usd=89,
         material='Cotton-blend fleece', fit='regular', origin=None, sizes=letters('S', 'XXL'), featured=False,
         ru='Комплект adidas: флисовое худи на молнии с капюшоном и брюки в тон, тональный логотип. Тёплый и мягкий — на каждый день.',
         uz='adidas toʻplami: kapyushonli zamokli flis xudi va bir xil rangdagi shim, tonal logotip. Issiq va yumshoq — har kuni uchun.',
         en='An adidas set: a full-zip fleece hoodie and matching pants with a tonal logo. Warm and soft, for every day.'),
]

BRANDS = [('Ramsey', 'ramsey', 9), ('Mizuno', 'mizuno', 10)]
HERO = 'ramsey-wool-overshirt-suit-navy'


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


out = ['-- Generated by scripts/build-products-2026-10.py — do not edit by hand.',
       '-- The shop\'s first real products. Idempotent: run it twice and nothing changes.',
       '-- Prices: USD with delivery x 11 780 UZS (CBU, 6 Oct 2026), rounded up to 10 000.', '',
       'begin;', '',
       '-- hide the placeholder catalog (Unsplash photos); it can be shown again in Admin -> Products',
       "update public.products set is_active = false",
       "where is_active and id in (select product_id from public.product_images where path like 'https://images.unsplash.com/%');", '',
       'insert into public.brands (name, slug, sort) values']
out.append(',\n'.join(f'  ({q(n)}, {q(s)}, {o})' for n, s, o in BRANDS))
out.append('on conflict (slug) do nothing;\n')
out.append('insert into public.products\n  (slug, brand_id, name, color, color_hex, color_group, style_code, category, price, old_price,\n'
           '   origin, material, fit, order_lead, description_ru, description_uz, description_en, is_new, is_featured, is_active, created_at) values')
rows = []
for i, p in enumerate(P):
    rows.append('  (' + ', '.join([
        q(p['slug']), f"(select id from public.brands where slug = {q(p['brand'])})", q(p['name']), q(p['color']), q(p['hex']),
        q(p['group']), q(p['style']), q(p['cat']), q(uzs(p['usd'])), 'null', q(p['origin']), q(p['material']), q(p['fit']),
        q(p.get('lead', '15–20')), q(p['ru']), q(p['uz']), q(p['en']), 'true', q(p['featured']), 'true',
        f"now() - interval '{i} minutes'"]) + ')')
out.append(',\n'.join(rows))
out.append('on conflict (slug) do nothing;\n')

out.append('insert into public.product_images (product_id, path, sort, is_main)\nselect p.id, v.path, v.sort, v.sort = 0\nfrom (values')
imgs = []
for p in P:
    for k, f in enumerate(IMAGES[p['slug']]):
        imgs.append(f"  ({q(p['slug'])}, {q(SITE + f)}, {k})")
out.append(',\n'.join(imgs))
out.append(') as v(slug, path, sort)\njoin public.products p on p.slug = v.slug\n'
           'where not exists (select 1 from public.product_images i where i.product_id = p.id and i.path = v.path);\n')

out.append('insert into public.product_sizes (product_id, label, sort, stock, orderable)\nselect p.id, v.label, v.sort, 0, true\nfrom (values')
sz = []
for p in P:
    for k, s in enumerate(p['sizes']):
        sz.append(f"  ({q(p['slug'])}, {q(s)}, {k})")
out.append(',\n'.join(sz))
out.append(') as v(slug, label, sort)\njoin public.products p on p.slug = v.slug\non conflict (product_id, label) do nothing;\n')

out.append('-- homepage photo: the two-piece suit (owner can change it in Admin -> Settings)')
out.append("update public.settings set value = jsonb_set(coalesce(value, '{}'::jsonb), '{hero}', "
           f"jsonb_build_object('image', {q(SITE + IMAGES[HERO][1])}, 'product', {q(HERO)}))")
out.append("where key = 'home';\n")
out.append('commit;\n')

os.makedirs(os.path.join(ROOT, 'supabase', 'catalog'), exist_ok=True)
path = os.path.join(ROOT, 'supabase', 'catalog', '2026-10-15-first-products.sql')
open(path, 'w', encoding='utf8', newline='\n').write('\n'.join(out))
for p in P:
    print(f"{p['slug']:<52} {p['usd']:>4} USD -> {uzs(p['usd']):>9,} UZS  {len(IMAGES[p['slug']])} photos  sizes {p['sizes'][0]}–{p['sizes'][-1]}")
print('wrote', os.path.relpath(path, ROOT))
