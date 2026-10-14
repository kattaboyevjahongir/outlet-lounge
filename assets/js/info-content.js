/* Outlet Lounge — texts of the information pages (delivery, returns, size guide, authenticity, about,
   contacts, FAQ, public offer, privacy policy) in Russian, Uzbek and English.

   Every page is a function of `c` — the live shop settings (delivery prices, hours, phone, company
   details) — so the owner changes a number in the admin panel and every page follows.
   Block kinds: { h, p:[…] } · { h, ul:[…] } · { h, table:{ head, rows } } · { h, faq:[[q, a], …] } · { contacts:true }

   LEGAL TEXTS (offer, privacy) are a working template; the owner must have them reviewed and complete
   the company details under Settings → Company in the admin panel before launch. */
(function () {
  const OL = (window.OL = window.OL || {});

  const TITLES = {
    ru: {
      delivery: 'Доставка и оплата', returns: 'Возврат и обмен', 'size-guide': 'Таблица размеров', authenticity: 'Оригинальность',
      about: 'О магазине', contacts: 'Контакты', faq: 'Вопросы и ответы', offer: 'Публичная оферта', privacy: 'Политика конфиденциальности',
    },
    uz: {
      delivery: 'Yetkazib berish va toʻlov', returns: 'Qaytarish va almashtirish', 'size-guide': 'Oʻlchamlar jadvali', authenticity: 'Originallik',
      about: 'Doʻkon haqida', contacts: 'Aloqa', faq: 'Savol-javoblar', offer: 'Ommaviy oferta', privacy: 'Maxfiylik siyosati',
    },
    en: {
      delivery: 'Delivery & payment', returns: 'Returns & exchange', 'size-guide': 'Size guide', authenticity: 'Authenticity',
      about: 'About the shop', contacts: 'Contacts', faq: 'FAQ', offer: 'Public offer', privacy: 'Privacy policy',
    },
  };
  OL.INFO_SLUGS = Object.keys(TITLES.ru);
  OL.INFO_TITLES = TITLES;

  // size tables come from the shared charts in data.js (the product page uses the same ones)
  const chart = (k) => (OL.SIZE_CHARTS && OL.SIZE_CHARTS[k]) || [];

  const CONTENT = {
    /* =========================================================== RU */
    ru(c) {
      const free = c.free ? `при заказе от ${c.money(c.free)} доставка бесплатная` : 'бесплатная доставка действует по акциям';
      return {
        delivery: {
          lead: 'Привозим по всему Узбекистану. Платить можно при получении.',
          blocks: [
            { h: 'Откуда берётся вещь', ul: [
              `В наличии в Ташкенте — доставим за ${c.stock} дн.`,
              `Под заказ из-за рубежа — привезём примерно за ${c.order} дн.; менеджер подтвердит дату и условия.`,
              'На странице товара у каждого размера указано, где он: у нас в Ташкенте или под заказ.',
            ] },
            { h: 'Способы и стоимость', table: { head: ['Способ', 'Срок', 'Стоимость'], rows: [
              ['Курьер по Ташкенту', '1–2 дня', c.fee.courier_tashkent ? c.money(c.fee.courier_tashkent) : 'бесплатно'],
              ['По регионам (БТС / почта)', '2–5 дней', c.fee.regions ? c.money(c.fee.regions) : 'бесплатно'],
              ['Самовывоз', 'по договорённости', c.fee.pickup ? c.money(c.fee.pickup) : 'бесплатно'],
            ] } },
            { p: [`Стоимость указана за весь заказ; ${free}. Срок доставки считается от момента, когда вещь у нас в Ташкенте.`] },
            { h: 'Как проходит заказ', ul: [
              `Вы оформляете заказ на сайте — менеджер перезвонит в течение ${c.minutes} минут (${c.hours}) и уточнит детали.`,
              'После подтверждения мы упаковываем вещи из наличия, а недостающее заказываем из-за рубежа.',
              'Статус заказа можно проверить в Telegram: кнопка на странице «Спасибо за заказ».',
            ] },
            { h: 'Оплата', ul: [
              'Наличными при получении.',
              'Банковской картой при получении (если курьер возит терминал — уточняйте у менеджера).',
              'Переводом на карту после звонка менеджера.',
              'За вещи под заказ менеджер может попросить предоплату — это обсуждается по телефону до заказа.',
            ] },
            { h: 'Регионы', p: ['Заказы в регионы отправляем службой БТС или почтой. Номер отправления менеджер пришлёт в Telegram или SMS. Проверяйте посылку при получении.'] },
          ],
        },
        returns: {
          lead: `Если вещь не подошла, вы можете вернуть или обменять её в течение ${c.returnDays} дней.`,
          blocks: [
            { h: 'Условия', ul: [
              'Вещь не надевалась и не стиралась, нет следов носки, запахов и повреждений.',
              'Сохранены бирки, упаковка и товарный вид.',
              'Есть подтверждение покупки: номер заказа или телефон, на который оформлен заказ.',
            ] },
            { h: 'Как оформить', ul: [
              `Напишите менеджеру в Telegram или позвоните: ${c.phone || 'контакты на странице «Контакты»'}.`,
              'Назовите номер заказа и причину — мы договоримся о передаче товара.',
              'После проверки вернём деньги тем же способом, которым вы платили, или обменяем на другой размер или цвет.',
            ] },
            { h: 'Что нельзя вернуть', p: ['Вещи со следами носки или стирки, без бирок, повреждённые по вине покупателя, а также нижнее бельё и носки — по гигиеническим причинам. Вещь, которую мы заказали для вас из-за рубежа, возвращается на тех же условиях, если с менеджером до заказа не оговорено иное. Если вы получили товар ненадлежащего качества, мы устраним недостаток или заменим вещь.'] },
          ],
        },
        'size-guide': {
          lead: 'Сверьте свои мерки с таблицами. Размеры брендов могут немного отличаться — ориентируйтесь и на описание товара.',
          blocks: [
            { h: 'Верх: футболки, рубашки, куртки', table: { head: ['Размер', 'RU', 'Грудь, см', 'Талия, см'], rows: chart('letter') } },
            { h: 'Брюки и джинсы', table: { head: ['Размер', 'Талия, см', 'Талия, дюймы'], rows: chart('waist') } },
            { h: 'Обувь', table: { head: ['EU', 'US', 'UK', 'Длина стопы, см'], rows: chart('shoes') } },
            { h: 'Ремни', table: { head: ['Размер, см', 'Талия, см'], rows: chart('belt') } },
            { h: 'Как снять мерки', ul: [
              'Грудь — по самой выступающей части, лента горизонтально, не стягивая.',
              'Талия — по самой узкой части торса, на уровне пупка.',
              'Стопа — встаньте на лист бумаги у стены и отметьте самый длинный палец; измеряйте вечером, берите большее значение.',
              'Между двумя размерами — выбирайте больший. Для приталенного кроя можно взять на размер больше.',
            ] },
            { h: 'Нужна помощь?', p: ['Напишите менеджеру в Telegram — подскажем по конкретной вещи.'] },
          ],
        },
        authenticity: {
          lead: 'Мы привозим только оригинальную одежду, обувь и аксессуары мировых брендов и отвечаем за каждую вещь.',
          blocks: [
            { h: 'Наша гарантия', ul: [
              'Все вещи оригинальные — от известных брендов, без реплик и «копий».',
              'Мы закупаем у проверенных поставщиков за рубежом; страна происхождения указана на странице товара.',
              'Каждую вещь осматриваем при получении: швы, материалы, маркировка, упаковка.',
              'Если вы сомневаетесь в оригинальности, возврат возможен в течение срока возврата.',
            ] },
            { h: 'Как проверить самому', ul: ['Сверьте артикул и состав на бирке с описанием на сайте.', 'Обратите внимание на ровные строчки, чёткую печать и качество фурнитуры.'] },
          ],
        },
        about: {
          lead: 'Outlet Lounge — магазин оригинальной мужской одежды, обуви и аксессуаров из-за рубежа.',
          blocks: [
            { p: ['Мы привозим вещи мировых брендов — от рубашек и джинсов до обуви и ремней. Часть ассортимента лежит у нас в Ташкенте и уезжает к вам за 1–3 дня, остальное мы закажем специально для вас.'] },
            { h: 'Что для нас важно', ul: ['Только оригинальные товары.', 'Честные цены и понятные сроки: сразу видно, что есть в наличии, а что придётся подождать.', 'Быстрый ответ менеджера и доставка по всему Узбекистану.'] },
            { p: ['Следите за новинками и акциями в Telegram и Instagram — ссылки на странице «Контакты».'] },
          ],
        },
        contacts: {
          lead: 'Свяжитесь с нами — ответим в рабочее время.',
          blocks: [{ contacts: true }, { h: 'Как мы отвечаем', p: [`Менеджер перезванивает в течение ${c.minutes} минут после оформления заказа (${c.hours}). Вопросы в Telegram и Instagram читаем в течение дня.`] }],
        },
        faq: {
          lead: 'Короткие ответы на частые вопросы.',
          blocks: [{ faq: [
            ['Как оформить заказ?', 'Выберите вещь и размер, добавьте в корзину и заполните форму. Можно заказать в один клик — оставьте имя и телефон, менеджер перезвонит.'],
            ['Чем отличается «в наличии» от «под заказ»?', `«В наличии» — вещь лежит у нас в Ташкенте, доставим за ${c.stock} дн. «Под заказ» — мы закажем её из-за рубежа, это занимает около ${c.order} дн. Менеджер подтвердит дату.`],
            ['Как оплатить?', 'Наличными или картой при получении, либо переводом на карту после звонка менеджера. За вещи под заказ может потребоваться предоплата.'],
            ['Сколько идёт доставка?', 'По Ташкенту 1–2 дня, по регионам 2–5 дней — после того, как вещь у нас. Точные сроки уточнит менеджер.'],
            ['Как выбрать размер?', 'Снимите мерки и сверьтесь с таблицей размеров. Если сомневаетесь, напишите нам.'],
            ['Это оригинал?', 'Да, мы продаём только оригинальные вещи мировых брендов.'],
            ['Можно ли вернуть или обменять?', `Да, в течение ${c.returnDays} дней, если вещь не надевалась и сохранены бирки.`],
            ['Как узнать статус заказа?', 'Нажмите «Отследить в Telegram» на странице подтверждения — бот ответит статусом. Также вам позвонит менеджер.'],
            ['Нужного размера нет', 'Если у размера нет отметки «Под заказ», он закончился. Нажмите «Сообщить о поступлении» на странице товара или напишите менеджеру.'],
          ] }],
        },
        offer: {
          lead: 'Условия договора купли-продажи товаров на сайте.',
          blocks: [
            { h: '1. Общие положения', p: [
              `1.1. Настоящая оферта — предложение ${c.company ? `${c.company}` : 'интернет-магазина Outlet Lounge'}${c.inn ? ` (ИНН ${c.inn})` : ''} (далее — «Продавец») любому физическому лицу (далее — «Покупатель») заключить договор купли-продажи товаров на условиях, изложенных ниже.`,
              '1.2. Оформление заказа на сайте означает полное и безоговорочное принятие условий оферты.',
            ] },
            { h: '2. Предмет договора', p: ['2.1. Продавец обязуется передать Покупателю товар, выбранный на сайте, а Покупатель — принять и оплатить его.', '2.2. Описание, фотографии, цена и наличие размеров указаны на странице товара. Фотографии могут незначительно отличаться от товара по цвету из-за настроек экрана.'] },
            { h: '3. Заказ и цена', p: ['3.1. Заказ оформляется на сайте или по телефону. После оформления менеджер связывается с Покупателем для подтверждения заказа.', '3.2. Цена товара указана в сумах (UZS) и действует на момент оформления заказа. Итоговая сумма включает стоимость доставки, если она применяется.', '3.3. Продавец вправе отказать в исполнении заказа, если товар отсутствует; в этом случае оплата, если она вносилась, возвращается.'] },
            { h: '4. Оплата', p: ['4.1. Оплата производится наличными или банковской картой при получении либо переводом на карту Продавца после подтверждения заказа.'] },
            { h: '5. Доставка', p: ['5.1. Доставка осуществляется курьером по Ташкенту и службой доставки или почтой по регионам Узбекистана. Сроки и стоимость указаны на странице «Доставка и оплата».', '5.2. Риск случайной утраты или повреждения товара переходит к Покупателю с момента получения.'] },
            { h: '6. Возврат и обмен', p: [`6.1. Покупатель вправе вернуть или обменять товар надлежащего качества в течение ${c.returnDays} дней с момента получения при условии сохранения товарного вида, потребительских свойств, упаковки и бирок.`, '6.2. Товар ненадлежащего качества возвращается или заменяется в порядке, установленном законодательством Республики Узбекистан о защите прав потребителей.', '6.3. Денежные средства возвращаются тем способом, которым была произведена оплата.'] },
            { h: '7. Ответственность и споры', p: ['7.1. Стороны несут ответственность в соответствии с законодательством Республики Узбекистан.', '7.2. Споры решаются путём переговоров, а при недостижении согласия — в судебном порядке.'] },
            { h: '8. Персональные данные', p: ['8.1. Оформляя заказ, Покупатель соглашается на обработку своих персональных данных в целях исполнения договора в соответствии с Политикой конфиденциальности.'] },
            { h: '9. Реквизиты Продавца', p: [[c.company, c.inn ? `ИНН ${c.inn}` : '', c.legalAddress, c.phone, c.email].filter(Boolean).join(' · ') || 'Outlet Lounge'] },
          ],
        },
        privacy: {
          lead: 'Как мы обращаемся с данными покупателей.',
          blocks: [
            { h: 'Какие данные мы собираем', ul: ['Имя и номер телефона, Telegram (по желанию).', 'Адрес доставки и комментарий к заказу.', 'Состав и сумма заказа, выбранный язык сайта.', 'Технические данные посещения (страницы, устройство) через сервисы аналитики, если они подключены.'] },
            { h: 'Зачем', ul: ['Чтобы принять, подтвердить, собрать и доставить заказ.', 'Чтобы связаться с вами по заказу.', 'Чтобы улучшать работу сайта.'] },
            { h: 'Кому передаются данные', p: ['Данные получают только сотрудники магазина и сервисы, без которых заказ невозможно обработать: хранилище данных (Supabase), хостинг (Vercel), мессенджер Telegram для уведомлений менеджеров, служба доставки. Мы не продаём данные третьим лицам.'] },
            { h: 'Срок хранения и защита', p: ['Данные хранятся столько, сколько нужно для исполнения заказа и требований законодательства. Доступ к ним имеют только сотрудники магазина через личные учётные записи; передача данных шифруется.'] },
            { h: 'Ваши права', p: [`Вы можете запросить сведения о ваших данных, их исправление или удаление, написав нам${c.email ? `: ${c.email}` : ''}${c.phone ? ` или по телефону ${c.phone}` : ''}.`] },
            { h: 'Cookies и аналитика', p: ['Сайт хранит в браузере корзину, избранное и выбор языка/темы. При подключении Яндекс Метрики или Google Analytics эти сервисы могут использовать cookies для статистики посещаемости.'] },
          ],
        },
      };
    },

    /* =========================================================== UZ */
    uz(c) {
      const free = c.free ? `${c.money(c.free)} dan boshlab yetkazib berish bepul` : 'bepul yetkazib berish aksiyalarda amal qiladi';
      return {
        delivery: {
          lead: 'Butun Oʻzbekiston boʻylab yetkazib beramiz. Qabul qilganda toʻlash mumkin.',
          blocks: [
            { h: 'Mahsulot qayerdan keladi', ul: [
              `Toshkentda mavjud boʻlsa — ${c.stock} kun ichida yetkazamiz.`,
              `Xorijdan buyurtma asosida — taxminan ${c.order} kunda olib kelamiz; menejer sana va shartlarni tasdiqlaydi.`,
              'Mahsulot sahifasida har bir oʻlcham uchun belgilangan: Toshkentda mavjud yoki buyurtma asosida.',
            ] },
            { h: 'Usullar va narxlar', table: { head: ['Usul', 'Muddat', 'Narx'], rows: [
              ['Toshkent boʻylab kuryer', '1–2 kun', c.fee.courier_tashkent ? c.money(c.fee.courier_tashkent) : 'bepul'],
              ['Viloyatlarga (BTS / pochta)', '2–5 kun', c.fee.regions ? c.money(c.fee.regions) : 'bepul'],
              ['Oʻzi olib ketish', 'kelishuv boʻyicha', c.fee.pickup ? c.money(c.fee.pickup) : 'bepul'],
            ] } },
            { p: [`Narx butun buyurtma uchun; ${free}. Yetkazish muddati mahsulot Toshkentga yetib kelgandan boshlab hisoblanadi.`] },
            { h: 'Buyurtma qanday oʻtadi', ul: [
              `Siz saytda buyurtma berasiz — menejer ${c.minutes} daqiqa ichida (${c.hours}) qoʻngʻiroq qilib, tafsilotlarni aniqlaydi.`,
              'Tasdiqlangach, omborda borini qadoqlaymiz, yetishmaganini xorijdan buyurtma qilamiz.',
              'Buyurtma holatini Telegramda tekshirish mumkin: “Buyurtma uchun rahmat” sahifasidagi tugma.',
            ] },
            { h: 'Toʻlov', ul: [
              'Qabul qilganda naqd pul.',
              'Qabul qilganda bank kartasi (kuryerda terminal boʻlsa — menejerdan soʻrang).',
              'Menejer qoʻngʻirogʻidan keyin kartaga oʻtkazma.',
              'Buyurtma asosidagi mahsulotlar uchun menejer oldindan toʻlov soʻrashi mumkin — bu buyurtmadan oldin telefonda kelishiladi.',
            ] },
            { h: 'Viloyatlar', p: ['Viloyatlarga buyurtmalarni BTS yoki pochta orqali joʻnatamiz. Joʻnatma raqamini menejer Telegram yoki SMS orqali yuboradi. Posilkani qabul qilganda tekshiring.'] },
          ],
        },
        returns: {
          lead: `Agar kiyim mos kelmasa, uni ${c.returnDays} kun ichida qaytarish yoki almashtirish mumkin.`,
          blocks: [
            { h: 'Shartlar', ul: ['Kiyim kiyilmagan va yuvilmagan, ishlatilgan izlari, hid va shikast yoʻq.', 'Birkalar, qadoq va tovar koʻrinishi saqlangan.', 'Xaridni tasdiqlovchi maʼlumot bor: buyurtma raqami yoki buyurtma rasmiylashtirilgan telefon.'] },
            { h: 'Qanday rasmiylashtiriladi', ul: [
              `Telegramda menejerga yozing yoki qoʻngʻiroq qiling: ${c.phone || '“Aloqa” sahifasidagi maʼlumotlar'}.`,
              'Buyurtma raqami va sababni ayting — tovarni topshirish boʻyicha kelishamiz.',
              'Tekshiruvdan soʻng pulni toʻlov usulingiz boʻyicha qaytaramiz yoki boshqa oʻlcham yoki rangga almashtiramiz.',
            ] },
            { h: 'Qaytarib boʻlmaydigan holatlar', p: ['Kiyilgan yoki yuvilgan izlari bor, birkasiz, xaridor aybi bilan shikastlangan buyumlar, shuningdek ichki kiyim va paypoqlar — gigiyena sabablariga koʻra. Siz uchun xorijdan buyurtma qilingan buyum, menejer bilan oldindan boshqacha kelishilmagan boʻlsa, xuddi shu shartlarda qaytariladi. Sifatsiz tovar olgan boʻlsangiz, nuqsonni bartaraf etamiz yoki buyumni almashtiramiz.'] },
          ],
        },
        'size-guide': {
          lead: 'Oʻlchamlaringizni jadvallar bilan solishtiring. Brendlar oʻlchamlari biroz farq qilishi mumkin — mahsulot tavsifiga ham eʼtibor bering.',
          blocks: [
            { h: 'Yuqori kiyim: futbolka, koʻylak, kurtka', table: { head: ['Oʻlcham', 'RU', 'Koʻkrak, sm', 'Bel, sm'], rows: chart('letter') } },
            { h: 'Shim va jinsi', table: { head: ['Oʻlcham', 'Bel, sm', 'Bel, dyuym'], rows: chart('waist') } },
            { h: 'Poyabzal', table: { head: ['EU', 'US', 'UK', 'Oyoq uzunligi, sm'], rows: chart('shoes') } },
            { h: 'Kamarlar', table: { head: ['Oʻlcham, sm', 'Bel, sm'], rows: chart('belt') } },
            { h: 'Oʻlchamni qanday olish kerak', ul: [
              'Koʻkrak — eng chiqib turgan joyidan, lenta gorizontal, tortmasdan.',
              'Bel — tananing eng ingichka joyidan, kindik darajasida.',
              'Oyoq — devor yonida qogʻozga turing va eng uzun barmoqni belgilang; kechqurun oʻlchang, kattasini oling.',
              'Ikki oʻlcham orasida boʻlsa — kattasini tanlang. Tor fason uchun bir oʻlcham kattasini olish mumkin.',
            ] },
            { h: 'Yordam kerakmi?', p: ['Telegramda menejerga yozing — aniq buyum boʻyicha maslahat beramiz.'] },
          ],
        },
        authenticity: {
          lead: 'Biz faqat jahon brendlarining original kiyim, poyabzal va aksessuarlarini olib kelamiz va har bir buyum uchun javob beramiz.',
          blocks: [
            { h: 'Bizning kafolat', ul: [
              'Barcha buyumlar original — taniqli brendlardan, nusxasiz.',
              'Xorijdagi ishonchli yetkazib beruvchilardan xarid qilamiz; kelib chiqqan davlat mahsulot sahifasida koʻrsatilgan.',
              'Har bir buyumni qabul qilganda koʻrikdan oʻtkazamiz: choklar, materiallar, markirovka, qadoq.',
              'Originalligiga shubha qilsangiz, qaytarish muddati ichida qaytarish mumkin.',
            ] },
            { h: 'Oʻzingiz qanday tekshirasiz', ul: ['Birkadagi artikul va tarkibni saytdagi tavsif bilan solishtiring.', 'Tekis chok, aniq bosma va furnitura sifatiga eʼtibor bering.'] },
          ],
        },
        about: {
          lead: 'Outlet Lounge — xorijdan olib kelingan original erkaklar kiyimi, poyabzali va aksessuarlari doʻkoni.',
          blocks: [
            { p: ['Biz jahon brendlarining buyumlarini olib kelamiz — koʻylak va jinsidan tortib poyabzal va kamargacha. Assortimentning bir qismi Toshkentdagi omborimizda va 1–3 kunda sizga yetib boradi, qolganini siz uchun maxsus buyurtma qilamiz.'] },
            { h: 'Biz uchun muhim', ul: ['Faqat original tovarlar.', 'Halol narxlar va aniq muddatlar: nima mavjud va nimani kutish kerakligi darhol koʻrinadi.', 'Menejerning tezkor javobi va butun Oʻzbekiston boʻylab yetkazib berish.'] },
            { p: ['Yangiliklar va aksiyalarni Telegram va Instagramda kuzatib boring — havolalar “Aloqa” sahifasida.'] },
          ],
        },
        contacts: {
          lead: 'Biz bilan bogʻlaning — ish vaqtida javob beramiz.',
          blocks: [{ contacts: true }, { h: 'Qanday javob beramiz', p: [`Menejer buyurtma rasmiylashtirilgandan soʻng ${c.minutes} daqiqa ichida qoʻngʻiroq qiladi (${c.hours}). Telegram va Instagramdagi savollarni kun davomida oʻqiymiz.`] }],
        },
        faq: {
          lead: 'Tez-tez beriladigan savollarga qisqa javoblar.',
          blocks: [{ faq: [
            ['Buyurtmani qanday rasmiylashtiraman?', 'Buyum va oʻlchamni tanlang, savatga qoʻshing va shaklni toʻldiring. Bir bosishda ham buyurtma berish mumkin — ism va telefon qoldiring, menejer qoʻngʻiroq qiladi.'],
            ['“Mavjud” va “buyurtma asosida” nimasi bilan farq qiladi?', `“Mavjud” — buyum Toshkentdagi omborimizda, ${c.stock} kunda yetkazamiz. “Buyurtma asosida” — uni xorijdan buyurtma qilamiz, bu taxminan ${c.order} kun oladi. Menejer sanani tasdiqlaydi.`],
            ['Qanday toʻlayman?', 'Qabul qilganda naqd yoki karta orqali, yoki menejer qoʻngʻirogʻidan keyin kartaga oʻtkazma. Buyurtma asosidagi mahsulotlar uchun oldindan toʻlov talab qilinishi mumkin.'],
            ['Yetkazish qancha vaqt oladi?', 'Toshkent boʻylab 1–2 kun, viloyatlarga 2–5 kun — buyum bizga yetib kelgandan keyin. Aniq muddatni menejer aytadi.'],
            ['Oʻlchamni qanday tanlayman?', 'Oʻlchamlaringizni olib, oʻlchamlar jadvaliga qarang. Shubha boʻlsa, bizga yozing.'],
            ['Bu original-mi?', 'Ha, biz faqat jahon brendlarining original buyumlarini sotamiz.'],
            ['Qaytarish yoki almashtirish mumkinmi?', `Ha, ${c.returnDays} kun ichida, buyum kiyilmagan va birkalar saqlangan boʻlsa.`],
            ['Buyurtma holatini qanday bilaman?', 'Tasdiqlash sahifasidagi “Telegramda kuzatish” tugmasini bosing — bot holatni aytadi. Menejer ham qoʻngʻiroq qiladi.'],
            ['Kerakli oʻlcham yoʻq', 'Agar oʻlchamda “Buyurtmaga” belgisi boʻlmasa, u tugagan. Mahsulot sahifasida “Kelganda xabar bering” tugmasini bosing yoki menejerga yozing.'],
          ] }],
        },
        offer: {
          lead: 'Saytdagi oldi-sotdi shartnomasi shartlari.',
          blocks: [
            { h: '1. Umumiy qoidalar', p: [
              `1.1. Ushbu oferta ${c.company ? c.company : 'Outlet Lounge internet-doʻkoni'}${c.inn ? ` (STIR ${c.inn})` : ''} (keyingi oʻrinlarda — “Sotuvchi”) tomonidan har qanday jismoniy shaxsga (keyingi oʻrinlarda — “Xaridor”) quyida bayon etilgan shartlarda oldi-sotdi shartnomasini tuzish taklifidir.`,
              '1.2. Saytda buyurtma rasmiylashtirish oferta shartlarini toʻliq va shartsiz qabul qilishni anglatadi.',
            ] },
            { h: '2. Shartnoma predmeti', p: ['2.1. Sotuvchi saytda tanlangan tovarni Xaridorga topshirish, Xaridor esa uni qabul qilib, toʻlash majburiyatini oladi.', '2.2. Tavsif, fotosuratlar, narx va oʻlchamlar mavjudligi tovar sahifasida koʻrsatilgan. Ekran sozlamalari sababli fotosuratlar rang jihatidan biroz farq qilishi mumkin.'] },
            { h: '3. Buyurtma va narx', p: ['3.1. Buyurtma saytda yoki telefon orqali rasmiylashtiriladi. Keyin menejer buyurtmani tasdiqlash uchun Xaridor bilan bogʻlanadi.', '3.2. Tovar narxi soʻmda (UZS) koʻrsatilgan va buyurtma rasmiylashtirilgan paytda amal qiladi. Yakuniy summa qoʻllanilsa, yetkazib berish narxini ham oʻz ichiga oladi.', '3.3. Tovar mavjud boʻlmasa, Sotuvchi buyurtmani bajarishdan bosh tortishi mumkin; bunda toʻlov kiritilgan boʻlsa, qaytariladi.'] },
            { h: '4. Toʻlov', p: ['4.1. Toʻlov qabul qilganda naqd yoki bank kartasi bilan, yoxud buyurtma tasdiqlangandan soʻng Sotuvchi kartasiga oʻtkazma orqali amalga oshiriladi.'] },
            { h: '5. Yetkazib berish', p: ['5.1. Toshkent boʻylab kuryer, Oʻzbekiston viloyatlariga yetkazib berish xizmati yoki pochta orqali yetkaziladi. Muddat va narx “Yetkazib berish va toʻlov” sahifasida koʻrsatilgan.', '5.2. Tovarning tasodifan yoʻqolishi yoki shikastlanishi xavfi Xaridorga qabul qilingan paytdan oʻtadi.'] },
            { h: '6. Qaytarish va almashtirish', p: [`6.1. Xaridor tovar koʻrinishi, isteʼmol xususiyatlari, qadoq va birkalar saqlangan sharti bilan sifatli tovarni qabul qilgandan soʻng ${c.returnDays} kun ichida qaytarishi yoki almashtirishi mumkin.`, '6.2. Sifatsiz tovar Oʻzbekiston Respublikasining isteʼmolchilar huquqlarini himoya qilish toʻgʻrisidagi qonunchiligida belgilangan tartibda qaytariladi yoki almashtiriladi.', '6.3. Pul mablagʻlari toʻlov amalga oshirilgan usul bilan qaytariladi.'] },
            { h: '7. Javobgarlik va nizolar', p: ['7.1. Tomonlar Oʻzbekiston Respublikasi qonunchiligiga muvofiq javob beradi.', '7.2. Nizolar muzokaralar yoʻli bilan, kelishuvga erishilmasa — sud tartibida hal qilinadi.'] },
            { h: '8. Shaxsiy maʼlumotlar', p: ['8.1. Buyurtma rasmiylashtirib, Xaridor shaxsiy maʼlumotlarini shartnomani bajarish maqsadida Maxfiylik siyosatiga muvofiq qayta ishlashga rozilik beradi.'] },
            { h: '9. Sotuvchi rekvizitlari', p: [[c.company, c.inn ? `STIR ${c.inn}` : '', c.legalAddress, c.phone, c.email].filter(Boolean).join(' · ') || 'Outlet Lounge'] },
          ],
        },
        privacy: {
          lead: 'Xaridorlar maʼlumotlari bilan qanday ishlaymiz.',
          blocks: [
            { h: 'Qanday maʼlumotlarni yigʻamiz', ul: ['Ism va telefon raqami, Telegram (ixtiyoriy).', 'Yetkazib berish manzili va buyurtmaga izoh.', 'Buyurtma tarkibi va summasi, saytning tanlangan tili.', 'Agar ulangan boʻlsa, tahlil xizmatlari orqali tashrifning texnik maʼlumotlari (sahifalar, qurilma).'] },
            { h: 'Nima uchun', ul: ['Buyurtmani qabul qilish, tasdiqlash, yigʻish va yetkazish uchun.', 'Buyurtma boʻyicha siz bilan bogʻlanish uchun.', 'Sayt ishini yaxshilash uchun.'] },
            { h: 'Maʼlumotlar kimga beriladi', p: ['Maʼlumotlarni faqat doʻkon xodimlari va buyurtmani qayta ishlash uchun zarur xizmatlar oladi: maʼlumotlar ombori (Supabase), hosting (Vercel), menejerlarga xabar yuborish uchun Telegram, yetkazib berish xizmati. Maʼlumotlarni uchinchi shaxslarga sotmaymiz.'] },
            { h: 'Saqlash muddati va himoya', p: ['Maʼlumotlar buyurtmani bajarish va qonun talablari uchun zarur muddat saqlanadi. Ularga faqat doʻkon xodimlari shaxsiy hisoblar orqali kira oladi; maʼlumotlar uzatilishi shifrlangan.'] },
            { h: 'Sizning huquqlaringiz', p: [`Maʼlumotlaringiz haqida maʼlumot soʻrash, ularni tuzatish yoki oʻchirishni talab qilish uchun bizga yozing${c.email ? `: ${c.email}` : ''}${c.phone ? ` yoki ${c.phone} raqamiga qoʻngʻiroq qiling` : ''}.`] },
            { h: 'Cookie va tahlil', p: ['Sayt brauzerda savat, sevimlilar va til/mavzu tanlovini saqlaydi. Yandex Metrika yoki Google Analytics ulanganda, bu xizmatlar tashrif statistikasi uchun cookie-lardan foydalanishi mumkin.'] },
          ],
        },
      };
    },

    /* =========================================================== EN */
    en(c) {
      const free = c.free ? `orders over ${c.money(c.free)} ship free` : 'free delivery applies during promotions';
      return {
        delivery: {
          lead: 'We deliver across Uzbekistan. You can pay on delivery.',
          blocks: [
            { h: 'Where your item comes from', ul: [
              `In stock in Tashkent — delivered in ${c.stock} days.`,
              `On order from abroad — brought to you in about ${c.order} days; a manager confirms the date and terms.`,
              'Every size on the product page shows which it is: in stock in Tashkent or on order.',
            ] },
            { h: 'Methods and prices', table: { head: ['Method', 'Time', 'Price'], rows: [
              ['Courier in Tashkent', '1–2 days', c.fee.courier_tashkent ? c.money(c.fee.courier_tashkent) : 'free'],
              ['Regions (BTS / post)', '2–5 days', c.fee.regions ? c.money(c.fee.regions) : 'free'],
              ['Pickup', 'by arrangement', c.fee.pickup ? c.money(c.fee.pickup) : 'free'],
            ] } },
            { p: [`Prices are per order; ${free}. Delivery time counts from the moment the item is with us in Tashkent.`] },
            { h: 'How an order goes', ul: [
              `You place the order on the site — a manager calls within ${c.minutes} minutes (${c.hours}) to confirm the details.`,
              'Once confirmed, we pack what is in stock and order the rest from abroad.',
              'You can check the order status in Telegram: the button on the “Thank you” page.',
            ] },
            { h: 'Payment', ul: [
              'Cash on delivery.',
              'Bank card on delivery (if the courier carries a terminal — ask the manager).',
              'Transfer to a card after the manager’s call.',
              'For items on order a manager may ask for a prepayment — we agree it by phone before ordering.',
            ] },
            { h: 'Regions', p: ['Regional orders ship via BTS or post. The manager sends the tracking number by Telegram or SMS. Please check the parcel when you receive it.'] },
          ],
        },
        returns: {
          lead: `If an item doesn’t fit, you can return or exchange it within ${c.returnDays} days.`,
          blocks: [
            { h: 'Conditions', ul: ['The item was not worn or washed, with no signs of use, odours or damage.', 'Tags, packaging and presentable condition are intact.', 'You have proof of purchase: the order number or the phone number used for the order.'] },
            { h: 'How to arrange it', ul: [
              `Message the manager on Telegram or call: ${c.phone || 'see the Contacts page'}.`,
              'Give the order number and the reason — we will agree how to hand the item over.',
              'After inspection we refund the way you paid, or exchange for another size or colour.',
            ] },
            { h: 'What can’t be returned', p: ['Items that were worn or washed, items without tags, items damaged by the buyer, and underwear and socks for hygiene reasons. An item we ordered for you from abroad is returned on the same terms unless you agreed otherwise with the manager before ordering. If you received a faulty item, we will fix the defect or replace it.'] },
          ],
        },
        'size-guide': {
          lead: 'Compare your measurements with the tables. Brands can differ slightly — also follow the notes on the product page.',
          blocks: [
            { h: 'Tops: T-shirts, shirts, jackets', table: { head: ['Size', 'RU', 'Chest, cm', 'Waist, cm'], rows: chart('letter') } },
            { h: 'Trousers and jeans', table: { head: ['Size', 'Waist, cm', 'Waist, in'], rows: chart('waist') } },
            { h: 'Shoes', table: { head: ['EU', 'US', 'UK', 'Foot length, cm'], rows: chart('shoes') } },
            { h: 'Belts', table: { head: ['Size, cm', 'Waist, cm'], rows: chart('belt') } },
            { h: 'How to measure', ul: [
              'Chest — around the fullest part, tape level, not tight.',
              'Waist — around the narrowest part of the torso, at navel height.',
              'Foot — stand on a sheet of paper against a wall and mark the longest toe; measure in the evening and take the larger value.',
              'Between two sizes? Choose the bigger one. For a slim fit you may want one size up.',
            ] },
            { h: 'Need help?', p: ['Message a manager on Telegram — we will advise on the exact item.'] },
          ],
        },
        authenticity: {
          lead: 'We bring only original clothing, shoes and accessories from leading brands, and stand behind every item.',
          blocks: [
            { h: 'Our guarantee', ul: [
              'Every item is original — from well-known brands, no replicas.',
              'We buy from trusted suppliers abroad; the country of origin is shown on the product page.',
              'Each item is inspected on arrival: stitching, materials, labels, packaging.',
              'If you doubt an item’s authenticity, you can return it within the return period.',
            ] },
            { h: 'How to check it yourself', ul: ['Compare the style code and composition on the tag with the description on the site.', 'Look for even stitching, crisp printing and good-quality hardware.'] },
          ],
        },
        about: {
          lead: 'Outlet Lounge — original menswear, shoes and accessories brought from abroad.',
          blocks: [
            { p: ['We bring pieces from leading brands — from shirts and jeans to shoes and belts. Part of the range sits in our Tashkent stock and reaches you in 1–3 days; the rest we order specially for you.'] },
            { h: 'What matters to us', ul: ['Only original goods.', 'Honest prices and clear timing: you see at once what is in stock and what you will wait for.', 'A quick answer from a manager and delivery across Uzbekistan.'] },
            { p: ['Follow new arrivals and offers on Telegram and Instagram — links on the Contacts page.'] },
          ],
        },
        contacts: {
          lead: 'Get in touch — we reply during working hours.',
          blocks: [{ contacts: true }, { h: 'How we reply', p: [`A manager calls within ${c.minutes} minutes after you place an order (${c.hours}). Telegram and Instagram messages are read during the day.`] }],
        },
        faq: {
          lead: 'Short answers to common questions.',
          blocks: [{ faq: [
            ['How do I place an order?', 'Choose an item and size, add it to the cart and fill in the form. You can also buy in one click — leave your name and phone and a manager will call.'],
            ['What is the difference between “in stock” and “on order”?', `“In stock” means the item is in our Tashkent stock and arrives in ${c.stock} days. “On order” means we order it from abroad for you, which takes about ${c.order} days. A manager confirms the date.`],
            ['How do I pay?', 'Cash or card on delivery, or a transfer to a card after the manager’s call. Items on order may need a prepayment.'],
            ['How long does delivery take?', 'Tashkent 1–2 days, regions 2–5 days — counted from the moment the item is with us. The manager confirms exact timing.'],
            ['How do I choose a size?', 'Take your measurements and check the size guide. If in doubt, message us.'],
            ['Are they original?', 'Yes, we sell only original items from leading brands.'],
            ['Can I return or exchange?', `Yes, within ${c.returnDays} days if the item was not worn and the tags are intact.`],
            ['How do I check my order status?', 'Press “Track in Telegram” on the confirmation page — the bot replies with the status. A manager will also call you.'],
            ['My size is not available', 'If a size has no “On order” mark, it is sold out. Press “Notify me” on the product page or message a manager.'],
          ] }],
        },
        offer: {
          lead: 'Terms of the sales contract on this website.',
          blocks: [
            { h: '1. General', p: [
              `1.1. This offer is a proposal by ${c.company ? c.company : 'the Outlet Lounge online shop'}${c.inn ? ` (TIN ${c.inn})` : ''} (the “Seller”) to any individual (the “Buyer”) to conclude a sales contract on the terms below.`,
              '1.2. Placing an order on the website means full and unconditional acceptance of these terms.',
            ] },
            { h: '2. Subject', p: ['2.1. The Seller undertakes to hand the Buyer the goods selected on the website; the Buyer undertakes to accept and pay for them.', '2.2. The description, photos, price and size availability are shown on the product page. Photos may differ slightly in colour because of screen settings.'] },
            { h: '3. Order and price', p: ['3.1. An order is placed on the website or by phone. A manager then contacts the Buyer to confirm it.', '3.2. Prices are in Uzbekistani sum (UZS) and apply at the time of ordering. The total includes the delivery fee where applicable.', '3.3. The Seller may decline an order if an item is unavailable; any payment already made is then refunded.'] },
            { h: '4. Payment', p: ['4.1. Payment is made in cash or by card on delivery, or by transfer to the Seller’s card after the order is confirmed.'] },
            { h: '5. Delivery', p: ['5.1. Delivery is by courier in Tashkent and by a delivery service or post to the regions of Uzbekistan. Time and price are on the “Delivery & payment” page.', '5.2. The risk of accidental loss or damage passes to the Buyer on receipt.'] },
            { h: '6. Returns and exchange', p: [`6.1. The Buyer may return or exchange goods of proper quality within ${c.returnDays} days of receipt provided their appearance, consumer properties, packaging and tags are intact.`, '6.2. Faulty goods are returned or replaced as provided by the consumer protection legislation of the Republic of Uzbekistan.', '6.3. Refunds are made by the method of payment used.'] },
            { h: '7. Liability and disputes', p: ['7.1. The parties are liable in accordance with the legislation of the Republic of Uzbekistan.', '7.2. Disputes are settled by negotiation or, failing that, in court.'] },
            { h: '8. Personal data', p: ['8.1. By placing an order the Buyer agrees to the processing of their personal data for the purpose of performing the contract, as set out in the Privacy policy.'] },
            { h: '9. Seller details', p: [[c.company, c.inn ? `TIN ${c.inn}` : '', c.legalAddress, c.phone, c.email].filter(Boolean).join(' · ') || 'Outlet Lounge'] },
          ],
        },
        privacy: {
          lead: 'How we handle customers’ data.',
          blocks: [
            { h: 'What we collect', ul: ['Name and phone number, Telegram (optional).', 'Delivery address and order comment.', 'Order contents and total, the language you chose.', 'Technical visit data (pages, device) through analytics services, if connected.'] },
            { h: 'Why', ul: ['To accept, confirm, pack and deliver your order.', 'To contact you about the order.', 'To improve the website.'] },
            { h: 'Who receives it', p: ['Only the shop’s staff and the services needed to process an order: data storage (Supabase), hosting (Vercel), Telegram for notifying managers, and the delivery service. We do not sell data to third parties.'] },
            { h: 'Retention and protection', p: ['Data is kept as long as needed to fulfil the order and meet legal requirements. Only staff with personal accounts can access it; data in transit is encrypted.'] },
            { h: 'Your rights', p: [`You can ask what data we hold, and request correction or deletion, by writing to us${c.email ? `: ${c.email}` : ''}${c.phone ? ` or calling ${c.phone}` : ''}.`] },
            { h: 'Cookies and analytics', p: ['The site stores your cart, wishlist and language/theme choice in the browser. If Yandex Metrica or Google Analytics is connected, those services may use cookies for visit statistics.'] },
          ],
        },
      };
    },
  };

  OL.infoContent = (lang, slug, ctx) => {
    const build = CONTENT[lang] || CONTENT.ru;
    return build(ctx)[slug] || null;
  };
})();
