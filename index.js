const TelegramBot = require('node-telegram-bot-api');

// 🔹 Вставь сюда токен от BotFather
const token = '8441771035:AAE9n_fUmfEQ77PPvT6rY_Ex4HieZDipCV4';
const bot = new TelegramBot(token, { polling: true });

// Размер поля
const GRID_SIZE = 7;

// Игроки (каждый чат — отдельная игра)
const players = {};

// Случайная позиция
function randomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

// Проверка, занята ли клетка змейкой
function isCellOccupied(snake, pos) {
  return snake.some(seg => seg.x === pos.x && seg.y === pos.y);
}

// Отрисовка поля
function renderGrid(snake, food) {
  let grid = '';
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const segment = snake.find(seg => seg.x === x && seg.y === y);
      if (segment) {
        grid += (segment === snake[0]) ? '🟢' : '🟩'; // голова и тело
      } else if (x === food.x && y === food.y) {
        grid += '🍎';
      } else {
        grid += '⬜';
      }
    }
    grid += '\n';
  }
  return grid;
}

// Кнопки управления
function controlButtons() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '⬆️', callback_data: 'up' }],
        [
          { text: '⬅️', callback_data: 'left' },
          { text: '➡️', callback_data: 'right' }
        ],
        [{ text: '⬇️', callback_data: 'down' }]
      ]
    }
  };
}

// Проверка столкновения с собой
function checkCollision(snake) {
  const [head, ...body] = snake;
  return body.some(seg => seg.x === head.x && seg.y === head.y);
}

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const startPos = randomPosition();
  let foodPos = randomPosition();
  while (foodPos.x === startPos.x && foodPos.y === startPos.y) {
    foodPos = randomPosition();
  }

  players[chatId] = {
    snake: [startPos], // змейка из 1 клетки
    food: foodPos,
    direction: 'right',
    score: 0,
    alive: true
  };

  const grid = renderGrid(players[chatId].snake, players[chatId].food);
  bot.sendMessage(
    chatId,
    `🐍 Добро пожаловать в змейку, ${msg.from.first_name}!\n\n${grid}\nСчёт: 0`,
    controlButtons()
  );
});

// Обработка кнопок
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const player = players[chatId];
  if (!player || !player.alive) return;

  const direction = query.data;
  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  if (direction !== opposite[player.direction]) player.direction = direction;

  const head = { ...player.snake[0] };

  // Двигаем голову
  switch (player.direction) {
    case 'up': head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE; break;
    case 'down': head.y = (head.y + 1) % GRID_SIZE; break;
    case 'left': head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE; break;
    case 'right': head.x = (head.x + 1) % GRID_SIZE; break;
  }

  // Добавляем новую голову
  player.snake.unshift(head);

  // Если съела яблоко → растёт
  if (head.x === player.food.x && head.y === player.food.y) {
    player.score++;

    // 🍎 появляется в новом месте (не на теле)
    let newFood;
    do {
      newFood = randomPosition();
    } while (isCellOccupied(player.snake, newFood));
    player.food = newFood;
    // ❗ хвост НЕ убираем — длина увеличивается

  } else {
    // 🍎 не съела → хвост удаляем (движение)
    player.snake.pop();
  }

  // Проверяем, не врезалась ли в себя
  if (checkCollision(player.snake)) {
    player.alive = false;
    bot.editMessageText(
      `💀 Игра окончена!\n\nСчёт: ${player.score}\nНажми /start, чтобы сыграть снова.`,
      { chat_id: chatId, message_id: query.message.message_id }
    );
    bot.answerCallbackQuery(query.id);
    return;
  }

  // Отрисовываем новое поле
  const grid = renderGrid(player.snake, player.food);
  bot.editMessageText(
    `🐍 Змейка\n\n${grid}\nСчёт: ${player.score}`,
    {
      chat_id: chatId,
      message_id: query.message.message_id,
      ...controlButtons()
    }
  );

  bot.answerCallbackQuery(query.id);
});
