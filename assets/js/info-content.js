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

  const SIZES = [
    ['38.5', '6', '5.5', '24'], ['39', '6.5', '6', '24.5'], ['40', '7', '6', '25'], ['40.5', '7.5', '6.5', '25.5'], ['41', '8', '7', '26'],
    ['42', '8.5', '7.5', '26.5'], ['42.5', '9', '8', '27'], ['43', '9.5', '8.5', '27.5'], ['44', '10', '9', '28'], ['44.5', '10.5', '9.5', '28.5'],
    ['45', '11', '10', '29'], ['46', '12', '11', '30'],
  ];

  const CONTENT = {
    /* =========================================================== RU */
    ru(c) {
      const free = c.free ? `при заказе от ${c.money(c.free)} доставка бесплатная` : 'бесплатная доставка действует по акциям';
      return {
        delivery: {
          lead: 'Привозим по всему Узбекистану. Платить можно при получении.',
          blocks: [
            { h: 'Способы и стоимость', table: { head: ['Способ', 'Срок', 'Стоимость'], rows: [
              ['Курьер по Ташкенту', '1–2 дня', c.fee.courier_tashkent ? c.money(c.fee.courier_tashkent) : 'бесплатно'],
              ['По регионам (БТС / почта)', '2–5 дней', c.fee.regions ? c.money(c.fee.regions) : 'бесплатно'],
              ['Самовывоз', 'по договорённости', c.fee.pickup ? c.money(c.fee.pickup) : 'бесплатно'],
            ] } },
            { p: [`Стоимость указана за весь заказ; ${free}.`] },
            { h: 'Как проходит заказ', ul: [
              `Вы оформляете заказ на сайте — менеджер перезвонит в течение ${c.minutes} минут (${c.hours}) и уточнит детали.`,
              'После подтверждения мы упаковываем заказ и передаём курьеру или в службу доставки.',
              'Статус заказа можно проверить в Telegram: кнопка на странице «Спасибо за заказ».',
            ] },
            { h: 'Оплата', ul: [
              'Наличными при получении.',
              'Банковской картой при получении (если курьер возит терминал — уточняйте у менеджера).',
              'Переводом на карту после звонка менеджера.',
            ] },
            { h: 'Регионы', p: ['Заказы в регионы отправляем службой БТС или почтой. Номер отправления менеджер пришлёт в Telegram или SMS. Проверяйте посылку при получении.'] },
          ],
        },
        returns: {
          lead: `Если пара не подошла, вы можете вернуть или обменять её в течение ${c.returnDays} дней.`,
          blocks: [
            { h: 'Условия', ul: [
              'Кроссовки не были в носке, нет следов эксплуатации.',
              'Сохранены коробка, бирки и товарный вид.',
              'Есть подтверждение покупки: номер заказа или телефон, на который оформлен заказ.',
            ] },
            { h: 'Как оформить', ul: [
              `Напишите менеджеру в Telegram или позвоните: ${c.phone || 'контакты на странице «Контакты»'}.`,
              'Назовите номер заказа и причину — мы договоримся о передаче товара.',
              'После проверки вернём деньги тем же способом, которым вы платили, или обменяем на другой размер/модель.',
            ] },
            { h: 'Что нельзя вернуть', p: ['Товары со следами носки, повреждённые по вине покупателя и пары без упаковки. Закон о защите прав потребителей при этом не ограничивается: если вы получили товар ненадлежащего качества, мы устраним недостаток или заменим пару.'] },
          ],
        },
        'size-guide': {
          lead: 'Ориентируйтесь на длину стопы — размеры разных брендов могут отличаться на полразмера.',
          blocks: [
            { h: 'Соответствие размеров', table: { head: ['EU', 'US (муж.)', 'UK', 'Длина стопы, см'], rows: SIZES } },
            { p: ['Женский размер US обычно на 1,5 больше мужского: мужской 8 = женский 9,5.'] },
            { h: 'Как измерить стопу', ul: [
              'Встаньте на лист бумаги у стены, пятка касается стены.',
              'Отметьте самый длинный палец и измерьте расстояние от стены до метки.',
              'Измеряйте вечером, когда нога чуть увеличивается, и обеими ногами — берите большее значение.',
              'Если между двумя размерами — выбирайте больший.',
            ] },
            { h: 'Нужна помощь?', p: ['Напишите менеджеру в Telegram — подскажем по конкретной модели.'] },
          ],
        },
        authenticity: {
          lead: 'Мы продаём только оригинальные кроссовки и отвечаем за каждую пару.',
          blocks: [
            { h: 'Наша гарантия', ul: [
              'Все пары оригинальные — от официальных брендов, без реплик и «копий».',
              'Перед отправкой каждую пару осматриваем: швы, материалы, маркировка, коробка.',
              'Если вы сомневаетесь в оригинальности, возврат возможен в течение срока возврата.',
            ] },
            { h: 'Почему цены ниже', p: ['Аутлет — это прошлые коллекции, остатки партий и модели, снятые с основных витрин. Это те же оригинальные кроссовки, только дешевле.'] },
            { h: 'Как проверить самому', ul: ['Сверьте артикул на бирке внутри кроссовка с артикулом на коробке и на сайте.', 'Обратите внимание на ровные швы, чёткие надписи и качество подошвы.'] },
          ],
        },
        about: {
          lead: 'Outlet Lounge — магазин оригинальных кроссовок по ценам аутлета.',
          blocks: [
            { p: ['Мы собрали в одном месте модели Nike, Jordan, New Balance, adidas, Converse, Vans, Puma и других брендов по ценам ниже рыночных. Мы любим кроссовки и знаем, как важно купить пару, которая подойдёт по размеру и не разочарует.'] },
            { h: 'Что для нас важно', ul: ['Только оригинальные товары.', 'Честные цены и понятные условия.', 'Быстрый ответ менеджера и доставка по всему Узбекистану.'] },
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
            ['Как оформить заказ?', 'Выберите модель и размер, добавьте в корзину и заполните форму. Можно заказать в один клик — оставьте имя и телефон, менеджер перезвонит.'],
            ['Как оплатить?', 'Наличными или картой при получении, либо переводом на карту после звонка менеджера.'],
            ['Сколько идёт доставка?', 'По Ташкенту 1–2 дня, по регионам 2–5 дней. Точные сроки уточнит менеджер.'],
            ['Как выбрать размер?', 'Измерьте длину стопы и сверьтесь с таблицей размеров. Если сомневаетесь, напишите нам.'],
            ['Это оригинал?', 'Да, мы продаём только оригинальные кроссовки.'],
            ['Можно ли вернуть или обменять?', `Да, в течение ${c.returnDays} дней, если кроссовки не были в носке и сохранён товарный вид.`],
            ['Как узнать статус заказа?', 'Нажмите «Отследить в Telegram» на странице подтверждения — бот ответит статусом. Также вам позвонит менеджер.'],
            ['Нужного размера нет в наличии', 'Нажмите «Сообщить о поступлении» на странице товара — мы напишем вам, когда размер появится.'],
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
            { h: 'Usullar va narxlar', table: { head: ['Usul', 'Muddat', 'Narx'], rows: [
              ['Toshkent boʻylab kuryer', '1–2 kun', c.fee.courier_tashkent ? c.money(c.fee.courier_tashkent) : 'bepul'],
              ['Viloyatlarga (BTS / pochta)', '2–5 kun', c.fee.regions ? c.money(c.fee.regions) : 'bepul'],
              ['Oʻzi olib ketish', 'kelishuv boʻyicha', c.fee.pickup ? c.money(c.fee.pickup) : 'bepul'],
            ] } },
            { p: [`Narx butun buyurtma uchun; ${free}.`] },
            { h: 'Buyurtma qanday amalga oshadi', ul: [
              `Saytda buyurtma berasiz — menejer ${c.minutes} daqiqa ichida (${c.hours}) qoʻngʻiroq qilib tafsilotlarni aniqlaydi.`,
              'Tasdiqlangandan soʻng buyurtmani qadoqlab, kuryerga yoki yetkazib berish xizmatiga topshiramiz.',
              'Buyurtma holatini Telegramda tekshirish mumkin: “Buyurtma uchun rahmat” sahifasidagi tugma.',
            ] },
            { h: 'Toʻlov', ul: ['Qabul qilganda naqd pul.', 'Qabul qilganda bank kartasi bilan (kuryerda terminal boʻlishini menejerdan soʻrang).', 'Menejer qoʻngʻirogʻidan soʻng kartaga oʻtkazma.'] },
            { h: 'Viloyatlar', p: ['Viloyatlarga buyurtmalarni BTS yoki pochta orqali joʻnatamiz. Joʻnatma raqamini menejer Telegram yoki SMS orqali yuboradi. Posilkani olayotganda tekshiring.'] },
          ],
        },
        returns: {
          lead: `Agar juft mos kelmasa, uni ${c.returnDays} kun ichida qaytarish yoki almashtirish mumkin.`,
          blocks: [
            { h: 'Shartlar', ul: ['Krossovkalar kiyilmagan, ishlatilgan izlari yoʻq.', 'Quti, birkalar va tovar koʻrinishi saqlangan.', 'Xaridni tasdiqlovchi maʼlumot bor: buyurtma raqami yoki buyurtma berilgan telefon.'] },
            { h: 'Qanday rasmiylashtiriladi', ul: [
              `Menejerga Telegramda yozing yoki qoʻngʻiroq qiling: ${c.phone || '“Aloqa” sahifasidagi kontaktlar'}.`,
              'Buyurtma raqami va sababni ayting — tovarni topshirish tartibini kelishamiz.',
              'Tekshiruvdan soʻng pulni toʻlov usulingiz boʻyicha qaytaramiz yoki boshqa oʻlcham/modelga almashtiramiz.',
            ] },
            { h: 'Qaytarib boʻlmaydigan holatlar', p: ['Kiyilgan izlari bor, xaridor aybi bilan shikastlangan va qadoqsiz juftlar. Sifatsiz tovar olgan boʻlsangiz, kamchilikni bartaraf etamiz yoki juftni almashtiramiz.'] },
          ],
        },
        'size-guide': {
          lead: 'Oyoq uzunligiga qarab tanlang — turli brendlarning oʻlchamlari yarim oʻlchamga farq qilishi mumkin.',
          blocks: [
            { h: 'Oʻlchamlar mosligi', table: { head: ['EU', 'US (erkak)', 'UK', 'Oyoq uzunligi, sm'], rows: SIZES } },
            { p: ['Ayollar US oʻlchami odatda erkaknikidan 1,5 ga katta: erkak 8 = ayol 9,5.'] },
            { h: 'Oyoqni qanday oʻlchash', ul: [
              'Devor yonida qogʻoz varagʻiga turing, tovon devorga tegib tursin.',
              'Eng uzun barmoqni belgilab, devordan belgigacha masofani oʻlchang.',
              'Oʻlchashni kechqurun, ikkala oyoqda bajaring — kattasini oling.',
              'Ikki oʻlcham orasida boʻlsa — kattasini tanlang.',
            ] },
            { h: 'Yordam kerakmi?', p: ['Menejerga Telegramda yozing — aniq model boʻyicha maslahat beramiz.'] },
          ],
        },
        authenticity: {
          lead: 'Faqat original krossovkalar sotamiz va har bir juft uchun javob beramiz.',
          blocks: [
            { h: 'Bizning kafolat', ul: ['Barcha juftlar original — rasmiy brendlardan, nusxasiz.', 'Joʻnatishdan oldin har bir juft koʻrikdan oʻtadi: choklar, materiallar, markirovka, quti.', 'Originalligiga shubha qilsangiz, qaytarish muddati ichida qaytarish mumkin.'] },
            { h: 'Narxlar nima uchun past', p: ['Autlet — oldingi kolleksiyalar, partiya qoldiqlari va asosiy vitrinadan olingan modellar. Bular xuddi shu original krossovkalar, faqat arzonroq.'] },
            { h: 'Oʻzingiz qanday tekshirasiz', ul: ['Krossovka ichidagi birkadagi artikulni quti va sayt bilan solishtiring.', 'Tekis choklar, aniq yozuvlar va taglik sifatiga eʼtibor bering.'] },
          ],
        },
        about: {
          lead: 'Outlet Lounge — autlet narxlaridagi original krossovkalar doʻkoni.',
          blocks: [
            { p: ['Nike, Jordan, New Balance, adidas, Converse, Vans, Puma va boshqa brendlarning modellarini bozordan arzon narxlarda bir joyga jamladik. Biz krossovkalarni sevamiz va oʻlchamiga mos, umidni oqlaydigan juft olish qanchalik muhimligini bilamiz.'] },
            { h: 'Biz uchun muhim', ul: ['Faqat original tovarlar.', 'Halol narxlar va tushunarli shartlar.', 'Menejerning tez javobi va butun Oʻzbekiston boʻylab yetkazib berish.'] },
            { p: ['Yangiliklar va aksiyalarni Telegram va Instagramda kuzating — havolalar “Aloqa” sahifasida.'] },
          ],
        },
        contacts: {
          lead: 'Biz bilan bogʻlaning — ish vaqtida javob beramiz.',
          blocks: [{ contacts: true }, { h: 'Qanday javob beramiz', p: [`Menejer buyurtma rasmiylashtirilgandan soʻng ${c.minutes} daqiqa ichida qoʻngʻiroq qiladi (${c.hours}). Telegram va Instagramdagi savollarni kun davomida oʻqiymiz.`] }],
        },
        faq: {
          lead: 'Tez-tez beriladigan savollarga qisqa javoblar.',
          blocks: [{ faq: [
            ['Buyurtmani qanday rasmiylashtiraman?', 'Model va oʻlchamni tanlang, savatga qoʻshing va shaklni toʻldiring. Bir bosishda ham buyurtma berish mumkin — ism va telefonni qoldiring, menejer qoʻngʻiroq qiladi.'],
            ['Qanday toʻlayman?', 'Qabul qilganda naqd yoki karta bilan, yoki menejer qoʻngʻirogʻidan soʻng kartaga oʻtkazma orqali.'],
            ['Yetkazib berish qancha vaqt oladi?', 'Toshkent boʻylab 1–2 kun, viloyatlarga 2–5 kun. Aniq muddatni menejer aytadi.'],
            ['Oʻlchamni qanday tanlayman?', 'Oyoq uzunligini oʻlchab, oʻlchamlar jadvaliga qarang. Shubha boʻlsa, bizga yozing.'],
            ['Bu original-mi?', 'Ha, biz faqat original krossovkalar sotamiz.'],
            ['Qaytarish yoki almashtirish mumkinmi?', `Ha, ${c.returnDays} kun ichida, krossovkalar kiyilmagan va tovar koʻrinishi saqlangan boʻlsa.`],
            ['Buyurtma holatini qanday bilaman?', 'Tasdiqlash sahifasidagi “Telegramda kuzatish” tugmasini bosing — bot holatni yozadi. Menejer ham qoʻngʻiroq qiladi.'],
            ['Kerakli oʻlcham yoʻq', 'Mahsulot sahifasida “Kelganda xabar bering” tugmasini bosing — oʻlcham paydo boʻlsa, yozamiz.'],
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
            { h: 'Methods and prices', table: { head: ['Method', 'Time', 'Price'], rows: [
              ['Courier in Tashkent', '1–2 days', c.fee.courier_tashkent ? c.money(c.fee.courier_tashkent) : 'free'],
              ['Regions (BTS / post)', '2–5 days', c.fee.regions ? c.money(c.fee.regions) : 'free'],
              ['Pickup', 'by arrangement', c.fee.pickup ? c.money(c.fee.pickup) : 'free'],
            ] } },
            { p: [`Prices are per order; ${free}.`] },
            { h: 'How an order goes', ul: [
              `You place an order — a manager calls within ${c.minutes} minutes (${c.hours}) to confirm the details.`,
              'Once confirmed, we pack it and hand it to the courier or delivery service.',
              'You can check the status in Telegram: the button on the “Thank you” page.',
            ] },
            { h: 'Payment', ul: ['Cash on delivery.', 'Card on delivery (ask the manager whether the courier carries a terminal).', 'Card transfer after the manager’s call.'] },
            { h: 'Regions', p: ['Orders to the regions go by BTS or post. The manager sends the tracking number via Telegram or SMS. Please check the parcel when you receive it.'] },
          ],
        },
        returns: {
          lead: `If a pair doesn’t fit, you can return or exchange it within ${c.returnDays} days.`,
          blocks: [
            { h: 'Conditions', ul: ['The sneakers were not worn and show no signs of use.', 'The box, tags and presentable condition are intact.', 'You have proof of purchase: the order number or the phone number the order was placed with.'] },
            { h: 'How to request', ul: [
              `Message the manager on Telegram or call: ${c.phone || 'see the Contacts page'}.`,
              'Tell us the order number and the reason — we’ll arrange the hand-over.',
              'After inspection we refund the way you paid, or exchange for another size or model.',
            ] },
            { h: 'What can’t be returned', p: ['Worn pairs, items damaged by the buyer, and pairs without packaging. If you received a faulty item, we will fix the defect or replace the pair.'] },
          ],
        },
        'size-guide': {
          lead: 'Go by foot length — sizes of different brands can differ by half a size.',
          blocks: [
            { h: 'Size conversion', table: { head: ['EU', 'US (men)', 'UK', 'Foot length, cm'], rows: SIZES } },
            { p: ['A women’s US size is usually 1.5 higher than a men’s: men’s 8 = women’s 9.5.'] },
            { h: 'How to measure your foot', ul: [
              'Stand on a sheet of paper against a wall, heel touching the wall.',
              'Mark the longest toe and measure from the wall to the mark.',
              'Measure in the evening, on both feet — take the larger value.',
              'Between two sizes? Choose the bigger one.',
            ] },
            { h: 'Need help?', p: ['Message the manager on Telegram — we’ll advise on the specific model.'] },
          ],
        },
        authenticity: {
          lead: 'We sell only original sneakers and stand behind every pair.',
          blocks: [
            { h: 'Our guarantee', ul: ['Every pair is original — from official brands, no replicas.', 'Each pair is inspected before shipping: stitching, materials, labels, box.', 'If you doubt the authenticity, you can return it within the return period.'] },
            { h: 'Why prices are lower', p: ['Outlet means past collections, batch leftovers and models taken off the main shop windows. They are the same original sneakers, just cheaper.'] },
            { h: 'How to check yourself', ul: ['Compare the article number on the inner label with the box and the website.', 'Look at even stitching, crisp lettering and the quality of the sole.'] },
          ],
        },
        about: {
          lead: 'Outlet Lounge — original sneakers at outlet prices.',
          blocks: [
            { p: ['We have gathered Nike, Jordan, New Balance, adidas, Converse, Vans, Puma and other brands in one place at below-market prices. We love sneakers and know how important it is to get a pair that fits and doesn’t disappoint.'] },
            { h: 'What matters to us', ul: ['Original products only.', 'Honest prices and clear terms.', 'A fast reply from a manager and delivery across Uzbekistan.'] },
            { p: ['Follow new arrivals and deals on Telegram and Instagram — links are on the Contacts page.'] },
          ],
        },
        contacts: {
          lead: 'Get in touch — we reply during working hours.',
          blocks: [{ contacts: true }, { h: 'How we reply', p: [`A manager calls within ${c.minutes} minutes after you place an order (${c.hours}). Telegram and Instagram messages are read during the day.`] }],
        },
        faq: {
          lead: 'Short answers to common questions.',
          blocks: [{ faq: [
            ['How do I place an order?', 'Choose a model and size, add it to the cart and fill in the form. You can also buy in one click — leave your name and phone and a manager will call.'],
            ['How do I pay?', 'Cash or card on delivery, or a card transfer after the manager’s call.'],
            ['How long does delivery take?', 'In Tashkent 1–2 days, to the regions 2–5 days. The manager will confirm exact timing.'],
            ['How do I choose a size?', 'Measure your foot length and check the size guide. If in doubt, message us.'],
            ['Are they original?', 'Yes, we sell only original sneakers.'],
            ['Can I return or exchange?', `Yes, within ${c.returnDays} days if the sneakers were not worn and are in presentable condition.`],
            ['How do I check my order status?', 'Press “Track in Telegram” on the confirmation page — the bot replies with the status. A manager will also call you.'],
            ['My size is out of stock', 'Press “Notify me” on the product page — we’ll message you when the size is back.'],
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
