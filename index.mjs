import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
import { parse } from 'parse5';
import leven from 'leven';

// Configure the database connection
// const pool = new Pool({
//   user,
//   password,
//   host,
//   port,
//   database,
// });

// Perform a query
async function queryDatabase() {
  const client = await pool.connect();

  try {
    const result = await client.query('SELECT * FROM a_priority_table LIMIT 5');
    console.log(result.rows);
  } catch (error) {
    console.error('Error executing query', error);
  } finally {
    client.release();
  }
}

async function fetchWebsite(url, timeoutAsMs) {
  try {
    const response = await axios.get(url, {timeout: timeoutAsMs});
    return response;
  } catch (error) {
    console.error('Error fetching '+url, error);
  }
}
async function FindProductUrlAndPriceData(g2aSearchQuery) {
  const url = 'https://www.g2a.com/category/games-c189?f%5Bdevice'+
    '%5D%5B0%5D=1118&f%5Bdrm%5D%5B0%5D=1&f%5Bproduct-kind%5D%5B0%5D'+
    '=10&f%5Bregions%5D%5B0%5D=8355&query='
  const response = await fetchWebsite(url+g2aSearchQuery, 5000);
  const document = parse(response.data);
  function findUlNodes(node) {
    // Check if the node is a <ul> with the desired class
    if (node.tagName === 'ul' && node.attrs.some(attr => attr.name === 'class' && attr.value === 'sc-GvhzO indexes__StyledListMobile-wklrsw-78 kSqeJg cLnXat')) {
      findLiInUl(node);
    }
    // If childNodes exist, recurse on each of them
    if (node.childNodes) {
      node.childNodes.forEach(findUlNodes);
    }
  }
  function findLinkInH3InLi(node) {
    if (node.tagName === 'a') {
      //console.log(node.attrs[0].value, node.attrs[1].value);
      priceData.push(node.attrs[0].value, node.attrs[1].value)
    } else if (node.childNodes) {
      node.childNodes.forEach(findLinkInH3InLi);
    }
  }
  function findH3InLi(node) {
    if (node.tagName === 'h3') {
      findLinkInH3InLi(node);
    } else if (node.childNodes) {
      node.childNodes.forEach(findH3InLi);
    }
  }
  function findLiInUl(node) {
    if (node.tagName === 'li') {
      findH3InLi(node); // url and name from here
      findPrice(node);
    } else if (node.childNodes) {
      node.childNodes.forEach(findLiInUl);
    }
  }
  function findPrice(node) {
  
    if (node.tagName === 'span' && node.attrs.some(attr => attr.name === 'class' &&
      attr.value.includes('sc-iqAclL sc-crzoAE dJFpVb eqnGHx sc-bqGGPW fIHClq'))) {
      node.childNodes.forEach(child => {
        if (child.nodeName === '#text') {
          //console.log(child.value);
          priceData.push(child.value);
        }
      });
    }
  
    if (node.tagName === 's' && node.attrs.some(attr => attr.name === 'class' &&
    attr.value.includes('sc-iqAclL sc-dIsUp dJFpVb bCiUoW sc-bqGGPW kZzpTd'))) {
    node.childNodes.forEach(child => {
      if (child.nodeName === '#text') {
        //console.log(child.value);
        priceData.push(child.value);
      }
    });
    }
  
    if (node.tagName === 'span' && node.attrs.some(attr => attr.name === 'class' &&
    attr.value.includes('sc-iqAclL sc-dIsUp iNabe hGHlKS sc-fFSPTT farltw'))) {
    node.childNodes.forEach(child => {
      if (child.nodeName === '#text') {
        //console.log(child.value);
        priceData.push(child.value);
      }
    });
    }
  
    // If childNodes exist, recurse on each of them
    if (node.childNodes) {
      node.childNodes.forEach(findPrice);
    }
  };
  function parsePriceData(priceData) {
    let result = [];
    let tempChunk = [];
    for (let item of priceData) {
      if (item[0] === '/') {
        result.push(tempChunk);
        tempChunk = [];
        tempChunk.push(item);
        continue;
      } else {
        if (item.length > 1) {
          tempChunk.push(item);
        }
      }
    }
    result.push(tempChunk);
    result.shift();
    return result;
  };
  
  var priceData = [];
  findUlNodes(document);
  const products = parsePriceData(priceData);
  if (products?.length == 0) { return {} }

  let bestSoFar = 1000;
  let bestIndex = -1;
  let index = -1;
  for (let product of products) {
    index++;
    const difference = leven(product[1], g2aSearchQuery);
    if (difference < bestSoFar) {
      bestIndex = index;
      bestSoFar = difference;
    }
  }
  const finalProduct = products[bestIndex];

  return { 
    url: finalProduct[0],
    name: finalProduct[1],
    price: finalProduct[2],
    retailPrice: finalProduct[3],
    salePercent: finalProduct[4],
    nameMatchLowerBetterShouldBeLike5Max: bestSoFar,
  }
}

//const gameName = 'The Elder Scrolls V: Skyrim';
//const gameName = 'Hogwarts Legacy';
//const gameName = 'Terraria';
const gameName = 'Squad';
//const gameName = 'BeamNG.drive';
//const gameName = 'DayZ';
//const gameName = 'Hell Let Loose';
//const gameName = 'Dota 2';
//const gameName = 'Days Gone';
//const gameName = 'Dying Light 2';

const res = await FindProductUrlAndPriceData(gameName+' Steam Key GLOBAL');
const res2 = await FindProductUrlAndPriceData(gameName+' - Steam Key - GLOBAL');
const res3 = await FindProductUrlAndPriceData(gameName+' (PC) Steam Key GLOBAL');
const res4 = await FindProductUrlAndPriceData(gameName+' (PC) - Steam Key - GLOBAL');

function best(responsesArr) {
  let tempBest = {};
  let bestMatchNumber = 1000;
  for (let res of responsesArr) {
    if (res.nameMatchLowerBetterShouldBeLike5Max < bestMatchNumber) {
      bestMatchNumber = res.nameMatchLowerBetterShouldBeLike5Max;
      tempBest = res;
    }
  }
  return tempBest.nameMatchLowerBetterShouldBeLike5Max < 2? tempBest : {};
}

console.log(best([res, res2, res3, res4]));
