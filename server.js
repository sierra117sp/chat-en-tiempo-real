// --- Nuevo backend con soporte de salas ---
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, 'public')));

// Historial de mensajes por sala
let rooms = {
  General: []
};
// Usuarios conectados
let users = {};
// Roles de usuario (solo el primero que entra es admin)
let admins = {};

io.on('connection', (socket) => {
  let username = '';
  let currentRoom = 'General';

  // Enviar lista de salas al usuario al conectarse
  socket.emit('room list', Object.keys(rooms));
  // Unirse a la sala General por defecto y enviar historial
  socket.join(currentRoom);
  socket.emit('chat history', rooms[currentRoom]);

  socket.on('set username', (name) => {
    // El primer usuario es admin
    if (Object.keys(users).length === 0) {
      admins[name] = true;
    }
  // Borrar mensaje (solo admin)
  socket.on('delete message', (messageId) => {
    if (admins[username]) {
      const messages = rooms[currentRoom];
      const idx = messages.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        messages.splice(idx, 1);
        io.to(currentRoom).emit('chat history', messages);
      }
    }
  });

  // Expulsar usuario (solo admin)
  socket.on('kick user', (userToKick) => {
    if (admins[username] && users[userToKick]) {
      const kickedSocketId = users[userToKick];
      io.to(kickedSocketId).emit('kicked');
      io.emit('user list', Object.keys(users));
    }
  });
  username = name;
  users[username] = socket.id;
  socket.broadcast.to(currentRoom).emit('user connected', username);
  io.emit('user list', Object.keys(users));
  });

  socket.on('join room', (roomName) => {
    if (!rooms[roomName]) rooms[roomName] = [];
    socket.leave(currentRoom);
    currentRoom = roomName;
    socket.join(currentRoom);
    socket.emit('chat history', rooms[currentRoom]);
    socket.emit('room list', Object.keys(rooms));
  });

  socket.on('create room', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = [];
      io.emit('room list', Object.keys(rooms));
    }
  });

  socket.on('chat message', (msg) => {
    // Soporte avanzado de emojis
    const emojiMap = {
      ':)': '😊', ':(': '😢', ':D': '😃', '<3': '❤️', ':o': '😮', ':p': '😛', ':fire:': '🔥', ':star:': '⭐', ':thumbsup:': '👍', ':clap:': '👏', ':100:': '💯', ':rocket:': '🚀', ':party:': '🥳', ':wink:': '😉', ':sob:': '😭', ':heart:': '❤️', ':laugh:': '😂', ':cool:': '😎', ':angry:': '😡', ':sleep:': '😴', ':poop:': '💩', ':ok:': '👌', ':wave:': '👋', ':pray:': '🙏', ':eyes:': '👀', ':star2:': '🌟', ':gift:': '🎁', ':tada:': '🎉', ':zzz:': '💤', ':sun:': '☀️', ':moon:': '🌙', ':rainbow:': '🌈', ':cat:': '🐱', ':dog:': '🐶', ':unicorn:': '🦄', ':cactus:': '🌵', ':pizza:': '🍕', ':cake:': '🍰', ':coffee:': '☕', ':beer:': '🍺', ':soccer:': '⚽', ':music:': '🎵', ':camera:': '📷', ':phone:': '📱', ':computer:': '💻', ':tv:': '📺', ':car:': '🚗', ':bus:': '🚌', ':train:': '🚆', ':airplane:': '✈️', ':money:': '💸', ':gem:': '💎', ':crown:': '👑', ':ghost:': '👻', ':alien:': '👽', ':robot:': '🤖', ':apple:': '🍎', ':banana:': '🍌', ':watermelon:': '🍉', ':cherry:': '🍒', ':grape:': '🍇', ':lemon:': '🍋', ':peach:': '🍑', ':avocado:': '🥑', ':broccoli:': '🥦', ':carrot:': '🥕', ':corn:': '🌽', ':hotdog:': '🌭', ':fries:': '🍟', ':popcorn:': '🍿', ':icecream:': '🍦', ':doughnut:': '🍩', ':cookie:': '🍪', ':chocolate:': '🍫', ':milk:': '🥛', ':tea:': '🍵', ':sushi:': '🍣', ':ramen:': '🍜', ':bento:': '🍱', ':taco:': '🌮', ':burrito:': '🌯', ':sandwich:': '🥪', ':egg:': '🥚', ':bacon:': '🥓', ':shrimp:': '🍤', ':lobster:': '🦞', ':crab:': '🦀', ':octopus:': '🐙', ':fish:': '🐟', ':whale:': '🐳', ':dolphin:': '🐬', ':turtle:': '🐢', ':frog:': '🐸', ':monkey:': '🐒', ':bear:': '🐻', ':panda:': '🐼', ':koala:': '🐨', ':rabbit:': '🐰', ':mouse:': '🐭', ':hamster:': '🐹', ':fox:': '🦊', ':lion:': '🦁', ':tiger:': '🐯', ':horse:': '🐴', ':cow:': '🐮', ':pig:': '🐷', ':sheep:': '🐑', ':goat:': '🐐', ':chicken:': '🐔', ':duck:': '🦆', ':eagle:': '🦅', ':owl:': '🦉', ':penguin:': '🐧', ':elephant:': '🐘', ':giraffe:': '🦒', ':zebra:': '🦓', ':kangaroo:': '🦘', ':camel:': '🐫', ':hippo:': '🦛', ':rhinoceros:': '🦏', ':crocodile:': '🐊', ':snake:': '🐍', ':spider:': '🕷️', ':scorpion:': '🦂', ':ladybug:': '🐞', ':ant:': '🐜', ':bee:': '🐝', ':butterfly:': '🦋', ':snail:': '🐌', ':worm:': '🪱', ':cricket:': '🦗', ':mosquito:': '🦟', ':fly:': '🪰', ':dragonfly:': '🪶', ':spiderweb:': '🕸️', ':rose:': '🌹', ':tulip:': '🌷', ':sunflower:': '🌻', ':blossom:': '🌼', ':bouquet:': '💐', ':cherryblossom:': '🌸', ':hibiscus:': '🌺', ':mapleleaf:': '🍁', ':fallenleaf:': '🍂', ':herb:': '🌿', ':mushroom:': '🍄', ':evergreen:': '🌲', ':palm:': '🌴', ':seedling:': '🌱', ':coconut:': '🥥', ':pineapple:': '🍍', ':kiwi:': '🥝', ':mango:': '🥭', ':strawberry:': '🍓', ':blueberry:': '🫐', ':blackberry:': '🫒', ':water:': '💧', ':droplet:': '💦', ':wave2:': '🌊', ':volcano:': '🌋', ':mountain:': '⛰️', ':snow:': '❄️', ':cloud:': '☁️', ':rain:': '🌧️', ':thunder:': '⚡', ':wind:': '🌬️', ':fog:': '🌫️', ':rainbow2:': '🌈', ':umbrella:': '☂️', ':snowman:': '⛄', ':fire2:': '🔥', ':star3:': '⭐', ':moon2:': '🌙', ':sun2:': '☀️', ':earth:': '🌍', ':globe:': '🌎', ':map:': '🗺️', ':compass:': '🧭', ':watch:': '⌚', ':alarm:': '⏰', ':hourglass:': '⌛', ':calendar:': '📅', ':clock:': '🕰️', ':timer:': '⏲️', ':stopwatch:': '⏱️', ':thermometer:': '🌡️', ':lightbulb:': '💡', ':flashlight:': '🔦', ':candle:': '🕯️', ':battery:': '🔋', ':plug:': '🔌', ':tools:': '🛠️', ':hammer:': '🔨', ':wrench:': '🔧', ':nutandbolt:': '🔩', ':gear:': '⚙️', ':bomb:': '💣', ':gun:': '🔫', ':knife:': '🔪', ':pill:': '💊', ':syringe:': '💉', ':tooth:': '🦷', ':bone:': '🦴', ':eyes2:': '👀', ':ear:': '👂', ':nose:': '👃', ':mouth:': '👄', ':tongue:': '👅', ':foot:': '🦶', ':hand:': '🖐️', ':fist:': '✊', ':muscle:': '💪', ':leg:': '🦵', ':brain:': '🧠', ':heart2:': '❤️', ':lungs:': '🫁', ':stomach:': '🫃', ':tooth2:': '🦷', ':bone2:': '🦴', ':eye2:': '👁️', ':ear2:': '👂', ':nose2:': '👃', ':mouth2:': '👄', ':tongue2:': '👅', ':foot2:': '🦶', ':hand2:': '🖐️', ':fist2:': '✊', ':muscle2:': '💪', ':leg2:': '🦵', ':brain2:': '🧠', ':heart3:': '❤️', ':lungs2:': '🫁', ':stomach2:': '🫃', ':tooth3:': '🦷', ':bone3:': '🦴', ':eye3:': '👁️', ':ear3:': '👂', ':nose3:': '👃', ':mouth3:': '👄', ':tongue3:': '👅', ':foot3:': '🦶', ':hand3:': '🖐️', ':fist3:': '✊', ':muscle3:': '💪', ':leg3:': '🦵', ':brain3:': '🧠', ':heart4:': '❤️', ':lungs3:': '🫁', ':stomach3:': '🫃', ':tooth4:': '🦷', ':bone4:': '🦴', ':eye4:': '👁️', ':ear4:': '👂', ':nose4:': '👃', ':mouth4:': '👄', ':tongue4:': '👅', ':foot4:': '🦶', ':hand4:': '🖐️', ':fist4:': '✊', ':muscle4:': '💪', ':leg4:': '🦵', ':brain4:': '🧠', ':heart5:': '❤️', ':lungs4:': '🫁', ':stomach4:': '🫃', ':tooth5:': '🦷', ':bone5:': '🦴', ':eye5:': '👁️', ':ear5:': '👂', ':nose5:': '👃', ':mouth5:': '👄', ':tongue5:': '👅', ':foot5:': '🦶', ':hand5:': '🖐️', ':fist5:': '✊', ':muscle5:': '💪', ':leg5:': '🦵', ':brain5:': '🧠', ':heart6:': '❤️', ':lungs5:': '🫁', ':stomach5:': '🫃', ':tooth6:': '🦷', ':bone6:': '🦴', ':eye6:': '👁️', ':ear6:': '👂', ':nose6:': '👃', ':mouth6:': '👄', ':tongue6:': '👅', ':foot6:': '🦶', ':hand6:': '🖐️', ':fist6:': '✊', ':muscle6:': '💪', ':leg6:': '🦵', ':brain6:': '🧠', ':heart7:': '❤️', ':lungs6:': '🫁', ':stomach6:': '🫃', ':tooth7:': '🦷', ':bone7:': '🦴', ':eye7:': '👁️', ':ear7:': '👂', ':nose7:': '👃', ':mouth7:': '👄', ':tongue7:': '👅', ':foot7:': '🦶', ':hand7:': '🖐️', ':fist7:': '✊', ':muscle7:': '💪', ':leg7:': '🦵', ':brain7:': '🧠', ':heart8:': '❤️', ':lungs7:': '🫁', ':stomach7:': '🫃', ':tooth8:': '🦷', ':bone8:': '🦴', ':eye8:': '👁️', ':ear8:': '👂', ':nose8:': '👃', ':mouth8:': '👄', ':tongue8:': '👅', ':foot8:': '🦶', ':hand8:': '🖐️', ':fist8:': '✊', ':muscle8:': '💪', ':leg8:': '🦵', ':brain8:': '🧠', ':heart9:': '❤️', ':lungs8:': '🫁', ':stomach8:': '🫃', ':tooth9:': '🦷', ':bone9:': '🦴', ':eye9:': '👁️', ':ear9:': '👂', ':nose9:': '👃', ':mouth9:': '👄', ':tongue9:': '👅', ':foot9:': '🦶', ':hand9:': '🖐️', ':fist9:': '✊', ':muscle9:': '💪', ':leg9:': '🦵', ':brain9:': '🧠', ':heart10:': '❤️', ':lungs9:': '🫁', ':stomach9:': '🫃', ':tooth10:': '🦷', ':bone10:': '🦴', ':eye10:': '👁️', ':ear10:': '👂', ':nose10:': '👃', ':mouth10:': '👄', ':tongue10:': '👅', ':foot10:': '🦶', ':hand10:': '🖐️', ':fist10:': '✊', ':muscle10:': '💪', ':leg10:': '🦵', ':brain10:': '🧠'
    };
      const emojiRegex = new RegExp(
        Object.keys(emojiMap)
          .map(e => e.replace(/([.*+?^${}()|[\]\\])/g, '\\$1'))
          .join('|'),
        'g'
      );
    let msgWithEmojis = msg.replace(emojiRegex, m => emojiMap[m] || m);
    // Cada mensaje tiene un id único y array de reacciones
    const messageObj = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      username: username || 'Anónimo',
      msg: msgWithEmojis,
      reactions: []
    };
    rooms[currentRoom].push(messageObj);
    if (rooms[currentRoom].length > 100) rooms[currentRoom].shift();
    io.to(currentRoom).emit('chat message', messageObj);
  // Evento para agregar reacción a mensaje
  socket.on('add reaction', ({ messageId, emoji }) => {
    const messages = rooms[currentRoom];
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      // Reacción: {emoji, username}
      msg.reactions.push({ emoji, username: username || 'Anónimo' });
      io.to(currentRoom).emit('update reactions', { messageId, reactions: msg.reactions });
    }
  });
  });

  socket.on('disconnect', () => {
    if (username && users[username]) {
      delete users[username];
      io.emit('user list', Object.keys(users));
    }
  // Mensajes privados
  socket.on('private message', ({ to, msg }) => {
    // Soporte de emojis en privados
    const emojiMap = {
      ':)': '😊', ':(': '😢', ':D': '😃', '<3': '❤️', ':o': '😮', ':p': '😛', ':fire:': '🔥', ':star:': '⭐', ':thumbsup:': '👍', ':clap:': '👏', ':100:': '💯', ':rocket:': '🚀', ':party:': '🥳', ':wink:': '😉', ':sob:': '😭', ':heart:': '❤️', ':laugh:': '😂', ':cool:': '😎', ':angry:': '😡', ':sleep:': '😴', ':poop:': '💩', ':ok:': '👌', ':wave:': '👋', ':pray:': '🙏', ':eyes:': '👀', ':star2:': '🌟', ':gift:': '🎁', ':tada:': '🎉', ':zzz:': '💤', ':sun:': '☀️', ':moon:': '🌙', ':rainbow:': '🌈', ':cat:': '🐱', ':dog:': '🐶', ':unicorn:': '🦄', ':cactus:': '🌵', ':pizza:': '🍕', ':cake:': '🍰', ':coffee:': '☕', ':beer:': '🍺', ':soccer:': '⚽', ':music:': '🎵', ':camera:': '📷', ':phone:': '📱', ':computer:': '💻', ':tv:': '📺', ':car:': '🚗', ':bus:': '🚌', ':train:': '🚆', ':airplane:': '✈️', ':money:': '💸', ':gem:': '💎', ':crown:': '👑', ':ghost:': '👻', ':alien:': '👽', ':robot:': '🤖', ':apple:': '🍎', ':banana:': '🍌', ':watermelon:': '🍉', ':cherry:': '🍒', ':grape:': '🍇', ':lemon:': '🍋', ':peach:': '🍑', ':avocado:': '🥑', ':broccoli:': '🥦', ':carrot:': '🥕', ':corn:': '🌽', ':hotdog:': '🌭', ':fries:': '🍟', ':popcorn:': '🍿', ':icecream:': '🍦', ':doughnut:': '🍩', ':cookie:': '🍪', ':chocolate:': '🍫', ':milk:': '🥛', ':tea:': '🍵', ':sushi:': '🍣', ':ramen:': '🍜', ':bento:': '🍱', ':taco:': '🌮', ':burrito:': '🌯', ':sandwich:': '🥪', ':egg:': '🥚', ':bacon:': '🥓', ':shrimp:': '🍤', ':lobster:': '🦞', ':crab:': '🦀', ':octopus:': '🐙', ':fish:': '🐟', ':whale:': '🐳', ':dolphin:': '🐬', ':turtle:': '🐢', ':frog:': '🐸', ':monkey:': '🐒', ':bear:': '🐻', ':panda:': '🐼', ':koala:': '🐨', ':rabbit:': '🐰', ':mouse:': '🐭', ':hamster:': '🐹', ':fox:': '🦊', ':lion:': '🦁', ':tiger:': '🐯', ':horse:': '🐴', ':cow:': '🐮', ':pig:': '🐷', ':sheep:': '🐑', ':goat:': '🐐', ':chicken:': '🐔', ':duck:': '🦆', ':eagle:': '🦅', ':owl:': '🦉', ':penguin:': '🐧', ':elephant:': '🐘', ':giraffe:': '🦒', ':zebra:': '🦓', ':kangaroo:': '🦘', ':camel:': '🐫', ':hippo:': '🦛', ':rhinoceros:': '🦏', ':crocodile:': '🐊', ':snake:': '🐍', ':spider:': '🕷️', ':scorpion:': '🦂', ':ladybug:': '🐞', ':ant:': '🐜', ':bee:': '🐝', ':butterfly:': '🦋', ':snail:': '🐌', ':worm:': '🪱', ':cricket:': '🦗', ':mosquito:': '🦟', ':fly:': '🪰', ':dragonfly:': '🪶', ':spiderweb:': '🕸️', ':rose:': '🌹', ':tulip:': '🌷', ':sunflower:': '🌻', ':blossom:': '🌼', ':bouquet:': '💐', ':cherryblossom:': '🌸', ':hibiscus:': '🌺', ':mapleleaf:': '🍁', ':fallenleaf:': '🍂', ':herb:': '🌿', ':mushroom:': '🍄', ':evergreen:': '🌲', ':palm:': '🌴', ':seedling:': '🌱', ':coconut:': '🥥', ':pineapple:': '🍍', ':kiwi:': '🥝', ':mango:': '🥭', ':strawberry:': '🍓', ':blueberry:': '🫐', ':blackberry:': '🫒', ':water:': '💧', ':droplet:': '💦', ':wave2:': '🌊', ':volcano:': '🌋', ':mountain:': '⛰️', ':snow:': '❄️', ':cloud:': '☁️', ':rain:': '🌧️', ':thunder:': '⚡', ':wind:': '🌬️', ':fog:': '🌫️', ':rainbow2:': '🌈', ':umbrella:': '☂️', ':snowman:': '⛄', ':fire2:': '🔥', ':star3:': '⭐', ':moon2:': '🌙', ':sun2:': '☀️', ':earth:': '🌍', ':globe:': '🌎', ':map:': '🗺️', ':compass:': '🧭', ':watch:': '⌚', ':alarm:': '⏰', ':hourglass:': '⌛', ':calendar:': '📅', ':clock:': '🕰️', ':timer:': '⏲️', ':stopwatch:': '⏱️', ':thermometer:': '🌡️', ':lightbulb:': '💡', ':flashlight:': '🔦', ':candle:': '🕯️', ':battery:': '🔋', ':plug:': '🔌', ':tools:': '🛠️', ':hammer:': '🔨', ':wrench:': '🔧', ':nutandbolt:': '🔩', ':gear:': '⚙️', ':bomb:': '💣', ':gun:': '🔫', ':knife:': '🔪', ':pill:': '💊', ':syringe:': '💉', ':tooth:': '🦷', ':bone:': '🦴', ':eyes2:': '👀', ':ear:': '👂', ':nose:': '👃', ':mouth:': '👄', ':tongue:': '👅', ':foot:': '🦶', ':hand:': '🖐️', ':fist:': '✊', ':muscle:': '💪', ':leg:': '🦵', ':brain:': '🧠', ':heart2:': '❤️', ':lungs:': '🫁', ':stomach:': '🫃', ':tooth2:': '🦷', ':bone2:': '🦴', ':eye2:': '👁️', ':ear2:': '👂', ':nose2:': '👃', ':mouth2:': '👄', ':tongue2:': '👅', ':foot2:': '🦶', ':hand2:': '🖐️', ':fist2:': '✊', ':muscle2:': '💪', ':leg2:': '🦵', ':brain2:': '🧠', ':heart3:': '❤️', ':lungs2:': '🫁', ':stomach2:': '🫃', ':tooth3:': '🦷', ':bone3:': '🦴', ':eye3:': '👁️', ':ear3:': '👂', ':nose3:': '👃', ':mouth3:': '👄', ':tongue3:': '👅', ':foot3:': '🦶', ':hand3:': '🖐️', ':fist3:': '✊', ':muscle3:': '💪', ':leg3:': '🦵', ':brain3:': '🧠', ':heart4:': '❤️', ':lungs3:': '🫁', ':stomach3:': '🫃', ':tooth4:': '🦷', ':bone4:': '🦴', ':eye4:': '👁️', ':ear4:': '👂', ':nose4:': '👃', ':mouth4:': '👄', ':tongue4:': '👅', ':foot4:': '🦶', ':hand4:': '🖐️', ':fist4:': '✊', ':muscle4:': '💪', ':leg4:': '🦵', ':brain4:': '🧠', ':heart5:': '❤️', ':lungs4:': '🫁', ':stomach4:': '🫃', ':tooth5:': '🦷', ':bone5:': '🦴', ':eye5:': '👁️', ':ear5:': '👂', ':nose5:': '👃', ':mouth5:': '👄', ':tongue5:': '👅', ':foot5:': '🦶', ':hand5:': '🖐️', ':fist5:': '✊', ':muscle5:': '💪', ':leg5:': '🦵', ':brain5:': '🧠', ':heart6:': '❤️', ':lungs5:': '🫁', ':stomach5:': '🫃', ':tooth6:': '🦷', ':bone6:': '🦴', ':eye6:': '👁️', ':ear6:': '👂', ':nose6:': '👃', ':mouth6:': '👄', ':tongue6:': '👅', ':foot6:': '🦶', ':hand6:': '🖐️', ':fist6:': '✊', ':muscle6:': '💪', ':leg6:': '🦵', ':brain6:': '🧠', ':heart7:': '❤️', ':lungs6:': '🫁', ':stomach6:': '🫃', ':tooth7:': '🦷', ':bone7:': '🦴', ':eye7:': '👁️', ':ear7:': '👂', ':nose7:': '👃', ':mouth7:': '👄', ':tongue7:': '👅', ':foot7:': '🦶', ':hand7:': '🖐️', ':fist7:': '✊', ':muscle7:': '💪', ':leg7:': '🦵', ':brain7:': '🧠', ':heart8:': '❤️', ':lungs7:': '🫁', ':stomach7:': '🫃', ':tooth8:': '🦷', ':bone8:': '🦴', ':eye8:': '👁️', ':ear8:': '👂', ':nose8:': '👃', ':mouth8:': '👄', ':tongue8:': '👅', ':foot8:': '🦶', ':hand8:': '🖐️', ':fist8:': '✊', ':muscle8:': '💪', ':leg8:': '🦵', ':brain8:': '🧠', ':heart9:': '❤️', ':lungs8:': '🫁', ':stomach8:': '🫃', ':tooth9:': '🦷', ':bone9:': '🦴', ':eye9:': '👁️', ':ear9:': '👂', ':nose9:': '👃', ':mouth9:': '👄', ':tongue9:': '👅', ':foot9:': '🦶', ':hand9:': '🖐️', ':fist9:': '✊', ':muscle9:': '💪', ':leg9:': '🦵', ':brain9:': '🧠', ':heart10:': '❤️', ':lungs9:': '🫁', ':stomach9:': '🫃', ':tooth10:': '🦷', ':bone10:': '🦴', ':eye10:': '👁️', ':ear10:': '👂', ':nose10:': '👃', ':mouth10:': '👄', ':tongue10:': '👅', ':foot10:': '🦶', ':hand10:': '🖐️', ':fist10:': '✊', ':muscle10:': '💪', ':leg10:': '🦵', ':brain10:': '🧠'
    };
    const emojiRegex = new RegExp(
      Object.keys(emojiMap)
        .map(e => e.replace(/([.*+?^${}()|[\]\\])/g, '\\$1'))
        .join('|'),
      'g'
    );
    let msgWithEmojis = msg.replace(emojiRegex, m => emojiMap[m] || m);
    const toSocketId = users[to];
    if (toSocketId) {
      io.to(toSocketId).emit('private message', { from: username, msg: msgWithEmojis });
    }
  });
    if (username) {
      socket.broadcast.to(currentRoom).emit('user disconnected', username);
    }
// Selector de tema
const themeSelect = document.getElementById('theme-select');
function setTheme(theme) {
  document.body.className = 'theme-' + theme;
  localStorage.setItem('chatTheme', theme);
}
themeSelect.onchange = function() {
  setTheme(themeSelect.value);
};
// Cargar tema guardado
const savedTheme = localStorage.getItem('chatTheme') || 'dark';
themeSelect.value = savedTheme;
setTheme(savedTheme);

  });
});

const PORT = process.env.PORT || 3000;
server.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor escuchando en puerto ${process.env.PORT || 3000}`);
});