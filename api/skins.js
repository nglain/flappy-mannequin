// API для онлайн скинов
// Хранение в памяти + синхронизация через запросы

// Глобальное хранилище (сохраняется пока функция "тёплая")
const globalSkins = globalThis.fanSkinsStorage || { skins: [], lastUpdate: 0 };
globalThis.fanSkinsStorage = globalSkins;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - получить все скины
  if (req.method === 'GET') {
    return res.status(200).json({
      skins: globalSkins.skins,
      count: globalSkins.skins.length
    });
  }

  // POST - добавить или голосовать
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.action === 'add') {
        // Проверяем лимит
        if (globalSkins.skins.length > 100) {
          // Удаляем старые с малым количеством голосов
          globalSkins.skins = globalSkins.skins
            .sort((a, b) => b.votes - a.votes)
            .slice(0, 50);
        }

        const newSkin = {
          id: 'skin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: String(body.name).slice(0, 20),
          author: String(body.author).slice(0, 15),
          votes: 1,
          imageData: body.imageData,
          createdAt: Date.now()
        };

        globalSkins.skins.unshift(newSkin);
        globalSkins.lastUpdate = Date.now();

        return res.status(200).json({ success: true, skin: newSkin });
      }

      if (body.action === 'vote') {
        const skin = globalSkins.skins.find(s => s.id === body.skinId);
        if (skin) {
          skin.votes++;
          globalSkins.lastUpdate = Date.now();
          return res.status(200).json({ success: true, votes: skin.votes });
        }
        return res.status(404).json({ error: 'Skin not found' });
      }

      if (body.action === 'sync') {
        // Синхронизация - клиент отправляет свои скины
        if (Array.isArray(body.skins)) {
          body.skins.forEach(clientSkin => {
            if (!globalSkins.skins.find(s => s.id === clientSkin.id)) {
              globalSkins.skins.push(clientSkin);
            }
          });
        }
        return res.status(200).json({
          success: true,
          skins: globalSkins.skins
        });
      }

      return res.status(400).json({ error: 'Unknown action' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
