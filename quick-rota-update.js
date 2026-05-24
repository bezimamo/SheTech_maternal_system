const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    const db = client.db('maternal-health');
    const result = await db.collection('vaccines').updateOne(
      { code: 'ROTA' },
      { $set: { dosesRequired: 3, recommendedAge: '6, 10, 14 weeks' } }
    );
    console.log('Update result:', result);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
