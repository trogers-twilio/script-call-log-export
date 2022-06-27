const Twilio = require('twilio');
const moment = require('moment');
const { parse } = require('json2csv');
const fs = require('fs');
require('dotenv').config();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
} = process.env;

const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

const arguments = process.argv.filter(arg => arg.includes('='));

if (arguments.length === 0) {
  console.log('No arguments included in run command. Unable to proceed.');
  process.exit();
} else if (!arguments.some(arg => arg.includes('start-date'))) {
  console.log('Missing "start-date" argument. Unable to proceed.');
  process.exit();
} else if (!arguments.some(arg => arg.includes('end-date'))) {
  console.log('Missing "end-date" argument. Unable to proceed.');
  process.exit();
} else if (!arguments.some(arg => arg.includes('output-file'))) {
  console.log('Missing "output-file" argument. Unable to proceed.');
  process.exit();
}

const startDateArg = arguments.find(arg => arg.startsWith('start-date'));
const startDate = startDateArg.split('=')[1];

const endDateArg = arguments.find(arg => arg.startsWith('end-date'));
const endDate = endDateArg.split('=')[1];

const outputFileArg = arguments.find(arg => arg.startsWith('output-file'));
const outputFile = outputFileArg.split('=')[1];

if (!moment(startDate, 'YYYY-MM-DD', true).isValid()) {
  console.log('Invalid "start-date". Must be in format "YYYY-MM-DD"');
  process.exit();
} else if (!moment(endDate, 'YYYY-MM-DD', true).isValid()) {
  console.log('Invalid "end-date". Must be in format "YYYY-MM-DD"');
  process.exit();
}

const startDateTime = new Date(`${startDate}T07:00:00Z`);
const endDateTime = new Date(`${endDate}T07:00:00Z`);

let startInterval = startDateTime;
let intervals = [];

while (endDateTime > startInterval) {
  const nextInterval = new Date(startInterval.getTime() + (5 * 60 * 1000));
  const intervalBlock = {
    endTimeAfter: startInterval.toISOString(),
    endTimeBefore: nextInterval.toISOString()
  };
  intervals.push(intervalBlock);

  startInterval = nextInterval;
}

const getCalls = (endTimeAfter, endTimeBefore, retryCount) => new Promise(async resolve => {
  let maxRetries = 10;
  let currentAttempt = retryCount || 1;
  try {
    // if (currentAttempt < 5) {
    //   await sleep(2000);
    //   throw new Error('This is a test error');
    // }
    const calls = await client.calls.list({
      pageSize: 1000,
      endTimeAfter,
      endTimeBefore
    });
    resolve(calls);
  } catch (error) {
    currentAttempt += 1;
    console.log('Error retrieving calls.', error.message);
    if (currentAttempt < maxRetries) {
      console.log('Retrying, attempt', currentAttempt);
      const calls = await getCalls(endTimeAfter, endTimeBefore, currentAttempt);
      resolve(calls);
    } else {
      console.log('Retry attempts exceeded. Interval missed.');
      resolve[[]];
    }
  }
});

const exportCallLogs = async () => {
  console.log('Retrieving call logs');

  const allCalls = [];
  const timerLabel = 'Retrieval time';
  const totalTimerLabel = 'Total retrieval time';
  
  console.time(totalTimerLabel);

  for(const interval of intervals) {
    console.log(`Retrieving interval`, interval.endTimeAfter, interval.endTimeBefore);
    console.time(timerLabel);
    const calls = await getCalls(interval.endTimeAfter, interval.endTimeBefore);
    console.log(`Retrieved ${calls.length} calls`);
    console.timeEnd(timerLabel);

    allCalls.push(...calls);
  }

  const includedProps = process.env.PROPERTIES.split(',');
  const callSids = new Map();
  const simplifiedCalls = [];

  for (const c of allCalls) {
    if (callSids.has(c.sid)) {
      continue;
    }
    callSids.set(c.sid, c.sid);
    const simpleCall = {};
    includedProps.forEach(prop => {
      simpleCall[prop] = c[prop];
      if (prop === 'startTime') {
        const localTime = moment.utc(c[prop]).local().format();
        simpleCall.startTimePT = localTime;
        const dateTimeSplit = localTime.split('T');
        const date = dateTimeSplit[0];
        const time = dateTimeSplit[1].slice(0,dateTimeSplit[1].indexOf('-'));

        simpleCall.datePT = date;
        simpleCall.timePT = time;
      }
    });
    simplifiedCalls.push(simpleCall);
  };

  console.log('All call logs retrieved. Total calls:', simplifiedCalls.length);
  console.timeEnd(totalTimerLabel);
  // console.log('First call:', simplifiedCalls[0]);

  const logsCsv = parse(simplifiedCalls);
  fs.writeFileSync(outputFile, logsCsv, err => {
    if (err) throw err;
    console.log('Call logs saved to file', outputFile);
  });
}

exportCallLogs();
