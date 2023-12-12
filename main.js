  const express = require('express');
  const bodyParser = require('body-parser');
  const swaggerJSDoc = require('swagger-jsdoc');
  const swaggerUI = require('swagger-ui-express');
  const multer = require('multer');
  const path = require("path");
  const fs = require('fs');

  const app = express();
  const port = 3000;

  const Page = fs.readFileSync('static/Page.html').toString();
  const upload = multer({ dest: 'uploads/' }); 
  app.use(bodyParser.json());
  app.use('/images', express.static('uploads'));

  let devices = [];
  let users = [];
  let currentDeviceId = 0;
  let currentUserId = 0;

  // Swagger опції
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Inventory API',
        version: '1.0.0',
      },
      tags: [
        {
          name: 'default',
          description: 'Загальні API',
        },
      ],
      components: {
        schemas: {
          Device: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Назва пристрою' },
              description: { type: 'string', description: 'Опис пристрою' },
              serialNumber: { type: 'string', description: 'Серійний номер пристрою' },
              manufacturer: { type: 'string', description: 'Виробник пристрою' },
            },
          },
          User: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Ім’я користувача' },
            },
          },
        },
      },
    },
    apis: ['main.js'],
  };

  const swaggerSpec = swaggerJSDoc(swaggerOptions);
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

  /**
   * @swagger
   * /devices:
   *   get:
   *     summary: Повертає список всіх пристроїв.
   *     responses:
   *       200:
   *         description: Успішно повертає список пристроїв.
   */
  app.get('/devices', (req, res) => {
    res.json(devices);
  });

  /**
   * @swagger
   * /devices/{id}:
   *   get:
   *     summary: Повертає інформацію про конкретний пристрій.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID пристрою
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Успішно повертає інформацію про пристрій.
   *       404:
   *         description: Пристрій не знайдено.
   */
  app.get('/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    const device = devices.find(d => d.id === deviceId);

    if (!device) {
      return res.status(404).json({ error: 'Пристрій не знайдено' });
    }

    res.json(device);
  });

  /**
   * @swagger
   * /devices:
   *   post:
   *     summary: Реєстрація нового пристрою.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Device'
   *     responses:
   *       200:
   *         description: Успішно реєструє новий пристрій.
   */
  app.post('/devices', (req, res) => {
    const newDevice = req.body;

    // Перевірка на збіг імен пристроїв
    if (devices.some(device => device.name === newDevice.name)) {
      return res.status(400).json({ error: 'Пристрій з таким ім\'ям вже зареєстровано' });
    }

    newDevice.id = generateDeviceId();
    newDevice.assigned_to = "не використовується"
    devices.push(newDevice);
    res.json(newDevice);
  });

  /**
   * @swagger
   * /devices/{id}:
   *   put:
   *     summary: Редагування інформації про пристрій.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID пристрою
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Device'
   *     responses:
   *       200:
   *         description: Успішно редагує інформацію про пристрій.
   *       404:
   *         description: Пристрій не знайдено.
   */
  app.put('/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    let updatedDevice = { ...req.body };
    const index = devices.findIndex(d => d.id === deviceId);
  
    if (index === -1) {
      return res.status(404).json({ error: 'Пристрій не знайдено' });
    }
  
    // Видаляємо поля id та assigned_to з updatedDevice
    delete updatedDevice.id;
    delete updatedDevice.assigned_to;
  
    // Зберігаємо поточні значення id та assigned_to
    updatedDevice = { ...devices[index], ...updatedDevice };
  
    devices[index] = updatedDevice;
    res.json(updatedDevice);
  });

  /**
 * @swagger
 * /devices/{id}:
 *   delete:
 *     summary: Видалення пристрою за ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID пристрою для видалення
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успішно видаляє пристрій.
 *       404:
 *         description: Пристрій не знайдено.
 */
app.delete('/devices/:id', (req, res) => {
  const deviceId = req.params.id;
  const index = devices.findIndex(d => d.id === deviceId);

  if (index === -1) {
    return res.status(404).json({ error: 'Пристрій не знайдено' });
  }

  devices.splice(index, 1);
  res.json({ message: 'Пристрій видалено успішно!' });
});
  
  /**
 * @swagger
 * /devices/{id}/image:
 *   put:
 *     summary: Додавання зображення пристрою.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID пристрою
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Успішно оновлює зображення пристрою.
 *       404:
 *         description: Пристрій не знайдено.
 */
  app.put('/devices/:id/image', upload.single('image'), (req, res) => {
    var temp = devices.filter((obj) => obj.id == req.params.id);

    if (temp.length == 0) {
        res.sendStatus(404);
    } else {
        temp[0].image_path = req.file.filename;
        res.sendStatus(200);
        res.json({ message: 'Зображення додано успішно!' });
    }
  });


  /**
  * @swagger
  * /devices/{id}/image:
  *   get:
  *     summary: Перегляд зображення пристрою.
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         description: ID пристрою
  *         schema:
  *           type: string
  *     responses:
  *       200:
  *         description: Успішно повертає зображення пристрою.
  *       404:
  *         description: Пристрій не знайдено або у нього немає зображення.
  */  
  app.get('/devices/:id/image', (req, res) => {
    var temp = devices.filter((obj) => obj.id == req.params.id);

    if (temp.length == 0) {
        res.sendStatus(404);
    } else {
        if (temp[0].image_path != null) {
            res.send(Page.replace('{%image_path}', temp[0].image_path).replace('image_mimetype'));
        } else {
            res.sendStatus(404);
        }
      }
  }); 

  /**
   * @swagger
   * /users:
   *   get:
   *     summary: Повертає список всіх користувачів.
   *     responses:
   *       200:
   *         description: Успішно повертає список користувачів.
   */
  app.get('/users', (req, res) => {
    res.json(users);
  });

  /**
   * @swagger
   * /users:
   *   post:
   *     summary: Реєстрація нового користувача.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/User'
   *     responses:
   *       200:
   *         description: Успішно реєструє нового користувача.
   */
  app.post('/users', (req, res) => {
    const newUser = req.body;

    // Перевірка на збіг імен користувачів
    if (users.some(user => user.name === newUser.name)) {
      return res.status(400).json({ error: 'Користувача з таким ім\'ям вже зареєстровано' });
    }

    newUser.id = generateUserId();
    users.push(newUser);
    res.json(newUser);
  });

/**
 * @swagger
 * /users/{id}/devices:
 *   get:
 *     summary: Отримання пристроїв, які використовує користувач.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID користувача
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успішно отримано пристрої, які використовує користувач.
 *       404:
 *         description: Користувач не знайдений.
 */
app.get('/users/:id/devices', (req, res) => {
  const userId = req.params.id;

  const user = users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ error: 'Користувач не знайдений' });
  }

  const userDevices = user.devices || [];

  res.json(userDevices);
});
  

  /**
   * @swagger
   * /devices/{id}/take:
   *   post:
   *     summary: Взяття пристрою у користування.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID пристрою
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *                 description: ID користувача, який бере пристрій у користування.
   *     responses:
   *       200:
   *         description: Успішно бере пристрій у користування.
   *       404:
   *         description: Пристрій або користувач не знайдені.
   */
  app.post('/devices/:id/take', (req, res) => {
    const deviceId = req.params.id;
    const userId = req.body.userId;
  
    const device = devices.find(d => d.id === deviceId);
    const user = users.find(u => u.id === userId);
  
    if (!device || !user) {
      return res.status(404).json({ error: 'Пристрій або користувач не знайдені' });
    }
  
    device.assigned_to = "використовується";
  
    // Додаємо пристрій до користувача
    if (!user.devices) {
      user.devices = [];  
    }
    user.devices.push(device);
  
    res.json({ message: 'Пристрій взято у користування!' });
  });
  

  /**
   * @swagger
   * /devices/{id}/return:
   *   post:
   *     summary: Повернення пристрою на зберігання.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         description: ID пристрою
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: string
   *                 description: ID користувача, який повертає пристрій.
   *     responses:
   *       200:
   *         description: Успішно повертає пристрій на зберігання.
   *       404:
   *         description: Пристрій або користувач не знайдені.
   */
  app.post('/devices/:id/return', (req, res) => {
    const deviceId = req.params.id;
    const userId = req.body.userId;

    const device = devices.find(d => d.id === deviceId);
    const user = users.find(u => u.id === userId);

    if (!device || !user) {
      return res.status(404).json({ error: 'Пристрій або користувач не знайдені' });
    }

    user.devices.splice(device, 1);

    device.assigned_to = "на зберіганні"
    // Логіка для повернення пристрою на зберігання
    res.json({ message: 'Пристрій повернено на зберіання!' });
  });

  // Генератор унікального ідентифікатора
  function generateDeviceId() {
    const deviceId = currentDeviceId < 10 ? '0' + currentDeviceId : '' + currentDeviceId;
    currentDeviceId = (currentDeviceId + 1) % 100; // Збільшуємо і встановлюємо межу на 99
    return deviceId;
  }

  function generateUserId() {
    const userId = currentUserId < 10 ? '0' + currentUserId : '' + currentUserId;
    currentUserId = (currentUserId + 1) % 100; // Збільшуємо і встановлюємо межу на 99
    return userId;
  }

  // Запускаємо сервер
  app.listen(port, () => {
    console.log(`Сервер запущений на: http://localhost:${port}` + '/api-docs/');
  });
