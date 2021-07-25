//为什么js的异步和其他语言的不一样？我不习惯，故关闭之
// $.ajaxSetup({async: false});

// Create portlet link
var portletLinkOnline = mw.util.addPortletLink(
    'p-personal',
    '#',
    '高级移动',
    't-onlineadmin',
    '移动页面时修正内链',
    '',
    '#pt-userpage'
);

var title = mw.config.get('wgTitle')
var new_title = '';
var old_title = ''
var links = [];

async function prepare() {
    ls = await get_pages_linkin(title)
    for (e in ls) {
        console.log(ls)
        var l = ls[e];
        wt = await get_page_wikitext(l)
        pr = await get_preview(l)
        links.push(new Array(l, wt, pr))
    }
    console.log(links)
    start()
}

new Promise(status => prepare())

function start(){
    var s1 = document.getElementById("content").innerHTML;
    s1 = document.getElementById("content").innerHTML = "<h1>移动工具 v1.0</h1>\n" +
        "    <h2>即将对该条目进行移动，请填写并确认以下信息</h2>\n" +
        "    <fieldset>\n" +
        "        <legend>操作</legend>\n" +
        "        <label for=\"move_reason\">移动理由：</label>\n" +
        "        <input id=\"move_reason\" class=\"mw-searchInput\" name=\"move_reason\" size=\"40\">\n" +
        "\n" +
        "        <label for=\"edit_reason\">修改内链摘要：</label>\n" +
        "        <input id=\"edit_reason\" class=\"mw-searchInput\" name=\"edit_reason\" size=\"40\" value=\"通过工具自动修复内链\">\n" +
        "\n" +
        "        <input name=\"loadpreview\" type=\"submit\" value=\"加载预览\">\n" +
        "        <input name=\"postedit\" type=\"submit\" value=\"一键发布编辑\">\n" +
        "    </fieldset>\n" +
        "    <hr/>\n" +
        "    <p>以下是链入该页面的页面，移动后将自动修复内链</p>" +
        "   <ul>"

    for (eac in links) {
        s1 = document.getElementById("content").innerHTML = s1 + "<li><a href=\"" + get_link(links[eac][0]) +"\">" + links[eac][0] + "</a></li>\n" +
            "        <details>\n" +
            "        <summary>展开预览</summary>\n" +
            "            <fieldset>\n" +
            "                <legend>预览</legend>\n" +
            "<div id=\"" + eac.toString() + "\">" +
            links[eac][2] +
            "<!--        预览内容-->\n" +
            " </div>>" +
            "            </fieldset>\n" +
            "            <fieldset style=\"height:300px\">\n" +
            "                <legend>wikitext</legend>\n" +
            "                <textarea style=\"height:100%; width: 100%\">" +
            links[eac][1] +
            "</textarea>\n" +
            "            </fieldset>\n" +
            "            <button id=\"target\" onclick=\"reload_preview(eac, links[eac][0])\">重新加载预览</button>\n" +
            "\n" +
            "        </details>";
    }
}

function get_link(title){
    return mw.util.getUrl(title)
}

async function reload_preview(number, title) {
    str = await get_preview(title);
    var s2 = document.getElementById(number.toString).innerHTML;
    s2 = document.getElementById(number.toString).innerHTML = str;
}


async function get_pages_linkin(title) {
    var api = new mw.Api();
    let items = [];
    api.get({
        format: 'json',
        action: 'query',
        prop: 'linkshere',
        titles: title,
        formatversion: '2',

    }).done(function (data) {
        var p;
        for (p in data) {
            items.push(data[p]);
        }
        return items[1].pages[0].linkshere
    })
}

async function replace_pages_text(title, summary) {
        api = new mw.Api();
        api.edit(title , function ( revision ){
            return {
                text:replace_pages_link(revision.content, old_title, new_title, true),
                summary:summary
            }
    }).then(function () {
            return "succeed"
        })
}



async function get_token(){
    var params = {
            action: 'query',
            meta:'tokens',
            type: 'csrf',
            formatversion: '2',
            format: 'json'
        },
        api = new mw.Api();
        api.get(params).then(function (data) {
            var token = data.query.tokens.csrftoken;
            return token
    })
}

function replace_pages_link(item, old_link, new_link, do_keep_now) {
    var reg1 = new RegExp('\\[\\[(' + old_link + ')\\]\\]')
    // var reg2 = new RegExp('\\[\\[([^\\[\\[]*?)\\|(' + old_link + ')\\]\\]', "g");
    var reg2 = new RegExp('\\[\\[('+ old_link + ')\\|([^\\[\\[]*?)\\]\\]');
    while (reg1.test(item)) {
        item = item.replace(reg1, '[[' + new_link + ']]');
    }
    if (do_keep_now){
        while (reg2.test(item)) {
            item = item.replace(reg2, '[[' + new_link + '|' + reg2.exec(item)[1] + ']]');
        }
    }else {
        while (reg2.test(item)) {
            item = item.replace(reg2, '[[' + new_link + ']]');
        }
    }
    return item
}

async function get_preview(text){
    var params = {
            action: 'parse',
            text: text,
            format: 'json',
            async: false,
            formatversion: '2',
        },
        api = new mw.Api();
    api.get(params).then(function (data) {
        return data.parse.text;
    })
}

async function move_pages(old_title ,new_title, reason, do_not_direct, token){
    var params = {
            action: 'move',
            form: old_title,
            to: new_title,
            reason: reason,
            movetalk: true,
            movesubpages: true,
            noredirect:do_not_direct,
            token:token,
            format: 'json',
            formatversion: '2',
        },
        api = new mw.Api();
    api.get(params).then(function (data) {
        return data
    })
}


async function get_page_wikitext(title) {
    var params = {
            action: 'query',
            prop: 'revisions',
            titles: title,
            async: false,
            rvprop: 'content',
            rvslots: 'main',
            formatversion: '2',
            format: 'json'
        },
        api = new mw.Api();
    api.get(params).then(function () {
        var pages = data.query.pages;
        itemss = pages[0].revisions[0].slots.main.content;
        return itemss
    })
}


