import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

const app = new Hono()

var fs = require('fs');
var path = require('path')

const dataFilePath = path.join(process.cwd(), 'store.json')

app.post('/',
  validator('json', async (data, context) => {
    const { key, value }: any = data;
    if (!key || !value) {
      return context.text('Both key and value are required', 400)
    }
    let storeData = await readData();
    if (storeData?.[key]) {
      return context.text('key already exists', 400)
    }
    return {
      body: data,
    }
  }),
  async (context) => {
    try {
      let data = await readData();
      const { body } = context.req.valid('json')
      const { key, value }: any = body;
      if (!data) {
        data = {};
      }
      data[key] = value;
      await writeData(data);
      return context.json(data)
    } catch (error) {
      console.error(error);
      context.text('internal error', 500)
    }
  });

app.get('/', async (c) => {
  try {
    const data = await readData();
    return c.json(data)
  } catch (error) {
    console.error(error);
    return c.text('internal error', 500)
  }
});

app.get('/:key', async (c) => {
  try {
    const data = await readData();
    const key = c.req.param('key');
    if (data?.[key]) {
      return c.json(data[key]);
    } else {
      return c.text('Key not found', 404);
    }
  } catch (error) {
    console.error(error);
    return c.text('internal error', 500)
  }
});

app.put('/:key',
  validator('json', async (data, context) => {
    const { key, value }: any = data;
    if (!key || !value) {
      return context.text('Both key and value are required', 400)
    }
    return {
      body: data,
    }
  }),
  async (c) => {
    try {
      const data = await readData();
      const updateKey = c.req.param('key');
      const { body } = c.req.valid('json')
      const { value }: any = body;
      if (!data[updateKey]) {
        return c.text('Key not found', 404);
      }
      data[updateKey] = value;
      await writeData(data);
      return c.json(data[updateKey])
    } catch (error) {
      console.error(error);
      return c.text('internal error', 500)
    }
  });

app.delete('/:key', async (c) => {
  try {
    const data = await readData();
    const key = c.req.param('key');
    if (!data[key]) {
      return c.text('Key not found', 404);
    }
    delete data[key];
    await writeData(data);
    return c.json(null);
  } catch (error) {
    console.error(error);
    return c.text('internal error', 500)
  }
});

async function readData() {
  try {
    const content = fs.readFileSync(dataFilePath, 'utf-8');
    return content && JSON.parse(content);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeData(data: any) {
  await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), () => { });
}

const port = 3000

console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
