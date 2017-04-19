var request,
    idx = Math.round(Math.random()*10) % 2,
    url = idx == 0 ? "https://d9ymae9qjseyw.cloudfront.net/dmm/ranking_online_weekly.json" : "https://yande.re/post.json";
    imgs = [];

    url = "https://d9ymae9qjseyw.cloudfront.net/dmm/ranking_online_weekly.json";


function get_imgs ()
{
    if (imgs.length === 0)
    {
        if (typeof request.responseText === "undefined" || request.responseText.length === 0)
        {
            return;
        }
        var response = JSON.parse(request.responseText);
        for (var i in response)
        {
            imgs.push({
                url:    (idx == 0 ? response[i].thumb : response[i].preview_url),
                w:      (idx == 0 ? 90 : parseInt(response[i].preview_width*0.7, 10))
            });
        }
    }

    var elements = document.getElementsByTagName('img');
    for (var i in elements)
    {
        if (elements[i].height < 60)
        {
            continue;
        }
        if (elements[i].width > 70 && elements[i].width < 300 && elements[i].getAttribute('av-prior') === null)
        {
            var key = Math.floor(Math.random()*imgs.length);
            elements[i].src = imgs[key].url;
            elements[i].style.width = imgs[key].w + "px";
            elements[i].style.height = "";
            elements[i].removeAttribute('height');
            elements[i].setAttribute('av-prior', "1");
        }
    }
}

window.onload = function ()
{
    request = new XMLHttpRequest();
    request.onload = get_imgs;
    request.open('GET', url);
    request.send();
}

var observer = new MutationObserver(function(mutations){
    mutations.forEach(get_imgs);
});
observer.observe(document.body, { attributes: true, childList: true, characterData: true, attributeFilter: ["src", "av-prior"]});