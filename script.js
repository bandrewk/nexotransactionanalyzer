"use strict";

//import { TransactionType, Transaction } from "/Transaction.js";

const dropZone = document.querySelector("#drop_zone");
const start = document.querySelector("#start");
const table = document.querySelector("#transactions");
const ibox1 = document.querySelector("#infobox-1");
const ibox2 = document.querySelector("#infobox-2");
const ibox3 = document.querySelector("#infobox-3");
const ibox4 = document.querySelector("#infobox-4");
const ibox5 = document.querySelector("#infobox-5");

console.log(dropZone);
dropZone.addEventListener("ondrop", dropHandler);

// var requestURL =
//   "https://api.exchangerate.host/2020-04-04?base=USD&symbols=EUR&amount=0.21";
// var request = new XMLHttpRequest();
// request.open("GET", requestURL);
// request.responseType = "json";
// request.send();

// request.onload = function () {
//   var response = request.response;
//   console.log(response);
// };

//table.classList.toggle(`hidden`);

function dropHandler(ev) {
  console.log(`hi`);

  // Only fire once per drop
  ev.stopImmediatePropagation();

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // If dropped items aren't files, reject them
    if (ev.dataTransfer.items[0].kind === "file") {
      var file = ev.dataTransfer.items[0].getAsFile();

      console.log(`reading file ${file.name}`);
      file.text().then((content) => fileReady(content));
    }
  }
}

function dragOverHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

function fileReady(content) {
  start.classList.toggle(`hidden`);
  // table.classList.toggle(`hidden`);
  console.log(`file is ready!`);

  let arr = content.split("\n");

  let jsonObj = [];
  let headers = arr[0].split(",");
  for (let i = 1; i < arr.length; i++) {
    let data = arr[i].split(",");
    let obj = {};
    for (let j = 0; j < data.length; j++) {
      obj[headers[j].trim()] = data[j].trim();
    }
    jsonObj.push(obj);
    console.log(obj);
  }
  JSON.stringify(jsonObj);

  jsonObj.map((value) => RenderTransaction(value));

  ibox1.innerHTML = `        <h2>${jsonObj.length + 1}</h2>
  <p>Transactions</p>`;
  ibox2.innerHTML = `        <h2>$ ${depositSum.toFixed(2)}</h2>
  <p>Crytpo deposits</p>`;
  ibox3.innerHTML = `        <h2>$ ${wireDeposits.toFixed(2)}</h2>
  <p>Wire deposits</p>`;
  ibox4.innerHTML = `        <h2>$ ${interesetSum.toFixed(2)}</h2>
  <p>Interest earned</p>`;
  ibox5.innerHTML = `        <h2>$ 0</h2>
  <p>Outstanding loan</p>`;

  //jsonObj.map((value) => PullForeignExchangeRate(value, `EUR`));
}

let depositSum = 0;
let wireDeposits = 0;
let interesetSum = 0;

let sumNexo = 0;

function PullForeignExchangeRate(t, cur) {
  fetch(
    `https://api.exchangerate.host/${t[`Date / Time`].substr(
      0,
      10
    )}?base=USD&symbols=${cur}&amount=${parseFloat(t.Amount)}`
  )
    .then((response) => response.json())
    .then((data) => console.log(data));
}

function RenderTransaction(t) {
  // Fix NEXO NEXO entries
  if (t.Currency === `NEXONEXO`) t.Currency = `NEXO`;
  let nexoCorrect = t.Currency.search(`NEXONEXO`);
  if (nexoCorrect >= 0) {
    t.Currency = t.Currency.substr(0, nexoCorrect) + `NEXO`;
  }

  nexoCorrect = t.Currency.search(`/`);
  if (nexoCorrect == -1) {
    t.Currency =
      `<img style="width: 24px; height: 24px" src="https://cryptoicon-api.vercel.app/api/icon/${t.Currency.toLowerCase()}" /> ` +
      t.Currency;
  }

  if (t.Type === `Deposit`) {
    depositSum += parseFloat(t[`USD Equivalent`].slice(1));
  }

  if (t.Type === `DepositToExchange`) {
    wireDeposits += parseFloat(t[`USD Equivalent`].slice(1));
  }

  if (t.Type === `Interest`) {
    interesetSum += parseFloat(t[`USD Equivalent`].slice(1));
  }

  //⏬ Withdrawal
  const html = `<tr>
  <td>${t.Transaction}</td>
  <td>${t.Type}</td>
  <td>${t.Currency}</td>
  <td>${parseFloat(t.Amount).toFixed(4)}</td>
  <td>$ ${parseFloat(t[`USD Equivalent`].slice(1)).toFixed(2)}</td>
  <td>${t.Details}</td>
  <td>${t[`Outstanding Loan`]}</td>
  <td>${t[`Date / Time`]}</td>
</tr>`;

  table.insertAdjacentHTML(`beforeend`, html);
}

/*

*/
