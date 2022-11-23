
const THEME = 'mbo';

const compares = { };
function createCompare (id, collapseIdentical) {
    var target = document.getElementById(id);
    target.innerHTML = '';

    let value = '';
    let origLeft = '';
    if (compares[id]) {
        value = compares[id].editor().getValue();
        origLeft = compares[id].leftOriginal().getValue();
    }

    return compares[id] = CodeMirror.MergeView(target, {
        value: value,
        origLeft: origLeft,
        lineNumbers: true,
        mode: "application/ld+json",
        theme: THEME,
        highlightDifferences: true,
        connect: 'align',
        revertButtons: false,
        collapseIdentical: collapseIdentical,
        scrollbarStyle: 'simple',
        allowEditingOriginals: false,
        foldGutter: collapseIdentical !== 1,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });
}

var jsonOld = CodeMirror.fromTextArea(document.getElementById('in'), { 
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    mode: 'application/ld+json',
    theme: THEME,
    scrollbarStyle: 'simple',
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
});

var jsonNew = CodeMirror.fromTextArea(document.getElementById('out'), { 
    value: '{ }',
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    mode: 'application/ld+json',
    theme: THEME,
    scrollbarStyle: 'simple',
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
});



let jsonCompare = createCompare("diff", 1);

jsonOld.setOption("extraKeys", {
    "Ctrl-Y": cm => CodeMirror.commands.foldAll(cm),
    "Ctrl-I": cm => CodeMirror.commands.unfoldAll(cm),
});
jsonNew.setOption("extraKeys", {
    "Ctrl-Y": cm => CodeMirror.commands.foldAll(cm),
    "Ctrl-I": cm => CodeMirror.commands.unfoldAll(cm),
});
jsonCompare.editor().setOption("extraKeys", {
    "Ctrl-Y": cm => CodeMirror.commands.foldAll(cm),
    "Ctrl-I": cm => CodeMirror.commands.unfoldAll(cm),
});
jsonCompare.leftOriginal().setOption("extraKeys", {
    "Ctrl-Y": cm => CodeMirror.commands.foldAll(cm),
    "Ctrl-I": cm => CodeMirror.commands.unfoldAll(cm),
});

const slideUp = () => {
    document.querySelectorAll('.moveUpAnimation').forEach(elm => elm.classList.add('moveUp'));
    document.querySelectorAll('.fadeOutAnimation').forEach(elm => elm.classList.add('fadeOut'));
}

function updateKey(value) {
    return (typeof value === 'object') ?
        (Array.isArray(value) ?
            value.map(updateKey) :
            Object.keys(value).reduce(
                (o, key) => {
                    const v = value[key];
                    key = key.trim().replace(/* add field name translation here*/);
                    o[key] = updateKey(v);
                    return o;
                }, {})
        ) :
        value;
}

// Parse and Stringify to ensure match
function sortObjByKey(value) {
    return (typeof value === 'object') ?
      (Array.isArray(value) ?
        value.map(sortObjByKey) :
        Object.keys(value).sort().reduce(
          (o, key) => {
            const v = value[key];
            o[key] = sortObjByKey(v);
            return o;
          }, {})
      ) :
      value;
  }

const sanitize = (s, sort=true) => {
    let obj = s;
    if (typeof obj === 'string') {
        obj = JSON.parse(s);
    }
    (sort) && (obj = sortObjByKey(updateKey(obj)));
    return JSON.stringify(obj, null, 2);
} 


const loadingMsg = (elm, msg) => {
    elm.disabled = true;
    const txt = elm.innerHTML;
    elm.innerHTML = msg || 'loading...';
    return () => {
        console.log(elm);
        elm.innerHTML = txt;
        elm.disabled = false;
    };
};

const btnErr = (elm, msg) => setTimeout(loadingMsg(elm, msg), 2000);;

const serverCall = (request, btn, callback) => {
    document.getElementById('outputArea').classList.add('fadeIn');
    slideUp(document.getElementById('expected'));
    const reset = loadingMsg(btn);
    
    addMessage(
        jsonNew, 
        `Loading, Please Wait <div class="demo-container"><div class="progress-bar" style="width: 400px"><div class="progress-bar-value"></div></div></div>`
    );

    fetch(request.path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.body),
    })
        .then((response) => response.json())
        .then((data) => {
            callback(data);
            reset();
        });
}

document.getElementById('enhance').addEventListener("click", function (e) {
    try {
        const obj = JSON.parse(jsonOld.getValue());
    } catch (error) {
        btnErr(this, 'Invalid JSON');
        addMessage(jsonOld, `<b>Error:</b> Invalid JSON ${error}`, { error: true });
        return;
    }

    const includeLinked = document.getElementById('cbIncludeLinked').checked;

    serverCall({
        path: '/enhance',
        body: { in: jsonOld.getValue(), includeLinked }
    }, this, (data) => {
        const oldObj = JSON.parse(jsonOld.getValue());
        const newObj = JSON.parse(data.out);

        // Unsorted Props
        jsonNew.setValue(sanitize(newObj, false));
        jsonOld.setValue(sanitize(oldObj, false));

        // Sorted Props
        jsonCompare.editor().setValue(sanitize(newObj));
        jsonCompare.leftOriginal().setValue(sanitize(oldObj));
        jsonCompare = createCompare("diff", 1);
    });
});

document.getElementById('compare').addEventListener("click", function (e) {
    let obj;
    try {
        obj = JSON.parse(jsonOld.getValue());
    } catch (error) {
        btnErr(this, 'Invalid JSON');
        addMessage(jsonOld, `<b>Error:</b> Invalid JSON ${error}`, { error: true });
        return;
    }

    serverCall({
        path: '/object',
        body: { id: obj._entity_data?.['Entity ID'] || obj['Entity ID']}
    }, this, (data) => {
        let oldObj = JSON.parse(jsonOld.getValue());
        delete oldObj._entity_data?._related_entity_data; // Remove data not gen'ed
        let combined = { ...oldObj, _entity_data: JSON.parse(data.obj) };

        // Unsorted Props
        jsonNew.setValue(sanitize(combined, false));
        jsonOld.setValue(sanitize(oldObj, false));

        // Sorted Props
        jsonCompare.editor().setValue(sanitize(combined));
        jsonCompare.leftOriginal().setValue(sanitize(oldObj));
        jsonCompare = createCompare("diff", 1);
    });
});

const addMessage = (editor, text, opt) => {
    let msg = document.createElement('div');
    msg.className = 'inline-code-msg' + (opt?.error ? ' inline-code-msg-error' : '');
    msg.innerHTML = text;
    let above = true;
    opt?.error && (above = false);
    const wid = editor.addLineWidget(opt?.line || 0, msg, { above, coverGutter: false, noHScroll: true});
    opt?.error && setTimeout(() => wid.clear(), 3000);
    return msg;
};



document.getElementById('collapse').addEventListener("click", (e) => {
    const targetid = e.target.dataset.targetid;
    let val = compares[targetid].options.collapseIdentical === 1 ? null : 1;

    compares[targetid] = createCompare(targetid, val);
});

document.getElementById('next').style.display = 'none'; // TODO not working correctly
document.getElementById('next').addEventListener("click", function (e) {
    const targetid = e.target.dataset.targetid;

    const cm = compares[targetid].editor().doc.cm;
    CodeMirror.commands.goNextDiff(cm);
    cm.setCursor(cm.getCursor().line + 25, 0);
});

document.getElementById('start-over').addEventListener("click", function (e) {
    window.location.reload();
});