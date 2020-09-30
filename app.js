const Twitter = require('twitter');
const tweetParser = require('./modules/tweet_parser.js');
const makeKeyword = require('./modules/make_keyword.js');
const Console = require('./modules/console.js');
const raidDatas = require('./config/raid_datas.js');

const {
  APP_CONSUMER_KEY,
  APP_CONSUMER_SECRET,
  APP_BEARER_TOKEN,
  USER_CONSUMER_KEY,
  USER_CONSUMER_SECRET,
  USER_ACCESS_TOKEN_KEY,
  USER_ACCESS_TOKEN_SECRET,
} = process.env;

const appAuth = {
  consumer_key: APP_CONSUMER_KEY,
  consumer_secret: APP_CONSUMER_SECRET,
  bearer_token: APP_BEARER_TOKEN,
};

const userAuth = {
  consumer_key: USER_CONSUMER_KEY,
  consumer_secret: USER_CONSUMER_SECRET,
  access_token_key: USER_ACCESS_TOKEN_KEY,
  access_token_secret: USER_ACCESS_TOKEN_SECRET,
};

/* Client */
const appAuthClient = new Twitter(appAuth);
const userAuthClient = new Twitter(userAuth);

/* Keyword Filter */
const filterKeys = Object.keys(raidDatas.switch).filter(key => raidDatas.switch[key]);
const filterDatas = filterKeys.map(key => raidDatas.detail[key]);
const keywords = makeKeyword(filterDatas);
const gbfTrack = keywords.join(','); // StreamAPI用
const gbfSearch = `(${keywords.join(') OR (')})`; // SearchAPI用

const isNewOnly = raidDatas.newOnly === true;
const isSound = raidDatas.isSound === true;

const idLogs = []; // 一度流れたIDを一時的に保持しておくバッファー配列
const APILimitPer = 900000; // Rate制限の単位時間(ms)
const APILimitFetch = 430; // Rate制限のFetch回数 (ほんとは450sだけど余裕持って420設定)
let boostModeFlag = false; // ブーストモードフラグ

console.log('Twitter Stream Connect Start!!');
console.log('------- Filters --------');
console.log(filterKeys);
console.log('------------------------');

/**
 * StreamAPIからツイート取得
 */
userAuthClient.stream('statuses/filter', { track: gbfTrack }, stream => {
  stream.on('data', tweet => {
    Console.output(tweetParser(tweet), 'stream', idLogs, isNewOnly, isSound, boostModeFlag);
  });
});

/**
 * SearchAPIからツイート取得
 */
let sec = 0; // 経過秒数
let fetchCount = 0; // Fetch実行回数
let APILockFlag = false; // ロックフラグ
let mostTweetID = 0; // 最も新しいTweetIDバッファー
let continuouslyBoostFetchCount = 0; // ブースト時の連続Fetch回数

/*
 * ブースト強度設定
 * - default: boostOFF時に、SearchAPIを叩く間隔の秒数(ms)
 * - boost: boostON時に、SearchAPIを叩く間隔の秒数(ms)
 * ※ 自前でカスタムする場合、default値 ÷ boost値 の 余りが0になるようにする事。
 */
const boostProfile = {
  normal: { default: 5000, boost: 1000 },
  highSpeed: { default: 2100, boost: 2100 },
  accelerate: { default: 10000, boost: 500 },
};
const boostParam = boostProfile[raidDatas.boostLevel] || boostProfile.normal;

// 1秒毎に監視、5秒間隔でFetch実行、ただしBootModeの時は1秒間隔でFetch実行
// RateLimitに引っかかりそうな時はロックをかける。一定時間超過でロック解除
setInterval(() => {
  if ((boostModeFlag === true || sec % boostParam.default === 0) && APILockFlag === false) {
    if (fetchCount < APILimitFetch) {
      fetchCount++;
      // console.time('fetchTime');
      appAuthClient.get(
        'search/tweets',
        { q: gbfSearch, count: 100, result_type: 'recent', include_entities: false },
        (error, tweets, _) => {
          // console.timeEnd('fetchTime');

          if (Console.checkError(error, tweets.error) === false) {
            // ツイートが正常に取得できた => コンソール出力
            const filteredTweets = tweets.statuses.filter(v => v.id > mostTweetID);
            if (filteredTweets.length > 0) {
              mostTweetID = Math.max.apply(
                null,
                filteredTweets.map(v => v.id),
              );
              for (let i = filteredTweets.length - 1; i >= 0; i--) {
                Console.output(tweetParser(filteredTweets[i]), 'search', idLogs, isNewOnly, isSound, boostModeFlag);
              }
            }
          } else {
            // エラーが返ってきた => 3分間SearchAPIロック
            APILockFlag = true;
            boostModeFlag = false;
            sec = 720000;
          }
          // console.timeEnd('fetchedExeTime');

          /*
           * [安全装置]
           * ブースト状態のまま一定回数連続Fetchしたら、自動的にブーストモードをOFFにする
           */
          if (boostModeFlag === true) {
            continuouslyBoostFetchCount++;
            if (continuouslyBoostFetchCount > 60) {
              console.log('＊＊＊＊ SafetyLock. Boost END. ＊＊＊＊');
              boostModeFlag = false;
            }
          } else {
            continuouslyBoostFetchCount = 0;
          }
        },
      );
    } else {
      // 単位時間内(15分)のFetch回数が制限に近付いたら、SearchAPIをロックする
      console.log(`SearchAPI Locked. Waiting time ${(APILimitPer - sec) / 1000}s.`);
      APILockFlag = true;
      boostModeFlag = false;
    }
  }

  // RateLimitの900秒が経過したら、秒数カウント及びFetch回数をリセット + ロック解除
  if (sec > APILimitPer) {
    if (APILockFlag === true) console.log('SearchAPI LimitCount Reset.');
    sec = 0;
    fetchCount = 0;
    APILockFlag = false;
  }

  sec += boostParam.boost;
}, boostParam.boost);

/**
 * キー入力によるブーストモードON/OFF
 */
Console.onKeypress(() => {
  if (boostModeFlag === false) {
    console.log('＊＊＊＊ Boost Start!!!! ＊＊＊＊');
    boostModeFlag = true;
  } else {
    console.log('＊＊＊＊ Boost End. ＊＊＊＊');
    boostModeFlag = false;
  }
});
