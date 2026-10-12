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

  OL.img = (i, w = 800, h) =>
    `https://images.unsplash.com/photo-${OL.IMG[i]}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=80`;

  const S = (list, out = []) => list.map((s) => ({ s, ok: !out.includes(s) }));

  // Prices in UZS (placeholder)
  const products = [
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
  OL.P = Object.fromEntries(products.map((p) => [p.id, p]));
  OL.PRODUCTS = products;
  OL.off = (p) => Math.round((1 - p.price / p.was) * 100);

  OL.BRANDS = ['Nike', 'Jordan', 'adidas', 'New Balance', 'Converse', 'Vans', 'Puma', 'Asics', 'Reebok', 'Saucony'];
  OL.CAT_IMG = { running: 27, lifestyle: 8, basketball: 16, men: 6, women: 4, kids: 34 };
  OL.CAT_COUNT = { running: 48, lifestyle: 86, basketball: 37, men: 124, women: 92, kids: 41 };

  OL.LISTS = {
    drops: ['p11', 'p3', 'p14', 'p16', 'p15', 'p9'],
    best: ['p2', 'p4', 'p7', 'p10', 'p5', 'p12', 'p8', 'p18'],
  };

  OL.I18N = {
    en: {
      currency: 'UZS',
      nav: { new: 'New arrivals', men: 'Men', women: 'Women', kids: 'Kids', deals: 'Outlet' },
      ui: {
        view: 'View', add: 'Add', added: 'Added', viewAll: 'View all', scroll: 'Scroll',
        models: 'models', off: 'off', fav: 'Save to wishlist', shopNow: 'Shop now',
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
        tagline: 'Original sneakers at outlet prices.', shop: 'Shop', help: 'Help', about: 'About',
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
        view: 'Смотреть', add: 'В корзину', added: 'Добавлено', viewAll: 'Смотреть все', scroll: 'Листайте',
        models: 'моделей', off: 'скидка', fav: 'В избранное', shopNow: 'Купить',
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
        tagline: 'Оригинальные кроссовки по ценам аутлета.', shop: 'Магазин', help: 'Помощь', about: 'О нас',
        delivery: 'Доставка', returns: 'Возврат', sizes: 'Таблица размеров', contact: 'Контакты',
        story: 'Наша история', auth: 'Оригинальность', stores: 'Магазины',
        rights: 'Все права защищены.', currency: 'Цены в сумах', photos: 'Временные фото: Unsplash',
      },
      toast: { light: 'Светлая тема', dark: 'Тёмная тема' },
    },

    uz: {
      currency: 'so‘m',
      nav: { new: 'Yangi kelganlar', men: 'Erkaklar', women: 'Ayollar', kids: 'Bolalar', deals: 'Autlet' },
      ui: {
        view: 'Ko‘rish', add: 'Savatga', added: 'Qo‘shildi', viewAll: 'Barchasi', scroll: 'Pastga',
        models: 'model', off: 'chegirma', fav: 'Sevimlilarga', shopNow: 'Xarid qilish',
      },
      tag: { new: 'Yangi', hot: 'Xit', last: 'Oxirgi juftlar' },
      cat: { running: 'Yugurish', lifestyle: 'Kundalik', basketball: 'Basketbol', men: 'Erkaklar', women: 'Ayollar', kids: 'Bolalar' },
      f: {
        live: 'Yangi drop sotuvda', title: ['Parvoz', 'sari', 'qadam'],
        lead: 'Har hafta yangi modellar keladi. Ular uchib ketmasidan oldin ulguring.',
        cta: 'Dropni tutish', drops: 'Yangi droplar',
        dropsText: 'Oltita yangi juft hozirgina qo‘ndi. Uchib ketmasidan oldin ko‘rib chiqing.',
        side: 'Davom eting', words: ['Faqat original', 'Autlet narxlari', 'Har hafta yangiliklar', 'Tez yetkazib berish'],
        dealBig: '−60% gacha',
      },
      sec: {
        newEyebrow: 'Hozirgina keldi', new: 'Yangi kelganlar',
        catsEyebrow: 'O‘zingiznikini toping', cats: 'Kategoriyalar',
        dealsEyebrow: 'Cheklangan vaqt', deals: 'Autlet chegirmalari',
        dealsText: 'Mashhur modellarning oxirgi o‘lchamlari — mavsumning eng past narxlarida.',
        bestEyebrow: 'Eng sevimli', best: 'Ko‘p sotilganlar',
        reviewsEyebrow: 'Sharhlar', reviews: 'Mijozlarimiz fikri',
      },
      cd: { d: 'kun', h: 'soat', m: 'daq', s: 'son', ends: 'Tugashiga' },
      reviews: [
        { t: 'Jordanlar ikki kunda keldi — original quti, mukammal holat va savdo markazidan ikki baravar arzon.', n: 'Aziz R.', c: 'Toshkent' },
        { t: 'Butikdek his, narxlari esa haqiqiy autlet. Endi sevimli krossovka do‘konim.', n: 'Malika T.', c: 'Samarqand' },
        { t: 'O‘lcham tanlashda yordam berishdi, tez yetkazishdi. Air Max juda mos keldi.', n: 'Dmitriy K.', c: 'Toshkent' },
      ],
      news: {
        title: 'Lounge’ga qo‘shiling', text: 'Droplarga erta kirish va a’zolar uchun maxsus narxlar. Spamsiz.',
        ph: 'Email manzilingiz', btn: 'Obuna bo‘lish', ok: 'Lounge’ga xush kelibsiz ✦',
      },
      cart: {
        title: 'Savat', empty: 'Savat bo‘sh', emptyText: 'Yoqqan juftni toping — u sizni shu yerda kutadi.',
        subtotal: 'Jami', save: 'Tejaysiz', checkout: 'Buyurtma berish', note: 'Yetkazib berish buyurtmada hisoblanadi.',
        remove: 'O‘chirish', size: 'O‘lcham', demo: 'Demo do‘kon — buyurtma keyinroq qo‘shiladi', added: 'Savatga qo‘shildi',
      },
      footer: {
        tagline: 'Original krossovkalar autlet narxlarida.', shop: 'Do‘kon', help: 'Yordam', about: 'Biz haqimizda',
        delivery: 'Yetkazib berish', returns: 'Qaytarish', sizes: 'O‘lchamlar jadvali', contact: 'Aloqa',
        story: 'Bizning tarix', auth: 'Originallik', stores: 'Do‘konlar',
        rights: 'Barcha huquqlar himoyalangan.', currency: 'Narxlar so‘mda', photos: 'Vaqtinchalik rasmlar: Unsplash',
      },
      toast: { light: 'Yorug‘ rejim', dark: 'Qorong‘i rejim' },
    },
  };
})();
