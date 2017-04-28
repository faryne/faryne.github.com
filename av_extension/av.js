var request,
    idx = Math.round(Math.random()*10) % 2,
    url = idx == 0 ? "https://d9ymae9qjseyw.cloudfront.net/dmm/ranking_online_weekly.json" : "https://yande.re/post.json";
    imgs = [], 
    loaded_flag = false;


function get_imgs ()
{
    if (imgs.length === 0)
    {
        request = new XMLHttpRequest();
        request.onload = function ()
        {
            if (typeof request.responseText === "undefined" || request.responseText.length === 0)
            {
                return;
            }
            var response = JSON.parse(request.responseText);
            imgs = [];
            for (var i in response)
            {
                if (typeof response[i].thumb === "undefined" && response[i].preview_url === "undefined")
                {
                    return false;
                }
                imgs.push({
                    url:    (idx == 0 ? response[i].thumb : response[i].preview_url),
                    w:      (idx == 0 ? 90 : parseInt(response[i].preview_width*0.7, 10))
                });
            }
        };
        request.open('GET', url, true);
        request.send();
        return;
    }

    var elements = document.getElementsByTagName('img');
    for (var i in elements)
    {
        if (elements[i].height < 60)
        {
            continue;
        }
        if (elements[i].width > 70 && elements[i].width < 200 && elements[i].getAttribute('av-prior') === null)
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

function render_images (imgs)
{
    var elements = document.getElementsByTagName('img');
    for (var i in elements)
    {
        if (elements[i].height < 60)
        {
            continue;
        }
        if (elements[i].width > 70 && elements[i].width < 200 && elements[i].getAttribute('av-prior') === null)
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
    var observer = new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
            let p = new Promise((resolve, reject) => 
            {
                if (imgs.length > 0)
                {
                    return resolve(imgs);
                }
                request = new XMLHttpRequest();
                request.open('GET', url, true);
                request.onload = function ()
                {
                    if (typeof request.responseText === "undefined" || request.responseText === "")
                    {
                        return;
                    }
                    var response = JSON.parse(request.responseText);
                    imgs = [];
                    for (var i in response)
                    {
                        if (typeof response[i].thumb === "undefined" && response[i].preview_url === "undefined")
                        {
                            return false;
                        }
                        imgs.push({
                            url:    (idx == 0 ? response[i].thumb : response[i].preview_url),
                            w:      (idx == 0 ? 90 : parseInt(response[i].preview_width*0.7, 10))
                        });
                    }
                    resolve(imgs);
                };
                request.send();
            });
        });
    });
    observer.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true, attributeFilter: ["src", "av-prior"]});
}