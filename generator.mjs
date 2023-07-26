import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import { getProductInformation } from "./index.mjs";


const pool = new Pool({
    host: process.env.HOST,
    port: process.env.PORT,
    database: process.env.DATABASE,
    user: process.env.USER,
    password: process.env.PASSWORD,
});
async function queryDatabase() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT a_trending_daily.gameid, a_priority_table.gamename
      FROM a_trending_daily
      LEFT JOIN a_priority_table ON a_trending_daily.gameid = a_priority_table.gameid
      ORDER BY a_trending_daily.increase DESC
      LIMIT 1000;
      `);
    client.release();
    return result.rows;
  } catch (error) {
    client.release();
    console.error('Error executing query', error);
    return undefined;
  }
};

const fetchg2aAndSaveToRDS = async (games) => {
  if (games) {
    for (const game of games) {
      const client = await pool.connect();
      if (!client) throw new Error("rds connection fail");

      const gameName = game.gamename;
      if (gameName.length < 2) continue;
      const resultg2a = await getProductInformation(gameName);
      console.log(gameName);
      console.log(resultg2a);
      if (Object.keys(resultg2a).length > 0) {
        //remove weird parameters from the end if exists
        let link = resultg2a.url;
        let idx = link.lastIndexOf('?');
        if (idx !== -1) { link = link.slice(0, idx); }     
        //////////
        await client.query("INSERT INTO affdata VALUES ($1, $2, $3, $4) ON CONFLICT (gameid) "+
          "DO UPDATE SET url=EXCLUDED.url, price=EXCLUDED.price, retailprice=EXCLUDED.retailprice",
        [game.gameid, link, resultg2a.price, resultg2a.retailPrice]);
      }
      client.release();
      await new Promise(resolve => setTimeout(resolve, Math.random() * 15000));
    }
  }
};


const gameNames = await queryDatabase();
await fetchg2aAndSaveToRDS(gameNames);








