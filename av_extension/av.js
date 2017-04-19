var imgs = document.getElementsByTagName('img');
function get_imgs ()
{
    var response = JSON.parse(request.responseText);
    var imgs = [];
    for (var i in response)
    {
        imgs.push(response[i].thumb);
    }

    var elements = document.getElementsByTagName('img');
    for (var i in elements)
    {
        if (elements[i].width > 70 && elements[i].width < 200)
        {
            var key = Math.floor(Math.random()*imgs.length);
            elements[i].src = imgs[key];
            elements[i].style.height = "";
            elements[i].removeAttribute('height');
        }
    }
}

var request;
window.onload = function()
{
    request = new XMLHttpRequest();
    request.onreadystatechange = get_imgs;
    request.open('GET', 'https://d9ymae9qjseyw.cloudfront.net/dmm/ranking_online_weekly.json');
    request.send();
};