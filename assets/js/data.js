/* Outlet Lounge — data: placeholder images, products and translations (EN / RU / UZ) */
(function () {
  const OL = (window.OL = window.OL || {});

  // Temporary Unsplash photos (swap for real product shots later)
  OL.IMG = [
    '1542291026-7eec264c27ff', // 0  red flyknit
    '1549298916-b41d501d3772', // 1  tan AF1
    '1600185365483-26d7a4cc7519', // 2  air max 1 sunset
    '1606107557195-0e29a4b5b4aa', // 3  volt trainer
    '1595950653106-6c9ebd614d3a', // 4  pastel AF1 shadow
    '1608231387042-66d1773070a5', // 5  white court on black
    '1460353581641-37baddab0fa2', // 6  grey on feet
    '1525966222134-fcfa99b8ae77', // 7  burgundy skate
    '1514989940723-e8e51635b782', // 8  air max 90 on feet
    '1491553895911-0055eca6402d', // 9  black floating shoe
    '1600269452121-4f2416e55c28', // 10 white AF1
    '1597045566677-8cf032ed6634', // 11 AJ1 mid
    '1556906781-9a412961c28c', // 12 AJ1 low lifestyle
    '1552346154-21d32810aba3', // 13 AJ1 pair
    '1584735175315-9d5df23860e6', // 14 dunk high coral
    '1605348532760-6753d2c43329', // 15 black basketball
    '1579338559194-a162d19bf842', // 16 AF1 on court
    '1543508282-6319a3e2621f', // 17 black AF1 studio
    '1512374382149-233c42b6a83b', // 18 white high tops
    '1539185441755-769473a23570', // 19 NB olive
    '1515955656352-a1fa3ffcd111', // 20 air max hyper blue
    '1600185365926-3a2ce3cdb9eb', // 21 air max 1 alt
    '1603808033192-082d6919d3e1', // 22 tan court
    '1595341888016-a392ef81b7de', // 23 chunky runner
    '1607522370275-f14206abe5d3', // 24 red hi-top
    '1588361861040-ac9b1018f6d5', // 25 grey pair on black
    '1551107696-a4b0c5a0d9a2', // 26 NB pink
    '1562183241-b937e95585b6', // 27 shoe tossed in air
    '1520256862855-398228c41684', // 28 blue runner
    '1604671801908-6f0c6a092c05', // 29 iridescent knit
    '1575537302964-96cd47c06b1b', // 30 AJ12 red
    '1622760807800-66cf1466fc08', // 31 white on linen
    '1612902376491-7a8a99b424e8', // 32 sneaker pile
    '1556048219-bb6978360b84', // 33 canvas pair
    '1465453869711-7e174808ace9', // 34 NB 574 white
    '1511556532299-8f662fc26c06', // 35 air max pink
  ];

  const UNSPLASH = (i) => `https://images.unsplash.com/photo-${OL.IMG[i]}`;

  // Resize helper: placeholder (Unsplash) photos are resized on the fly;
  // uploaded product photos are served exactly as stored.
  OL.pimg = (url, w = 800, h) => {
    if (!url) return '';
    if (url.includes('images.unsplash.com')) {
      return `${url.split('?')[0]}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=80`;
    }
    return url;
  };
  OL.img = (i, w = 800, h) => OL.pimg(UNSPLASH(i), w, h); // category / hero placeholders

  // ----------------------------------------------------------------------
  // Placeholder catalog. This is (a) the offline fallback when /api/catalog is
  // unavailable and (b) the source of supabase/seed.sql (see scripts/build-seed.mjs).
  // Once real products live in the database, turn the fallback off with
  // OL.CONFIG.staticFallback = false so placeholder prices are never shown.
  // ----------------------------------------------------------------------
  OL.CONFIG = { staticFallback: true };

  const S = (list, out = []) => list.map((s) => ({ s, ok: !out.includes(s), stock: out.includes(s) ? 0 : 3 }));
  const slugify = (str) =>
    str.toLowerCase().replace(/[“”"’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const NEW_IDS = ['p11', 'p3', 'p14', 'p16', 'p15', 'p9'];
  const FEATURED_IDS = ['p2', 'p4', 'p7', 'p10', 'p5', 'p12', 'p8', 'p18'];
  const GENDER = { p6: 'women', p16: 'women', p7: 'women', p17: 'kids' };

  // Prices in UZS (placeholder)
  const RAW = [
    { id: 'p1', brand: 'Nike', name: 'Air Max 1 “Sunset”', cat: 'running', price: 1390000, was: 2190000, img: 2, alt: 21, tag: 'new', sizes: S([40, 41, 42, 43, 44], [44]) },
    { id: 'p2', brand: 'Nike', name: 'Air Force 1 ’07 “Triple White”', cat: 'lifestyle', price: 1190000, was: 1790000, img: 10, alt: 31, tag: 'hot', sizes: S([39, 40, 41, 42, 43]) },
    { id: 'p3', brand: 'Jordan', name: 'Air Jordan 1 Mid “Chicago Toe”', cat: 'basketball', price: 1590000, was: 2490000, img: 11, alt: 13, tag: 'hot', sizes: S([40, 41, 42, 43, 44], [40]) },
    { id: 'p4', brand: 'Jordan', name: 'Air Jordan 1 Low “Shattered”', cat: 'basketball', price: 1490000, was: 2290000, img: 12, alt: 13, tag: null, sizes: S([40, 41, 42, 43, 44]) },
    { id: 'p5', brand: 'New Balance', name: '247 “Olive Suede”', cat: 'lifestyle', price: 990000, was: 1690000, img: 19, alt: 34, tag: null, sizes: S([40, 41, 42, 43, 44], [41]) },
    { id: 'p6', brand: 'New Balance', name: 'X-90 “Pink Haze”', cat: 'running', price: 890000, was: 1590000, img: 26, alt: 34, tag: 'new', sizes: S([36, 37, 38, 39, 40]) },
    { id: 'p7', brand: 'Converse', name: 'Chuck 70 Hi “Cherry”', cat: 'lifestyle', price: 690000, was: 1190000, img: 24, alt: 33, tag: null, sizes: S([37, 38, 39, 40, 41]) },
    { id: 'p8', brand: 'Vans', name: 'Old Skool “Burgundy”', cat: 'lifestyle', price: 590000, was: 990000, img: 7, alt: 33, tag: 'last', sizes: S([39, 40, 41, 42, 43], [39, 43]) },
    { id: 'p9', brand: 'Nike', name: 'Kyrie 7 “Onyx”', cat: 'basketball', price: 1290000, was: 2090000, img: 15, alt: 9, tag: null, sizes: S([41, 42, 43, 44, 45]) },
    { id: 'p10', brand: 'Nike', name: 'Air Force 1 React “Court”', cat: 'lifestyle', price: 1290000, was: 1990000, img: 16, alt: 17, tag: null, sizes: S([40, 41, 42, 43, 44]) },
    { id: 'p11', brand: 'Jordan', name: 'Air Jordan 12 Retro “Gym Red”', cat: 'basketball', price: 1890000, was: 2890000, img: 30, alt: 0, tag: 'new', sizes: S([41, 42, 43, 44, 45], [45]) },
    { id: 'p12', brand: 'Nike', name: 'Free RN Flyknit “Crimson”', cat: 'running', price: 990000, was: 1590000, img: 0, alt: 27, tag: null, sizes: S([39, 40, 41, 42, 43]) },
    { id: 'p13', brand: 'Nike', name: 'SuperRep Go “Volt”', cat: 'running', price: 790000, was: 1390000, img: 3, alt: 29, tag: 'last', sizes: S([40, 41, 42, 43, 44], [42]) },
    { id: 'p14', brand: 'Nike', name: 'Air Max 90 “Hyper Blue”', cat: 'running', price: 1190000, was: 1990000, img: 20, alt: 35, tag: 'new', sizes: S([39, 40, 41, 42, 43]) },
    { id: 'p15', brand: 'adidas', name: 'Prophere “Aqua Pulse”', cat: 'running', price: 990000, was: 1790000, img: 28, alt: 23, tag: 'new', sizes: S([40, 41, 42, 43, 44]) },
    { id: 'p16', brand: 'Nike', name: 'AF1 Shadow “Pastel”', cat: 'lifestyle', price: 1190000, was: 1890000, img: 4, alt: 35, tag: null, sizes: S([36, 37, 38, 39, 40], [36]) },
    { id: 'p17', brand: 'Puma', name: 'Court Classic “Pure White”', cat: 'lifestyle', price: 690000, was: 1090000, img: 5, alt: 31, tag: null, sizes: S([40, 41, 42, 43, 44]) },
    { id: 'p18', brand: 'Nike', name: 'Dunk High “Coral Cream”', cat: 'lifestyle', price: 1390000, was: 2190000, img: 14, alt: 18, tag: 'hot', sizes: S([39, 40, 41, 42, 43]) },
  ];

  // Same shape the API returns (see api/catalog.js). `id` is the slug.
  OL.STATIC_PRODUCTS = RAW.map((r) => {
    const slug = slugify(r.name);
    return {
      id: slug, slug, brand: r.brand, name: r.name, colorway: null, cat: r.cat,
      gender: GENDER[r.id] || 'unisex', price: r.price, was: r.was,
      images: [UNSPLASH(r.img), UNSPLASH(r.alt)], tag: r.tag,
      isNew: NEW_IDS.includes(r.id), featured: FEATURED_IDS.includes(r.id),
      sizes: r.sizes, tags: [], desc: null,
    };
  });

  OL.STATIC_SETTINGS = {
    home: { hero: { product: slugify('Kyrie 7 “Onyx”'), image: UNSPLASH(9) }, deal_ends: null },
    delivery: {
      methods: [
        { id: 'courier_tashkent', fee: 30000 },
        { id: 'regions', fee: 50000 },
        { id: 'pickup', fee: 0 },
      ],
      free_threshold: 1500000,
    },
    // edited in admin later; empty values hide the matching buttons/links
    contacts: { phone: '', hours: '10:00–21:00', call_minutes: 15, telegram: '', telegram_bot: '', instagram: '' },
  };

  // Active catalog (replaced by live data from /api/catalog when available)
  OL.source = 'static';
  OL.setCatalog = (products, settings, source) => {
    OL.PRODUCTS = products;
    OL.P = Object.fromEntries(products.map((p) => [p.id, p]));
    OL.SETTINGS = settings || {};
    OL.source = source;
  };
  OL.setCatalog(OL.STATIC_PRODUCTS, OL.STATIC_SETTINGS, 'static');

  // contact details: live `contacts` setting over the defaults above
  OL.contacts = () => ({ ...OL.STATIC_SETTINGS.contacts, ...((OL.SETTINGS && OL.SETTINGS.contacts) || {}) });

  OL.off = (p) => (p.was && p.was > p.price ? Math.round((1 - p.price / p.was) * 100) : 0);

  OL.BRANDS = ['Nike', 'Jordan', 'adidas', 'New Balance', 'Converse', 'Vans', 'Puma', 'Asics', 'Reebok', 'Saucony'];
  OL.CAT_IMG = { running: 27, lifestyle: 8, basketball: 16, men: 6, women: 4, kids: 34 };

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
  OL.counts = () => {
    const c = { running: 0, lifestyle: 0, basketball: 0, men: 0, women: 0, kids: 0 };
    for (const p of OL.PRODUCTS) {
      if (p.cat in c) c[p.cat] += 1;
      if (p.gender === 'men' || p.gender === 'unisex') c.men += 1;
      if (p.gender === 'women' || p.gender === 'unisex') c.women += 1;
      if (p.gender === 'kids') c.kids += 1;
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
        tagline: 'Original sneakers at outlet prices.', cart: 'Cart', wish: 'Wishlist', ask: 'Ask a manager', hours: 'Daily {hours}', shop: 'Shop', help: 'Help', about: 'About',
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
        tagline: 'Оригинальные кроссовки по ценам аутлета.', cart: 'Корзина', wish: 'Избранное', ask: 'Спросить менеджера', hours: 'Ежедневно {hours}', shop: 'Магазин', help: 'Помощь', about: 'О нас',
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
        tagline: 'Original krossovkalar autlet narxlarida.', cart: 'Savat', wish: 'Sevimlilar', ask: 'Menejerdan soʻrash', hours: 'Har kuni {hours}', shop: 'Doʻkon', help: 'Yordam', about: 'Biz haqimizda',
        delivery: 'Yetkazib berish', returns: 'Qaytarish', sizes: 'Oʻlchamlar jadvali', contact: 'Aloqa',
        story: 'Bizning tarix', auth: 'Originallik', stores: 'Doʻkonlar',
        rights: 'Barcha huquqlar himoyalangan.', currency: 'Narxlar soʻmda', photos: 'Vaqtinchalik rasmlar: Unsplash',
      },
      toast: { light: 'Yorugʻ rejim', dark: 'Qorongʻi rejim' },
    },
  };
})();
