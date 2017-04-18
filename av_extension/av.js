var imgs = document.getElementsByTagName('img');

var output = [];
for (var i in imgs)
{
    output.push(imgs[i].src);
}
alert(output.join(";"));