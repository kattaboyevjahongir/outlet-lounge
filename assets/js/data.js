/* Outlet Lounge — data: placeholder images, catalog and translations (EN / RU / UZ) */
(function () {
  const OL = (window.OL = window.OL || {});

  // Temporary Unsplash photos (the owner replaces them with real product shots in the admin panel)
  OL.IMG = {
    'polo-black-1': '1625910513413-c23b8bb81cba', 'polo-black-2': '1625910513399-c9fcba54338c',
    'polo-grey-1': '1586363090844-099253d6a1cb', 'polo-grey-2': '1625910513394-ea511bed44ca',
    'shirt-blue-1': '1604695573706-53170668f6a6', 'shirt-grey-1': '1598032895397-b9472444bf93',
    'tee-white-1': '1581655353564-df123a1eb820', 'tee-white-2': '1521572163474-6864f9cf17ab',
    'tee-black-1': '1583743814966-8936f5b7be1a', 'tee-black-2': '1618354691373-d851c5c3a990',
    'hoodie-grey-1': '1564557287817-3785e38ec1f5', 'hoodie-grey-2': '1611817757591-c3f345024273',
    'knit-black-1': '1611312449297-a69dc9c3987b', 'knit-black-2': '1611312449545-94176309c857',
    'denim-jacket-1': '1611312449408-fcece27cdbb7', 'denim-jacket-2': '1772798921699-69445b09c598',
    'leather-jacket-1': '1675877879221-871aa9f7c314', 'leather-jacket-2': '1602346693719-c1c05078679e',
    'blazer-1': '1592878904946-b3cd8ae243d0', 'blazer-2': '1592878940526-0214b0f374f6',
    'jeans-blue-1': '1714143164072-7646ef5cb24d', 'jeans-blue-2': '1714143136367-7bb68f3f0669',
    'jeans-black-1': '1718252540617-6ecda2b56b57', 'jeans-black-2': '1718252540511-e958742e4165',
    'trousers-1': '1584865288642-42078afe6942',
    'shorts-green-1': '1621496503717-095a410e1566', 'shorts-blue-1': '1617951907145-53f6eb87a3a3',
    'underwear-1': '1778118259283-ba2c786e82fc', 'underwear-2': '1561504599-f900052636b3',
    'sneaker-white-1': '1597350584914-55bb62285896', 'sneaker-white-2': '1600269452121-4f2416e55c28',
    'sneaker-low-1': '1544441892-794166f1e3be', 'sneaker-low-2': '1625860191460-10a66c7384fb',
    'derby-brown-1': '1614252235316-8c857d38b5f4', 'derby-brown-2': '1603191659812-ee978eeeef76',
    'derby-black-1': '1668069226492-508742b03147', 'derby-black-2': '1641893843833-a006778dc00b',
    'boots-brown-1': '1608256246200-53e635b5b65f', 'boots-brown-2': '1605812860427-4024433a70fd',
    'belt-black-1': '1664286074176-5206ee5dc878', 'belt-brown-1': '1711443982852-b3df5c563448',
    'wallet-1': '1601592996763-f05c9c80a7f1', 'wallet-2': '1579014134953-1580d7f123f3',
    'backpack-1': '1622560481156-01fc7e1693e6', 'backpack-2': '1581605405669-fcdf81165afa',
    'cap-white-1': '1588850561407-ed78c282e89b',
    'tie-1': '1779630389516-334d96704c83', 'tie-2': '1598033129183-c4f50c736f10',
    // editorial / department pictures
    'look-1': '1619603364904-c0498317e145', 'look-2': '1550995694-3f5f4a7e1bd2', 'look-3': '1539042380473-e548736ea2c4',
    'look-4': '1602346733051-b660c8747610', 'suit-1': '1618886614638-80e3c103d31a', 'loafers-1': '1533867617858-e7b97e060509',
  };

  const UNSPLASH = (key) => `https://images.unsplash.com/photo-${OL.IMG[key]}`;

  // Resize helper: placeholder (Unsplash) photos are resized on the fly; photos uploaded in the
  // admin panel exist as 1600 / 800 / 400 px files next to each other (…-1600.webp), so the
  // closest size that is large enough is picked.
  OL.pimg = (url, w = 800, h) => {
    if (!url) return '';
    if (url.includes('images.unsplash.com')) {
      return `${url.split('?')[0]}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=80`;
    }
    const m = url.match(/^(.*\/product-images\/.*)-1600\.(webp|jpg)$/);
    if (m) return `${m[1]}-${w <= 420 ? 400 : w <= 840 ? 800 : 1600}.${m[2]}`;
    return url;
  };
  OL.img = (key, w = 800, h) => OL.pimg(UNSPLASH(key), w, h); // department / hero placeholders

  // ----------------------------------------------------------------------
  // Departments and categories. The database table `categories` is the source of truth (the owner edits
  // it in the admin panel); this list is the offline fallback and mirrors the migration
  // (a test keeps them identical). Size systems: letter, ru, waist, shoes, belt, one.
  // ----------------------------------------------------------------------
  OL.DEPARTMENTS = ['clothing', 'shoes', 'accessories'];
  const C = (slug, dept, ru, uz, en, sizes, image) => ({ slug, dept, name: { ru, uz, en }, sizes, image, sort: 0 });
  OL.STATIC_CATEGORIES = [
    C('t-shirts', 'clothing', 'Футболки', 'Futbolkalar', 'T-shirts', 'letter', 'tee-white-1'),
    C('polos', 'clothing', 'Поло', 'Polo', 'Polos', 'letter', 'polo-black-1'),
    C('shirts', 'clothing', 'Рубашки', 'Koʻylaklar', 'Shirts', 'letter', 'shirt-blue-1'),
    C('knitwear', 'clothing', 'Трикотаж', 'Trikotaj', 'Knitwear', 'letter', 'knit-black-1'),
    C('hoodies-sweatshirts', 'clothing', 'Худи и свитшоты', 'Xudi va svitshotlar', 'Hoodies & sweatshirts', 'letter', 'hoodie-grey-1'),
    C('jackets-coats', 'clothing', 'Куртки и пальто', 'Kurtka va paltolar', 'Jackets & coats', 'letter', 'denim-jacket-1'),
    C('suits-blazers', 'clothing', 'Костюмы и пиджаки', 'Kostyum va pidjaklar', 'Suits & blazers', 'ru', 'blazer-1'),
    C('trousers', 'clothing', 'Брюки', 'Shimlar', 'Trousers', 'waist', 'trousers-1'),
    C('jeans', 'clothing', 'Джинсы', 'Jinsilar', 'Jeans', 'waist', 'jeans-blue-1'),
    C('shorts', 'clothing', 'Шорты', 'Shortilar', 'Shorts', 'letter', 'shorts-green-1'),
    C('underwear-socks', 'clothing', 'Бельё и носки', 'Ichki kiyim va paypoqlar', 'Underwear & socks', 'letter', 'underwear-1'),
    C('sneakers', 'shoes', 'Кроссовки', 'Krossovkalar', 'Sneakers', 'shoes', 'sneaker-white-1'),
    C('classic-shoes', 'shoes', 'Классическая обувь', 'Klassik poyabzal', 'Classic shoes', 'shoes', 'derby-brown-1'),
    C('boots', 'shoes', 'Ботинки', 'Botinkalar', 'Boots', 'shoes', 'boots-brown-1'),
    C('belts', 'accessories', 'Ремни', 'Kamarlar', 'Belts', 'belt', 'belt-black-1'),
    C('bags', 'accessories', 'Сумки и рюкзаки', 'Sumka va ryukzaklar', 'Bags & backpacks', 'one', 'backpack-1'),
    C('caps-hats', 'accessories', 'Кепки и шапки', 'Kepka va shapkalar', 'Caps & hats', 'one', 'cap-white-1'),
    C('wallets', 'accessories', 'Кошельки', 'Hamyonlar', 'Wallets', 'one', 'wallet-1'),
    C('ties', 'accessories', 'Галстуки', 'Galstuklar', 'Ties', 'one', 'tie-1'),
    C('sunglasses', 'accessories', 'Очки', 'Koʻzoynaklar', 'Sunglasses', 'one', 'look-2'),
  ].map((c, i) => ({ ...c, sort: i + 1 }));

  // Size labels per size system, in display order (the admin panel offers the same lists)
  OL.SIZE_SYSTEMS = {
    letter: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
    ru: ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62'],
    waist: ['28', '29', '30', '31', '32', '33', '34', '36', '38', '40'],
    shoes: ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
    belt: ['85', '90', '95', '100', '105', '110', '115'],
    one: ['ONE SIZE'],
  };

  // ----------------------------------------------------------------------
  // Placeholder catalog. This is (a) the offline fallback when /api/catalog is
  // unavailable and (b) the source of supabase/seed.sql (see scripts/build-seed.mjs).
  // Once real products live in the database, turn the fallback off with
  // OL.CONFIG.staticFallback = false so placeholder prices are never shown.
  // ----------------------------------------------------------------------
  OL.CONFIG = { staticFallback: true };

  const slugify = (str) =>
    str.toLowerCase().replace(/[“”"’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // sizes: a list of labels; `low` have 1 left here, `ord` are sold out here but can be ordered from abroad,
  // `out` are sold out for good, every other size has 3 in stock (and can also be ordered when more is wanted)
  const Z = (labels, { low = [], ord = [], out = [] } = {}) => labels.map((s) => {
    const stock = out.includes(s) || ord.includes(s) ? 0 : low.includes(s) ? 1 : 3;
    const order = !out.includes(s);
    return { s, ok: stock > 0 || order, stock, order };
  });
  const L = ['S', 'M', 'L', 'XL', 'XXL'];
  const RU = ['48', '50', '52', '54', '56'];
  const W = ['30', '32', '34', '36'];
  const SH = ['40', '41', '42', '43', '44', '45'];
  const BELT = ['90', '95', '100', '105', '110'];
  const ONE = ['ONE SIZE'];

  // Prices in UZS (placeholder). `style` ties the colours of one item together.
  const RAW = [
    { brand: 'Lacoste', name: 'Classic Fit Polo', color: 'Black', hex: '#141414', group: 'black', style: 'LC-L1212', cat: 'polos', price: 1290000, origin: 'FR', material: '100% cotton petit piqué', fit: 'regular', model: 'Model is 186 cm and wears M', imgs: ['polo-black-1', 'polo-black-2'], sizes: Z(L, { low: ['XL'], ord: ['XXL'] }), isNew: true },
    { brand: 'Lacoste', name: 'Classic Fit Polo', color: 'Grey', hex: '#8C9096', group: 'grey', style: 'LC-L1212', cat: 'polos', price: 1290000, origin: 'FR', material: '100% cotton petit piqué', fit: 'regular', model: 'Model is 186 cm and wears M', imgs: ['polo-grey-1', 'polo-grey-2'], sizes: Z(L, { ord: ['S'] }), featured: true },
    { brand: 'Polo Ralph Lauren', name: 'Slim Fit Oxford Shirt', color: 'Blue', hex: '#6F93C7', group: 'blue', style: 'RL-OX1', cat: 'shirts', price: 1590000, was: 1990000, origin: 'US', material: '100% cotton oxford', fit: 'slim', model: 'Model is 188 cm and wears M', imgs: ['shirt-blue-1', 'shirt-grey-1'], sizes: Z(L, { ord: ['XXL'] }), featured: true },
    { brand: 'Polo Ralph Lauren', name: 'Slim Fit Oxford Shirt', color: 'Grey', hex: '#9EA2A8', group: 'grey', style: 'RL-OX1', cat: 'shirts', price: 1590000, was: 1990000, origin: 'US', material: '100% cotton oxford', fit: 'slim', model: 'Model is 188 cm and wears M', imgs: ['shirt-grey-1', 'shirt-blue-1'], sizes: Z(L, { low: ['M'], out: ['S'] }) },
    { brand: 'Tommy Hilfiger', name: 'Logo Crew T-shirt', color: 'White', hex: '#F4F4F2', group: 'white', style: 'TH-TEE1', cat: 't-shirts', price: 590000, origin: 'NL', material: '100% organic cotton', fit: 'regular', imgs: ['tee-white-1', 'tee-white-2'], sizes: Z(L), isNew: true, featured: true },
    { brand: 'Tommy Hilfiger', name: 'Logo Crew T-shirt', color: 'Black', hex: '#1A1A1A', group: 'black', style: 'TH-TEE1', cat: 't-shirts', price: 590000, origin: 'NL', material: '100% organic cotton', fit: 'regular', imgs: ['tee-black-1', 'tee-black-2'], sizes: Z(L, { ord: ['XL', 'XXL'] }), featured: true },
    { brand: 'Calvin Klein', name: 'Cotton Fleece Hoodie', color: 'Grey', hex: '#A3A5A8', group: 'grey', style: 'CK-HD1', cat: 'hoodies-sweatshirts', price: 1190000, was: 1590000, origin: 'IT', material: '80% cotton, 20% polyester', fit: 'relaxed', model: 'Model is 185 cm and wears L', imgs: ['hoodie-grey-1', 'hoodie-grey-2'], sizes: Z(L, { low: ['S'] }), isNew: true },
    { brand: 'BOSS', name: 'Merino Crew Neck Sweater', color: 'Black', hex: '#161616', group: 'black', style: 'BS-KN1', cat: 'knitwear', price: 1890000, origin: 'IT', material: '100% extra-fine merino wool', fit: 'regular', model: 'Model is 187 cm and wears M', imgs: ['knit-black-1', 'knit-black-2'], sizes: Z(L, { ord: ['L', 'XL'] }), featured: true },
    { brand: 'Gant', name: 'Denim Jacket', color: 'Blue', hex: '#4D6A94', group: 'blue', style: 'GA-JK1', cat: 'jackets-coats', price: 2290000, origin: 'PT', material: '100% cotton denim', fit: 'regular', model: 'Model is 186 cm and wears M', imgs: ['denim-jacket-1', 'denim-jacket-2'], sizes: Z(L, { out: ['XXL'] }) },
    { brand: 'Diesel', name: 'Leather Biker Jacket', color: 'Black', hex: '#121212', group: 'black', style: 'DS-LJ1', cat: 'jackets-coats', price: 5900000, was: 7400000, origin: 'IT', material: 'Lamb leather, cotton lining', fit: 'slim', model: 'Model is 184 cm and wears M', imgs: ['leather-jacket-1', 'leather-jacket-2'], sizes: Z(L, { ord: ['S', 'M', 'L', 'XL', 'XXL'] }), isNew: true },
    { brand: 'BOSS', name: 'Slim Fit Wool Blazer', color: 'Navy', hex: '#1F2A44', group: 'navy', style: 'BS-BZ1', cat: 'suits-blazers', price: 3490000, origin: 'IT', material: '100% virgin wool', fit: 'slim', model: 'Model is 188 cm and wears 50', imgs: ['blazer-1', 'blazer-2'], sizes: Z(RU, { low: ['52'], ord: ['56'] }), featured: true },
    { brand: 'Diesel', name: 'Slim Tapered Jeans', color: 'Dark Blue', hex: '#26344F', group: 'navy', style: 'DS-JN1', cat: 'jeans', price: 1590000, origin: 'IT', material: '98% cotton, 2% elastane', fit: 'slim', model: 'Model is 186 cm and wears W32', imgs: ['jeans-blue-1', 'jeans-blue-2'], sizes: Z(W, { ord: ['36'] }), featured: true },
    { brand: 'Diesel', name: 'Slim Tapered Jeans', color: 'Black', hex: '#191919', group: 'black', style: 'DS-JN1', cat: 'jeans', price: 1590000, origin: 'IT', material: '98% cotton, 2% elastane', fit: 'slim', model: 'Model is 186 cm and wears W32', imgs: ['jeans-black-1', 'jeans-black-2'], sizes: Z(W, { low: ['30'] }) },
    { brand: 'Calvin Klein', name: 'Slim Tailored Trousers', color: 'Black', hex: '#1B1B1B', group: 'black', style: 'CK-TR1', cat: 'trousers', price: 1290000, was: 1790000, origin: 'TR', material: '66% polyester, 32% viscose, 2% elastane', fit: 'slim', imgs: ['trousers-1'], sizes: Z(W, { ord: ['30', '36'] }) },
    { brand: 'Lacoste', name: 'Cotton Fleece Shorts', color: 'Green', hex: '#3E6B4E', group: 'green', style: 'LC-SH1', cat: 'shorts', price: 790000, origin: 'FR', material: '100% cotton fleece', fit: 'regular', imgs: ['shorts-green-1', 'shorts-blue-1'], sizes: Z(L, { out: ['S'] }) },
    { brand: 'Calvin Klein', name: 'Boxer Briefs, 3-pack', color: 'Black', hex: '#181818', group: 'black', style: 'CK-UW1', cat: 'underwear-socks', price: 490000, origin: 'TR', material: '95% cotton, 5% elastane', fit: 'slim', imgs: ['underwear-1', 'underwear-2'], sizes: Z(L), featured: true },
    { brand: 'Nike', name: 'Air Force 1 Low', color: 'White', hex: '#F2F2F0', group: 'white', style: 'NK-AF1', cat: 'sneakers', price: 1490000, origin: 'VN', material: 'Leather upper, rubber sole', imgs: ['sneaker-white-1', 'sneaker-white-2'], sizes: Z(SH, { low: ['41'], ord: ['45'] }), isNew: true, featured: true },
    { brand: 'adidas', name: 'Stan Smith', color: 'White', hex: '#F4F4F1', group: 'white', style: 'AD-SS1', cat: 'sneakers', price: 1190000, was: 1490000, origin: 'ID', material: 'Leather upper, rubber sole', imgs: ['sneaker-low-1', 'sneaker-low-2'], sizes: Z(SH, { out: ['40'], ord: ['44', '45'] }) },
    { brand: 'BOSS', name: 'Leather Derby Shoes', color: 'Brown', hex: '#6A4630', group: 'brown', style: 'BS-DR1', cat: 'classic-shoes', price: 2790000, origin: 'IT', material: 'Calf leather, leather sole', imgs: ['derby-brown-1', 'derby-brown-2'], sizes: Z(['40', '41', '42', '43', '44'], { ord: ['40', '44'] }), featured: true },
    { brand: 'BOSS', name: 'Leather Derby Shoes', color: 'Black', hex: '#141414', group: 'black', style: 'BS-DR1', cat: 'classic-shoes', price: 2790000, origin: 'IT', material: 'Calf leather, leather sole', imgs: ['derby-black-1', 'derby-black-2'], sizes: Z(['40', '41', '42', '43', '44'], { low: ['42'] }) },
    { brand: 'Gant', name: 'Leather Lace-up Boots', color: 'Brown', hex: '#704A34', group: 'brown', style: 'GA-BT1', cat: 'boots', price: 2590000, origin: 'PT', material: 'Full-grain leather', imgs: ['boots-brown-1', 'boots-brown-2'], sizes: Z(['41', '42', '43', '44', '45'], { ord: ['41', '42', '43', '44', '45'] }), isNew: true },
    { brand: 'BOSS', name: 'Leather Belt', color: 'Black', hex: '#151515', group: 'black', style: 'BS-BL1', cat: 'belts', price: 890000, origin: 'IT', material: 'Calf leather, metal buckle', imgs: ['belt-black-1'], sizes: Z(BELT, { out: ['90'] }), featured: true },
    { brand: 'BOSS', name: 'Leather Belt', color: 'Brown', hex: '#6A4630', group: 'brown', style: 'BS-BL1', cat: 'belts', price: 890000, origin: 'IT', material: 'Calf leather, metal buckle', imgs: ['belt-brown-1'], sizes: Z(BELT, { ord: ['110'] }) },
    { brand: 'Polo Ralph Lauren', name: 'Leather Card Wallet', color: 'Black', hex: '#161616', group: 'black', style: 'RL-WL1', cat: 'wallets', price: 790000, origin: 'IT', material: 'Pebbled leather', imgs: ['wallet-1', 'wallet-2'], sizes: Z(ONE) },
    { brand: 'Tommy Hilfiger', name: 'Commuter Backpack', color: 'Black', hex: '#1B1B1B', group: 'black', style: 'TH-BP1', cat: 'bags', price: 1290000, was: 1690000, origin: 'CN', material: 'Recycled polyester', imgs: ['backpack-1', 'backpack-2'], sizes: Z(ONE, { low: ONE }), featured: true },
    { brand: 'Lacoste', name: 'Cotton Twill Cap', color: 'White', hex: '#F3F3F0', group: 'white', style: 'LC-CP1', cat: 'caps-hats', price: 590000, origin: 'FR', material: '100% cotton twill', imgs: ['cap-white-1'], sizes: Z(ONE) },
    { brand: 'BOSS', name: 'Silk Tie', color: 'Navy', hex: '#1E2C4A', group: 'navy', style: 'BS-TI1', cat: 'ties', price: 490000, origin: 'IT', material: '100% silk', imgs: ['tie-1', 'tie-2'], sizes: Z(ONE, { ord: ONE }) },
  ];

  // Same shape the API returns (see api/catalog.js). `id` is the slug.
  OL.STATIC_PRODUCTS = RAW.map((r, i) => {
    const slug = slugify(`${r.brand} ${r.name} ${r.color}`);
    const total = r.sizes.reduce((n, z) => n + z.stock, 0);
    return {
      id: slug, slug, brand: r.brand, name: r.name, color: r.color, colorHex: r.hex, colorGroup: r.group,
      styleCode: r.style, sku: null, cat: r.cat, price: r.price, was: r.was || r.price,
      origin: r.origin || null, material: r.material || null, fit: r.fit || null, model: r.model || null, orderLead: null,
      images: r.imgs.map(UNSPLASH),
      tag: r.isNew ? 'new' : r.featured ? 'hot' : total > 0 && total <= 3 ? 'last' : null,
      isNew: !!r.isNew, featured: !!r.featured, sizes: r.sizes, tags: [], desc: null, order: i,
    };
  });

  OL.STATIC_SETTINGS = {
    home: { hero: {}, deal_ends: null },
    delivery: {
      methods: [
        { id: 'courier_tashkent', fee: 30000 },
        { id: 'regions', fee: 50000 },
        { id: 'pickup', fee: 0 },
      ],
      free_threshold: 1500000,
      stock_days: '1–3',
      order_days: '10–18',
      order_note: {},
    },
    // edited in admin later; empty values hide the matching buttons/links
    contacts: { phone: '', hours: '10:00–21:00', call_minutes: 15, telegram: '', telegram_bot: '', instagram: '' },
  };

  // Active catalog (replaced by live data from /api/catalog when available)
  OL.source = 'static';
  OL.setCatalog = (products, settings, source, categories) => {
    OL.PRODUCTS = products;
    OL.P = Object.fromEntries(products.map((p) => [p.id, p]));
    OL.SETTINGS = settings || {};
    OL.source = source;
    OL.CATEGORIES = (categories && categories.length ? categories : OL.STATIC_CATEGORIES).slice().sort((a, b) => a.sort - b.sort);
    OL.CAT = Object.fromEntries(OL.CATEGORIES.map((c) => [c.slug, c]));
    // brands that have products, the biggest first
    const n = {};
    products.forEach((p) => { n[p.brand] = (n[p.brand] || 0) + 1; });
    OL.BRANDS = Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b));
  };
  OL.setCatalog(OL.STATIC_PRODUCTS, OL.STATIC_SETTINGS, 'static');

  // contact details: live `contacts` setting over the defaults above
  OL.contacts = () => ({ ...OL.STATIC_SETTINGS.contacts, ...((OL.SETTINGS && OL.SETTINGS.contacts) || {}) });

  // delivery times and the note about ordering from abroad (live `delivery` setting over the defaults)
  OL.deliveryInfo = () => ({ ...OL.STATIC_SETTINGS.delivery, ...((OL.SETTINGS && OL.SETTINGS.delivery) || {}) });

  OL.off = (p) => (p.was && p.was > p.price ? Math.round((1 - p.price / p.was) * 100) : 0);

  // a category's name in the current language (falls back to English, then the slug)
  OL.catName = (slug, lang) => {
    const c = OL.CAT && OL.CAT[slug];
    if (!c) return slug;
    return c.name[lang || (OL.state && OL.state.lang) || 'en'] || c.name.en || slug;
  };
  OL.catDept = (slug) => (OL.CAT && OL.CAT[slug] ? OL.CAT[slug].dept : null);

  // Home page lists, derived from product flags (set in the admin panel)
  OL.lists = () => {
    const all = OL.PRODUCTS;
    const fill = (picked, want) => {
      const out = picked.slice(0, want);
      for (const p of all) {
        if (out.length >= Math.min(want, all.length)) break;
        if (!out.includes(p)) out.push(p);
      }
      return out;
    };
    return {
      drops: fill(all.filter((p) => p.isNew), 6),
      best: fill(all.filter((p) => p.featured), 8),
    };
  };
  OL.hero = () => {
    const cfg = (OL.SETTINGS.home && OL.SETTINGS.home.hero) || {};
    const product = OL.P[cfg.product] || OL.PRODUCTS[0] || null;
    return { product, image: cfg.image || (product && product.images[0]) || '' };
  };
  // number of products per category and per department
  OL.counts = () => {
    const c = { dept: { clothing: 0, shoes: 0, accessories: 0 }, cat: {} };
    for (const p of OL.PRODUCTS) {
      c.cat[p.cat] = (c.cat[p.cat] || 0) + 1;
      const d = OL.catDept(p.cat);
      if (d) c.dept[d] += 1;
    }
    return c;
  };

  OL.I18N = {
    en: {
      currency: 'UZS',
      nav: { new: 'New arrivals', men: 'Men', women: 'Women', kids: 'Kids', deals: 'Outlet' },
      ui: {
        search: 'Search', close: 'Close', wishlist: 'Wishlist', soldOut: 'Sold out', menu: 'Menu',
        view: 'View', add: 'Add', added: 'Added', viewAll: 'View all', scroll: 'Scroll',
        models: 'models', off: 'off', fav: 'Save to wishlist', shopNow: 'Shop now',
      },
      search: {
        viewAll: 'View all {n} results', ph: 'Search sneakers, brands…', popular: 'Popular brands', recent: 'Recent searches', clear: 'Clear',
        none: 'Nothing found', noneText: 'Try another spelling or a brand name.', results: 'results',
      },
      wish: { title: 'Wishlist', empty: 'No saved sneakers yet', emptyText: 'Tap the heart on a pair you like — it will wait for you here.' },
      meta: {
        title: 'Outlet Lounge — Original sneakers at outlet prices',
        description: 'Original Nike, Jordan, New Balance and more at outlet prices. Delivery across Uzbekistan.',
      },
      crumbs: { home: 'Home', shop: 'Shop' },
      shop: {
        eyebrow: 'Collection',
        title: { all: 'All sneakers', new: 'New arrivals', sale: 'Outlet deals', men: 'Men’s sneakers', women: 'Women’s sneakers', kids: 'Kids’ sneakers' },
        models: 'models', filters: 'Filters', sort: 'Sort', clear: 'Clear all', show: 'Show {n} models',
        sortBy: { newest: 'Newest', 'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low', discount: 'Biggest discount', popular: 'Popular' },
        f: { cat: 'Category', gender: 'Gender', brand: 'Brand', size: 'Size (EU)', price: 'Price', off: 'Discount', stock: 'In stock only' },
        genders: { men: 'Men', women: 'Women', kids: 'Kids' },
        offFrom: 'from {n}%', anyOff: 'Any',
        more: 'Load more', shown: 'Showing {a} of {b}',
        emptyTitle: 'No sneakers match your filters', emptyText: 'Try removing a filter or two — there are plenty of pairs waiting.',
        query: 'Results for “{q}”', priceFrom: 'From', priceTo: 'To',
      },
      pd: {
        methods: { courier_tashkent: 'Courier in Tashkent', regions: 'Regions of Uzbekistan', pickup: 'Pickup' },
        free: 'Free', freeFrom: 'Free delivery on orders from {n}',
        sku: 'SKU', size: 'Size', chooseSize: 'Choose your size', chooseHint: 'Please choose a size first', sizeGuide: 'Size guide',
        add: 'Add to cart', soldOut: 'Sold out', onlyLeft: 'Only {n} left', inStock: 'In stock', save: 'You save',
        share: 'Share', copied: 'Link copied', allSold: 'This model is sold out right now',
        unit: { eu: 'EU', us: 'US', cm: 'cm' },
        description: 'Description', details: 'Details', delivery: 'Delivery & payment', returns: 'Returns & exchange', authentic: 'Authenticity',
        descDefault: 'Original {brand} {name}. Brand new, in the original box.',
        detailsList: ['100% original product', 'Brand new, in the original box', 'Inspected by our team before shipping'],
        deliveryText: 'Courier delivery in Tashkent and delivery across Uzbekistan. Pay by cash or card when you receive the order, or by transfer after the manager’s call.',
        returnsText: 'Unworn pairs with the box and tags can be exchanged. Write to us on Telegram or call — we will arrange it.',
        authText: 'Every pair comes from authorized channels and is checked by hand before it reaches you.',
        trust: ['100% original', 'Delivery across Uzbekistan', 'Exchange available'],
        related: 'You may also like', recent: 'Recently viewed', zoom: 'Zoom', prev: 'Previous', next: 'Next', close: 'Close',
      },
      sg: {
        title: 'Size guide',
        text: 'Stand on a sheet of paper, mark your longest toe and your heel, and measure the distance in centimetres. Choose the size whose “cm” is closest to your foot length — if you are between sizes, take the larger one.',
        note: 'Values are approximate and can differ slightly between brands.', cols: ['EU', 'US', 'UK', 'cm'],
      },
      wl: { title: 'Wishlist', browse: 'Browse sneakers', count: '{n} saved' },
      nf: { title: 'Page not found', text: 'The page may have moved, or the pair has sold out. Let’s get you back to the sneakers.', shop: 'Browse all sneakers', home: 'Back to home' },
      ct: { phone: 'Phone', hours: 'Working hours', address: 'Address', soon: 'Contact details will appear here soon.', help: 'Help' },
      mega: { cats: 'Categories', brands: 'Top brands', all: 'View all', featured: 'Featured' },
      cp: {
        title: 'Your cart', items: '{n} items', empty: 'Your cart is empty', emptyText: 'Find a pair you love — it will wait for you here.',
        browse: 'Browse sneakers', subtotal: 'Subtotal', discount: 'Discount', delivery: 'Delivery', deliveryNote: 'Calculated at checkout',
        total: 'Total', promo: 'Promo code', promoPh: 'Enter code', apply: 'Apply', applied: 'Code {code} applied', removePromo: 'Remove',
        promoBad: 'This code isn’t valid for your order', checkout: 'Checkout', continue: 'Continue shopping',
        freeFrom: 'Add {n} more for free delivery', freeDone: 'You get free delivery', size: 'Size', remove: 'Remove', save: 'You save',
        viewCart: 'View cart', free: 'Free',
        gone: '{name} (EU {size}) is no longer available in this quantity.',
      },
      ck: {
        title: 'Checkout', contact: 'Contact', name: 'Full name', phone: 'Phone', telegram: 'Telegram username (optional)',
        pref: 'How should we reach you?', prefCall: 'Call me', prefTg: 'Message on Telegram',
        delivery: 'Delivery', region: 'Region', regionPick: 'Select region', city: 'City / district', address: 'Street, house, apartment',
        landmark: 'Landmark (optional)', payment: 'Payment',
        pay: { cash: 'Cash on delivery', card_on_delivery: 'Card on delivery (terminal)', transfer: 'Transfer to card after the manager’s call' },
        comment: 'Comment (optional)', commentPh: 'Anything we should know?',
        consent: 'I agree to the terms of sale and the privacy policy', place: 'Place order', placing: 'Placing order…',
        summary: 'Your order', pickupNote: 'Pickup address will be confirmed by the manager.',
        regions: ['Tashkent city', 'Tashkent region', 'Andijan', 'Bukhara', 'Fergana', 'Jizzakh', 'Karakalpakstan', 'Kashkadarya', 'Khorezm', 'Namangan', 'Navoi', 'Samarkand', 'Syrdarya', 'Surkhandarya'],
      },
      err: {
        name: 'Please enter your name', phone: 'Enter a valid Uzbek number, e.g. +998 90 123 45 67', telegram: 'Username like @name',
        region: 'Choose a region', address: 'Please enter the street and house', consent: 'Please accept the terms to continue',
        tooMany: 'Too many attempts — please try again in a few minutes.', down: 'Ordering is temporarily unavailable. Please try again soon.',
        network: 'Network problem. Check your connection and try again.',
        stock: 'Sorry, {name} (EU {size}) has just sold out. Please update your cart.',
        gone: 'Sorry, {name} is no longer available.', promo: 'This promo code is not valid for your order.', generic: 'Something went wrong. Please try again.',
        viaTg: 'Or order through a manager in Telegram',
      },
      ok: {
        title: 'Thank you!', text: 'Your order is accepted. A manager will call you within {min} minutes (daily {hours}).', follow: 'Track in Telegram',
        number: 'Order number', total: 'Total', continue: 'Continue shopping', none: 'No recent order',
        noneText: 'Orders you place show up here right after checkout.', notified: 'Our managers have been notified.',
      },
      qb: {
        btn: 'Buy in 1 click', title: 'Quick order', text: 'Leave your phone — a manager will call to confirm size, address and payment.',
        name: 'Your name', phone: 'Phone', send: 'Order', sending: 'Sending…', doneTitle: 'Thank you!',
        doneText: 'We received your request. A manager will call you shortly.',
      },
      nt: {
        btn: 'Notify me when available', title: 'Tell me when it’s back', text: 'Leave your phone or Telegram — we’ll message you when this model returns.',
        phone: 'Phone', telegram: 'Telegram (optional)', send: 'Notify me', doneTitle: 'Done!', doneText: 'We’ll let you know as soon as it’s back.',
      },
      tag: { new: 'New', hot: 'Hot', last: 'Last pairs' },
      cat: { running: 'Running', lifestyle: 'Lifestyle', basketball: 'Basketball', men: 'Men', women: 'Women', kids: 'Kids' },
      f: {
        live: 'Drop live now', title: ['Step', 'into', 'flight'],
        lead: 'Fresh drops land every week. Catch them before they take off.',
        cta: 'Catch the drop', drops: 'New drops',
        dropsText: 'Six fresh pairs just touched down. Scroll through before they fly.',
        side: 'Keep scrolling', words: ['Original only', 'Outlet prices', 'New drops weekly', 'Fast delivery'],
        dealBig: 'Up to −60%',
      },
      sec: {
        newEyebrow: 'Just landed', new: 'New arrivals',
        catsEyebrow: 'Find your fit', cats: 'Shop by category',
        dealsEyebrow: 'Limited time', deals: 'Outlet deals',
        dealsText: 'Last sizes of iconic silhouettes at their lowest prices of the season.',
        bestEyebrow: 'Most loved', best: 'Best sellers',
        reviewsEyebrow: 'Reviews', reviews: 'Loved in the lounge',
      },
      cd: { d: 'days', h: 'hours', m: 'min', s: 'sec', ends: 'Ends in' },
      reviews: [
        { t: 'Got my Jordans in two days — original box, perfect condition and half the mall price.', n: 'Aziz R.', c: 'Tashkent' },
        { t: 'Feels like a boutique, but the prices are pure outlet. My new favourite sneaker store.', n: 'Malika T.', c: 'Samarkand' },
        { t: 'Helpful size advice and fast delivery. The Air Max fit perfectly.', n: 'Dmitriy K.', c: 'Tashkent' },
      ],
      news: {
        title: 'Join the lounge', text: 'Early access to drops and members-only prices. No spam — only heat.',
        ph: 'Your email', btn: 'Subscribe', ok: 'Welcome to the lounge ✦',
      },
      cart: {
        title: 'Your cart', empty: 'Your cart is empty', emptyText: 'Find a pair you love — it will wait for you here.',
        subtotal: 'Subtotal', save: 'You save', checkout: 'Checkout', note: 'Delivery calculated at checkout.',
        remove: 'Remove', size: 'Size', demo: 'Demo store — checkout comes later', added: 'Added to cart',
      },
      footer: {
        tagline: 'Original sneakers at outlet prices.', cart: 'Cart', inn: 'TIN', wish: 'Wishlist', ask: 'Ask a manager', hours: 'Daily {hours}', shop: 'Shop', help: 'Help', about: 'About',
        delivery: 'Delivery', returns: 'Returns', sizes: 'Size guide', contact: 'Contact',
        story: 'Our story', auth: 'Authenticity', stores: 'Stores',
        rights: 'All rights reserved.', currency: 'Prices in UZS', photos: 'Placeholder photos: Unsplash',
      },
      toast: { light: 'Light mode', dark: 'Dark mode' },
    },

    ru: {
      currency: 'сум',
      nav: { new: 'Новинки', men: 'Мужчинам', women: 'Женщинам', kids: 'Детям', deals: 'Аутлет' },
      ui: {
        search: 'Поиск', close: 'Закрыть', wishlist: 'Избранное', soldOut: 'Нет в наличии', menu: 'Меню',
        view: 'Смотреть', add: 'В корзину', added: 'Добавлено', viewAll: 'Смотреть все', scroll: 'Листайте',
        models: 'моделей', off: 'скидка', fav: 'В избранное', shopNow: 'Купить',
      },
      search: {
        viewAll: 'Показать все результаты ({n})', ph: 'Поиск кроссовок и брендов…', popular: 'Популярные бренды', recent: 'Недавние запросы', clear: 'Очистить',
        none: 'Ничего не найдено', noneText: 'Попробуйте другое написание или название бренда.', results: 'результатов',
      },
      wish: { title: 'Избранное', empty: 'Пока ничего не сохранено', emptyText: 'Нажмите на сердечко у понравившейся пары — она будет ждать вас здесь.' },
      meta: {
        title: 'Outlet Lounge — оригинальные кроссовки по ценам аутлета',
        description: 'Оригинальные Nike, Jordan, New Balance и другие бренды по ценам аутлета. Доставка по всему Узбекистану.',
      },
      crumbs: { home: 'Главная', shop: 'Магазин' },
      shop: {
        eyebrow: 'Коллекция',
        title: { all: 'Все кроссовки', new: 'Новинки', sale: 'Скидки аутлета', men: 'Мужские кроссовки', women: 'Женские кроссовки', kids: 'Детские кроссовки' },
        models: 'моделей', filters: 'Фильтры', sort: 'Сортировка', clear: 'Сбросить всё', show: 'Показать {n} моделей',
        sortBy: { newest: 'Сначала новые', 'price-asc': 'Цена: по возрастанию', 'price-desc': 'Цена: по убыванию', discount: 'Максимальная скидка', popular: 'Популярные' },
        f: { cat: 'Категория', gender: 'Пол', brand: 'Бренд', size: 'Размер (EU)', price: 'Цена', off: 'Скидка', stock: 'Только в наличии' },
        genders: { men: 'Мужское', women: 'Женское', kids: 'Детское' },
        offFrom: 'от {n}%', anyOff: 'Любая',
        more: 'Показать ещё', shown: 'Показано {a} из {b}',
        emptyTitle: 'Нет кроссовок по вашим фильтрам', emptyText: 'Попробуйте убрать один-два фильтра — пар в наличии много.',
        query: 'Результаты по запросу «{q}»', priceFrom: 'От', priceTo: 'До',
      },
      pd: {
        methods: { courier_tashkent: 'Курьер по Ташкенту', regions: 'Регионы Узбекистана', pickup: 'Самовывоз' },
        free: 'Бесплатно', freeFrom: 'Бесплатная доставка от {n}',
        sku: 'Артикул', size: 'Размер', chooseSize: 'Выберите размер', chooseHint: 'Сначала выберите размер', sizeGuide: 'Таблица размеров',
        add: 'В корзину', soldOut: 'Нет в наличии', onlyLeft: 'Осталось {n}', inStock: 'В наличии', save: 'Ваша выгода',
        share: 'Поделиться', copied: 'Ссылка скопирована', allSold: 'Эта модель сейчас закончилась',
        unit: { eu: 'EU', us: 'US', cm: 'см' },
        description: 'Описание', details: 'Детали', delivery: 'Доставка и оплата', returns: 'Возврат и обмен', authentic: 'Оригинальность',
        descDefault: 'Оригинальные {brand} {name}. Новая пара в оригинальной коробке.',
        detailsList: ['100% оригинальный товар', 'Новые, в оригинальной коробке', 'Проверены нашей командой перед отправкой'],
        deliveryText: 'Курьерская доставка по Ташкенту и доставка по всему Узбекистану. Оплата наличными или картой при получении либо переводом после звонка менеджера.',
        returnsText: 'Неношеные пары с коробкой и бирками можно обменять. Напишите нам в Telegram или позвоните — всё организуем.',
        authText: 'Каждая пара поставляется из официальных каналов и проверяется вручную перед отправкой.',
        trust: ['100% оригинал', 'Доставка по Узбекистану', 'Возможен обмен'],
        related: 'Вам также понравится', recent: 'Вы смотрели', zoom: 'Увеличить', prev: 'Назад', next: 'Вперёд', close: 'Закрыть',
      },
      sg: {
        title: 'Таблица размеров',
        text: 'Встаньте на лист бумаги, отметьте самый длинный палец и пятку и измерьте расстояние в сантиметрах. Выберите размер, у которого «см» ближе всего к длине вашей стопы — если вы между размерами, берите больший.',
        note: 'Значения приблизительные и могут немного отличаться у разных брендов.', cols: ['EU', 'US', 'UK', 'см'],
      },
      wl: { title: 'Избранное', browse: 'Смотреть кроссовки', count: 'Сохранено: {n}' },
      nf: { title: 'Страница не найдена', text: 'Возможно, страница переехала или пара уже раскуплена. Давайте вернёмся к кроссовкам.', shop: 'Все кроссовки', home: 'На главную' },
      ct: { phone: 'Телефон', hours: 'Часы работы', address: 'Адрес', soon: 'Контакты скоро появятся здесь.', help: 'Помощь' },
      mega: { cats: 'Категории', brands: 'Топ брендов', all: 'Смотреть все', featured: 'Выбор недели' },
      cp: {
        title: 'Корзина', items: 'Товаров: {n}', empty: 'Корзина пуста', emptyText: 'Найдите пару по душе — она будет ждать вас здесь.',
        browse: 'Смотреть кроссовки', subtotal: 'Сумма', discount: 'Скидка', delivery: 'Доставка', deliveryNote: 'Рассчитывается при оформлении',
        total: 'Итого', promo: 'Промокод', promoPh: 'Введите код', apply: 'Применить', applied: 'Код {code} применён', removePromo: 'Убрать',
        promoBad: 'Этот код не подходит для вашего заказа', checkout: 'Оформить заказ', continue: 'Продолжить покупки',
        freeFrom: 'Добавьте ещё на {n} для бесплатной доставки', freeDone: 'Доставка бесплатная', size: 'Размер', remove: 'Удалить', save: 'Ваша выгода',
        viewCart: 'Открыть корзину', free: 'Бесплатно',
        gone: '{name} (EU {size}) недоступны в таком количестве.',
      },
      ck: {
        title: 'Оформление заказа', contact: 'Контакты', name: 'Имя и фамилия', phone: 'Телефон', telegram: 'Telegram (необязательно)',
        pref: 'Как с вами связаться?', prefCall: 'Позвонить', prefTg: 'Написать в Telegram',
        delivery: 'Доставка', region: 'Регион', regionPick: 'Выберите регион', city: 'Город / район', address: 'Улица, дом, квартира',
        landmark: 'Ориентир (необязательно)', payment: 'Оплата',
        pay: { cash: 'Наличными при получении', card_on_delivery: 'Картой при получении (терминал)', transfer: 'Переводом на карту после звонка менеджера' },
        comment: 'Комментарий (необязательно)', commentPh: 'Что нам важно знать?',
        consent: 'Я согласен(на) с условиями продажи и политикой конфиденциальности', place: 'Оформить заказ', placing: 'Оформляем…',
        summary: 'Ваш заказ', pickupNote: 'Адрес самовывоза уточнит менеджер.',
        regions: ['Ташкент (город)', 'Ташкентская область', 'Андижан', 'Бухара', 'Фергана', 'Джизак', 'Каракалпакстан', 'Кашкадарья', 'Хорезм', 'Наманган', 'Навои', 'Самарканд', 'Сырдарья', 'Сурхандарья'],
      },
      err: {
        name: 'Введите ваше имя', phone: 'Введите узбекский номер, например +998 90 123 45 67', telegram: 'Имя пользователя вида @name',
        region: 'Выберите регион', address: 'Укажите улицу и дом', consent: 'Подтвердите согласие, чтобы продолжить',
        tooMany: 'Слишком много попыток — повторите через несколько минут.', down: 'Оформление заказа временно недоступно. Попробуйте позже.',
        network: 'Проблема с сетью. Проверьте соединение и повторите.',
        stock: 'К сожалению, {name} (EU {size}) только что раскупили. Обновите корзину.',
        gone: 'К сожалению, {name} больше недоступны.', promo: 'Этот промокод не подходит для вашего заказа.', generic: 'Что-то пошло не так. Попробуйте ещё раз.',
        viaTg: 'Или оформите заказ у менеджера в Telegram',
      },
      ok: {
        title: 'Спасибо за заказ!', text: 'Ваш заказ принят. Менеджер позвонит вам в течение {min} минут (ежедневно {hours}).', follow: 'Отследить в Telegram',
        number: 'Номер заказа', total: 'Итого', continue: 'Продолжить покупки', none: 'Недавних заказов нет',
        noneText: 'Оформленные заказы появятся здесь сразу после покупки.', notified: 'Наши менеджеры уже уведомлены.',
      },
      qb: {
        btn: 'Купить в 1 клик', title: 'Быстрый заказ', text: 'Оставьте телефон — менеджер позвонит, чтобы уточнить размер, адрес и оплату.',
        name: 'Ваше имя', phone: 'Телефон', send: 'Заказать', sending: 'Отправляем…', doneTitle: 'Спасибо!',
        doneText: 'Мы получили вашу заявку. Менеджер скоро позвонит.',
      },
      nt: {
        btn: 'Сообщить о поступлении', title: 'Сообщим, когда вернётся', text: 'Оставьте телефон или Telegram — мы напишем, когда модель снова появится.',
        phone: 'Телефон', telegram: 'Telegram (необязательно)', send: 'Сообщить мне', doneTitle: 'Готово!', doneText: 'Сообщим сразу, как только модель вернётся.',
      },
      tag: { new: 'Новинка', hot: 'Хит', last: 'Последние пары' },
      cat: { running: 'Бег', lifestyle: 'Повседневные', basketball: 'Баскетбол', men: 'Мужчинам', women: 'Женщинам', kids: 'Детям' },
      f: {
        live: 'Релиз уже в продаже', title: ['Шаг', 'в', 'полёт'],
        lead: 'Новые релизы каждую неделю. Успейте, пока они не улетели.',
        cta: 'Поймать релиз', drops: 'Новые релизы',
        dropsText: 'Шесть свежих пар только что приземлились. Листайте, пока они не улетели.',
        side: 'Листайте дальше', words: ['Только оригинал', 'Цены аутлета', 'Новинки каждую неделю', 'Быстрая доставка'],
        dealBig: 'До −60%',
      },
      sec: {
        newEyebrow: 'Только что прибыли', new: 'Новинки',
        catsEyebrow: 'Найдите свою пару', cats: 'Категории',
        dealsEyebrow: 'Ограниченное время', deals: 'Скидки аутлета',
        dealsText: 'Последние размеры культовых моделей по самым низким ценам сезона.',
        bestEyebrow: 'Любимое', best: 'Хиты продаж',
        reviewsEyebrow: 'Отзывы', reviews: 'Нас любят',
      },
      cd: { d: 'дней', h: 'часов', m: 'мин', s: 'сек', ends: 'До конца' },
      reviews: [
        { t: 'Джорданы пришли за два дня — оригинальная коробка, идеальное состояние и полцены от ТЦ.', n: 'Азиз Р.', c: 'Ташкент' },
        { t: 'Ощущение бутика, а цены — настоящий аутлет. Теперь мой любимый магазин кроссовок.', n: 'Малика Т.', c: 'Самарканд' },
        { t: 'Помогли с размером и быстро доставили. Air Max сели идеально.', n: 'Дмитрий К.', c: 'Ташкент' },
      ],
      news: {
        title: 'Вступайте в лаунж', text: 'Ранний доступ к релизам и цены для своих. Без спама — только огонь.',
        ph: 'Ваш email', btn: 'Подписаться', ok: 'Добро пожаловать в лаунж ✦',
      },
      cart: {
        title: 'Корзина', empty: 'Корзина пуста', emptyText: 'Найдите пару по душе — она будет ждать вас здесь.',
        subtotal: 'Итого', save: 'Ваша выгода', checkout: 'Оформить заказ', note: 'Доставка рассчитывается при оформлении.',
        remove: 'Удалить', size: 'Размер', demo: 'Демо-магазин — оформление появится позже', added: 'Добавлено в корзину',
      },
      footer: {
        tagline: 'Оригинальные кроссовки по ценам аутлета.', cart: 'Корзина', inn: 'ИНН', wish: 'Избранное', ask: 'Спросить менеджера', hours: 'Ежедневно {hours}', shop: 'Магазин', help: 'Помощь', about: 'О нас',
        delivery: 'Доставка', returns: 'Возврат', sizes: 'Таблица размеров', contact: 'Контакты',
        story: 'Наша история', auth: 'Оригинальность', stores: 'Магазины',
        rights: 'Все права защищены.', currency: 'Цены в сумах', photos: 'Временные фото: Unsplash',
      },
      toast: { light: 'Светлая тема', dark: 'Тёмная тема' },
    },

    uz: {
      currency: 'soʻm',
      nav: { new: 'Yangi kelganlar', men: 'Erkaklar', women: 'Ayollar', kids: 'Bolalar', deals: 'Autlet' },
      ui: {
        search: 'Qidiruv', close: 'Yopish', wishlist: 'Sevimlilar', soldOut: 'Qolmagan', menu: 'Menyu',
        view: 'Koʻrish', add: 'Savatga', added: 'Qoʻshildi', viewAll: 'Barchasi', scroll: 'Pastga',
        models: 'model', off: 'chegirma', fav: 'Sevimlilarga', shopNow: 'Xarid qilish',
      },
      search: {
        viewAll: 'Barcha natijalar ({n})', ph: 'Krossovka va brendlarni qidiring…', popular: 'Mashhur brendlar', recent: 'Oxirgi qidiruvlar', clear: 'Tozalash',
        none: 'Hech narsa topilmadi', noneText: 'Boshqacha yozib koʻring yoki brend nomini kiriting.', results: 'natija',
      },
      wish: { title: 'Sevimlilar', empty: 'Hali hech narsa saqlanmagan', emptyText: 'Yoqqan juftdagi yurakchani bosing — u sizni shu yerda kutadi.' },
      meta: {
        title: 'Outlet Lounge — autlet narxlaridagi original krossovkalar',
        description: 'Nike, Jordan, New Balance va boshqa brendlarning original krossovkalari autlet narxlarida. Oʻzbekiston boʻylab yetkazib berish.',
      },
      crumbs: { home: 'Bosh sahifa', shop: 'Doʻkon' },
      shop: {
        eyebrow: 'Kolleksiya',
        title: { all: 'Barcha krossovkalar', new: 'Yangi kelganlar', sale: 'Autlet chegirmalari', men: 'Erkaklar krossovkalari', women: 'Ayollar krossovkalari', kids: 'Bolalar krossovkalari' },
        models: 'model', filters: 'Filtrlar', sort: 'Saralash', clear: 'Hammasini tozalash', show: '{n} ta modelni koʻrsatish',
        sortBy: { newest: 'Yangilari', 'price-asc': 'Narx: arzonidan', 'price-desc': 'Narx: qimmatidan', discount: 'Eng katta chegirma', popular: 'Mashhurlari' },
        f: { cat: 'Kategoriya', gender: 'Jins', brand: 'Brend', size: 'Oʻlcham (EU)', price: 'Narx', off: 'Chegirma', stock: 'Faqat mavjudlari' },
        genders: { men: 'Erkaklar', women: 'Ayollar', kids: 'Bolalar' },
        offFrom: '{n}% dan', anyOff: 'Istalgan',
        more: 'Yana koʻrsatish', shown: '{b} tadan {a} tasi koʻrsatilgan',
        emptyTitle: 'Filtrlarga mos krossovka topilmadi', emptyText: 'Bir-ikkita filtrni olib tashlab koʻring — juftlar koʻp.',
        query: '“{q}” boʻyicha natijalar', priceFrom: 'Dan', priceTo: 'Gacha',
      },
      pd: {
        methods: { courier_tashkent: 'Toshkent boʻylab kuryer', regions: 'Oʻzbekiston viloyatlari', pickup: 'Olib ketish' },
        free: 'Bepul', freeFrom: '{n} dan boshlab bepul yetkazish',
        sku: 'Artikul', size: 'Oʻlcham', chooseSize: 'Oʻlchamni tanlang', chooseHint: 'Avval oʻlchamni tanlang', sizeGuide: 'Oʻlchamlar jadvali',
        add: 'Savatga', soldOut: 'Qolmagan', onlyLeft: 'Atigi {n} ta qoldi', inStock: 'Mavjud', save: 'Tejaysiz',
        share: 'Ulashish', copied: 'Havola nusxalandi', allSold: 'Bu model hozir tugagan',
        unit: { eu: 'EU', us: 'US', cm: 'sm' },
        description: 'Tavsif', details: 'Tafsilotlar', delivery: 'Yetkazib berish va toʻlov', returns: 'Qaytarish va almashtirish', authentic: 'Originallik',
        descDefault: 'Original {brand} {name}. Yangi juft, original qutisida.',
        detailsList: ['100% original mahsulot', 'Yangi, original qutisida', 'Joʻnatishdan oldin jamoamiz tekshirgan'],
        deliveryText: 'Toshkent boʻylab kuryer orqali va butun Oʻzbekiston boʻylab yetkazib berish. Naqd yoki karta orqali qabul qilganda yoki menejer qoʻngʻirogʻidan soʻng oʻtkazma orqali toʻlang.',
        returnsText: 'Kiyilmagan, qutisi va yorligʻi bor juftlarni almashtirish mumkin. Telegram orqali yozing yoki qoʻngʻiroq qiling.',
        authText: 'Har bir juft rasmiy kanallardan keladi va sizga yetib borishidan oldin qoʻlda tekshiriladi.',
        trust: ['100% original', 'Oʻzbekiston boʻylab yetkazish', 'Almashtirish mumkin'],
        related: 'Sizga yoqishi mumkin', recent: 'Koʻrib chiqqanlaringiz', zoom: 'Kattalashtirish', prev: 'Oldingi', next: 'Keyingi', close: 'Yopish',
      },
      sg: {
        title: 'Oʻlchamlar jadvali',
        text: 'Qogʻoz varagʻiga turing, eng uzun barmoq va tovoningizni belgilang va masofani santimetrda oʻlchang. “sm” oyoq uzunligingizga eng yaqin oʻlchamni tanlang — agar ikki oʻlcham orasida boʻlsangiz, kattasini oling.',
        note: 'Qiymatlar taxminiy boʻlib, brendlar oʻrtasida biroz farq qilishi mumkin.', cols: ['EU', 'US', 'UK', 'sm'],
      },
      wl: { title: 'Sevimlilar', browse: 'Krossovkalarni koʻrish', count: 'Saqlangan: {n}' },
      nf: { title: 'Sahifa topilmadi', text: 'Sahifa koʻchirilgan yoki juft sotib boʻlingan boʻlishi mumkin. Keling, krossovkalarga qaytamiz.', shop: 'Barcha krossovkalar', home: 'Bosh sahifaga' },
      ct: { phone: 'Telefon', hours: 'Ish vaqti', address: 'Manzil', soon: 'Aloqa maʼlumotlari tez orada shu yerda paydo boʻladi.', help: 'Yordam' },
      mega: { cats: 'Kategoriyalar', brands: 'Top brendlar', all: 'Barchasini koʻrish', featured: 'Tanlangan' },
      cp: {
        title: 'Savat', items: 'Mahsulotlar: {n}', empty: 'Savat boʻsh', emptyText: 'Yoqqan juftni toping — u sizni shu yerda kutadi.',
        browse: 'Krossovkalarni koʻrish', subtotal: 'Summa', discount: 'Chegirma', delivery: 'Yetkazib berish', deliveryNote: 'Buyurtma paytida hisoblanadi',
        total: 'Jami', promo: 'Promokod', promoPh: 'Kodni kiriting', apply: 'Qoʻllash', applied: '{code} kodi qoʻllandi', removePromo: 'Olib tashlash',
        promoBad: 'Bu kod buyurtmangiz uchun yaroqsiz', checkout: 'Buyurtma berish', continue: 'Xaridni davom ettirish',
        freeFrom: 'Bepul yetkazish uchun yana {n} qoʻshing', freeDone: 'Yetkazib berish bepul', size: 'Oʻlcham', remove: 'Oʻchirish', save: 'Tejaysiz',
        viewCart: 'Savatni ochish', free: 'Bepul',
        gone: '{name} (EU {size}) bu miqdorda mavjud emas.',
      },
      ck: {
        title: 'Buyurtmani rasmiylashtirish', contact: 'Aloqa', name: 'Ism va familiya', phone: 'Telefon', telegram: 'Telegram (ixtiyoriy)',
        pref: 'Siz bilan qanday bogʻlanaylik?', prefCall: 'Qoʻngʻiroq qiling', prefTg: 'Telegramga yozing',
        delivery: 'Yetkazib berish', region: 'Viloyat', regionPick: 'Viloyatni tanlang', city: 'Shahar / tuman', address: 'Koʻcha, uy, xonadon',
        landmark: 'Moʻljal (ixtiyoriy)', payment: 'Toʻlov',
        pay: { cash: 'Qabul qilganda naqd', card_on_delivery: 'Qabul qilganda karta orqali (terminal)', transfer: 'Menejer qoʻngʻirogʻidan soʻng kartaga oʻtkazma' },
        comment: 'Izoh (ixtiyoriy)', commentPh: 'Bilishimiz kerak boʻlgan narsa bormi?',
        consent: 'Sotuv shartlari va maxfiylik siyosatiga roziman', place: 'Buyurtma berish', placing: 'Rasmiylashtirilmoqda…',
        summary: 'Buyurtmangiz', pickupNote: 'Olib ketish manzilini menejer aniqlashtiradi.',
        regions: ['Toshkent shahri', 'Toshkent viloyati', 'Andijon', 'Buxoro', 'Fargʻona', 'Jizzax', 'Qoraqalpogʻiston', 'Qashqadaryo', 'Xorazm', 'Namangan', 'Navoiy', 'Samarqand', 'Sirdaryo', 'Surxondaryo'],
      },
      err: {
        name: 'Ismingizni kiriting', phone: 'Oʻzbekiston raqamini kiriting, masalan +998 90 123 45 67', telegram: '@name koʻrinishidagi nom',
        region: 'Viloyatni tanlang', address: 'Koʻcha va uyni kiriting', consent: 'Davom etish uchun rozilikni tasdiqlang',
        tooMany: 'Urinishlar juda koʻp — bir necha daqiqadan soʻng qayta urinib koʻring.', down: 'Buyurtma berish vaqtincha mavjud emas. Keyinroq urinib koʻring.',
        network: 'Tarmoq muammosi. Ulanishni tekshirib, qayta urinib koʻring.',
        stock: 'Afsuski, {name} (EU {size}) hozirgina sotilib ketdi. Savatni yangilang.',
        gone: 'Afsuski, {name} endi mavjud emas.', promo: 'Bu promokod buyurtmangiz uchun yaroqsiz.', generic: 'Xatolik yuz berdi. Qayta urinib koʻring.',
        viaTg: 'Yoki buyurtmani Telegram orqali menejerga bering',
      },
      ok: {
        title: 'Rahmat!', text: 'Buyurtmangiz qabul qilindi. Menejer {min} daqiqa ichida qoʻngʻiroq qiladi (har kuni {hours}).', follow: 'Telegram orqali kuzatish',
        number: 'Buyurtma raqami', total: 'Jami', continue: 'Xaridni davom ettirish', none: 'Yaqinda buyurtma yoʻq',
        noneText: 'Rasmiylashtirgan buyurtmalaringiz xariddan soʻng shu yerda koʻrinadi.', notified: 'Menejerlarimiz xabardor qilindi.',
      },
      qb: {
        btn: '1 bosishda xarid', title: 'Tezkor buyurtma', text: 'Telefoningizni qoldiring — menejer oʻlcham, manzil va toʻlovni aniqlashtirish uchun qoʻngʻiroq qiladi.',
        name: 'Ismingiz', phone: 'Telefon', send: 'Buyurtma berish', sending: 'Yuborilmoqda…', doneTitle: 'Rahmat!',
        doneText: 'Soʻrovingizni oldik. Menejer tez orada qoʻngʻiroq qiladi.',
      },
      nt: {
        btn: 'Kelganda xabar bering', title: 'Qaytganda xabar beramiz', text: 'Telefon yoki Telegramingizni qoldiring — model qaytganda yozamiz.',
        phone: 'Telefon', telegram: 'Telegram (ixtiyoriy)', send: 'Xabar bering', doneTitle: 'Tayyor!', doneText: 'Model qaytishi bilanoq xabar beramiz.',
      },
      tag: { new: 'Yangi', hot: 'Xit', last: 'Oxirgi juftlar' },
      cat: { running: 'Yugurish', lifestyle: 'Kundalik', basketball: 'Basketbol', men: 'Erkaklar', women: 'Ayollar', kids: 'Bolalar' },
      f: {
        live: 'Yangi drop sotuvda', title: ['Parvoz', 'sari', 'qadam'],
        lead: 'Har hafta yangi modellar keladi. Ular uchib ketmasidan oldin ulguring.',
        cta: 'Dropni tutish', drops: 'Yangi droplar',
        dropsText: 'Oltita yangi juft hozirgina qoʻndi. Uchib ketmasidan oldin koʻrib chiqing.',
        side: 'Davom eting', words: ['Faqat original', 'Autlet narxlari', 'Har hafta yangiliklar', 'Tez yetkazib berish'],
        dealBig: '−60% gacha',
      },
      sec: {
        newEyebrow: 'Hozirgina keldi', new: 'Yangi kelganlar',
        catsEyebrow: 'Oʻzingiznikini toping', cats: 'Kategoriyalar',
        dealsEyebrow: 'Cheklangan vaqt', deals: 'Autlet chegirmalari',
        dealsText: 'Mashhur modellarning oxirgi oʻlchamlari — mavsumning eng past narxlarida.',
        bestEyebrow: 'Eng sevimli', best: 'Koʻp sotilganlar',
        reviewsEyebrow: 'Sharhlar', reviews: 'Mijozlarimiz fikri',
      },
      cd: { d: 'kun', h: 'soat', m: 'daq', s: 'son', ends: 'Tugashiga' },
      reviews: [
        { t: 'Jordanlar ikki kunda keldi — original quti, mukammal holat va savdo markazidan ikki baravar arzon.', n: 'Aziz R.', c: 'Toshkent' },
        { t: 'Butikdek his, narxlari esa haqiqiy autlet. Endi sevimli krossovka doʻkonim.', n: 'Malika T.', c: 'Samarqand' },
        { t: 'Oʻlcham tanlashda yordam berishdi, tez yetkazishdi. Air Max juda mos keldi.', n: 'Dmitriy K.', c: 'Toshkent' },
      ],
      news: {
        title: 'Lounge safiga qoʻshiling', text: 'Droplarga erta kirish va aʼzolar uchun maxsus narxlar. Spamsiz.',
        ph: 'Email manzilingiz', btn: 'Obuna boʻlish', ok: 'Lounge oilasiga xush kelibsiz ✦',
      },
      cart: {
        title: 'Savat', empty: 'Savat boʻsh', emptyText: 'Yoqqan juftni toping — u sizni shu yerda kutadi.',
        subtotal: 'Jami', save: 'Tejaysiz', checkout: 'Buyurtma berish', note: 'Yetkazib berish buyurtmada hisoblanadi.',
        remove: 'Oʻchirish', size: 'Oʻlcham', demo: 'Demo doʻkon — buyurtma keyinroq qoʻshiladi', added: 'Savatga qoʻshildi',
      },
      footer: {
        tagline: 'Original krossovkalar autlet narxlarida.', cart: 'Savat', inn: 'STIR', wish: 'Sevimlilar', ask: 'Menejerdan soʻrash', hours: 'Har kuni {hours}', shop: 'Doʻkon', help: 'Yordam', about: 'Biz haqimizda',
        delivery: 'Yetkazib berish', returns: 'Qaytarish', sizes: 'Oʻlchamlar jadvali', contact: 'Aloqa',
        story: 'Bizning tarix', auth: 'Originallik', stores: 'Doʻkonlar',
        rights: 'Barcha huquqlar himoyalangan.', currency: 'Narxlar soʻmda', photos: 'Vaqtinchalik rasmlar: Unsplash',
      },
      toast: { light: 'Yorugʻ rejim', dark: 'Qorongʻi rejim' },
    },
  };
})();
