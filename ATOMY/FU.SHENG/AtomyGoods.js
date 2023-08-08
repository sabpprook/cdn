const loginModal = new mdb.Modal($("#loginModal")[0]);
const loanModal = new mdb.Modal($("#loanModal")[0]);
const itemCountCollapse = new mdb.Collapse($("#item-count")[0], { toggle: false });
const itemBorrowCollapse = new mdb.Collapse($("#item-borrow")[0], { toggle: false });

var sessionKey = localStorage.getItem("sessionKey");
var sessionExp = localStorage.getItem("sessionExp");

setInterval(() => {
  sessionKey = localStorage.getItem("sessionKey");
  sessionExp = localStorage.getItem("sessionExp");
  var ts = Date.now();
  if (sessionKey == null || sessionExp == null || ts > sessionExp) {
    localStorage.removeItem("sessionKey");
    localStorage.removeItem("sessionExp");
    loginModal.show();
  } else {
    sessionCheck(sessionKey);
  }
}, 3000);

function loginSubmit() {
  var pwd = $("#loginPassword").val();
  var key = CryptoJS.MD5(pwd).toString();
  sessionCheck(key);
}

function sessionCheck(key) {
  if (typeof google != 'undefined') {
    google.script.run.withSuccessHandler(sessionCheckOnSuccess).sessionCheck(key);
  } else {
    $("body").append( $("<script></" + "script>").attr("src", "AtomyGoods.js") );
    showGoodsList();
    handleGoods();
    handleLoans();
    sessionCheckOnSuccess(JSON.stringify( { "result": true, "key": key } ));
  }
}

function sessionCheckOnSuccess(data) {
  json = JSON.parse(data);
  console.log(data);
  if (json.result) {
    loginModal.hide();
    sessionKey = json.key;
    sessionExp = Date.now() + 3600_000;
    //sessionExp = Date.now() + 5_000;
    localStorage.setItem("sessionKey", sessionKey);
    localStorage.setItem("sessionExp", sessionExp);
    getGoods();
    getLoans();
  }
}

function btnOnProcess(selector, remove=false) {
  if (remove) {
    $(selector).attr("disabled", false);
    $(selector + " span").remove();

  } else {
    $(selector).attr("disabled", true);
    $(selector).append( $("<span></span>").addClass("ms-2 spinner-border spinner-border-sm") );
  }
}

function itemOnClick(event) {
  $("#goods-list").addClass("d-none");
  $("#goods-list-back").removeClass("d-none");
  $("#goods-option").removeClass("d-none");
  $("#goods-select tbody tr").html(event.currentTarget.innerHTML);
}

function getGoods() {
  if (!window.AtomyGoods) {
    google.script.run.withSuccessHandler(getGoodsOnSuccess).getGoods(sessionKey);
  }
}

function getGoodsOnSuccess(goods) {
  window.AtomyGoods = JSON.parse(goods);
  console.log(AtomyGoods);
  showGoodsList();
  handleGoods();
}

function showGoodsList() {
  $("#goods-list").removeClass("d-none");
  $("#goods-option").addClass("d-none");

  $("#goods-list-back").addClass("d-none");
  
  var select = $("#goods-select tbody td");
  var list = $("#goods-list tbody tr");

  if (select.length > 0 && list.length > 0) {
    list = list.toArray();
    var id = select.first().text();
    var idx = list.map(e => e.firstChild.textContent).indexOf(id);
    if (idx < 5) return;
    preSibling = (e, cnt) => {
      for (var i = cnt; i > 0; i--)
      e = e.previousSibling;
      return e;
    };
    preSibling(list[idx], 3).scrollIntoView(true);
  }
}

function handleGoods() {
  $("#goods-list").html("");

  var listAll = $("#goods-list-switch").prop("checked");
  var title = [ '商品編號', '商品名稱', '售價 / PV', '數量' ];
  var index = [ 0, 1, 2, 5 ];
  var row_count = 0;

  var table = $("<table></table>").addClass("table table-striped table-hover bg-white text-nowrap");
  var thead = $("<thead></thead>").addClass("bg-light");
  var tbody = $("<tbody></tbody>").addClass("user-select-none table-group-divider");
  var row = $("<tr></tr>").addClass("table-warning");

  title.forEach((text) => { 
    row.append($("<th></th>").text(text));
  });

  thead.append(row)
  table.append(thead);
  
  for (var i = 0; i < AtomyGoods.length; i++) {
    if (!AtomyGoods[i][0]) continue;
    if (listAll || AtomyGoods[i][5] > 0) {
      var row = $("<tr></tr>");
      index.forEach((idx) => {
        if (idx == 1) var s = AtomyGoods[i][4];
        if (idx == 2) var s = AtomyGoods[i][3];
        if (s != undefined) {
          row.append($("<td></td>")
          .append( $("<p></p>").addClass("fw-normal mb-1").text(AtomyGoods[i][idx]) )
          .append( $("<p></p>").addClass("text-muted mb-0").text(s) ));
        } else {
          row.append($("<td></td>").text(AtomyGoods[i][idx]));
        }
      });
      row.bind("click", itemOnClick);
      tbody.append(row);
    }
  }

  table.append(tbody);
  $('#goods-list').append(table);
}

function editGoodCount() {
  var id = $("#goods-select td")[0].innerHTML;
  var count = $("#edit-goods-count").val();

  btnOnProcess("#btnItemCount");
  itemCountCollapse.toggle();

  if (typeof google != 'undefined') {
    google.script.run.withSuccessHandler(editGoodOnSuccess).editGood(id, count, sessionKey);
  } else {
    console.log(`editGood(${id}, ${count})`);
  }
}

function editGoodOnSuccess(goods) {
  $("#edit-goods-count").val("");
  btnOnProcess("#btnItemCount", true);
  var json = JSON.parse(goods);
  var elm = AtomyGoods.find(elm => elm[0] == json[0]);
  elm[5] = json[5];
  handleGoods();
  showGoodsList();
}

function createLoan() {
  btnOnProcess("#btnItemBorrow");

  var data = {
    gdsId: $("#goods-select td")[0].innerHTML,
    gdsName: $("#goods-select td")[1].firstChild.innerHTML,
    gdsCount: $("#loan-goods-count").val(),
    member: $("#loan-member-name").val(),
    tel: $("#loan-member-tel").val(),
    orderNum: $("#loan-order-number").val(),
    comment: $("#loan-comment").val(),
    date: $("#loan-date").val(),
    return: false,
    returnDate: ''
  };
  if (!data.gdsCount || !data.date || !data.member || !data.tel) {
    return;
  }
  var json = JSON.stringify(data);
  var hash = CryptoJS.MD5(json).toString()
  var count = parseInt($("#goods-select tbody td").last().text()) - parseInt(data.gdsCount);

  itemBorrowCollapse.toggle();

  if (typeof google != 'undefined') {
    google.script.run.withSuccessHandler(editGoodOnSuccess).editGood(data.gdsId, count, sessionKey);
    google.script.run.withSuccessHandler(createLoanOnSuccess).createLoan(hash, json, sessionKey);
  } else {
    console.log(`editGood(${data.gdsId}, ${count})`);
    console.log(`createLoan(${hash}, ${json})`);
  }
}

function createLoanOnSuccess(goods) {
  btnOnProcess("#btnItemBorrow", true);

  $("#loan-goods-count").val(1);
  $("#loan-member-name").val("");
  $("#loan-member-tel").val("");
  $("#loan-order-number").val("");
  $("#loan-comment").val("");
  $("#loan-date").val("");
  showGoodsList();

  if (typeof google != 'undefined') {
    google.script.run.withSuccessHandler(getLoansOnSuccess).getLoans(sessionKey);
  }
}

function getLoans() {
  if (!window.AtomyLoans) {
    google.script.run.withSuccessHandler(getLoansOnSuccess).getLoans(sessionKey);
  }
}

function getLoansOnSuccess(loans) {
  window.AtomyLoans = JSON.parse(loans);
  console.log(AtomyLoans);
  handleLoans();
}

function handleLoans() {
  $("#loans-list").html("");

  var title = [ '日期', '商品', '數量', '會員', '狀態', '訂單', '備註', '編輯' ];
  var row_count = 0;

  var table = $("<table></table>").addClass("table table-hover bg-white text-nowrap");
  var thead = $("<thead></thead>").addClass("bg-light");
  var tbody = $("<tbody></tbody>").addClass("user-select-none table-group-divider");
  var row = $("<tr></tr>");

  title.forEach((text) => { 
    row.append($("<th></th>").text(text));
  });

  thead.append(row)
  table.append(thead);
  
  for (var i = 0; i < AtomyLoans.length; i++) {
    var hash = AtomyLoans[i][0];
    var data = JSON.parse(AtomyLoans[i][1]);
    console.log(data);

    var row = $("<tr></tr>");
    row.append($("<td></td>").text(data.date));
    row.append( 
      $("<td></td>")
      .append( $("<p></p>").addClass("fw-normal mb-1").text(data.gdsName) )
      .append( $("<p></p>").addClass("text-muted mb-0").text(data.gdsId) )
    );
    row.append($("<td></td>").text(data.gdsCount));
    row.append( 
      $("<td></td>")
      .append( $("<p></p>").addClass("fw-normal mb-1").text(data.member) )
      .append( $("<p></p>").addClass("text-muted mb-0").text(data.tel) )
    );
    if (data.return) {
      row.append( 
        $("<td></td>")
        .append( $("<p></p>").addClass("badge badge-success mb-1 d-inline").text("完成歸還") )
        .append( $("<p></p>").addClass("text-muted mb-0").text(data.returnDate) )
      );
    } else {
      row.append( 
        $("<td></td>")
        .append( $("<p></p>").addClass("badge badge-danger mb-1 d-inline").text("尚未歸還") )
        .append( $("<p></p>").addClass("text-muted mb-0 d-none").text("") )
      );
    }
    row.append($("<td></td>").text(data.orderNum));
    row.append($("<td></td>").text(data.comment));

    row.append( 
      $("<td></td>")
      .append( $("<button></button>").addClass("btn btn-primary btn-floating")
      .attr("data-mdb-toggle", "modal")
      .attr("data-mdb-target", "#loanModal")
      .append( $("<i></i>").addClass("fas fa-lg fa-pencil") ).bind("click", loanOnClick)
    ));

    row.append($("<td></td>").addClass("d-none").text(hash));

    tbody.append(row);
  }

  table.append(tbody);
  $('#loans-list').append(table);
}

function loanOnClick(e) {
  var hash = e.currentTarget.parentElement.parentElement.lastChild.textContent;
  $("#loanHash").val(hash);

  var json = AtomyLoans.find((record) => record[0] == hash)[1];
  json = JSON.parse(json);

  $("#loanReturnOrder").val(json.orderNum);
  $("#loanReturnDate").val(json.returnDate);
  $("#loanComment").val(json.comment);
  $("#loanReturnSwitch").prop('checked', json.return);
  $("#loanReturnSwitch").prop('disabled', json.return);
}

function loanUpdateOnClick(e) {
  var hash = $("#loanHash").val();
  btnOnProcess("#btnloanUpdate");

  var json = AtomyLoans.find((record) => record[0] == hash)[1];
  json = JSON.parse(json);

  json.orderNum = $("#loanReturnOrder").val();
  json.returnDate = $("#loanReturnDate").val();
  json.comment = $("#loanComment").val();
  json.return = $("#loanReturnSwitch").prop('checked');

  console.log(json);

  if (typeof google != 'undefined') {
    google.script.run.withSuccessHandler(loanUpdateOnSuccess).editLoan(hash, JSON.stringify(json), sessionKey);
  } else {
    console.log(`editLoan(${hash}, ${JSON.stringify(json)})`);
  }
}

function loanUpdateOnSuccess(loan) {
  loanModal.hide();
  btnOnProcess("#btnloanUpdate", true);
  if (loan != null) {
    var json = JSON.parse(loan);
    var elm = AtomyLoans.find(elm => elm[0] == json[0]);
    elm[1] = json[1];
    handleLoans();
  }
}

function loanDeleteOnClick() {
  var hash = $("#loanHash").val();
  btnOnProcess("#btnloanDelete");

  if (typeof google != 'undefined') {
    google.script.run.withSuccessHandler(loanDeleteOnSuccess).deleteLoan(hash, sessionKey);
  } else {
    console.log(`deleteLoan(${hash})`);
  }
}

function loanDeleteOnSuccess(hash) {
  btnOnProcess("#btnloanDelete", true);
  loanModal.hide();
  if (hash != null) {
    AtomyLoans = AtomyLoans.filter(elm => elm[0] != hash);
    handleLoans();
  }
}