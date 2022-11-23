document.getElementById('sample').addEventListener("click", function (e) {
    jsonOld.setValue(JSON.stringify(obj, null, 4));
    let msg = document.createElement("div");
    msg.className = 'inline-code-msg';
    msg.innerHTML = '<b>Note:</b> Sample data pulled from Database on <b>11/21/2022</b>';
    //jsonOld.addLineWidget(0, msg, {coverGutter: false, noHScroll: true});
});

document.getElementById('pull-request').addEventListener("click", function (e) {
    jsonOld.setValue(JSON.stringify(pullRequest, null, 4));
    let msg = document.createElement("div");
    msg.className = 'inline-code-msg';
    msg.innerHTML = '<b>Note:</b> Sample data pulled from Database on <b>11/21/2022</b>';
    //jsonOld.addLineWidget(0, msg, {coverGutter: false, noHScroll: true});
});

const pullRequest = {
    "Entity ID": "first",
    "Note": "Will pull first record in db. Change Entity ID to a real value."
  }

const obj = {
    "Entity ID": 113752,
    "_entity_data": {
      "Keywords": "dog,cat,horse",
      "Markdown Link": "[link](www.google.com)",
      "Markdown Image": "![Alt Text](./dog.png)",
      "Markdown Bold": "__bold__",
      "Markdown Italicized": "*Italicized*",
      "Markdown Email": "<fake@example.com>",
      "HTML Encoded": "&quot; &apos; &amp; &lt; &gt; &nbsp; &iexcl; &cent; &pound; &curren; &yen; &brvbar; &sect; &uml; &copy;"
    }
  }