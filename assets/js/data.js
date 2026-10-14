/* Outlet Lounge — data: placeholder images, categories and catalog (the texts are in i18n.js) */
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

  // Size-guide tables (approximate, men's). Columns match `sg.sys.<system>.cols` in i18n.js.
  const LET = [['XS', '44', '84–88', '70–74'], ['S', '46', '88–92', '74–78'], ['M', '48', '92–96', '78–82'], ['L', '50', '96–100', '82–86'],
    ['XL', '52', '100–104', '86–90'], ['XXL', '54', '104–108', '90–94'], ['3XL', '56', '108–112', '94–98'], ['4XL', '58', '112–116', '98–102']];
  OL.SIZE_CHARTS = {
    letter: LET,
    ru: [...LET.map((r) => [r[1], r[0], r[2], r[3]]), ['60', '5XL', '116–120', '102–106'], ['62', '6XL', '120–124', '106–110']],
    waist: [['28', '71', '28'], ['29', '74', '29'], ['30', '76', '30'], ['31', '79', '31'], ['32', '81', '32'], ['33', '84', '33'],
      ['34', '86', '34'], ['36', '91', '36'], ['38', '97', '38'], ['40', '102', '40']],
    shoes: [['38', '5.5', '5', '24'], ['39', '6', '5.5', '24.5'], ['40', '7', '6', '25'], ['41', '8', '7', '26'], ['42', '8.5', '7.5', '26.5'],
      ['43', '9.5', '8.5', '27.5'], ['44', '10', '9', '28'], ['45', '11', '10', '29'], ['46', '12', '11', '30'], ['47', '13', '12', '31']],
    belt: [['85', '75–80'], ['90', '80–85'], ['95', '85–90'], ['100', '90–95'], ['105', '95–100'], ['110', '100–105'], ['115', '105–110']],
    one: [],
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
})();
