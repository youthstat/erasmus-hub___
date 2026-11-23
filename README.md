# Erasmus+ Hub

## Запуск
1. `npm install`
2. Створіть проєкт на https://console.firebase.google.com
   - Build → Firestore Database → Create database
   - Build → Authentication → Sign-in method → увімкніть **Anonymous**
   - Project settings → Your apps → Web (</>) → скопіюйте ключі
3. Ключі Firebase вже вписані в `src/firebase/config.js` (файл .env не потрібен)
4. Firestore → Rules → вставте вміст `firestore.rules` → Publish
5. `npm run dev`
6. На сайті: ADMIN → пароль `1234` → Admin panel → "Load demo missions" (або створіть свої)

Пароль адміна: `src/config/adminPassword.js`.

## Колекції Firestore
- `users/{id}`: name, country, score, registered (учасників додає адмін)
- `credentials/{userId}`: passHash (пароль акаунта учасника, SHA-256)
- `missions/{id}`: title, category, points, short, details, proofType (link/comment/confirm), proofHint, deadlineAt, recurrence, active
- `submissions/{uid_missionId_date}`: missionId, userId, userName, points, proofType, proofValue, status (pending/approved/rejected)
- `gossips/{hash}`: госіп для Rattie Patty (text, words, points, createdAt + anonymous; userId/userName лише якщо відправник обрав «Show my name»). Читає лише адмін-сторінка; id — хеш (людина + текст), тому той самий текст від тієї ж людини вдруге не оплачується
- `pointsLog/{id}`: userId, delta, reason, createdAt
- `sfPlayers/{userId}`, `sfClaims/{targetId}` — Secret friend (хто кому секрет-френд)
- `kgPlayers/{userId}`, `kgClaims/{targetId}`, `kgItemClaims/{ownerId}` — Killer game (жертва + предмет)

## Акаунти учасників
Адмін додає учасників (leaderboard → + ADD PARTICIPANT). Учасник: Sign in / Register → обирає своє ім'я зі списку
(можна друкувати для пошуку), вказує країну й придумує пароль → потрапляє у свій акаунт. Далі вхід за ім'ям і паролем.
Забули пароль: Admin → leaderboard → RESET PW (ім'я знову вільне, бали зберігаються).

## Секрет-френд і Killer game
Грає той, хто зайшов в акаунт: ім'я підставляється автоматично, пароль не потрібен. В Killer game учасник вказує лише предмет.
Ніхто не отримує себе, кожне ім'я видається лише раз, усі зв'язки утворюють один замкнений ланцюжок.
Адмін у Admin panel: додає/редагує/видаляє учасників (країна, бали), вибирає хто грає в кожну гру, бачить усі зв'язки,
може вилучити гравця (ELIMINATE) і скинути гру (RESET GAME).
Killer game: кнопка «I killed my victim» вбиває жертву (викреслюється на дошці, у неї «You have been killed»),
вбивця успадковує її жертву й предмет.
Додаткова колекція: `gameConfig/{sf|kg}` -> { excluded: [userId] }.

## Безпека
Пароль 1234 перевіряється в браузері, тому технічно тямущий користувач зможе обійти його.
Для події серед знайомих це нормально. Для суворого захисту: Firebase Auth (email адміна)
+ правила `request.auth.token.email == '...'` для запису балів/місій.

## Rattie Patty (mascot)
`src/components/mascot/Mascot.jsx` — маленька сіра мишка з рожевими вухами живе на сторінці: лазить по блоках (`.box` і картках), спить на них, гризе кут, ховається за краєм блока та визирає з краю екрана, іноді каже «Don't click me!». Спрайти — `src/assets/mouse/` (вирізані зі стікерлиста), список — `sprites.js`.

Клік по ній: «Hi, I'm Rattie Patty!» → пропозиція «gossip for 1 point — deal?» → **Deal!** → поле, де вона чекає на текст. Кожен госіп довший за 3 слова (4+) = **+1 бал** одразу після «Send»; писати можна скільки завгодно, але кожен госіп має бути новим. Без акаунта вона просить зареєструватись, з акаунтом вітає на ім'я. Відправник обирає «Anonymous» (автор не зберігається взагалі) або «Show my name» (ім'я бачить лише адмін). Інші учасники госіпів не бачать; в адмін-панелі є блок «Gossips for Rattie Patty». Вікно мишки — «сирне» (клас `.cheese` в `index.css`). Налаштування (бали, мінімум слів) — константи `GOSSIP_POINTS`, `GOSSIP_MIN_WORDS` у `src/firebase/services.js`.


## Нове (адмін)
- Адмін-панель: кожен блок можна сховати (HIDE) або відкрити на весь екран (FULL WINDOW, Esc закриває); HIDE ALL / SHOW ALL.
- Місії: CLEAR DONE на картці місії та Clear all completions — очищає всіх, хто виконав (бали, що вже нараховані, лишаються).
- Gossips: видалення по одному (з підтвердженням) і Gossip board `/gossips` — режим читання лише з паролем, який ставить адмін
  (Admin → Gossips → Set a password → Open for readers). Автори читачам не показуються. Документ: `settings/gossips`.
- Oscar: при «Send to voting» додається обкладинка фільму (стискається в JPEG і зберігається в `teams/{id}.cover`).
  У бюлетені зверху картинка + назва фільму, нижче ім'я людини і фільм, який вона представляє.
- Години прибрано: етапи Oscar без часу, дедлайн місії — лише дата, у формі допомоги немає вибору активності та годин.
